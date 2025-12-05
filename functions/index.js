/**
 * Firebase Cloud Functions for FMS Portal
 * Handles Stripe webhook for auto-marking applicants as paid
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

/**
 * Stripe Webhook Handler
 * This function receives payment notifications from Stripe
 * and automatically updates the applicant status to "paid"
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    console.log("Rejected non-POST request");
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const event = req.body;

    // Log the event type for debugging
    console.log("Received Stripe event:", event.type);

    // We only care about successful checkout completions
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Get the customer email from the session
      const customerEmail = session.customer_details?.email ||
                           session.customer_email;

      if (!customerEmail) {
        console.error("No customer email found in session");
        return res.status(400).send("No customer email found");
      }

      const emailLower = customerEmail.toLowerCase().trim();
      console.log("Processing payment for email:", emailLower);

      // Find the applicant with this email who is awaiting payment
      const applicantsRef = db.collection("applicants");
      const snapshot = await applicantsRef
          .where("email", "==", emailLower)
          .where("status", "==", "approved_to_pay")
          .get();

      if (snapshot.empty) {
        // Try without status filter in case they already paid
        // or status is different
        const allMatchingSnapshot = await applicantsRef
            .where("email", "==", emailLower)
            .get();

        if (allMatchingSnapshot.empty) {
          console.log("No applicant found with email:", emailLower);
          // Still return 200 to acknowledge receipt
          return res.status(200).send("No matching applicant found");
        }

        // Check if any are awaiting payment
        let foundApplicant = null;
        allMatchingSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "approved_to_pay") {
            foundApplicant = {id: doc.id, data: data};
          }
        });

        if (!foundApplicant) {
          console.log("Applicant found but not in approved_to_pay status");
          return res.status(200).send("Applicant not awaiting payment");
        }
      }

      // Update the applicant(s) to paid status
      const batch = db.batch();
      let updatedCount = 0;

      snapshot.forEach((doc) => {
        console.log("Updating applicant:", doc.id);
        batch.update(doc.ref, {
          status: "paid",
          stripePaymentId: session.payment_intent || session.id,
          stripeSessionId: session.id,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paidAmount: session.amount_total ? session.amount_total / 100 : 30,
          paymentCurrency: session.currency || "gbp",
        });
        updatedCount++;
      });

      if (updatedCount > 0) {
        await batch.commit();
        console.log(`Successfully marked ${updatedCount} applicant(s) as paid`);
      }

      return res.status(200).send(`Updated ${updatedCount} applicant(s)`);
    }

    // For other event types, just acknowledge receipt
    console.log("Ignoring event type:", event.type);
    return res.status(200).send("Event received");
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Still return 200 to prevent Stripe from retrying
    return res.status(200).send("Error processed");
  }
});
