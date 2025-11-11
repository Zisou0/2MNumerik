const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/itemController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', getAllItems);
router.get('/:id', getItemById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createItem);
router.put('/:id', authenticateToken, updateItem);
router.delete('/:id', authenticateToken, deleteItem);

module.exports = router;