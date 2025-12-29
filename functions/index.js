/**
 * Firebase Cloud Functions for FMS Portal
 * - Stripe webhook for auto-marking applicants as paid
 * - 2FA reset request handler
 * - 2FA reset confirmation handler
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

/**
 * 2FA Reset Request Handler
 * Sends reset email to users who have lost access to their authenticator
 */
exports.request2FAReset = functions.https.onCall(async (data, context) => {
  const email = data.email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Valid email is required",
    );
  }

  try {
    // Find user with this email who has 2FA enabled
    const usersSnapshot = await db.collection("users")
        .where("email", "==", email)
        .where("has2FA", "==", true)
        .limit(1)
        .get();

    // Always return success (don't reveal if account exists)
    if (usersSnapshot.empty) {
      console.log("No user found with 2FA for email:", email);
      return {success: true};
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Generate secure random token
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");

    // Token expires in 30 minutes
    const expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 60 * 1000),
    );

    // Store token in Firestore
    await db.collection("2faResetTokens").add({
      token: token,
      userId: userId,
      email: email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: expiresAt,
      used: false,
    });

    // Create reset link
    const resetLink =
      `https://portal.fmsprehospital.co.uk/confirm-2fa-reset.html?token=${token}`;

    // Send email via mail collection (triggers SendGrid)
    await db.collection("mail").add({
      to: email,
      message: {
        subject: "Reset Your 2FA - FMS Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #00a896 0%, #028090 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">FMS Prehospital Portal</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333;">Reset Your Two-Factor Authentication</h2>
              <p style="color: #666; font-size: 16px;">Hello ${userData.firstName || "there"},</p>
              <p style="color: #666; font-size: 16px;">We received a request to reset your two-factor authentication. Click the button below to disable your current 2FA and set up a new one.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: linear-gradient(135deg, #00a896 0%, #028090 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset My 2FA</a>
              </div>
              <p style="color: #999; font-size: 14px;"><strong>This link will expire in 30 minutes.</strong></p>
              <p style="color: #999; font-size: 14px;">If you didn't request this reset, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">Festival Medical Services - FMS Prehospital Portal</p>
            </div>
          </div>
        `,
      },
    });

    console.log("2FA reset email queued for:", email);
    return {success: true};
  } catch (error) {
    console.error("2FA reset error:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred processing your request",
    );
  }
});

/**
 * 2FA Reset Confirmation Handler
 * Validates token and disables 2FA for the user
 */
exports.confirm2FAReset = functions.https.onCall(async (data, context) => {
  const token = data.token?.trim();

  if (!token) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Reset token is required",
    );
  }

  try {
    // Find the token in Firestore
    const tokensSnapshot = await db.collection("2faResetTokens")
        .where("token", "==", token)
        .limit(1)
        .get();

    if (tokensSnapshot.empty) {
      console.log("Token not found:", token.substring(0, 10) + "...");
      throw new functions.https.HttpsError(
          "not-found",
          "This reset link is invalid. It may have already been used.",
      );
    }

    const tokenDoc = tokensSnapshot.docs[0];
    const tokenData = tokenDoc.data();

    // Check if token has been used
    if (tokenData.used) {
      console.log("Token already used:", tokenDoc.id);
      throw new functions.https.HttpsError(
          "failed-precondition",
          "This reset link has already been used. Please request a new one.",
      );
    }

    // Check if token has expired
    const expiresAt = tokenData.expiresAt.toDate();
    if (new Date() > expiresAt) {
      console.log("Token expired:", tokenDoc.id);
      // Delete expired token
      await tokenDoc.ref.delete();
      throw new functions.https.HttpsError(
          "deadline-exceeded",
          "This reset link has expired. Please request a new one.",
      );
    }

    // Token is valid - disable 2FA for the user
    const userId = tokenData.userId;
    const userRef = db.collection("users").doc(userId);

    await userRef.update({
      has2FA: false,
      secret2FA: admin.firestore.FieldValue.delete(),
      twoFactorDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
      twoFactorDisabledReason: "email_reset",
    });

    // Delete the used token
    await tokenDoc.ref.delete();

    console.log("2FA reset successful for user:", userId);
    return {success: true, message: "2FA has been reset successfully"};
  } catch (error) {
    // Re-throw HttpsErrors as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("2FA confirmation error:", error);
    throw new functions.https.HttpsError(
        "internal",
        "An error occurred processing your request",
    );
  }
});