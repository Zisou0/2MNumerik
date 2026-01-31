const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');
const { authenticateToken, checkConnection } = require('../middleware/auth');

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Middleware to extend timeout for export routes (5 minutes)
const extendTimeout = (req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000); // 5 minutes
  next();
};

// Export dashboard table route
router.get('/dashboard', ExportController.exportDashboardTable);

// Export tasks table route
router.get('/tasks', ExportController.exportTasksTable);

// Export finitions table route
router.get('/finitions', ExportController.exportFinitionsTable);

// Export database route (admin only - handled in controller)
// Uses extended timeout for large exports
router.get('/database', extendTimeout, ExportController.exportDatabase);

module.exports = router;
