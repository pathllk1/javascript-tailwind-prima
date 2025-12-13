// Client-side JavaScript for dropdown menu functionality

document.addEventListener('DOMContentLoaded', function() {
  // Get the dropdown button and menu
  const userMenuButton = document.getElementById('user-menu-button');
  const userMenu = document.getElementById('user-menu');
  
  // Check if elements exist (only on pages where user is logged in)
  if (userMenuButton && userMenu) {
    // Toggle dropdown menu when button is clicked
    userMenuButton.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent event bubbling
      userMenu.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking anywhere else on the page
    document.addEventListener('click', function(e) {
      if (!userMenuButton.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.add('hidden');
      }
    });
    
    // Close dropdown when pressing Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        userMenu.classList.add('hidden');
      }
    });
  }
});