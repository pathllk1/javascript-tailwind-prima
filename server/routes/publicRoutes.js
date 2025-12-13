const express = require('express');
const router = express.Router();
const publicController = require('../controller/publicController');
const { csrfProtection } = require('../middleware/csrfMiddleware');

// GET routes (no CSRF protection needed)
router.get('/', publicController.home);
router.get('/about', publicController.about);
router.get('/contact', publicController.contact);

// POST route for contact form (with CSRF protection)
router.post('/contact', csrfProtection, publicController.contactPost);

module.exports = router;