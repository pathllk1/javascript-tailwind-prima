const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { csrfProtection } = require('../middleware/csrfMiddleware');

// Apply authentication middleware to all routes in this file
router.use(authenticate);

// Apply CSRF protection to all routes
router.use(csrfProtection);

// Profile page
router.get('/profile', (req, res) => {
  res.render('pages/profile', { 
    title: 'User Profile', 
    user: req.user,
    tokenExpiration: req.tokenExpiration
  });
});

// Settings page
router.get('/settings', (req, res) => {
  res.render('pages/settings', { 
    title: 'Account Settings', 
    user: req.user,
    tokenExpiration: req.tokenExpiration
  });
});

module.exports = router;