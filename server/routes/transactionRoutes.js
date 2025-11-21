const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  deleteTransaction,
  validateTransaction,
  cancelTransaction
} = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

// Public routes - GET operations
router.get('/', getAllTransactions);
router.get('/:id', getTransactionById);

// Protected routes (require authentication)
router.post('/', authenticateToken, createTransaction);
router.delete('/:id', authenticateToken, deleteTransaction);

// Special transaction operations
router.patch('/:id/validate', authenticateToken, validateTransaction);
router.patch('/:id/cancel', authenticateToken, cancelTransaction);

module.exports = router;