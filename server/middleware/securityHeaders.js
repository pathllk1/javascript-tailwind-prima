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
        (req, res) => `'nonce-${res.locals.cspNonce}'`  // Use nonce for inline scripts
      ],
      
      // Style sources - allow self and inline styles (needed for TailwindCSS)
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",  // Required for TailwindCSS
        'https://fonts.googleapis.com'
      ],
      
      // Font sources
      fontSrc: [
        "'self'", 
        'https://fonts.gstatic.com',
        'data:'
      ],
      
      // Image sources
      imgSrc: [
        "'self'",
        'data:',
        'https://*'  // Allow images from any source (adjust as needed)
      ],
      
      // Connect sources for AJAX requests
      connectSrc: [
        "'self'",
        'http://localhost:*',     // For local development
        'https://localhost:*'     // For local development (HTTPS)
      ],
      
      // Object sources
      objectSrc: ["'none'"],
      
      // Media sources
      mediaSrc: ["'self'"],
      
      // Frame ancestors (for clickjacking protection)
      frameAncestors: ["'none'"],
      
      // Base URI
      baseUri: ["'self'"],
      
      // Form actions
      formAction: ["'self'"]
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
  noSniff: true
});

module.exports = securityHeaders;