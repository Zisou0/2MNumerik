const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { checkConnection, authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', checkConnection, validateRegistration, AuthController.register);
router.post('/login', checkConnection, validateLogin, AuthController.login);

// Protected routes
router.get('/profile', checkConnection, authenticateToken, AuthController.getProfile);
router.post('/logout', checkConnection, authenticateToken, AuthController.logout);

module.exports = router;
