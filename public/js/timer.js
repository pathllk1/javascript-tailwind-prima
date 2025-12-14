// Client-side JavaScript for access token expiration timer

// Store timer interval globally so we can clear it on re-initialization
let timerInterval = null;
let timerElement = null;

function initializeTimer() {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Check if we're on a page where timer is needed
  const timerContainer = document.getElementById('timer-container');
  if (!timerContainer) return;
  
  // Create or get the timer element
  timerElement = document.getElementById('token-timer');
  if (!timerElement) {
    timerElement = document.createElement('div');
    timerElement.id = 'token-timer';
    timerElement.className = 'px-2 py-1 bg-white bg-opacity-20 rounded text-sm font-mono flex items-center justify-center';
    timerElement.style.display = 'none';
    timerElement.innerHTML = 'Time Remain for Timeout: <span id="time-value">15:00</span>';
    timerElement.style.minWidth = '56px';
    timerElement.style.fontFamily = 'monospace';
    timerContainer.appendChild(timerElement);
    
    // Add CSS for blinking animation (only once)
    if (!document.getElementById('timer-blink-style')) {
      const style = document.createElement('style');
      style.id = 'timer-blink-style';
      style.textContent = `
        @keyframes blink-animation {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        .blink {
          animation: blink-animation 1s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Function to update the timer display
  function updateTimerDisplay(expirationTime) {
    const now = Date.now();
    const timeLeft = expirationTime - now;
    
    if (timeLeft <= 0) {
      timerElement.innerHTML = 'EXPIRED';
      timerElement.className = 'px-2 py-1 bg-red-500 rounded text-sm font-mono flex items-center justify-center';
      return;
    }
    
    // Calculate minutes and seconds
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    // Format as "Time Remain for Timeout: MM:SS" with separate span for blinking
    const timeValue = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerElement.innerHTML = `Time Remain for Timeout: <span id="time-value">${timeValue}</span>`;
    
    // Get the time value span for blinking effect
    const timeValueSpan = document.getElementById('time-value');
    
    // Update color based on time left
    if (minutes < 2) {
      // Only the time value blinks when below 2 minutes
      timeValueSpan.className = 'blink';
      timerElement.className = 'px-2 py-1 bg-red-500 rounded text-sm font-mono flex items-center justify-center';
    } else if (minutes < 5) {
      // Remove blinking when above 2 minutes
      timeValueSpan.className = '';
      timerElement.className = 'px-2 py-1 bg-yellow-500 rounded text-sm font-mono flex items-center justify-center';
    } else {
      // Remove blinking when above 5 minutes
      timeValueSpan.className = '';
      timerElement.className = 'px-2 py-1 bg-blue-500 bg-opacity-20 rounded text-sm font-mono flex items-center justify-center';
    }
  }
  
  // Function to refresh token via AJAX
  async function refreshToken() {
    try {
      const response = await fetch('/auth/refresh-token', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token refreshed successfully:', data.message);
        const newExpiration = data.expiration;
        accessTokenExpiration = newExpiration;
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
    const expirationTimestamp = timerContainer ? timerContainer.dataset.expiration : null;
    
    let accessTokenExpiration;
    
    if (expirationTimestamp) {
      accessTokenExpiration = parseInt(expirationTimestamp, 10);
      if (isNaN(accessTokenExpiration) || accessTokenExpiration <= 0) {
        accessTokenExpiration = Date.now() + (15 * 60 * 1000);
      }
    } else {
      accessTokenExpiration = Date.now() + (15 * 60 * 1000);
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
    timerInterval = setInterval(() => {
      updateTimerDisplay(accessTokenExpiration);
      
      // Refresh token 1 minute before expiration
      const timeUntilExpiration = accessTokenExpiration - Date.now();
      if (timeUntilExpiration <= 60000 && timeUntilExpiration > 59000) {
        refreshToken();
      }
      
      // Emergency refresh if token has expired
      if (timeUntilExpiration <= 0) {
        clearInterval(timerInterval);
        refreshToken();
      }
    }, 1000);
  }
  
  // Start timer if user is authenticated
  const userMenu = document.getElementById('user-menu-button');
  if (userMenu) {
    startTimer();
  }
}

// Initialize on first load
document.addEventListener('DOMContentLoaded', initializeTimer);

// Re-initialize after silent navigation
window.addEventListener('page-changed', (e) => {
  setTimeout(initializeTimer, 50);
});