// Client-side JavaScript for access token expiration timer

document.addEventListener('DOMContentLoaded', function() {
  // Timer element
  const timerElement = document.createElement('div');
  timerElement.id = 'token-timer';
  timerElement.className = 'px-2 py-1 bg-white bg-opacity-20 rounded text-sm font-mono flex items-center justify-center';
  timerElement.style.display = 'none'; // Hidden by default
  timerElement.textContent = '15:00'; // Default text
  timerElement.style.minWidth = '56px'; // Ensure consistent width for MM:SS format
  timerElement.style.fontFamily = 'monospace'; // Ensure monospace font
  
  // Insert timer element in the timer container
  const timerContainer = document.getElementById('timer-container');
  
  if (timerContainer) {
    timerContainer.appendChild(timerElement);
  }
  
  // Function to update the timer display
  function updateTimerDisplay(expirationTime) {
    const now = Date.now();
    const timeLeft = expirationTime - now;
    
    if (timeLeft <= 0) {
      timerElement.textContent = 'EXPIRED';
      timerElement.className = 'px-2 py-1 bg-red-500 rounded text-sm font-mono flex items-center justify-center';
      return;
    }
    
    // Calculate minutes and seconds
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    // Format as MM:SS
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update color based on time left
    if (minutes < 2) {
      timerElement.className = 'px-2 py-1 bg-red-500 rounded text-sm font-mono flex items-center justify-center';
    } else if (minutes < 5) {
      timerElement.className = 'px-2 py-1 bg-yellow-500 rounded text-sm font-mono flex items-center justify-center';
    } else {
      timerElement.className = 'px-2 py-1 bg-blue-500 bg-opacity-20 rounded text-sm font-mono flex items-center justify-center';
    }
  }
  
  // Function to refresh token via AJAX
  async function refreshToken() {
    try {
      const response = await fetch('/auth/refresh-token', {
        method: 'POST',
        credentials: 'same-origin', // Include cookies in the request
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token refreshed successfully:', data.message);
        // Use the actual expiration time from the server response
        const newExpiration = data.expiration;
        // Update the timer with the new expiration time
        accessTokenExpiration = newExpiration;
        // Dispatch a custom event to notify other parts of the app
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { expiration: newExpiration } }));
      } else {
        console.error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }
  
  // Function to start the timer
  function startTimer() {
    // Try to get the actual token expiration time from a data attribute
    // This would be set by the server in the template
    const timerContainer = document.getElementById('timer-container');
    const expirationTimestamp = timerContainer ? timerContainer.dataset.expiration : null;
    
    let accessTokenExpiration;
    
    if (expirationTimestamp) {
      // Use the actual expiration time from the server
      accessTokenExpiration = parseInt(expirationTimestamp, 10);
      
      // Validate that the parsed time is a valid number
      if (isNaN(accessTokenExpiration) || accessTokenExpiration <= 0) {
        // Fallback to 15 minutes from now
        accessTokenExpiration = Date.now() + (15 * 60 * 1000); // 15 minutes from now
      }
    } else {
      // Fallback to 15 minutes from now
      accessTokenExpiration = Date.now() + (15 * 60 * 1000); // 15 minutes from now
    }
    
    // Listen for token refresh events
    window.addEventListener('tokenRefreshed', function(event) {
      accessTokenExpiration = event.detail.expiration;
    });
    
    // Show the timer
    timerElement.style.display = 'flex';
    
    // Update immediately
    updateTimerDisplay(accessTokenExpiration);
    
    // Update every second
    const timerInterval = setInterval(() => {
      updateTimerDisplay(accessTokenExpiration);
      
      // Refresh token 1 minute before expiration
      const timeUntilExpiration = accessTokenExpiration - Date.now();
      if (timeUntilExpiration <= 60000 && timeUntilExpiration > 59000) { // 1 minute before expiration
        // Try to refresh the token proactively
        refreshToken();
      }
      
      // Emergency refresh if token has expired
      if (timeUntilExpiration <= 0) {
        clearInterval(timerInterval);
        // Try to refresh the token automatically when it expires
        refreshToken();
      }
    }, 1000);
  }
  
  // Start timer if user is authenticated
  const userMenu = document.getElementById('user-menu-button');
  
  if (userMenu) {
    startTimer();
  }
});