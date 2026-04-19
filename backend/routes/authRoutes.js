const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Frontend eke idan ena POST requests
router.post('/register', authController.registerStudent);
router.post('/login', authController.loginUser);

module.exports = router;