const { Transaction, Item, Location, StockLevel } = require('../models');
const { Op } = require('sequelize');

// Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at', 
      sortOrder = 'DESC', 
      search = '',
      type = '',
      status = '',
      item_id = '',
      from_location = '',
      to_location = ''
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for filters
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { created_by: { [Op.like]: `%${search}%` } },
        { validated_by: { [Op.like]: `%${search}%` } }
      ];
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (item_id) {
      whereClause.item_id = item_id;
    }

    if (from_location) {
      whereClause.from_location = from_location;
    }

    if (to_location) {
      whereClause.to_location = to_location;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Get single transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

// Create new transaction
const createTransaction = async (req, res) => {
  try {
    const { 
      item_id, 
      from_location, 
      to_location, 
      quantity, 
      type, 
      created_by 
    } = req.body;

    // Validation
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    if (!type || !['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].includes(type)) {
      return res.status(400).json({ error: 'Type must be one of: IN, OUT, TRANSFER, ADJUSTMENT' });
    }

    if (!created_by || created_by.trim().length === 0) {
      return res.status(400).json({ error: 'Created by is required' });
    }

    // Verify item exists
    const item = await Item.findByPk(item_id);
    if (!item) {
      return res.status(400).json({ error: 'Item not found' });
    }

    // Validate locations based on transaction type
    if (type === 'TRANSFER') {
      if (!from_location || !to_location) {
        return res.status(400).json({ error: 'Both from_location and to_location are required for TRANSFER type' });
      }
      if (from_location === to_location) {
        return res.status(400).json({ error: 'From location and to location cannot be the same' });
      }
    }

    if (type === 'IN' && from_location) {
      return res.status(400).json({ error: 'From location should not be specified for IN type' });
    }

    if (type === 'OUT' && to_location) {
      return res.status(400).json({ error: 'To location should not be specified for OUT type' });
    }

    // Verify locations exist if provided
    if (from_location) {
      const fromLoc = await Location.findByPk(from_location);
      if (!fromLoc) {
        return res.status(400).json({ error: 'From location not found' });
      }
    }

    if (to_location) {
      const toLoc = await Location.findByPk(to_location);
      if (!toLoc) {
        return res.status(400).json({ error: 'To location not found' });
      }
    }

    // Check stock availability before creating transaction
    try {
      await validateStockAvailability({
        item_id,
        type,
        from_location,
        quantity: parseInt(quantity)
      });
    } catch (stockError) {
      return res.status(400).json({ 
        error: stockError.message,
        type: 'INSUFFICIENT_STOCK'
      });
    }

    const transaction = await Transaction.create({
      item_id,
      from_location: from_location || null,
      to_location: to_location || null,
      quantity: parseInt(quantity),
      type,
      created_by: created_by.trim(),
      status: 'draft'
    });

    // Fetch the created transaction with associations
    const transactionWithAssociations = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name']
        }
      ]
    });

    res.status(201).json(transactionWithAssociations);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

// Update transaction
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      item_id, 
      from_location, 
      to_location, 
      quantity, 
      type, 
      status 
    } = req.body;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Don't allow updates to validated or cancelled transactions
    if (transaction.status === 'validated') {
      return res.status(400).json({ error: 'Cannot update validated transaction' });
    }

    // Validate new values if provided
    if (item_id) {
      const item = await Item.findByPk(item_id);
      if (!item) {
        return res.status(400).json({ error: 'Item not found' });
      }
    }

    if (quantity !== undefined && quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    if (type && !['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].includes(type)) {
      return res.status(400).json({ error: 'Type must be one of: IN, OUT, TRANSFER, ADJUSTMENT' });
    }

    if (status && !['draft', 'validated', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status must be one of: draft, validated, cancelled' });
    }

    // Verify locations exist if provided
    if (from_location !== undefined && from_location !== null) {
      const fromLoc = await Location.findByPk(from_location);
      if (!fromLoc) {
        return res.status(400).json({ error: 'From location not found' });
      }
    }

    if (to_location !== undefined && to_location !== null) {
      const toLoc = await Location.findByPk(to_location);
      if (!toLoc) {
        return res.status(400).json({ error: 'To location not found' });
      }
    }

    // Validate stock availability if updating quantity or transaction affects stock
    const newQuantity = quantity !== undefined ? parseInt(quantity) : transaction.quantity;
    const newType = type !== undefined ? type : transaction.type;
    const newFromLocation = from_location !== undefined ? from_location : transaction.from_location;
    
    if (quantity !== undefined || type !== undefined || from_location !== undefined) {
      try {
        await validateStockAvailability({
          item_id: transaction.item_id,
          type: newType,
          from_location: newFromLocation,
          quantity: newQuantity
        });
      } catch (stockError) {
        return res.status(400).json({ 
          error: stockError.message,
          type: 'INSUFFICIENT_STOCK'
        });
      }
    }

    // Update transaction
    const updateData = {};
    if (item_id !== undefined) updateData.item_id = item_id;
    if (from_location !== undefined) updateData.from_location = from_location;
    if (to_location !== undefined) updateData.to_location = to_location;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;

    await transaction.update(updateData);

    // Fetch updated transaction with associations
    const updatedTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Don't allow deletion of validated transactions
    if (transaction.status === 'validated') {
      return res.status(400).json({ error: 'Cannot delete validated transaction' });
    }

    await transaction.destroy();
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

// Validate transaction
const validateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { validated_by } = req.body;

    if (!validated_by || validated_by.trim().length === 0) {
      return res.status(400).json({ error: 'Validated by is required' });
    }

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft transactions can be validated' });
    }

    // Validate stock availability again before validation (in case stock changed since creation)
    try {
      await validateStockAvailability({
        item_id: transaction.item_id,
        type: transaction.type,
        from_location: transaction.from_location,
        quantity: transaction.quantity
      });
    } catch (stockError) {
      return res.status(400).json({ 
        error: stockError.message,
        type: 'INSUFFICIENT_STOCK'
      });
    }

    // Update stock levels based on transaction type
    await updateStockLevels(transaction);

    await transaction.update({
      status: 'validated',
      validated_by: validated_by.trim(),
      validated_at: new Date()
    });

    // Fetch updated transaction with associations
    const validatedTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json(validatedTransaction);
  } catch (error) {
    console.error('Error validating transaction:', error);
    res.status(500).json({ error: 'Failed to validate transaction' });
  }
};

