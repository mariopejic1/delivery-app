const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require("../middleware/auth");

router.get('/login', authController.getLoginPage);
router.get('/register', authController.getRegisterPage);

router.post('/login', authController.login);
router.post('/register', authController.register);

router.get('/logout', authController.logout);


module.exports = router;
