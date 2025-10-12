// profile-service.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (if not already initialized elsewhere)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Get the current user's profile
 * @returns {Promise<Object|null>} The profile data or null if no profile exists
 */
async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) {
    console.error("No user is signed in");
    return null;
  }
  
  return getUserProfile(user.uid);
}

/**
 * Get a user's profile by user ID
 * @param {string} userId - The user ID
 * @returns {Promise<Object|null>} The profile data or null if no profile exists
 */
async function getUserProfile(userId) {
  try {
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return profileSnap.data();
    } else {
      return null; // No profile exists
    }
  } catch (error) {
    console.error("Error getting profile:", error);
    throw error;
  }
}

/**
 * Create a new profile for the current user
 * @param {Object} profileData - Initial profile data
 * @returns {Promise<void>}
 */
async function createProfile(profileData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  
  try {
    // Ensure the profile has the required structure
    const newProfile = {
      personalDetails: profileData.personalDetails || {
        DOB: null,
        emergencyContact: ""
      },
      driving: profileData.driving || {
        c1Classification: false,
        dlNumber: "",
        niNumber: "",
        points: ""
      },
      medicalQualifications: profileData.medicalQualifications || {
        certExpiry: null,
        details: "",
        gmc: "",
        hcpc: "",
        nbc: "",
        qualification: ""
      },
      submission: {
        agreedToTerms: false,
        submittedAt: null
      },
      adminUse: {
        status: "draft", // Changed from "pending" to "draft"
        approvedBy: "",
        notes: "",
        reviewedAt: null
      }
    };
    
    // Create the profile document
    await setDoc(doc(db, 'profiles', user.uid), newProfile);
    console.log("Profile created successfully");
    
    return newProfile;
  } catch (error) {
    console.error("Error creating profile:", error);
    throw error;
  }
}

/**
 * Update personal details section of the profile
 * @param {Object} personalDetails - Updated personal details
 * @returns {Promise<void>}
 */
async function updatePersonalDetails(personalDetails) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    
    // Check if the profile exists
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      // Only update the status if it's not already set to a different value
      const profile = profileSnap.data();
      if (!profile.adminUse || profile.adminUse.status === "pending" || profile.adminUse.status === "") {
        await updateDoc(profileRef, {
          personalDetails: personalDetails,
          "adminUse.status": "draft" // Ensure draft status when saving without submitting
        });
      } else {
        // Just update the personal details without changing status
        await updateDoc(profileRef, {
          personalDetails: personalDetails
        });
      }
    } else {
      // Profile doesn't exist, create it
      await createProfile({ personalDetails: personalDetails });
    }
    
    console.log("Personal details updated successfully");
  } catch (error) {
    console.error("Error updating personal details:", error);
    throw error;
  }
}

/**
 * Update driving information section of the profile
 * @param {Object} driving - Updated driving information
 * @returns {Promise<void>}
 */
async function updateDriving(driving) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    
    // Check if the profile exists
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      // Only update the status if it's not already set to a different value
      const profile = profileSnap.data();
      if (!profile.adminUse || profile.adminUse.status === "pending" || profile.adminUse.status === "") {
        await updateDoc(profileRef, {
          driving: driving,
          "adminUse.status": "draft" // Ensure draft status when saving without submitting
        });
      } else {
        // Just update the driving details without changing status
        await updateDoc(profileRef, {
          driving: driving
        });
      }
    } else {
      // Profile doesn't exist, create it
      await createProfile({ driving: driving });
    }
    
    console.log("Driving information updated successfully");
  } catch (error) {
    console.error("Error updating driving information:", error);
    throw error;
  }
}

/**
 * Update medical qualifications section of the profile
 * @param {Object} medicalQualifications - Updated medical qualifications
 * @returns {Promise<void>}
 */
async function updateMedicalQualifications(medicalQualifications) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    
    // Check if the profile exists
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      // Only update the status if it's not already set to a different value
      const profile = profileSnap.data();
      if (!profile.adminUse || profile.adminUse.status === "pending" || profile.adminUse.status === "") {
        await updateDoc(profileRef, {
          medicalQualifications: medicalQualifications,
          "adminUse.status": "draft" // Ensure draft status when saving without submitting
        });
      } else {
        // Just update the medical qualifications without changing status
        await updateDoc(profileRef, {
          medicalQualifications: medicalQualifications
        });
      }
    } else {
      // Profile doesn't exist, create it
      await createProfile({ medicalQualifications: medicalQualifications });
    }
    
    console.log("Medical qualifications updated successfully");
  } catch (error) {
    console.error("Error updating medical qualifications:", error);
    throw error;
  }
}

