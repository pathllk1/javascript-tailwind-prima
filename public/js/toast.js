// Toast notification system
document.addEventListener('DOMContentLoaded', function() {
  // Initialize toast notifications
  initToastNotifications();
});

// Function to initialize toast notifications
function initToastNotifications() {
  // Auto-show toasts that are already rendered in the DOM
  const staticToasts = document.querySelectorAll('.toast-alert[data-message]:not([data-message=""])');
  staticToasts.forEach(toast => {
    // Auto-hide after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 5000);
  });
  
  // Show toasts from data attributes in hidden elements
  showToastsFromDataAttributes();
}

// Function to show toasts from data attributes
function showToastsFromDataAttributes() {
  // Get messages from hidden divs
  const successDiv = document.getElementById('success-message');
  const errorDiv = document.getElementById('error-message');
  
  // Show success toast if exists
  if (successDiv && successDiv.textContent.trim() !== '') {
    showToast(successDiv.textContent.trim(), 'success');
  }
  
  // Show error toast if exists
  if (errorDiv && errorDiv.textContent.trim() !== '') {
    showToast(errorDiv.textContent.trim(), 'error');
  }
}

// Function to create and show a toast notification
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-alert px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  
  toast.innerHTML = `
    <div class="flex items-center">
      <span class="flex-1">${message}</span>
      <button class="ml-4 text-white hover:text-gray-200 focus:outline-none">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    </div>
  `;
  
  // Add close functionality
  const closeButton = toast.querySelector('button');
  closeButton.addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  });
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 5000);
}

// Make showToast globally available
window.showToast = showToast;