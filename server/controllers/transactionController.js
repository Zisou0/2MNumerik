const { Transaction, Item, Location, Lot, LotLocation, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateLotNumber, generateCustomLotNumber } = require('../utils/lotNumberGenerator');

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
      lot_id = '',
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

    if (lot_id) {
      whereClause.lot_id = lot_id;
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
          model: Lot,
          as: 'lot',
          attributes: ['id', 'lot_number', 'expiration_date', 'status'],
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'nom', 'email', 'telephone']
            }
          ]
        },
        {
          model: Location,
          as: 'fromLocation',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Location,
          as: 'toLocation',
          attributes: ['id', 'name', 'type']
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
          model: Lot,
          as: 'lot',
          include: [
            {
              model: Supplier,
              as: 'supplier',
              attributes: ['id', 'nom']
            }
          ]
        },
        {
          model: Location,
          as: 'fromLocation'
        },
        {
          model: Location,
          as: 'toLocation'
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

// Create new transaction (handles LOT-based inventory)
const createTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const {
      item_id,
      lot_id,
      from_location,
      to_location,
      quantity,
      type,
      created_by,
      status = 'draft',
      auto_validate = false,
      // For IN transactions (creating new LOT)
      supplier_id,
      manufacturing_date,
      expiration_date,
      use_custom_lot_number = false,
      lot_notes
    } = req.body;

    // Validation
    if (!item_id) {
      await t.rollback();
      return res.status(400).json({ error: 'Item ID is required' });
    }

    if (!quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    if (!type || !['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'].includes(type)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    if (!created_by) {
      await t.rollback();
      return res.status(400).json({ error: 'Created by is required' });
    }

    // Verify item exists
    const item = await Item.findByPk(item_id, { transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }

    let finalLotId = lot_id;

    // Validate transaction feasibility without making changes (for draft status)
    const shouldProcessInventory = auto_validate || status === 'validated';

    // Pre-validation checks for all transaction types
    switch (type) {
      case 'IN':
        if (!to_location) {
          await t.rollback();
          return res.status(400).json({ error: 'Destination location is required for IN transactions' });
        }

        const toLocationIn = await Location.findByPk(to_location, { transaction: t });
        if (!toLocationIn) {
          await t.rollback();
          return res.status(404).json({ error: 'Destination location not found' });
        }

        // For IN transactions, LOT will be created during validation
        // No inventory changes in draft mode
        break;

      case 'OUT':
        if (!from_location) {
          await t.rollback();
          return res.status(400).json({ error: 'Source location is required for OUT transactions' });
        }

        if (!lot_id) {
          await t.rollback();
          return res.status(400).json({ error: 'LOT ID is required for OUT transactions' });
        }

        // Check stock availability
        const lotLocationOut = await LotLocation.findOne({
          where: { lot_id: lot_id, location_id: from_location },
          transaction: t
        });

        if (!lotLocationOut) {
          await t.rollback();
          return res.status(400).json({ error: 'LOT not found at source location' });
        }

        if (lotLocationOut.quantity < quantity) {
          await t.rollback();
          return res.status(400).json({ 
            type: 'INSUFFICIENT_STOCK',
            error: `Stock insuffisant. Disponible: ${lotLocationOut.quantity}, Demandé: ${quantity}` 
          });
        }

        finalLotId = lot_id;
        break;

      case 'TRANSFER':
        if (!from_location || !to_location) {
          await t.rollback();
          return res.status(400).json({ error: 'Both source and destination locations are required for TRANSFER' });
        }

        if (from_location === to_location) {
          await t.rollback();
          return res.status(400).json({ error: 'Source and destination locations must be different' });
        }

        if (!lot_id) {
          await t.rollback();
          return res.status(400).json({ error: 'LOT ID is required for TRANSFER transactions' });
        }

        const [fromLocationTransfer, toLocationTransfer] = await Promise.all([
          Location.findByPk(from_location, { transaction: t }),
          Location.findByPk(to_location, { transaction: t })
        ]);

        if (!fromLocationTransfer || !toLocationTransfer) {
          await t.rollback();
          return res.status(404).json({ error: 'One or both locations not found' });
        }

        // Check stock availability
        const sourceLotLocation = await LotLocation.findOne({
          where: { lot_id: lot_id, location_id: from_location },
          transaction: t
        });

        if (!sourceLotLocation) {
          await t.rollback();
          return res.status(400).json({ error: 'LOT not found at source location' });
        }

        if (sourceLotLocation.quantity < quantity) {
          await t.rollback();
          return res.status(400).json({ 
            type: 'INSUFFICIENT_STOCK',
            error: `Stock insuffisant à la source. Disponible: ${sourceLotLocation.quantity}, Demandé: ${quantity}` 
          });
        }

        finalLotId = lot_id;
        break;

      case 'ADJUSTMENT':
        if (!lot_id) {
          await t.rollback();
          return res.status(400).json({ error: 'LOT ID is required for ADJUSTMENT transactions' });
        }

        const adjustmentLocation = to_location || from_location;
        if (!adjustmentLocation) {
          await t.rollback();
          return res.status(400).json({ error: 'Location is required for ADJUSTMENT transactions' });
        }

        finalLotId = lot_id;
        break;

      default:
        await t.rollback();
        return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // For IN transactions, create lot immediately (even for draft status)
    if (type === 'IN' && !finalLotId) {
      const lot_number = await generateLotNumber(item_id);

      const newLot = await Lot.create({
        lot_number,
        item_id,
        supplier_id: supplier_id || null,
        manufacturing_date: manufacturing_date || null,
        expiration_date: expiration_date || null,
        received_date: new Date(),
        initial_quantity: quantity,
        status: 'active',
        notes: lot_notes || null
      }, { transaction: t });

      finalLotId = newLot.id;
    }

    // Create transaction record (without inventory changes for draft)
    const transaction = await Transaction.create({
      item_id,
      lot_id: finalLotId,
      from_location: from_location || null,
      to_location: to_location || null,
      quantity,
      type,
      status: auto_validate ? 'validated' : status,
      created_by,
      validated_by: auto_validate ? created_by : null,
      validated_at: auto_validate ? new Date() : null
    }, { transaction: t });

    // If auto-validate or already validated, process inventory changes
    if (shouldProcessInventory) {
      await processInventoryChanges(transaction, finalLotId, t, {
        supplier_id,
        manufacturing_date,
        expiration_date,
        lot_notes
      });
    }

    await t.commit();

    // Fetch created transaction with associations
    const createdTransaction = await Transaction.findByPk(transaction.id, {
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: Lot,
          as: 'lot'
        },
        {
          model: Location,
          as: 'fromLocation'
        },
        {
          model: Location,
          as: 'toLocation'
        }
      ]
    });

    res.status(201).json(createdTransaction);
  } catch (error) {
    await t.rollback();
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction', details: error.message });
  }
};

// Helper function to process inventory changes
const processInventoryChanges = async (transaction, lotId, dbTransaction, lotData = {}) => {
  switch (transaction.type) {
    case 'IN':
      // Check if LOT already exists at this location
      const existingLotLocation = await LotLocation.findOne({
        where: { lot_id: lotId, location_id: transaction.to_location },
        transaction: dbTransaction
      });

      if (existingLotLocation) {
        await existingLotLocation.update({
          quantity: existingLotLocation.quantity + transaction.quantity
        }, { transaction: dbTransaction });
      } else {
        await LotLocation.create({
          lot_id: lotId,
          location_id: transaction.to_location,
          quantity: transaction.quantity,
          minimum_quantity: 0
        }, { transaction: dbTransaction });
      }
      break;

    case 'OUT':
      // Remove quantity from source location
      const lotLocationOut = await LotLocation.findOne({
        where: { lot_id: lotId, location_id: transaction.from_location },
        transaction: dbTransaction
      });

      if (lotLocationOut) {
        await lotLocationOut.update({
          quantity: lotLocationOut.quantity - transaction.quantity
        }, { transaction: dbTransaction });

        // Update LOT status if depleted everywhere
        if (lotLocationOut.quantity - transaction.quantity === 0) {
          const otherLocations = await LotLocation.findAll({
            where: { 
              lot_id: lotId,
              location_id: { [Op.ne]: transaction.from_location }
            },
            transaction: dbTransaction
          });

          const totalRemaining = otherLocations.reduce((sum, ll) => sum + ll.quantity, 0);
          
          if (totalRemaining === 0) {
            const lot = await Lot.findByPk(lotId, { transaction: dbTransaction });
            if (lot) {
              await lot.update({ status: 'depleted' }, { transaction: dbTransaction });
            }
          }
        }
      }
      break;

    case 'TRANSFER':
      // Decrease quantity at source
      const sourceLotLocation = await LotLocation.findOne({
        where: { lot_id: lotId, location_id: transaction.from_location },
        transaction: dbTransaction
      });

      if (sourceLotLocation) {
        await sourceLotLocation.update({
          quantity: sourceLotLocation.quantity - transaction.quantity
        }, { transaction: dbTransaction });
      }

      // Increase quantity at destination
      const destLotLocation = await LotLocation.findOne({
        where: { lot_id: lotId, location_id: transaction.to_location },
        transaction: dbTransaction
      });

      if (destLotLocation) {
        await destLotLocation.update({
          quantity: destLotLocation.quantity + transaction.quantity
        }, { transaction: dbTransaction });
      } else {
        await LotLocation.create({
          lot_id: lotId,
          location_id: transaction.to_location,
          quantity: transaction.quantity,
          minimum_quantity: 0
        }, { transaction: dbTransaction });
      }
      break;

    case 'ADJUSTMENT':
      // Set exact quantity at location
      const adjustmentLocation = transaction.to_location || transaction.from_location;
      let lotLocationAdj = await LotLocation.findOne({
        where: { lot_id: lotId, location_id: adjustmentLocation },
        transaction: dbTransaction
      });

      if (!lotLocationAdj) {
        await LotLocation.create({
          lot_id: lotId,
          location_id: adjustmentLocation,
          quantity: transaction.quantity,
          minimum_quantity: 0
        }, { transaction: dbTransaction });
      } else {
        await lotLocationAdj.update({
          quantity: transaction.quantity
        }, { transaction: dbTransaction });
      }
      break;
  }
};

// Validate transaction (execute the inventory movement)
const validateTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { validated_by } = req.body;

    if (!validated_by) {
      await t.rollback();
      return res.status(400).json({ error: 'Validator name is required' });
    }

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'validated') {
      await t.rollback();
      return res.status(400).json({ error: 'Transaction is already validated' });
    }

    if (transaction.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot validate a cancelled transaction' });
    }

    // For IN transactions without existing lot_id, create the lot now (this should rarely happen)
    let finalLotId = transaction.lot_id;
    
    if (transaction.type === 'IN' && !transaction.lot_id) {
      const item = await Item.findByPk(transaction.item_id);
      const lot_number = await generateLotNumber(transaction.item_id);

      // During validation, we don't have the original lot data, so create with minimal info
      const newLot = await Lot.create({
        lot_number,
        item_id: transaction.item_id,
        supplier_id: null, // No supplier info available during validation
        manufacturing_date: null,
        expiration_date: null,
        received_date: new Date(),
        initial_quantity: transaction.quantity,
        status: 'active',
        notes: null
      }, { transaction: t });

      finalLotId = newLot.id;
      
      // Update transaction with new lot_id
      await transaction.update({
        lot_id: finalLotId
      }, { transaction: t });
    }

    // Re-verify stock availability for OUT and TRANSFER transactions
    if (transaction.type === 'OUT' || transaction.type === 'TRANSFER') {
      const lotLocation = await LotLocation.findOne({
        where: { 
          lot_id: transaction.lot_id || finalLotId, 
          location_id: transaction.from_location 
        }
      });

      if (!lotLocation || lotLocation.quantity < transaction.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          type: 'INSUFFICIENT_STOCK',
          error: `Stock insuffisant pour valider cette transaction. Disponible: ${lotLocation?.quantity || 0}, Demandé: ${transaction.quantity}` 
        });
      }
    }

    // Process inventory changes
    await processInventoryChanges(transaction, finalLotId, t, {});

    // Update transaction status
    await transaction.update({
      status: 'validated',
      validated_by,
      validated_at: new Date()
    }, { transaction: t });

    await t.commit();

    // Fetch updated transaction
    const updatedTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: Lot,
          as: 'lot'
        },
        {
          model: Location,
          as: 'fromLocation'
        },
        {
          model: Location,
          as: 'toLocation'
        }
      ]
    });

    res.json(updatedTransaction);
  } catch (error) {
    await t.rollback();
    console.error('Error validating transaction:', error);
    res.status(500).json({ error: 'Failed to validate transaction' });
  }
};

