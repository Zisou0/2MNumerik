const express = require('express');
const router = express.Router();
const StatisticsController = require('../controllers/statisticsController');
const { authenticateToken, checkConnection } = require('../middleware/auth');

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Helper middleware for admin-only access
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Accès réservé aux administrateurs' 
    });
  }
  next();
};

// Statistics routes (admin only)
router.get('/business', requireAdmin, StatisticsController.getBusinessStats);
router.get('/dashboard', StatisticsController.getDashboardStats);

module.exports = router;
