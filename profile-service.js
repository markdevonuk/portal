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
        status: "pending",
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
    await updateDoc(profileRef, {
      personalDetails: personalDetails
    });
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
    await updateDoc(profileRef, {
      driving: driving
    });
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
    await updateDoc(profileRef, {
      medicalQualifications: medicalQualifications
    });
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
    await updateDoc(profileRef, {
      "submission.agreedToTerms": agreedToTerms,
      "submission.submittedAt": serverTimestamp(),
      "adminUse.status": "pending"
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

// Export functions
export {
  getCurrentUserProfile,
  getUserProfile,
  createProfile,
  updatePersonalDetails,
  updateDriving,
  updateMedicalQualifications,
  submitProfile,
  reviewProfile
};
