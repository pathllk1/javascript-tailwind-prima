const express = require('express');
const router = express.Router();
const publicController = require('../controller/publicController');
const { csrfProtection } = require('../middleware/csrfMiddleware');

// Apply CSRF protection to all routes
router.use(csrfProtection);

// Home page
router.get('/', publicController.home);

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', { 
    title: 'About Us', 
    user: req.user || null,
    tokenExpiration: req.tokenExpiration || null
  });
});

// Contact page
router.get('/contact', publicController.contact);
router.post('/contact', publicController.contactPost);

module.exports = router;