// Cancel transaction
const cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'validated') {
      return res.status(400).json({ error: 'Cannot cancel validated transaction' });
    }

    if (transaction.status === 'cancelled') {
      return res.status(400).json({ error: 'Transaction is already cancelled' });
    }

    await transaction.update({
      status: 'cancelled'
    });

    // Fetch updated transaction with associations
    const cancelledTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name']
        }
      ]
    });

    res.json(cancelledTransaction);
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({ error: 'Failed to cancel transaction' });
  }
};

// Helper function to validate stock availability before transaction creation
const validateStockAvailability = async ({ item_id, type, from_location, quantity }) => {
  // Only check stock for transactions that will remove stock
  if (type === 'OUT' || type === 'TRANSFER' || (type === 'ADJUSTMENT' && from_location)) {
    if (!from_location) {
      throw new Error('From location is required for stock validation');
    }

    // Check current stock level
    const stockLevel = await StockLevel.findOne({
      where: {
        item_id: item_id,
        location_id: from_location
      }
    });

    const currentStock = stockLevel ? stockLevel.quantity : 0;
    
    if (currentStock < quantity) {
      const item = await Item.findByPk(item_id);
      const location = await Location.findByPk(from_location);
      
      throw new Error(
        `Stock insuffisant. Article: ${item?.name || 'Inconnu'}, ` +
        `Emplacement: ${location?.name || 'Inconnu'}, ` +
        `Stock actuel: ${currentStock}, ` +
        `Quantité demandée: ${quantity}`
      );
    }
  }
};

// Helper function to update stock levels based on transaction
const updateStockLevels = async (transaction) => {
  const { item_id, quantity, type, from_location, to_location } = transaction;

  switch (type) {
    case 'IN':
      // Add stock to destination location
      if (to_location) {
        await updateStockLevel(item_id, to_location, quantity);
      }
      break;

    case 'OUT':
      // Remove stock from source location
      if (from_location) {
        await updateStockLevel(item_id, from_location, -quantity);
      }
      break;

    case 'TRANSFER':
      // Remove stock from source location and add to destination
      if (from_location) {
        await updateStockLevel(item_id, from_location, -quantity);
      }
      if (to_location) {
        await updateStockLevel(item_id, to_location, quantity);
      }
      break;

    case 'ADJUSTMENT':
      // For adjustments, we need to handle both positive and negative adjustments
      if (to_location) {
        // Positive adjustment (add stock)
        await updateStockLevel(item_id, to_location, quantity);
      } else if (from_location) {
        // Negative adjustment (remove stock)
        await updateStockLevel(item_id, from_location, -quantity);
      }
      break;

    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
};

// Helper function to update or create stock level
const updateStockLevel = async (itemId, locationId, quantityChange) => {
  try {
    // Find existing stock level or create one
    const [stockLevel, created] = await StockLevel.findOrCreate({
      where: {
        item_id: itemId,
        location_id: locationId
      },
      defaults: {
        item_id: itemId,
        location_id: locationId,
        quantity: 0,
        minimum_quantity: 0
      }
    });

    // Calculate new quantity
    const newQuantity = stockLevel.quantity + quantityChange;

    // Prevent negative stock levels
    if (newQuantity < 0) {
      throw new Error(`Insufficient stock. Current: ${stockLevel.quantity}, Attempted change: ${quantityChange}`);
    }

    // Update the stock level
    await stockLevel.update({ quantity: newQuantity });

    console.log(`Stock level updated for item ${itemId} at location ${locationId}: ${stockLevel.quantity} -> ${newQuantity}`);
  } catch (error) {
    console.error('Error updating stock level:', error);
    throw error;
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  validateTransaction,
  cancelTransaction
};