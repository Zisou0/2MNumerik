const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { authenticateToken, checkConnection } = require('../middleware/auth');

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Order routes
router.get('/', OrderController.getAllOrders);
router.get('/stats', OrderController.getOrderStats);
router.get('/history', OrderController.getHistoryOrders);
router.get('/history/stats', OrderController.getHistoryOrderStats);
router.get('/:id', OrderController.getOrderById);
router.post('/', OrderController.createOrder);
router.put('/:id', OrderController.updateOrder);
router.put('/:orderId/products/:productId', OrderController.updateOrderProduct);
router.delete('/:id', OrderController.deleteOrder);

module.exports = router;
