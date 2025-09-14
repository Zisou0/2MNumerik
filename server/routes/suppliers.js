const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all suppliers
router.get('/', supplierController.getSuppliers);

// Get supplier by ID
router.get('/:id', supplierController.getSupplierById);

// Create new supplier
router.post('/', supplierController.createSupplier);

// Update supplier
router.put('/:id', supplierController.updateSupplier);

// Delete supplier (soft delete)
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
