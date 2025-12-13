// Client-side JavaScript for authentication UI interactions

document.addEventListener('DOMContentLoaded', function() {
  // Toggle password visibility
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      this.textContent = type === 'password' ? 'Show' : 'Hide';
    });
  });
  
  // Form validation
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      if (!email || !password) {
        e.preventDefault();
        alert('Please fill in all fields');
      }
    });
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
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
    });
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
});