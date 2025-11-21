const { Lot, LotLocation, Item, Supplier, Location, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateLotNumber, generateCustomLotNumber } = require('../utils/lotNumberGenerator');
const { generateLotPDF, generateLotLabel } = require('../utils/pdfGenerator');

// Get all lots with pagination and filtering
const getLots = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'created_at', 
      sortOrder = 'DESC', 
      search = '',
      status = '',
      item_id = '',
      supplier_id = '',
      expiring_soon = false
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const whereClause = {};
    
    if (search) {
      whereClause.lot_number = {
        [Op.like]: `%${search}%`
      };
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (item_id) {
      whereClause.item_id = parseInt(item_id);
    }
    
    if (supplier_id) {
      whereClause.supplier_id = parseInt(supplier_id);
    }
    
    // Filter for expiring soon (within 30 days)
    if (expiring_soon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      whereClause.expiration_date = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.lte]: thirtyDaysFromNow },
          { [Op.gte]: new Date() }
        ]
      };
      whereClause.status = 'active';
    }

    const { count, rows } = await Lot.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'nom', 'email']
        },
        {
          model: LotLocation,
          as: 'lotLocations',
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'name', 'type']
            }
          ]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true
    });

    res.json({
      lots: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
};

// Get single lot by ID
const getLotById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lot = await Lot.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: LotLocation,
          as: 'lotLocations',
          include: [
            {
              model: Location,
              as: 'location'
            }
          ]
        },
        {
          model: Transaction,
          as: 'transactions',
          limit: 10,
          order: [['created_at', 'DESC']],
          include: [
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
        }
      ]
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    res.json(lot);
  } catch (error) {
    console.error('Error fetching lot:', error);
    res.status(500).json({ error: 'Failed to fetch lot' });
  }
};

// Create new lot
const createLot = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const {
      item_id,
      supplier_id,
      manufacturing_date,
      expiration_date,
      received_date,
      initial_quantity,
      status = 'active',
      notes,
      location_id,
      minimum_quantity = 0,
      use_custom_lot_number = false
    } = req.body;

    // Validation
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    if (!initial_quantity || initial_quantity <= 0) {
      return res.status(400).json({ error: 'Initial quantity must be greater than 0' });
    }
    
    if (!location_id) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    // Verify item exists
    const item = await Item.findByPk(item_id);
    if (!item) {
      await t.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }

    // Verify location exists
    const location = await Location.findByPk(location_id);
    if (!location) {
      await t.rollback();
      return res.status(404).json({ error: 'Location not found' });
    }

    // Generate lot number
    const lot_number = use_custom_lot_number 
      ? await generateCustomLotNumber(item.name)
      : await generateLotNumber(item_id);

    // Create lot
    const lot = await Lot.create({
      lot_number,
      item_id,
      supplier_id: supplier_id || null,
      manufacturing_date: manufacturing_date || null,
      expiration_date: expiration_date || null,
      received_date: received_date || new Date(),
      initial_quantity,
      status,
      notes: notes || null
    }, { transaction: t });

    // Create lot_location entry
    await LotLocation.create({
      lot_id: lot.id,
      location_id,
      quantity: initial_quantity,
      minimum_quantity
    }, { transaction: t });

    await t.commit();

    // Fetch the created lot with associations
    const createdLot = await Lot.findByPk(lot.id, {
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: LotLocation,
          as: 'lotLocations',
          include: [
            {
              model: Location,
              as: 'location'
            }
          ]
        }
      ]
    });

    res.status(201).json(createdLot);
  } catch (error) {
    await t.rollback();
    console.error('Error creating lot:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
};

// Update lot
const updateLot = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_id,
      manufacturing_date,
      expiration_date,
      status,
      notes
    } = req.body;

    const lot = await Lot.findByPk(id);
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Update lot
    await lot.update({
      supplier_id: supplier_id !== undefined ? supplier_id : lot.supplier_id,
      manufacturing_date: manufacturing_date !== undefined ? manufacturing_date : lot.manufacturing_date,
      expiration_date: expiration_date !== undefined ? expiration_date : lot.expiration_date,
      status: status || lot.status,
      notes: notes !== undefined ? notes : lot.notes
    });

    // Fetch updated lot with associations
    const updatedLot = await Lot.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: Supplier,
          as: 'supplier'
        },
        {
          model: LotLocation,
          as: 'lotLocations',
          include: [
            {
              model: Location,
              as: 'location'
            }
          ]
        }
      ]
    });

    res.json(updatedLot);
  } catch (error) {
    console.error('Error updating lot:', error);
    res.status(500).json({ error: 'Failed to update lot' });
  }
};