/**
 * Submit the profile for review
 * @param {boolean} agreedToTerms - Whether the user has agreed to the terms
 * @returns {Promise<void>}
 */
async function submitProfile(agreedToTerms) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  
  if (!agreedToTerms) {
    throw new Error("You must agree to the terms to submit your profile");
  }
  
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    
    // Check if the profile has required fields before submitting
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      throw new Error("Profile doesn't exist. Please save your profile details first.");
    }
    
    // Update submission details and set status to pending
    await updateDoc(profileRef, {
      "submission.agreedToTerms": agreedToTerms,
      "submission.submittedAt": serverTimestamp(),
      "adminUse.status": "pending" // Explicitly set to pending only when submitted
    });
    
    console.log("Profile submitted for review successfully");
  } catch (error) {
    console.error("Error submitting profile:", error);
    throw error;
  }
}

/**
 * Admin function to review a user's profile
 * @param {string} userId - The user ID whose profile is being reviewed
 * @param {string} status - The review status (approved, rejected)
 * @param {string} notes - Admin notes about the review
 * @returns {Promise<void>}
 */
async function reviewProfile(userId, status, notes) {
  const admin = auth.currentUser;
  if (!admin) {
    throw new Error("No user is signed in");
  }
  
  try {
    // Note: Firestore rules should enforce admin status
    const profileRef = doc(db, 'profiles', userId);
    await updateDoc(profileRef, {
      "adminUse.status": status,
      "adminUse.approvedBy": admin.uid,
      "adminUse.notes": notes,
      "adminUse.reviewedAt": serverTimestamp()
    });
    console.log("Profile review updated successfully");
  } catch (error) {
    console.error("Error reviewing profile:", error);
    throw error;
  }
}

/**
 * Update a profile and reset it to pending status
 * @param {Object} updatedProfile - The updated profile data
 * @returns {Promise<void>}
 */
async function updateAndResubmitProfile(updatedProfile) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is signed in");
  }
  
  try {
    const profileRef = doc(db, 'profiles', user.uid);
    
    // Get existing profile to preserve notes
    const existingProfileSnap = await getDoc(profileRef);
    let adminNotes = "";
    
    if (existingProfileSnap.exists()) {
      const existingProfile = existingProfileSnap.data();
      
      // If there are existing admin notes, preserve them
      if (existingProfile.adminUse && existingProfile.adminUse.notes) {
        // Format current date for the note
        const currentDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit', 
          month: 'short', 
          year: 'numeric'
        });
        
        // If updatedProfile already has adminUse.notes, use that (from profile.html)
        // Otherwise, create a standard update note
        if (updatedProfile.adminUse && updatedProfile.adminUse.notes) {
          adminNotes = updatedProfile.adminUse.notes;
        } else {
          adminNotes = `${existingProfile.adminUse.notes}\n\nProfile updated by user on ${currentDate}. Requires review.`;
        }
      } else {
        // No existing notes, create a simple note about the update
        const currentDate = new Date().toLocaleDateString('en-GB', {
          day: '2-digit', 
          month: 'short', 
          year: 'numeric'
        });
        adminNotes = `Profile updated by user on ${currentDate}. Requires review.`;
      }
    }
    
    // Update profile with new data
    const updateData = {
      personalDetails: updatedProfile.personalDetails || {},
      driving: updatedProfile.driving || {},
      medicalQualifications: updatedProfile.medicalQualifications || {},
      "submission.submittedAt": serverTimestamp(),
      // Reset to pending status
      "adminUse.status": "pending",
      "adminUse.notes": adminNotes
    };
    
    await updateDoc(profileRef, updateData);
    
    console.log("Profile updated and resubmitted for review");
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

// Export functions
export {
  getCurrentUserProfile,
  getUserProfile,
  createProfile,
  updatePersonalDetails,
  updateDriving,
  updateMedicalQualifications,
  submitProfile,
  reviewProfile,
  updateAndResubmitProfile
};
