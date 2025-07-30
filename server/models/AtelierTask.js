const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AtelierTask = sequelize.define('AtelierTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      },
      comment: 'Titre de la tâche'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée de la tâche'
    },
    assigned_to: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nom de la personne assignée à la tâche'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
      validate: {
        isIn: [['low', 'medium', 'high', 'urgent']]
      },
      comment: 'Priorité de la tâche'
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'in_progress', 'completed', 'cancelled']]
      },
      comment: 'Statut de la tâche'
    },
    atelier_type: {
      type: DataTypes.ENUM('petit_format', 'grand_format', 'sous_traitance', 'general'),
      allowNull: false,
      defaultValue: 'general',
      validate: {
        isIn: [['petit_format', 'grand_format', 'sous_traitance', 'general']]
      },
      comment: 'Type d\'atelier concerné'
    },
    estimated_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      },
      comment: 'Durée estimée en minutes'
    },
    actual_duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      },
      comment: 'Durée réelle en minutes'
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date d\'échéance'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de début effectif'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date de fin effective'
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      },
      comment: 'ID de la commande associée (optionnel)'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID de l\'utilisateur qui a créé la tâche'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes additionnelles'
    }
  }, {
    tableName: 'atelier_tasks',
    timestamps: true,
    hooks: {
      beforeUpdate: (task, options) => {
        // Auto-set started_at when status changes to in_progress
        if (task.changed('status') && task.status === 'in_progress' && !task.started_at) {
          task.started_at = new Date();
        }
        
        // Auto-set completed_at when status changes to completed
        if (task.changed('status') && task.status === 'completed' && !task.completed_at) {
          task.completed_at = new Date();
        }
        
        // Clear completed_at if status changes away from completed
        if (task.changed('status') && task.status !== 'completed') {
          task.completed_at = null;
        }
      }
    }
  });

  // Define associations
  AtelierTask.associate = function(models) {
    // AtelierTask belongs to an order (optional)
    AtelierTask.belongsTo(models.Order, {
      foreignKey: 'order_id',
      as: 'order'
    });
    
    // AtelierTask belongs to a user (creator)
    AtelierTask.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return AtelierTask;
};
