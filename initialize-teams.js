// initialize-teams.js
// This script initializes the teams collection with the initial set of teams

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Initialize the teams collection with predefined teams
 * This function should be run only once by an administrator
 */
async function initializeTeams() {
  try {
    // Check if teams already exist
    const teamsRef = collection(db, 'teams');
    const teamsSnapshot = await getDocs(teamsRef);
    
    if (!teamsSnapshot.empty) {
      console.log('Teams collection is not empty. Initialization skipped to avoid duplicates.');
      return false;
    }
    
    // Initial teams to create
    const initialTeams = [
      {
        name: "Ambulance Paramedics",
        description: "Qualified paramedics providing ambulance-based care",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Ambulance Crew",
        description: "Crew members supporting ambulance operations",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Cycle Crew",
        description: "Emergency response on bicycles",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Doctors (Static points only)",
        description: "Medical doctors stationed at fixed locations",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Nurses (Static points only)",
        description: "Nursing staff stationed at fixed locations",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Responders",
        description: "First responders providing initial emergency care",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Stages",
        description: "Medical staff stationed at event stages",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Stages Team Leaders",
        description: "Leadership personnel for stage medical teams",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Medcomms Clinical Supervisor",
        description: "Clinical oversight for medical communications",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Medcomms Dispatcher",
        description: "Resource allocation and dispatch personnel",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Medcomms Call Taker",
        description: "Staff receiving and processing emergency calls",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Medcomms Other",
        description: "Additional medical communications support staff",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: "Make Ready crew",
        description: "Staff responsible for equipment preparation and maintenance",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];
    
    // Add each team to the collection
    for (const team of initialTeams) {
      await addDoc(collection(db, 'teams'), team);
      console.log(`Created team: ${team.name}`);
    }
    
    console.log('Teams initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing teams:', error);
    return false;
  }
}

/**
 * Update user schema to include teams field
 * This should be run by an administrator to ensure all users have the teams array
 */
async function updateUserSchema() {
  try {
    // Get all users without a teams field
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('teams', '==', null));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log('All users already have the teams field. Schema update skipped.');
      return true;
    }
    
    let updateCount = 0;
    const updatePromises = [];
    
    usersSnapshot.forEach(doc => {
      updatePromises.push(
        updateDoc(doc.ref, {
          teams: []
        })
      );
      updateCount++;
    });
    
    await Promise.all(updatePromises);
    console.log(`Updated ${updateCount} users with teams field.`);
    
    return true;
  } catch (error) {
    console.error('Error updating user schema:', error);
    return false;
  }
}

// Export functions
export {
  initializeTeams,
  updateUserSchema
};