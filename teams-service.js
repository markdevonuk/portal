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

// SAFE Firebase initialization using try-catch
let app;
let internalDb;
let internalAuth;

try {
  app = initializeApp(firebaseConfig);
  internalAuth = getAuth(app);
  internalDb = getFirestore(app);
} catch (e) {
  // Firebase already initialized elsewhere
  if (e.code === 'app/duplicate-app' || e.message.includes('already exists')) {
    internalAuth = getAuth();
    internalDb = getFirestore();
  } else {
    throw e;
  }
}

/**
 * Get all teams from the database
 * @param {Object} [dbParam] - Optional Firestore database instance (uses internal if not provided)
 * @returns {Promise<Array>} Array of team objects with IDs
 */
async function getAllTeams(dbParam) {
  const db = dbParam || internalDb;
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
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<Object|null>} The team data or null if not found
 */
async function getTeamById(teamId, dbParam) {
  const db = dbParam || internalDb;
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
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<string>} The ID of the new team
 */
async function createTeam(teamData, dbParam) {
  const db = dbParam || internalDb;
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
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<void>}
 */
async function updateTeam(teamId, teamData, dbParam) {
  const db = dbParam || internalDb;
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
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<void>}
 */
async function deleteTeam(teamId, dbParam) {
  const db = dbParam || internalDb;
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
 * @param {string} teamId - The team ID
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<Array>} Array of user objects with IDs
 */
async function getUsersInTeam(teamId, dbParam) {
  const db = dbParam || internalDb;
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('teams', 'array-contains', teamId));
    const usersSnapshot = await getDocs(usersQuery);
    
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort users by name
    users.sort((a, b) => {
      // First by surname if available
      if (a.surname && b.surname) {
        return a.surname.localeCompare(b.surname);
      }
      // Then by firstName
      return a.firstName.localeCompare(b.firstName);
    });
    
    return users;
  } catch (error) {
    console.error("Error getting users in team:", error);
    throw error;
  }
}

/**
 * Add a user to a team
 * @param {string} userId - The user ID
 * @param {string} teamId - The team ID
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<void>}
 */
async function addUserToTeam(userId, teamId, dbParam) {
  const db = dbParam || internalDb;
  try {
    await updateDoc(doc(db, 'users', userId), {
      teams: arrayUnion(teamId)
    });
  } catch (error) {
    console.error("Error adding user to team:", error);
    throw error;
  }
}

/**
 * Remove a user from a team
 * @param {string} userId - The user ID
 * @param {string} teamId - The team ID
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<void>}
 */
async function removeUserFromTeam(userId, teamId, dbParam) {
  const db = dbParam || internalDb;
  try {
    await updateDoc(doc(db, 'users', userId), {
      teams: arrayRemove(teamId)
    });
  } catch (error) {
    console.error("Error removing user from team:", error);
    throw error;
  }
}

/**
 * Get all teams a user belongs to
 * @param {string} userId - The user ID
 * @param {Object} [dbParam] - Optional Firestore database instance
 * @returns {Promise<Array>} Array of team objects with IDs
 */
async function getUserTeams(userId, dbParam) {
  const db = dbParam || internalDb;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return [];
    }
    
    const userData = userSnap.data();
    
    // If user doesn't have teams array, initialize it
    if (!userData.teams) {
      await updateDoc(userRef, {
        teams: []
      });
      return [];
    }
    
    const teamIds = userData.teams || [];
    
    if (teamIds.length === 0) {
      return [];
    }
    
    const teams = [];
    for (const teamId of teamIds) {
      const team = await getTeamById(teamId, db);
      if (team) {
        teams.push(team);
      }
    }
    
    // Sort teams by name
    teams.sort((a, b) => a.name.localeCompare(b.name));
    
    return teams;
  } catch (error) {
    console.error("Error getting user teams:", error);
    throw error;
  }
}

export {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getUsersInTeam,
  addUserToTeam,
  removeUserFromTeam,
  getUserTeams
};