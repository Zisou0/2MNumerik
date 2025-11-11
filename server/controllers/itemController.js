const { Item, StockLevel, Location } = require('../models');
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
          model: StockLevel,
          as: 'stockLevels',
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
      distinct: true, // This ensures we count distinct items, not joined rows
      col: 'id' // Specify which column to count distinct on
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
          model: StockLevel,
          as: 'stockLevels',
          include: [
            {
              model: Location,
              as: 'location'
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
    const { name, description, stockLevels = [] } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    // Validate stock levels if provided
    if (stockLevels.length > 0) {
      for (const stockLevel of stockLevels) {
        if (!stockLevel.location_id) {
          return res.status(400).json({ error: 'Location ID is required for stock levels' });
        }
        if (stockLevel.minimum_quantity === undefined || stockLevel.minimum_quantity < 0) {
          return res.status(400).json({ error: 'Minimum quantity must be a non-negative number' });
        }
        
        // Verify location exists
        const location = await Location.findByPk(stockLevel.location_id);
        if (!location) {
          return res.status(400).json({ error: `Location with ID ${stockLevel.location_id} not found` });
        }
      }
    }

    const item = await Item.create({
      name: name.trim(),
      description: description?.trim() || null
    });

    // Create stock levels if provided
    if (stockLevels.length > 0) {
      const stockLevelPromises = stockLevels.map(stockLevel => 
        StockLevel.create({
          item_id: item.id,
          location_id: stockLevel.location_id,
          quantity: 0, // Initial quantity is 0
          minimum_quantity: stockLevel.minimum_quantity
        })
      );
      
      await Promise.all(stockLevelPromises);
    }

    // Fetch the created item with its stock levels for response
    const itemWithStockLevels = await Item.findByPk(item.id, {
      include: [
        {
          model: StockLevel,
          as: 'stockLevels',
          include: [
            {
              model: Location,
              as: 'location'
            }
          ]
        }
      ]
    });

    res.status(201).json(itemWithStockLevels);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};

// Update item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, stockLevels = [] } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Validate stock levels if provided
    if (stockLevels.length > 0) {
      for (const stockLevel of stockLevels) {
        if (!stockLevel.location_id) {
          return res.status(400).json({ error: 'Location ID is required for stock levels' });
        }
        if (stockLevel.minimum_quantity === undefined || stockLevel.minimum_quantity < 0) {
          return res.status(400).json({ error: 'Minimum quantity must be a non-negative number' });
        }
        
        // Verify location exists
        const location = await Location.findByPk(stockLevel.location_id);
        if (!location) {
          return res.status(400).json({ error: `Location with ID ${stockLevel.location_id} not found` });
        }
      }
    }

    // Update item basic info
    await item.update({
      name: name?.trim() || item.name,
      description: description?.trim() || item.description
    });

    // Handle stock levels update if provided
    if (stockLevels.length > 0) {
      // Remove existing stock levels
      await StockLevel.destroy({
        where: { item_id: id }
      });

      // Create new stock levels
      const stockLevelPromises = stockLevels.map(stockLevel => 
        StockLevel.create({
          item_id: item.id,
          location_id: stockLevel.location_id,
          quantity: stockLevel.quantity || 0, // Preserve existing quantity if provided, otherwise 0
          minimum_quantity: stockLevel.minimum_quantity
        })
      );
      
      await Promise.all(stockLevelPromises);
    }

    // Fetch the updated item with its stock levels for response
    const updatedItemWithStockLevels = await Item.findByPk(item.id, {
      include: [
        {
          model: StockLevel,
          as: 'stockLevels',
          include: [
            {
              model: Location,
              as: 'location'
            }
          ]
        }
      ]
    });

    res.json(updatedItemWithStockLevels);
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