// Client-side interceptor for automated CSRF protection and token management
(function() {
  'use strict';

  // Store CSRF token globally
  let csrfToken = null;
  
  // Store token expiration time
  let accessTokenExpiration = null;
  
  // Flag to prevent multiple simultaneous refresh requests
  let isRefreshing = false;
  
  // Queue for requests that need to wait for token refresh
  let refreshQueue = [];

  /**
   * Initialize the interceptor
   */
  function init() {
    // Get CSRF token from meta tag if available
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
      csrfToken = csrfMeta.getAttribute('content');
    }
    
    // Get token expiration from meta tag if available
    const expirationMeta = document.querySelector('meta[name="token-expiration"]');
    if (expirationMeta) {
      accessTokenExpiration = parseInt(expirationMeta.getAttribute('content'), 10);
    }
    
    // Listen for token refresh events from timer.js
    window.addEventListener('tokenRefreshed', function(event) {
      accessTokenExpiration = event.detail.expiration;
      isRefreshing = false;
      
      // Reset refresh flag
      window.tokenRefreshTriggered = false;
      
      // Process queued requests
      processQueue();
    });
    
    // Override fetch and XMLHttpRequest
    overrideFetch();
    overrideXHR();
  }

  /**
   * Process queued requests after token refresh
   */
  function processQueue() {
    while (refreshQueue.length > 0) {
      const { resolve, reject, request } = refreshQueue.shift();
      
      // Retry the request
      if (request instanceof Request || typeof request === 'string') {
        // Fetch request
        fetch(request).then(resolve).catch(reject);
      } else {
        // XHR request - just call resolve to trigger the original send
        resolve();
      }
    }
  }

  /**
   * Add request to queue
   */
  function addToQueue(promiseExecutor) {
    return new Promise(promiseExecutor);
  }

  /**
   * Check if token needs refresh (1 minute before expiration)
   */
  function shouldRefreshToken() {
    if (!accessTokenExpiration) return false;
    
    const now = Date.now();
    const timeUntilExpiration = accessTokenExpiration - now;
    
    // Check if we're within 1 minute of expiration and haven't already triggered a refresh
    return timeUntilExpiration <= 60000 && timeUntilExpiration > 0 && !window.tokenRefreshTriggered;
  }

  /**
   * Refresh access token
   */
  async function refreshToken() {
    if (isRefreshing) {
      // Return a promise that will resolve when refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject, request: '/auth/refresh-token' });
      });
    }
    
    isRefreshing = true;
    
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
        accessTokenExpiration = data.expiration;
        isRefreshing = false;
        
        // Reset refresh flag
        window.tokenRefreshTriggered = false;
        
        // Process queued requests
        processQueue();
        
        // Dispatch event for timer.js to update
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { expiration: data.expiration } }));
        
        return Promise.resolve();
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      isRefreshing = false;
      // Reset refresh flag on error
      window.tokenRefreshTriggered = false;
      console.error('Error refreshing token:', error);
      
      // Process queue with errors
      while (refreshQueue.length > 0) {
        const { reject } = refreshQueue.shift();
        reject(error);
      }
      
      // Redirect to login
      window.location.href = '/auth/login';
      return Promise.reject(error);
    }
  }



  /**
   * Override fetch API
   */
  function overrideFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = function(input, init = {}) {
      // Convert input to Request object to easily access properties
      const request = new Request(input, init);
      
      // Add CSRF token for non-GET requests
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        // Clone the request to modify headers
        const newInit = Object.assign({}, init);
        newInit.headers = new Headers(init.headers || {});
        
        if (csrfToken) {
          newInit.headers.set('X-CSRF-Token', csrfToken);
        }
        
        // Create new request with modified headers
        const newRequest = new Request(request, newInit);
        
        // Check if token needs refresh
        if (shouldRefreshToken()) {
          return addToQueue((resolve, reject) => {
            refreshQueue.push({ resolve, reject, request: newRequest });
            refreshToken();
          });
        }
        
        return originalFetch(newRequest);
      }
      
      // For GET requests, check token refresh
      if (shouldRefreshToken()) {
        return addToQueue((resolve, reject) => {
          refreshQueue.push({ resolve, reject, request });
          refreshToken();
        });
      }
      
      return originalFetch(request);
    };
  }

  /**
   * Override XMLHttpRequest
   */
  function overrideXHR() {
    const originalXHR = window.XMLHttpRequest;
    
    // Store original methods
    const originalOpen = originalXHR.prototype.open;
    const originalSend = originalXHR.prototype.send;
    const originalSetRequestHeader = originalXHR.prototype.setRequestHeader;
    
    // Override the prototype methods directly
    originalXHR.prototype.open = function(method, url, async, user, password) {
      // Store config on the instance
      this._interceptorConfig = {
        method: method.toUpperCase(),
        url: url,
        headers: {},
        data: null
      };
      
      return originalOpen.call(this, method, url, async, user, password);
    };
    
    originalXHR.prototype.setRequestHeader = function(header, value) {
      // Store headers on the instance config
      if (this._interceptorConfig) {
        this._interceptorConfig.headers[header] = value;
      }
      return originalSetRequestHeader.call(this, header, value);
    };
    
    originalXHR.prototype.send = function(data) {
      if (this._interceptorConfig) {
        this._interceptorConfig.data = data;
        
        // Add CSRF token for non-GET requests
        if (this._interceptorConfig.method !== 'GET' && this._interceptorConfig.method !== 'HEAD') {
          if (csrfToken && !this._interceptorConfig.headers['X-CSRF-Token']) {
            this.setRequestHeader('X-CSRF-Token', csrfToken);
          }
        }
        
        // Check if token needs refresh
        if (shouldRefreshToken()) {
          // Queue the request and refresh token
          addToQueue((resolve, reject) => {
            refreshQueue.push({ 
              resolve: () => originalSend.call(this, data),
              reject: (error) => {
                this.dispatchEvent(new CustomEvent('error', { detail: error }));
              },
              request: Object.assign({}, this._interceptorConfig)
            });
            refreshToken();
          });
          return;
        }
      }
      
      return originalSend.call(this, data);
    };
  }

  /**
   * Public API
   */
  window.AuthInterceptor = {
    /**
     * Update CSRF token
     */
    updateCsrfToken: function(token) {
      csrfToken = token;
    },
    
    /**
     * Update token expiration
     */
    updateTokenExpiration: function(expiration) {
      accessTokenExpiration = expiration;
    },
    
    /**
     * Force token refresh
     */
    refreshToken: refreshToken
  };

  // Initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();