// Cancel transaction
const cancelTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'validated') {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Cannot cancel a validated transaction. Create a reversal transaction instead.' 
      });
    }

    if (transaction.status === 'cancelled') {
      await t.rollback();
      return res.status(400).json({ error: 'Transaction is already cancelled' });
    }

    // For draft transactions, no inventory reversal is needed since no changes were made
    // Just mark as cancelled and clean up any unused lots for IN transactions

    // If there's a LOT that was created specifically for this IN transaction (draft status),
    // we should remove it since it wasn't actually used
    if (transaction.type === 'IN' && transaction.status === 'draft' && transaction.lot_id) {
      // Check if this lot was used in any other transactions or has any stock
      const [otherTransactions, lotLocations] = await Promise.all([
        Transaction.count({
          where: {
            lot_id: transaction.lot_id,
            id: { [Op.ne]: transaction.id },
            status: { [Op.ne]: 'cancelled' }
          }
        }),
        LotLocation.findAll({
          where: { lot_id: transaction.lot_id }
        })
      ]);

      const totalQuantity = lotLocations.reduce((sum, ll) => sum + ll.quantity, 0);

      // If no other transactions and no stock, delete the lot
      if (otherTransactions === 0 && totalQuantity === 0) {
        // Delete lot locations first
        await LotLocation.destroy({
          where: { lot_id: transaction.lot_id }
        }, { transaction: t });

        // Delete the lot
        await Lot.destroy({
          where: { id: transaction.lot_id }
        }, { transaction: t });
      }
    }

    // Mark transaction as cancelled
    await transaction.update({
      status: 'cancelled'
    }, { transaction: t });

    await t.commit();

    // Fetch updated transaction
    const updatedTransaction = await Transaction.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: Lot,
          as: 'lot'
        },
        {
          model: Location,
          as: 'fromLocation'
        },
        {
          model: Location,
          as: 'toLocation'
        }
      ]
    });

    res.json(updatedTransaction);
  } catch (error) {
    await t.rollback();
    console.error('Error cancelling transaction:', error);
    res.status(500).json({ error: 'Failed to cancel transaction' });
  }
};

