const { getUser } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserController {
  // Get all users (admin functionality)
  static async getAllUsers(req, res) {
    try {
      const { role } = req.query; // Add role filter parameter
      const User = getUser();
      
      const whereClause = {};
      if (role) {
        whereClause.role = role;
      }
      
      const users = await User.findAll({
        where: whereClause,
        attributes: { exclude: ['password'] }, // Don't return passwords
        order: [['created_at', 'DESC']]
      });

      res.json({
        message: 'Utilisateurs récupérés avec succès',
        users: users
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const User = getUser();
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json({
        message: 'Utilisateur trouvé',
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update user (for admin management)
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, password, role } = req.body;
      const User = getUser();

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Update user fields
      if (username) user.username = username;
      if (email) user.email = email;
      if (role) user.role = role;
      
      // Update password if provided
      if (password) {
        const saltRounds = 10;
        user.password = await bcrypt.hash(password, saltRounds);
      }

      await user.save();

      res.json({
        message: 'Utilisateur mis à jour avec succès',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur ou email est déjà utilisé' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update user profile (for self-update)
  static async updateProfile(req, res) {
    try {
      const { username, email } = req.body;
      const userId = req.user.id; // From auth middleware
      const User = getUser();

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Update user fields
      if (username) user.username = username;
      if (email) user.email = email;

      await user.save();

      res.json({
        message: 'Profil mis à jour avec succès',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur ou email est déjà utilisé' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  } // Add this missing closing brace

  // Create new user
  static async createUser(req, res) {
    try {
      const { username, email, password, role = 'user' } = req.body;
      const User = getUser();

      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
      }

      const user = await User.create({
        username,
        email,
        password,
        role
      });

      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce nom d\'utilisateur ou email est déjà utilisé' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const User = getUser();

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      await user.destroy();

      res.json({
        message: 'Utilisateur supprimé avec succès'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Delete user account
  static async deleteAccount(req, res) {
    try {
      // This would need implementation for deleting user account
      res.json({
        message: 'Fonctionnalité de suppression en développement'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = UserController;
