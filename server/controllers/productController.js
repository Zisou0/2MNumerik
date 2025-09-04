const { Product, Finition, ProductFinition } = require('../models');
const { Op, fn, col } = require('sequelize');

// Get all products
const getAllProducts = async (req, res) => {
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

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Finition,
          as: 'finitions',
          through: {
            as: 'productFinition',
            attributes: ['is_default', 'additional_cost', 'additional_time']
          },
          where: { active: true },
          required: false
        }
      ]
    });

    const totalPages = Math.ceil(count / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      products: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts: count,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      include: [
        {
          model: Finition,
          as: 'finitions',
          through: {
            as: 'productFinition',
            attributes: ['is_default', 'additional_cost', 'additional_time']
          },
          where: { active: true },
          required: false
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Create a new product
const createProduct = async (req, res) => {
  try {
    const { name, estimated_creation_time, atelier_types = [] } = req.body;
    
    if (!name || !estimated_creation_time) {
      return res.status(400).json({ error: 'Name and estimated creation time are required' });
    }

    // Validate atelier_types if provided
    const validAtelierTypes = ['petit_format', 'grand_format', 'sous_traitance', 'service_crea'];
    if (atelier_types.length > 0) {
      const invalidTypes = atelier_types.filter(type => !validAtelierTypes.includes(type));
      if (invalidTypes.length > 0) {
        return res.status(400).json({ error: `Invalid atelier types: ${invalidTypes.join(', ')}` });
      }
    }
    
    const product = await Product.create({
      name,
      estimated_creation_time,
      atelier_types: atelier_types.length > 0 ? atelier_types : null
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, estimated_creation_time, atelier_types } = req.body;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate atelier_types if provided
    const validAtelierTypes = ['petit_format', 'grand_format', 'sous_traitance', 'service_crea'];
    if (atelier_types && atelier_types.length > 0) {
      const invalidTypes = atelier_types.filter(type => !validAtelierTypes.includes(type));
      if (invalidTypes.length > 0) {
        return res.status(400).json({ error: `Invalid atelier types: ${invalidTypes.join(', ')}` });
      }
    }
    
    await product.update({
      name: name || product.name,
      estimated_creation_time: estimated_creation_time || product.estimated_creation_time,
      atelier_types: atelier_types !== undefined ? (atelier_types.length > 0 ? atelier_types : null) : product.atelier_types
    });
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
