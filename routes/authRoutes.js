// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET stranice
router.get('/login', authController.getLoginPage);
router.get('/register', authController.getRegisterPage);

// POST forme
router.post('/login', authController.login);
router.post('/register', authController.register);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
