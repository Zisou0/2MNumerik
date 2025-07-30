const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');
const { authenticateToken, checkConnection } = require('../middleware/auth');

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Export database route (admin only - handled in controller)
router.get('/database', ExportController.exportDatabase);

module.exports = router;
