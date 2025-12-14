// Client-side JavaScript for authentication UI interactions

function initializeAuth() {
  // Toggle password visibility
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  togglePasswordButtons.forEach(button => {
    // Remove old listener
    button.removeEventListener('click', handleTogglePassword);
    // Add new listener
    button.addEventListener('click', handleTogglePassword);
  });
  
  // Form validation
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  if (loginForm) {
    loginForm.removeEventListener('submit', handleLoginSubmit);
    loginForm.addEventListener('submit', handleLoginSubmit);
  }
  
  if (signupForm) {
    signupForm.removeEventListener('submit', handleSignupSubmit);
    signupForm.addEventListener('submit', handleSignupSubmit);
  }
  
  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => {
        alert.remove();
      }, 300);
    }, 5000);
  });
  
  // Event handler functions
  function handleTogglePassword() {
    const targetId = this.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? 'Show' : 'Hide';
  }
  
  function handleLoginSubmit(e) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      e.preventDefault();
      alert('Please fill in all fields');
    }
  }
  
  function handleSignupSubmit(e) {
    const name = document.getElementById('name').value;
    const uname = document.getElementById('uname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!name || !uname || !email || !password) {
      e.preventDefault();
      alert('Please fill in all fields');
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      e.preventDefault();
      alert('Please enter a valid email address');
    }
  }
}

// Initialize on first load
document.addEventListener('DOMContentLoaded', initializeAuth);

// Re-initialize after silent navigation
window.addEventListener('page-changed', (e) => {
  setTimeout(initializeAuth, 50);
});