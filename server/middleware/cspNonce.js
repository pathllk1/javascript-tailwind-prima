const crypto = require('crypto');

// Middleware to generate CSP nonce for each request
const cspNonce = (req, res, next) => {
  // Generate a random nonce for this request
  res.locals.cspNonce = crypto.randomBytes(32).toString('hex');
  next();
};

module.exports = cspNonce;