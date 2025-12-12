Skip to content
Navigation Menu
markdevonuk
portal
 
Type / to search
Code
Issues
Pull requests
Actions
Projects
Wiki
Security
2
Insights
Settings
Files

t
css
functions
.DS_Store
.firebaserc
.gitignore
CNAME
README.md
admin-allowed-emails.html
admin-applicants.html
admin-delete-profile.html
admin-downloads.html
admin-edit-profile.html
admin-profiles.html
admin-user-management.html
admin.html
code.css
dashboard.html
edit.txt
email-test.html
event-management-email.js
event-management.html
events-card.js
events.html
firebase-config.js
firebase.json
index.html
joinfms.html
loader.js
login.html
payment-success.html
profile-service.js
profile.html
register.html
search-members.html
setup-2fa.html
team-assignment.html
team-management.html
teams-service.js
verify-2fa.html
portal
/teams-service.js
markdevonuk
markdevonuk
Set up teams
667db82
 · 
last month
portal
/teams-service.js

Code

Blame
288 lines (255 loc) · 6.68 KB
Older
Newer
markdevonuk
last month

Set up teams
// teams-service.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  doc,
  getDoc,
  getDocs,
  setDoc, 
  collection,
  query,
  where,
  arrayUnion,
  arrayRemove,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (if not already initialized elsewhere)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Get all teams from the database
 * @returns {Promise<Array>} Array of team objects with IDs
 */
async function getAllTeams() {
  try {
    const teamsRef = collection(db, 'teams');
    const teamsSnapshot = await getDocs(teamsRef);
    
    const teams = [];
    teamsSnapshot.forEach(doc => {
      teams.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort teams by name
    teams.sort((a, b) => a.name.localeCompare(b.name));
    
    return teams;
  } catch (error) {
    console.error("Error getting teams:", error);
    throw error;
  }
}

/**
 * Get a team by ID
 * @param {string} teamId - The team ID
 * @returns {Promise<Object|null>} The team data or null if not found
 */
async function getTeamById(teamId) {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      return {
        id: teamSnap.id,
        ...teamSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting team:", error);
    throw error;
  }
}

/**
 * Create a new team
 * @param {Object} teamData - Team data (name required)
 * @returns {Promise<string>} The ID of the new team
 */
async function createTeam(teamData) {
  try {
    if (!teamData.name || teamData.name.trim() === '') {
      throw new Error("Team name is required");
    }
    
    const newTeam = {
      name: teamData.name.trim(),
      description: teamData.description || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'teams'), newTeam);
    return docRef.id;
  } catch (error) {
    console.error("Error creating team:", error);
    throw error;
  }
}

/**
 * Update an existing team
 * @param {string} teamId - The team ID to update
 * @param {Object} teamData - The updated team data
 * @returns {Promise<void>}
 */
async function updateTeam(teamId, teamData) {
  try {
    if (!teamData.name || teamData.name.trim() === '') {
      throw new Error("Team name is required");
    }
    
    const updateData = {
      name: teamData.name.trim(),
      description: teamData.description || '',
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(doc(db, 'teams', teamId), updateData);
  } catch (error) {
    console.error("Error updating team:", error);
    throw error;
  }
}

/**
 * Delete a team
 * @param {string} teamId - The team ID to delete
 * @returns {Promise<void>}
 */
async function deleteTeam(teamId) {
  try {
    // Delete the team document
    await deleteDoc(doc(db, 'teams', teamId));
    
    // Update all users who are members of this team to remove it from their teams array
    const usersRef = collection(db, 'users');
    const usersWithTeamQuery = query(usersRef, where('teams', 'array-contains', teamId));
    const usersWithTeamSnapshot = await getDocs(usersWithTeamQuery);
    
    const updatePromises = [];
    usersWithTeamSnapshot.forEach(userDoc => {
      updatePromises.push(
        updateDoc(doc(db, 'users', userDoc.id), {
          teams: arrayRemove(teamId)
        })
      );
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error deleting team:", error);
    throw error;
  }
}

/**
 * Get users in a team
Blaming portal/teams-service.js at f9103f1f9b48165c9af8a52ecdacc2e5006c4171 · markdevonuk/portal