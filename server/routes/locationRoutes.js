const express = require('express');
const router = express.Router();
const {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationTypes
} = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', getAllLocations);
router.get('/types', getLocationTypes);
router.get('/:id', getLocationById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createLocation);
router.put('/:id', authenticateToken, updateLocation);
router.delete('/:id', authenticateToken, deleteLocation);

module.exports = router;