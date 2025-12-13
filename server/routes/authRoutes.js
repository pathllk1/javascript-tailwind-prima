const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

// GET routes
router.get('/login', authController.loginPage);
router.get('/signup', authController.signupPage);
router.get('/logout', authController.logout);

// POST routes
router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;