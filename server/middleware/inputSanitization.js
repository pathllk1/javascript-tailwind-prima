const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Set up DOMPurify for server-side sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Default sanitization options
const defaultOptions = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false
};

// Sanitize a single value
const sanitizeValue = (value, options = {}) => {
  if (typeof value !== 'string') {
    return value;
  }
  
  const sanitizeOptions = { ...defaultOptions, ...options };
  return DOMPurify.sanitize(value, sanitizeOptions);
};

// Middleware to sanitize user inputs
const inputSanitization = (req, res, next) => {
  // Sanitize body parameters
  if (req.body) {
    for (const key in req.body) {
      req.body[key] = sanitizeValue(req.body[key]);
    }
  }
  
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      req.query[key] = sanitizeValue(req.query[key]);
    }
  }
  
  // Sanitize route parameters
  if (req.params) {
    for (const key in req.params) {
      req.params[key] = sanitizeValue(req.params[key]);
    }
  }
  
  next();
};

module.exports = {
  inputSanitization,
  sanitizeValue
};