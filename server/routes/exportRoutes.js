const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');
const { authenticateToken, checkConnection } = require('../middleware/auth');

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Export dashboard table route
router.get('/dashboard', ExportController.exportDashboardTable);

// Export tasks table route
router.get('/tasks', ExportController.exportTasksTable);

// Export database route (admin only - handled in controller)
router.get('/database', ExportController.exportDatabase);

module.exports = router;
