const { Supplier } = require('../models');
const { Op } = require('sequelize');

const supplierController = {
  // Get all suppliers
  async getSuppliers(req, res) {
    try {
      const { page = 1, limit = 50, search, specialty, active } = req.query;
      
      const offset = (page - 1) * limit;
      
      // Build where conditions
      const where = {};
      
      if (search) {
        where[Op.or] = [
          { nom: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      if (specialty) {
        where.specialites = {
          [Op.contains]: [specialty]
        };
      }
      
      if (active !== undefined) {
        where.actif = active === 'true';
      }
      
      const { count, rows: suppliers } = await Supplier.findAndCountAll({
        where,
        order: [['nom', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({
        suppliers,
        totalCount: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit)
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la récupération des fournisseurs',
        error: error.message 
      });
    }
  },

  // Get supplier by ID
  async getSupplierById(req, res) {
    try {
      const { id } = req.params;
      
      const supplier = await Supplier.findByPk(id, {
        include: [
          {
            association: 'orderProducts',
            limit: 10,
            order: [['createdAt', 'DESC']]
          }
        ]
      });
      
      if (!supplier) {
        return res.status(404).json({ message: 'Fournisseur non trouvé' });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la récupération du fournisseur',
        error: error.message 
      });
    }
  },

  // Create new supplier
  async createSupplier(req, res) {
    try {
      const { nom, email, telephone, adresse, specialites, notes } = req.body;
      
      // Validate required fields
      if (!nom) {
        return res.status(400).json({ message: 'Le nom du fournisseur est requis' });
      }
      
      const supplier = await Supplier.create({
        nom,
        email,
        telephone,
        adresse,
        specialites: specialites || [],
        notes,
        actif: true
      });
      
      res.status(201).json(supplier);
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la création du fournisseur',
        error: error.message 
      });
    }
  },

  // Update supplier
  async updateSupplier(req, res) {
    try {
      const { id } = req.params;
      const { nom, email, telephone, adresse, specialites, actif, notes } = req.body;
      
      const supplier = await Supplier.findByPk(id);
      
      if (!supplier) {
        return res.status(404).json({ message: 'Fournisseur non trouvé' });
      }
      
      await supplier.update({
        nom,
        email,
        telephone,
        adresse,
        specialites,
        actif,
        notes
      });
      
      res.json(supplier);
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la mise à jour du fournisseur',
        error: error.message 
      });
    }
  },

  // Delete supplier
  async deleteSupplier(req, res) {
    try {
      const { id } = req.params;
      
      const supplier = await Supplier.findByPk(id);
      
      if (!supplier) {
        return res.status(404).json({ message: 'Fournisseur non trouvé' });
      }
      
      // Soft delete by setting actif to false
      await supplier.update({ actif: false });
      
      res.json({ message: 'Fournisseur désactivé avec succès' });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ 
        message: 'Erreur lors de la suppression du fournisseur',
        error: error.message 
      });
    }
  }
};

module.exports = supplierController;
