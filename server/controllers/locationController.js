const { Location, LotLocation, Lot, Transaction, Item } = require('../models');
const { Op } = require('sequelize');

// Get all locations
const getAllLocations = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC', search = '', type = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for search and filtering
    const whereClause = {};
    if (search) {
      whereClause.name = {
        [Op.like]: `%${search}%`
      };
    }
    if (type) {
      whereClause.type = type;
    }

    const { count, rows } = await Location.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true, // This ensures we count distinct locations, not joined rows
      col: 'id', // Specify which column to count distinct on
      include: [
        {
          model: LotLocation,
          as: 'lotLocations',
          required: false,
          include: [
            {
              model: Lot,
              as: 'lot',
              include: [
                {
                  model: Item,
                  as: 'item',
                  attributes: ['id', 'name', 'description']
                }
              ]
            }
          ]
        }
      ]
    });

    res.json({
      locations: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

// Get single location by ID
const getLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await Location.findByPk(id, {
      include: [
        {
          model: LotLocation,
          as: 'lotLocations',
          required: false,
          include: [
            {
              model: Lot,
              as: 'lot',
              include: [
                {
                  model: Item,
                  as: 'item',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        },
        {
          model: Transaction,
          as: 'outgoingTransactions',
          required: false,
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: Transaction,
          as: 'incomingTransactions',
          required: false,
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

// Create new location
const createLocation = async (req, res) => {
  try {
    const { name, type } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Location type is required' });
    }

    const validTypes = ['main_depot', 'workshop', 'store', 'supplier', 'customer'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid location type. Must be one of: ' + validTypes.join(', ')
      });
    }

    // Check if location name already exists
    const existingLocation = await Location.findOne({
      where: { name: name.trim() }
    });

    if (existingLocation) {
      return res.status(400).json({ error: 'A location with this name already exists' });
    }

    const location = await Location.create({
      name: name.trim(),
      type: type
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
};

// Update location
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Validation for type if provided
    if (type) {
      const validTypes = ['main_depot', 'workshop', 'store', 'supplier', 'customer'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          error: 'Invalid location type. Must be one of: ' + validTypes.join(', ')
        });
      }
    }

    // Check if location name already exists (excluding current location)
    if (name && name.trim() !== location.name) {
      const existingLocation = await Location.findOne({
        where: { 
          name: name.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (existingLocation) {
        return res.status(400).json({ error: 'A location with this name already exists' });
      }
    }

    await location.update({
      name: name?.trim() || location.name,
      type: type || location.type
    });

    res.json(location);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

// Delete location
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Check if location has lot locations with quantity
    const lotLocations = await LotLocation.findAll({
      where: { 
        location_id: id,
        quantity: { [Op.gt]: 0 }
      }
    });

    if (lotLocations.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete location with existing stock. Please move or remove stock first.' 
      });
    }

    // Check if location has transactions
    const transactions = await Transaction.findAll({
      where: {
        [Op.or]: [
          { from_location: id },
          { to_location: id }
        ]
      }
    });

    if (transactions.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete location with existing transactions. This location is part of transaction history.' 
      });
    }

    await location.destroy();
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
};

// Get location types for dropdown
const getLocationTypes = async (req, res) => {
  try {
    const types = [
      { value: 'main_depot', label: 'Dépôt Principal' },
      { value: 'workshop', label: 'Atelier' },
      { value: 'store', label: 'Magasin' },
      { value: 'supplier', label: 'Fournisseur' },
      { value: 'customer', label: 'Client' }
    ];

    res.json(types);
  } catch (error) {
    console.error('Error fetching location types:', error);
    res.status(500).json({ error: 'Failed to fetch location types' });
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationTypes
};