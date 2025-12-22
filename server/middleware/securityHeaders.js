const helmet = require('helmet');

// Security middleware with CSP configuration
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      // Default sources for most directives
      defaultSrc: ["'self'"],
      
      // Script sources - allow self and nonce-based inline scripts
      scriptSrc: [
        "'self'", 
        'http://*',
        'https://*',
        "'unsafe-inline'",       // Allow inline scripts (needed for some features)
        (req, res) => `'nonce-${res.locals.cspNonce}'`  // Use nonce for inline scripts
      ],
      
      // Style sources - allow self and inline styles (needed for TailwindCSS)
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",  // Required for TailwindCSS
        'http://*',
        'https://*'
      ],
      
      // Font sources
      fontSrc: [
        "'self'", 
        'http://*',
        'https://*',
        'data:'
      ],
      
      // Image sources
      imgSrc: [
        "'self'",
        'data:',
        'http://*',   // Allow images from any HTTP source
        'https://*'   // Allow images from any HTTPS source
      ],
      
      // Connect sources for AJAX requests
      connectSrc: [
        "'self'",
        'http://localhost:*',     // For local development
        'https://localhost:*',    // For local development (HTTPS)
        'http://*:*',             // For HTTP connections to any host in production
        'https://*:*',            // For HTTPS connections to any host in production
        'ws://*',                 // For WebSocket connections (HTTP)
        'wss://*'                 // For WebSocket connections (HTTPS)
      ],
      
      // Object sources
      objectSrc: ["'none'"],
      
      // Media sources
      mediaSrc: ["'self'"],
      
      // Frame ancestors (for clickjacking protection)
      frameAncestors: ["'self'"],
      
      // Allow iframes from any source
      frameSrc: ["'self'", 'http://*', 'https://*'],
      
      // Base URI
      baseUri: ["'self'"],
      
      // Form actions
      formAction: ["'self'"],
      
      // Worker sources
      workerSrc: ["'self'", 'blob:'],
      
      // Manifest sources
      manifestSrc: ["'self'", 'http://*', 'https://*'],
      
      // Child sources (for frames, workers, etc.)
      childSrc: ["'self'", 'http://*', 'https://*'],
      
      // Prefetch sources
      prefetchSrc: ["'self'", 'http://*', 'https://*'],
    }
  },
  
  // X-Content-Type-Options header to prevent MIME-type sniffing
  contentTypeOptions: true,
  
  // X-Frame-Options header to prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  
  // X-XSS-Protection header (legacy but still useful)
  xssFilter: true,
  
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'no-referrer'
  },
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // Internet Explorer compatibility
  ieNoOpen: true,
  noSniff: true,
  
  // Upgrade insecure requests
  upgradeInsecureRequests: true
});

module.exports = securityHeaders;