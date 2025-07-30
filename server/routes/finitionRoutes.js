const express = require('express');
const FinitionController = require('../controllers/finitionController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Finition CRUD routes
router.get('/', FinitionController.getAllFinitions);
router.get('/:id', FinitionController.getFinitionById);
router.post('/', FinitionController.createFinition);
router.put('/:id', FinitionController.updateFinition);
router.delete('/:id', FinitionController.deleteFinition);

// Product-finition relationship routes
router.get('/product/:productId', FinitionController.getProductFinitions);
router.post('/product/:productId/finition/:finitionId', FinitionController.addFinitionToProduct);
router.put('/product/:productId/finition/:finitionId', FinitionController.updateProductFinition);
router.delete('/product/:productId/finition/:finitionId', FinitionController.removeFinitionFromProduct);

module.exports = router;
