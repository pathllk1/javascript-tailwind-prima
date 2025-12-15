const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { csrfProtection, csrfTokenMiddleware } = require('../middleware/csrfMiddleware');

// Apply authentication middleware to all routes in this file
router.use(authenticate);

// Apply CSRF protection to all routes
router.use(csrfProtection);
router.use(csrfTokenMiddleware);

// Excel automation routes
const excelRoutes = require('./excel-automation/excelRoutes');
router.use('/excel', excelRoutes);
// Profile page
router.get('/profile', (req, res) => {
  // Check for success messages
  const success = req.query.login_success === 'true' ? 'You have been logged in successfully!' : null;
  
  res.render('pages/profile', { 
    title: 'User Profile', 
    user: req.user,
    tokenExpiration: req.tokenExpiration,
    csrfToken: res.locals.csrfToken,
    success: success
  });
});

// Settings page
router.get('/settings', (req, res) => {
  res.render('pages/settings', { 
    title: 'Account Settings', 
    user: req.user,
    tokenExpiration: req.tokenExpiration,
    csrfToken: res.locals.csrfToken
  });
});

module.exports = router;