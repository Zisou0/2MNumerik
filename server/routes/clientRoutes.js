const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/clientController');
const { authenticateToken, checkConnection } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Apply middleware to all routes
router.use(checkConnection);
router.use(authenticateToken);

// Helper middleware for role checking
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    next();
  };
};

// Get client statistics
router.get('/stats', ClientController.getClientStats);

// Get detailed client statistics by ID
router.get('/:id/statistics', ClientController.getClientDetailedStats);

// Search clients (for dropdowns/autocomplete)
router.get('/search', ClientController.searchClients);

// Get all clients
router.get('/', ClientController.getAllClients);

// Get client by ID
router.get('/:id', ClientController.getClientById);

// Create new client (admin or commercial only)
router.post('/', requireRole(['admin', 'commercial']), ClientController.createClient);

// Import clients from Excel (admin or commercial only)
router.post('/import', requireRole(['admin', 'commercial']), upload.single('file'), ClientController.importClientsFromExcel);

// Update client (admin or commercial only)
router.put('/:id', requireRole(['admin', 'commercial']), ClientController.updateClient);

// Deactivate client (admin or commercial only)
router.patch('/:id/deactivate', requireRole(['admin', 'commercial']), ClientController.deactivateClient);

// Reactivate client (admin or commercial only)
router.patch('/:id/reactivate', requireRole(['admin', 'commercial']), ClientController.reactivateClient);

// Delete client (admin only)
router.delete('/:id', requireRole(['admin']), ClientController.deleteClient);

module.exports = router;
