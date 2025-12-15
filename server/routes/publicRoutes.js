const express = require('express');
const router = express.Router();
const publicController = require('../controller/publicController');
const { csrfProtection, csrfTokenMiddleware } = require('../middleware/csrfMiddleware');

// Home page (no CSRF protection needed for GET requests)
router.get('/', publicController.home);

// About page (no CSRF protection needed for GET requests)
router.get('/about', (req, res) => {
  res.render('pages/about', { 
    title: 'About Us', 
    user: req.user || null,
    tokenExpiration: req.tokenExpiration || null
  });
});

// Contact page (apply CSRF protection only to POST requests that modify data)
router.get('/contact', csrfTokenMiddleware, publicController.contact);
router.post('/contact', csrfProtection, publicController.contactPost);

module.exports = router;