// events-card.js
// This component will render an events card for the dashboard
// It will show either a link to the events page, or display events the user has volunteered for

// This function is exported and will be used in dashboard.html
async function renderEventsCard(container, auth, db, firebaseFunctions) {
  const { collection, query, where, getDocs, getDoc, doc } = firebaseFunctions;
  
  // Get the current user and check if they've volunteered for any events
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('User not authenticated');
      return;
    }

    // Create the card container
    const eventsCard = document.createElement('div');
    eventsCard.className = 'dashboard-card';
    eventsCard.id = 'eventsCard';
    
    // Set the loading state
    eventsCard.innerHTML = `
      <h3 class="mb-4"><i class="bi bi-calendar-event"></i> Events</h3>
      <div class="text-center py-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading events...</p>
      </div>
    `;
    
    // Add the card to the container
    container.appendChild(eventsCard);
    
    // Check if the user has volunteered for any events
    const volunteerQuery = query(
      collection(db, 'eventVolunteers'),
      where('userId', '==', currentUser.uid)
    );
    
    const volunteerSnapshot = await getDocs(volunteerQuery);
    
    // If the user hasn't volunteered for any events, show a link to the events page
    if (volunteerSnapshot.empty) {
      eventsCard.innerHTML = `
        <h3 class="mb-4"><i class="bi bi-calendar-event"></i> Events</h3>
        <p class="mb-4">You haven't volunteered for any events yet. Check out the available events and volunteer opportunities.</p>
        <div class="text-center">
          <a href="events.html" class="btn btn-primary">
            <i class="bi bi-calendar-plus"></i> View & Volunteer for Events
          </a>
        </div>
      `;
      return;
    }
    
    // If the user has volunteered for events, load and display them
    const myEvents = [];
    
    for (const volunteerDoc of volunteerSnapshot.docs) {
      const volunteerData = volunteerDoc.data();
      const eventId = volunteerData.eventId;
      
      // Get the event details
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      
      if (eventDoc.exists()) {
        myEvents.push({
          id: eventDoc.id,
          ...eventDoc.data(),
          volunteerStatus: volunteerData.selected ? 'selected' : 'volunteered',
          volunteeredAt: volunteerData.volunteeredAt,
          selectedAt: volunteerData.selectedAt,
          notes: volunteerData.notes || ''
        });
      }
    }
    
    // Sort events by start date (soonest first)
    myEvents.sort((a, b) => {
      const dateA = a.startDate?.toDate() || new Date(0);
      const dateB = b.startDate?.toDate() || new Date(0);
      return dateA - dateB;
    });
    
    // Format a date object to a readable string
    function formatDate(date) {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    
    // Display the events
    let eventsList = '';
    myEvents.forEach(event => {
      const startDate = event.startDate?.toDate ? formatDate(event.startDate.toDate()) : 'TBD';
      const endDate = event.endDate?.toDate ? formatDate(event.endDate.toDate()) : 'TBD';
      const dateDisplay = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
      
      // Determine appropriate badge class based on status
      let badgeClass, badgeText;
      if (event.volunteerStatus === 'selected') {
        badgeClass = 'approved-badge'; // Using the same style as approved profiles
        badgeText = 'Selected';
      } else {
        badgeClass = 'pending-badge'; // Using the same style as pending profiles
        badgeText = 'Volunteered';
      }
      
      eventsList += `
        <div class="card mb-3 border-0 shadow-sm">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title mb-1">${event.name}</h5>
              <span class="${badgeClass}">${badgeText}</span>
            </div>
            <p class="card-text mb-1"><i class="bi bi-geo-alt"></i> ${event.location || 'Location TBD'}</p>
            <p class="card-text mb-2"><i class="bi bi-calendar-date"></i> ${dateDisplay}</p>
            ${event.notes ? `<p class="card-text text-muted small fst-italic">Your notes: "${event.notes}"</p>` : ''}
          </div>
        </div>
      `;
    });
    
    eventsCard.innerHTML = `
      <h3 class="mb-4"><i class="bi bi-calendar-event"></i> Events</h3>
      <div class="mb-4">
        ${eventsList}
      </div>
      <div class="text-center">
        <a href="events.html" class="btn btn-primary">
          <i class="bi bi-calendar-plus"></i> View More Events
        </a>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading events card:', error);
    
    // Show error state
    if (document.getElementById('eventsCard')) {
      document.getElementById('eventsCard').innerHTML = `
        <h3 class="mb-4"><i class="bi bi-calendar-event"></i> Events</h3>
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> Error loading events. Please refresh the page.
        </div>
        <div class="text-center">
          <a href="events.html" class="btn btn-primary">
            <i class="bi bi-calendar-plus"></i> Go to Events Page
          </a>
        </div>
      `;
    }
  }
}

export { renderEventsCard };