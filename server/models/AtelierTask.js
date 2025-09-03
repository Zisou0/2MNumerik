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
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of assigned user IDs or usernames'
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
      type: DataTypes.ENUM('type_extern', 'type_intern'),
      allowNull: false,
      defaultValue: 'type_extern',
      validate: {
        isIn: [['type_extern', 'type_intern']]
      },
      comment: 'Type de tâche'
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
    // AtelierTask belongs to a user (creator)
    AtelierTask.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return AtelierTask;
};
