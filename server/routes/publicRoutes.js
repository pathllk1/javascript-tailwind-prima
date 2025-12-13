const express = require('express');
const router = express.Router();
const publicController = require('../controller/publicController');

// GET routes
router.get('/', publicController.home);
router.get('/about', publicController.about);
router.get('/contact', publicController.contact);

// POST route for contact form
router.post('/contact', publicController.contactPost);

module.exports = router;