// Delete transaction (only drafts)
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'draft') {
      return res.status(400).json({ 
        error: 'Only draft transactions can be deleted. Use cancel for other statuses.' 
      });
    }

    await transaction.destroy();
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

// Get available LOTs for an item at a location
const getAvailableLots = async (req, res) => {
  try {
    const { item_id, location_id } = req.query;

    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const whereClause = {
      item_id: parseInt(item_id),
      status: 'active'
    };

    const includeClause = {
      model: LotLocation,
      as: 'lotLocations',
      where: {
        quantity: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'type']
        }
      ]
    };

    // Filter by location if specified
    if (location_id) {
      includeClause.where.location_id = parseInt(location_id);
    }

    const lots = await Lot.findAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name']
        },
        includeClause
      ],
      order: [
        ['expiration_date', 'ASC NULLS LAST'],
        ['received_date', 'ASC']
      ]
    });

    // Filter out lots with no available quantity at specified location
    const availableLots = lots.filter(lot => lot.lotLocations && lot.lotLocations.length > 0);

    res.json(availableLots);
  } catch (error) {
    console.error('Error fetching available lots:', error);
    res.status(500).json({ error: 'Failed to fetch available lots' });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  validateTransaction,
  cancelTransaction,
  deleteTransaction,
  getAvailableLots
};
