const { Item, Lot, LotLocation, Location, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all items
const getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for search
    const whereClause = {};
    if (search) {
      whereClause.name = {
        [Op.like]: `%${search}%`
      };
    }

    const { count, rows } = await Item.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Lot,
          as: 'lots',
          include: [
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
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
      col: 'id'
    });

    res.json({
      items: rows,
      totalCount: count,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// Get single item by ID
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await Item.findByPk(id, {
      include: [
        {
          model: Lot,
          as: 'lots',
          include: [
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
        }
      ]
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

// Create new item
const createItem = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const item = await Item.create({
      name: name.trim(),
      description: description?.trim() || null
    });

    // Fetch the created item for response
    const createdItem = await Item.findByPk(item.id, {
      include: [
        {
          model: Lot,
          as: 'lots',
          include: [
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
        }
      ]
    });

    res.status(201).json(createdItem);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};

// Update item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update item basic info
    await item.update({
      name: name?.trim() || item.name,
      description: description?.trim() || item.description
    });

    // Fetch the updated item for response
    const updatedItem = await Item.findByPk(item.id, {
      include: [
        {
          model: Lot,
          as: 'lots',
          include: [
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
        }
      ]
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// Delete item
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await item.destroy();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};