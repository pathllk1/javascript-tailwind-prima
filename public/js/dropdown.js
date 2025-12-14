// Client-side JavaScript for dropdown menu functionality

// Store handler references globally so we can remove them properly
const dropdownHandlers = {
  buttonClick: null,
  documentClick: null,
  escapeKey: null,
  menuItemClick: null
};

// Create a reusable function for initialization
function initializeDropdown() {
  // Get the dropdown button and menu
  const userMenuButton = document.getElementById('user-menu-button');
  const userMenu = document.getElementById('user-menu');
  
  // Check if elements exist (only on pages where user is logged in)
  if (!userMenuButton || !userMenu) return;
  
  // Remove old event listeners to prevent duplicates
  if (dropdownHandlers.buttonClick) {
    userMenuButton.removeEventListener('click', dropdownHandlers.buttonClick);
  }
  if (dropdownHandlers.documentClick) {
    document.removeEventListener('click', dropdownHandlers.documentClick);
  }
  if (dropdownHandlers.escapeKey) {
    document.removeEventListener('keydown', dropdownHandlers.escapeKey);
  }
  // FIXED: Check if userMenu exists before querying for menu items
  if (dropdownHandlers.menuItemClick && userMenu) {
    // Remove menu item click listeners
    const menuItems = userMenu.querySelectorAll('[role="menuitem"]');
    menuItems.forEach(item => {
      item.removeEventListener('click', dropdownHandlers.menuItemClick);
    });
  }
  
  // Create new handler functions
  dropdownHandlers.buttonClick = function(e) {
    e.stopPropagation();
    userMenu.classList.toggle('hidden');
  };
  
  dropdownHandlers.documentClick = function(e) {
    if (!userMenuButton.contains(e.target) && !userMenu.contains(e.target)) {
      userMenu.classList.add('hidden');
    }
  };
  
  dropdownHandlers.escapeKey = function(e) {
    if (e.key === 'Escape') {
      userMenu.classList.add('hidden');
    }
  };
  
  // NEW: Handler for menu item clicks to ensure dropdown closes
  dropdownHandlers.menuItemClick = function(e) {
    // Close the dropdown immediately when a menu item is clicked
    userMenu.classList.add('hidden');
  };
  
  // Add new event listeners
  userMenuButton.addEventListener('click', dropdownHandlers.buttonClick);
  document.addEventListener('click', dropdownHandlers.documentClick);
  document.addEventListener('keydown', dropdownHandlers.escapeKey);
  
  // NEW: Add click listeners to menu items to ensure dropdown closes
  // FIXED: Check if userMenu exists before querying for menu items
  if (userMenu) {
    const menuItems = userMenu.querySelectorAll('[role="menuitem"]');
    menuItems.forEach(item => {
      item.addEventListener('click', dropdownHandlers.menuItemClick);
    });
  }
}

// Initialize on first load
document.addEventListener('DOMContentLoaded', initializeDropdown);

// Re-initialize after silent navigation
window.addEventListener('page-changed', (e) => {
  const { url } = e.detail;
  setTimeout(initializeDropdown, 50);
});