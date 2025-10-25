// This file contains the modified email sending function for event-management.html

// Function to modify the button text and behavior
function modifyEmailButton() {
  // Find the button in the modal
  const prepareMessageBtn = document.getElementById('prepareMessageBtn');
  
  if (prepareMessageBtn) {
    // Change the button text and icon
    prepareMessageBtn.innerHTML = '<i class="bi bi-send"></i> Send Emails';
    
    // Remove the old click handler and add the new one
    prepareMessageBtn.removeEventListener('click', prepareEmailDetails);
    prepareMessageBtn.addEventListener('click', sendEmails);
  }
}

// New function to send emails directly
async function sendEmails() {
  const messageTarget = document.querySelector('input[name="messageTarget"]:checked')?.value || 'selected';
  const subject = document.getElementById('messageSubject')?.value?.trim() || '';
  const content = document.getElementById('messageContent')?.value?.trim() || '';
  
  if (!subject) {
    showAlert('Please enter a subject', 'warning');
    return;
  }
  
  if (!content) {
    showAlert('Please enter a message', 'warning');
    return;
  }
  
  let targetVolunteers = [];
  
  switch (messageTarget) {
    case 'selected':
      targetVolunteers = currentEventVolunteers.filter(v => v.selected);
      break;
    case 'notSelected':
      targetVolunteers = currentEventVolunteers.filter(v => !v.selected);
      break;
    case 'all':
      targetVolunteers = currentEventVolunteers;
      break;
  }
  
  if (targetVolunteers.length === 0) {
    showAlert('No volunteers found for the selected target group', 'warning');
    return;
  }
  
  // Show loading state
  const sendBtn = document.getElementById('prepareMessageBtn');
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
  
  try {
    let successCount = 0;
    let errorCount = 0;
    const errorMessages = [];
    
    // Process each volunteer individually
    for (const volunteer of targetVolunteers) {
      try {
        // Skip if no email address
        if (!volunteer.email) {
          errorCount++;
          continue;
        }
        
        // Get first name (first word of name or "Member" if not available)
        const firstName = volunteer.name ? volunteer.name.split(' ')[0] : 'Member';
        
        // Personalize content with first name
        const personalizedContent = content.replace('Dear Member,', `Dear ${firstName},`);
        
        // Send email to volunteer and a copy to prehospital
        await addDoc(collection(db, 'mail'), {
          to: [
            volunteer.email,
            { email: 'prehospital@festival-medical.org', name: 'COPY EMAIL' }
          ],
          message: {
            subject: subject,
            text: personalizedContent,
            html: personalizedContent.replace(/\n/g, '<br>')
          }
        });
        
        successCount++;
      } catch (err) {
        console.error(`Error sending email to ${volunteer.email}:`, err);
        errorCount++;
        errorMessages.push(`${volunteer.email}: ${err.message}`);
      }
    }
    
    // Prepare result message
    let resultMessage = '';
    if (successCount > 0) {
      resultMessage = `Successfully sent ${successCount} email${successCount !== 1 ? 's' : ''}`;
    }
    if (errorCount > 0) {
      resultMessage += resultMessage ? ' with ' : '';
      resultMessage += `${errorCount} error${errorCount !== 1 ? 's' : ''}`;
    }
    
    // Show appropriate alert
    if (errorCount === 0) {
      showAlert(resultMessage + '!', 'success');
      
      // Close the modal after success
      const modalEl = document.getElementById('messageVolunteersModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    } else if (successCount > 0) {
      showAlert(resultMessage + '. Check console for details.', 'warning');
      console.error('Email sending errors:', errorMessages);
    } else {
      showAlert('Failed to send emails. Check console for details.', 'danger');
      console.error('Email sending errors:', errorMessages);
    }
    
  } catch (error) {
    console.error('Error in email sending process:', error);
    showAlert(`Error sending emails: ${error.message}`, 'danger');
  } finally {
    // Reset button state
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="bi bi-send"></i> Send Emails';
  }
}

// Function to initialize the email modifications
function initEmailModifications() {
  // Wait for DOM to be fully loaded
  window.addEventListener('DOMContentLoaded', function() {
    // Run with a slight delay to ensure all event handlers are attached
    setTimeout(modifyEmailButton, 1000);
  });
  
  // Try to modify immediately in case DOM is already loaded
  modifyEmailButton();
}

// Initialize the modifications
initEmailModifications();