// Delete lot
const deleteLot = async (req, res) => {
  try {
    const { id } = req.params;

    const lot = await Lot.findByPk(id);
    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Check if lot has any quantity remaining
    const lotLocations = await LotLocation.findAll({
      where: { lot_id: id }
    });

    const totalQuantity = lotLocations.reduce((sum, ll) => sum + ll.quantity, 0);
    
    if (totalQuantity > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete lot with remaining quantity. Please deplete or adjust the lot first.' 
      });
    }

    await lot.destroy();
    res.json({ message: 'Lot deleted successfully' });
  } catch (error) {
    console.error('Error deleting lot:', error);
    res.status(500).json({ error: 'Failed to delete lot' });
  }
};

// Get lots by item
const getLotsByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status = 'active', location_id = '' } = req.query;

    // Validate itemId parameter
    const parsedItemId = parseInt(itemId, 10);
    if (isNaN(parsedItemId)) {
      return res.status(400).json({ error: 'Invalid item ID provided' });
    }

    const whereClause = { item_id: parsedItemId };
    
    if (status) {
      whereClause.status = status;
    }

    const includeClause = [
      {
        model: Item,
        as: 'item',
        attributes: ['id', 'name']
      },
      {
        model: Supplier,
        as: 'supplier',
        attributes: ['id', 'nom']
      },
      {
        model: LotLocation,
        as: 'lotLocations',
        include: [
          {
            model: Location,
            as: 'location',
            attributes: ['id', 'name', 'type']
          }
        ]
      }
    ];

    // Filter by location if specified
    if (location_id) {
      const parsedLocationId = parseInt(location_id, 10);
      if (!isNaN(parsedLocationId)) {
        includeClause[2].where = { location_id: parsedLocationId };
        includeClause[2].required = true;
      }
    }

    const lots = await Lot.findAll({
      where: whereClause,
      include: includeClause,
      order: [['expiration_date', 'ASC'], ['received_date', 'ASC']]
    });

    res.json(lots);
  } catch (error) {
    console.error('Error fetching lots by item:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
};

// Get expiring lots
const getExpiringLots = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parseInt(days));

    const lots = await Lot.findAll({
      where: {
        expiration_date: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.lte]: daysFromNow },
            { [Op.gte]: new Date() }
          ]
        },
        status: 'active'
      },
      include: [
        {
          model: Item,
          as: 'item'
        },
        {
          model: LotLocation,
          as: 'lotLocations',
          where: {
            quantity: { [Op.gt]: 0 }
          },
          include: [
            {
              model: Location,
              as: 'location'
            }
          ]
        }
      ],
      order: [['expiration_date', 'ASC']]
    });

    res.json(lots);
  } catch (error) {
    console.error('Error fetching expiring lots:', error);
    res.status(500).json({ error: 'Failed to fetch expiring lots' });
  }
};

// Generate PDF document for lot
const generateLotDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'full' } = req.query; // 'full' for detailed PDF, 'label' for compact label

    const lot = await Lot.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'description']
        },
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'nom', 'email', 'telephone']
        },
        {
          model: LotLocation,
          as: 'lotLocations',
          include: [
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'name', 'type']
            }
          ]
        }
      ]
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    // Prepare data for PDF
    const pdfData = {
      ...lot.toJSON(),
      locations: lot.lotLocations?.map(ll => ({
        name: ll.location?.name,
        type: ll.location?.type,
        quantity: ll.quantity
      })) || []
    };

    let buffer;
    let filename;
    
    if (type === 'label') {
      buffer = await generateLotLabel(pdfData);
      filename = `lot-label-${lot.lot_number}.pdf`;
    } else {
      buffer = await generateLotPDF(pdfData);
      filename = `lot-document-${lot.lot_number}.pdf`;
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error) {
    console.error('Error generating lot document:', error);
    res.status(500).json({ error: 'Failed to generate lot document' });
  }
};

module.exports = {
  getLots,
  getLotById,
  createLot,
  updateLot,
  deleteLot,
  getLotsByItem,
  getExpiringLots,
  generateLotDocument
};
