const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lotController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all LOT routes
router.use(authenticateToken);

/**
 * GET /api/lots
 * Get all lots with optional filtering
 * Query params: status, item_id, location_id, expiring (boolean)
 */
router.get('/', lotController.getLots);

/**
 * GET /api/lots/expiring-soon
 * Get lots that are expiring soon (within configured days)
 * Query params: days (optional, defaults to 30)
 */
router.get('/expiring-soon', lotController.getExpiringLots);

/**
 * GET /api/lots/item/:itemId
 * Get all lots for a specific item
 */
router.get('/item/:itemId', lotController.getLotsByItem);

/**
 * GET /api/lots/:id
 * Get a specific lot by ID with full details
 */
router.get('/:id', lotController.getLotById);

/**
 * GET /api/lots/:id/document
 * Generate PDF document for a specific lot
 * Query params: type (full or label, defaults to full)
 */
router.get('/:id/document', lotController.generateLotDocument);

/**
 * POST /api/lots
 * Create a new lot
 */
router.post('/', lotController.createLot);

/**
 * PUT /api/lots/:id
 * Update an existing lot
 */
router.put('/:id', lotController.updateLot);

/**
 * DELETE /api/lots/:id
 * Delete a lot (only if no active inventory)
 */
router.delete('/:id', lotController.deleteLot);

module.exports = router;
