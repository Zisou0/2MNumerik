const { Finition, Product, ProductFinition } = require('../models');

class FinitionController {
  // Get all finitions
  static async getAllFinitions(req, res) {
    try {
      const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC', search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build where clause for search
      const whereClause = { active: true };
      if (search) {
        whereClause.name = {
          [require('sequelize').Op.iLike]: `%${search}%`
        };
      }

      const { count, rows } = await Finition.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const totalPages = Math.ceil(count / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        finitions: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalFinitions: count,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (error) {
      console.error('Error fetching finitions:', error);
      res.status(500).json({ error: 'Failed to fetch finitions' });
    }
  }

  // Get finition by ID
  static async getFinitionById(req, res) {
    try {
      const { id } = req.params;
      const finition = await Finition.findByPk(id, {
        include: [
          {
            model: Product,
            as: 'products',
            through: {
              as: 'productFinition',
              attributes: ['is_default', 'additional_cost', 'additional_time']
            }
          }
        ]
      });
      
      if (!finition) {
        return res.status(404).json({ error: 'Finition not found' });
      }
      
      res.json(finition);
    } catch (error) {
      console.error('Error fetching finition:', error);
      res.status(500).json({ error: 'Failed to fetch finition' });
    }
  }

  // Create a new finition
  static async createFinition(req, res) {
    try {
      const { name, description, price_modifier, time_modifier, active } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      const finition = await Finition.create({
        name,
        description,
        price_modifier: price_modifier || 0,
        time_modifier: time_modifier || 0,
        active: active !== undefined ? active : true
      });
      
      res.status(201).json(finition);
    } catch (error) {
      console.error('Error creating finition:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'A finition with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to create finition' });
    }
  }

  // Update a finition
  static async updateFinition(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price_modifier, time_modifier, active } = req.body;
      
      const finition = await Finition.findByPk(id);
      
      if (!finition) {
        return res.status(404).json({ error: 'Finition not found' });
      }
      
      await finition.update({
        name: name || finition.name,
        description: description !== undefined ? description : finition.description,
        price_modifier: price_modifier !== undefined ? price_modifier : finition.price_modifier,
        time_modifier: time_modifier !== undefined ? time_modifier : finition.time_modifier,
        active: active !== undefined ? active : finition.active
      });
      
      res.json(finition);
    } catch (error) {
      console.error('Error updating finition:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'A finition with this name already exists' });
      }
      res.status(500).json({ error: 'Failed to update finition' });
    }
  }

  // Delete a finition
  static async deleteFinition(req, res) {
    try {
      const { id } = req.params;
      const finition = await Finition.findByPk(id);
      
      if (!finition) {
        return res.status(404).json({ error: 'Finition not found' });
      }
      
      // Instead of hard delete, we can deactivate it
      await finition.update({ active: false });
      res.json({ message: 'Finition deactivated successfully' });
    } catch (error) {
      console.error('Error deleting finition:', error);
      res.status(500).json({ error: 'Failed to delete finition' });
    }
  }

  // Get finitions for a specific product
  static async getProductFinitions(req, res) {
    try {
      const { productId } = req.params;
      
      const product = await Product.findByPk(productId, {
        include: [
          {
            model: Finition,
            as: 'finitions',
            through: {
              as: 'productFinition',
              attributes: ['is_default', 'additional_cost', 'additional_time']
            },
            where: { active: true }
          }
        ]
      });
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(product.finitions);
    } catch (error) {
      console.error('Error fetching product finitions:', error);
      res.status(500).json({ error: 'Failed to fetch product finitions' });
    }
  }

  // Add finition to a product
  static async addFinitionToProduct(req, res) {
    try {
      const { productId, finitionId } = req.params;
      const { is_default, additional_cost, additional_time } = req.body;
      
      // Check if product and finition exist
      const product = await Product.findByPk(productId);
      const finition = await Finition.findByPk(finitionId);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      if (!finition) {
        return res.status(404).json({ error: 'Finition not found' });
      }

      // Check if relationship already exists
      const existingRelation = await ProductFinition.findOne({
        where: { product_id: productId, finition_id: finitionId }
      });

      if (existingRelation) {
        return res.status(400).json({ error: 'This finition is already associated with this product' });
      }

      // If this is set as default, remove default from other finitions for this product
      if (is_default) {
        await ProductFinition.update(
          { is_default: false },
          { where: { product_id: productId } }
        );
      }

      const productFinition = await ProductFinition.create({
        product_id: productId,
        finition_id: finitionId,
        is_default: is_default || false,
        additional_cost: additional_cost || 0,
        additional_time: additional_time || 0
      });
      
      // Fetch the complete relation with finition details
      const completeRelation = await ProductFinition.findByPk(productFinition.id, {
        include: [
          {
            model: Finition,
            as: 'finition'
          }
        ]
      });
      
      res.status(201).json(completeRelation);
    } catch (error) {
      console.error('Error adding finition to product:', error);
      res.status(500).json({ error: 'Failed to add finition to product' });
    }
  }

  // Remove finition from a product
  static async removeFinitionFromProduct(req, res) {
    try {
      const { productId, finitionId } = req.params;
      
      const productFinition = await ProductFinition.findOne({
        where: { product_id: productId, finition_id: finitionId }
      });
      
      if (!productFinition) {
        return res.status(404).json({ error: 'Product-finition relationship not found' });
      }
      
      await productFinition.destroy();
      res.json({ message: 'Finition removed from product successfully' });
    } catch (error) {
      console.error('Error removing finition from product:', error);
      res.status(500).json({ error: 'Failed to remove finition from product' });
    }
  }

  // Update product-finition relationship
  static async updateProductFinition(req, res) {
    try {
      const { productId, finitionId } = req.params;
      const { is_default, additional_cost, additional_time } = req.body;
      
      const productFinition = await ProductFinition.findOne({
        where: { product_id: productId, finition_id: finitionId }
      });
      
      if (!productFinition) {
        return res.status(404).json({ error: 'Product-finition relationship not found' });
      }

      // If this is set as default, remove default from other finitions for this product
      if (is_default) {
        await ProductFinition.update(
          { is_default: false },
          { where: { product_id: productId, finition_id: { [require('sequelize').Op.ne]: finitionId } } }
        );
      }
      
      await productFinition.update({
        is_default: is_default !== undefined ? is_default : productFinition.is_default,
        additional_cost: additional_cost !== undefined ? additional_cost : productFinition.additional_cost,
        additional_time: additional_time !== undefined ? additional_time : productFinition.additional_time
      });
      
      // Fetch the updated relation with finition details
      const updatedRelation = await ProductFinition.findByPk(productFinition.id, {
        include: [
          {
            model: Finition,
            as: 'finition'
          }
        ]
      });
      
      res.json(updatedRelation);
    } catch (error) {
      console.error('Error updating product finition:', error);
      res.status(500).json({ error: 'Failed to update product finition' });
    }
  }
}

module.exports = FinitionController;
