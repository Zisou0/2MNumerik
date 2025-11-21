const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    lot_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'lots',
        key: 'id'
      }
    },
    from_location: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    to_location: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    type: {
      type: DataTypes.ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('draft', 'validated', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft'
    },
    created_by: {
      type: DataTypes.STRING,
      allowNull: false
    },
    validated_by: {
      type: DataTypes.STRING,
      allowNull: true
    },
    validated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Define associations
  Transaction.associate = function(models) {
    // Transaction belongs to Item
    Transaction.belongsTo(models.Item, {
      foreignKey: 'item_id',
      as: 'item'
    });
    
    // Transaction belongs to Lot
    Transaction.belongsTo(models.Lot, {
      foreignKey: 'lot_id',
      as: 'lot'
    });
    
    // Transaction belongs to Location (from)
    Transaction.belongsTo(models.Location, {
      foreignKey: 'from_location',
      as: 'fromLocation'
    });
    
    // Transaction belongs to Location (to)
    Transaction.belongsTo(models.Location, {
      foreignKey: 'to_location',
      as: 'toLocation'
    });
  };

  return Transaction;
};