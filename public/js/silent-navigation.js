/**
 * Silent Navigation System
 * Enables AJAX-based page transitions without full page reloads
 * Uses History API for URL management
 */

class SilentNavigator {
  constructor() {
    this.currentUrl = window.location.pathname;
    this.isNavigating = false;
    this.init();
  }

  init() {
    // Intercept all navigation links (but not form submissions)
    document.addEventListener('click', (e) => this.handleLinkClick(e), true);
    
    // Prevent form submission interception - let forms submit normally
    document.addEventListener('submit', (e) => {
      // Allow all form submissions to proceed normally
      return true;
    }, false);
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', (e) => this.handlePopState(e));
    
    // Initialize existing scripts after page load
    this.initializePageScripts();
  }

  handleLinkClick(e) {
    const link = e.target.closest('a');
    
    if (!link) return;
    
    // Do NOT intercept if this is inside a form
    if (link.closest('form')) return;
    
    const href = link.getAttribute('href');
    
    // Skip if:
    // - No href
    // - External links
    // - Anchor links
    // - Links with data-no-navigate attribute
    // - Auth routes (logout, login, signup)
    if (
      !href ||
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.startsWith('#') ||
      link.hasAttribute('data-no-navigate') ||
      href.includes('/auth/')
    ) {
      return;
    }

    e.preventDefault();
    this.navigateTo(href);
  }

  async navigateTo(url) {
    if (this.isNavigating || url === this.currentUrl) return;

    this.isNavigating = true;
    
    try {
      // Show loading state
      this.showLoadingState();

      // Fetch the page content
      const response = await fetch(url, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/html'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();

      // Parse the response
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract content from main element
      const newContent = doc.querySelector('main');
      const currentContent = document.querySelector('main');

      if (!newContent) {
        // Fallback to full page reload if main not found
        window.location.href = url;
        return;
      }

      // Update title
      document.title = doc.title;

      // Fade out animation
      currentContent.style.opacity = '0';
      currentContent.style.transition = 'opacity 0.3s ease-out';

      await new Promise(resolve => setTimeout(resolve, 300));

      // Replace content
      currentContent.innerHTML = newContent.innerHTML;
      currentContent.style.opacity = '1';
      currentContent.style.transition = 'opacity 0.3s ease-in';

      // Update URL
      window.history.pushState({ url }, '', url);
      this.currentUrl = url;

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Re-initialize page scripts
      this.initializePageScripts();

      // Dispatch custom event for other scripts
      window.dispatchEvent(new CustomEvent('page-changed', { detail: { url } }));

    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to full page reload
      window.location.href = url;
    } finally {
      this.isNavigating = false;
      this.hideLoadingState();
    }
  }

  handlePopState(e) {
    const url = window.location.pathname;
    if (url !== this.currentUrl) {
      this.navigateTo(url);
    }
  }

  showLoadingState() {
    // Create or show loading indicator
    let loader = document.getElementById('page-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'page-loader';
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #a855f7);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = 'block';
  }

  hideLoadingState() {
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.display = 'none';
      }, 500);
    }
  }

  initializePageScripts() {
    // Re-initialize scripts that depend on DOM
    this.reinitializeTimer();
    // NOTE: Dropdown is re-initialized by dropdown.js via page-changed event
    // Do NOT call reinitializeDropdown() here as it would add duplicate listeners
    this.reinitializeAuth();
    this.reinitializeExcel();
  }

  reinitializeExcel() {
    // Re-initialize Excel handlers if on Excel page
    if (window.location.pathname.includes('/excel')) {
      if (window.initializeExcelHandlers) {
        window.initializeExcelHandlers();
      }
    }
  }

  reinitializeTimer() {
    const timerContainer = document.getElementById('timer-container');
    if (timerContainer && window.initializeTimer) {
      window.initializeTimer();
    }
  }

  // NOTE: reinitializeDropdown() removed - dropdown.js handles its own re-initialization
  // via the page-changed event listener to avoid duplicate event listeners

  reinitializeAuth() {
    // Re-initialize any auth-related functionality
    if (window.initializeAuth) {
      window.initializeAuth();
    }
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      width: 0;
    }
    to {
      width: 100%;
    }
  }

  main {
    transition: opacity 0.3s ease;
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SilentNavigator();
  });
} else {
  new SilentNavigator();
}
