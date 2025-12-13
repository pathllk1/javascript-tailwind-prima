const csrf = require('csurf');

// CSRF protection middleware for forms that need protection
// Note: Public routes like login/signup should not use CSRF protection
// as guests don't have tokens yet
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  }
});

// Middleware to add CSRF token to locals for views
// Only used when CSRF protection is active on specific routes
const csrfTokenMiddleware = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  next();
};

module.exports = {
  csrfProtection,
  csrfTokenMiddleware
};