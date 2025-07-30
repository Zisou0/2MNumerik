const express = require('express');
const router = express.Router();
const AtelierTaskController = require('../controllers/atelierTaskController');
const { authenticateToken, checkConnection } = require('../middleware/auth');

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Get task statistics
router.get('/stats', AtelierTaskController.getTaskStats);

// Get tasks by assignee
router.get('/assignee/:assigned_to', AtelierTaskController.getTasksByAssignee);

// Get all tasks (with filtering and pagination)
router.get('/', AtelierTaskController.getTasks);

// Get single task by ID
router.get('/:id', AtelierTaskController.getTask);

// Create new task
router.post('/', AtelierTaskController.createTask);

// Update task
router.put('/:id', AtelierTaskController.updateTask);

// Update task status (simplified endpoint)
router.patch('/:id/status', AtelierTaskController.updateTaskStatus);

// Delete task
router.delete('/:id', AtelierTaskController.deleteTask);

module.exports = router;
