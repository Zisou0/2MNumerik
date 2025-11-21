const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lot = sequelize.define('Lot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    lot_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    manufacturing_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    received_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    initial_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'expired', 'recalled', 'depleted'),
      allowNull: false,
      defaultValue: 'active'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'lots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  Lot.associate = function(models) {
    // Lot belongs to Item
    Lot.belongsTo(models.Item, {
      foreignKey: 'item_id',
      as: 'item'
    });
    
    // Lot belongs to Supplier
    Lot.belongsTo(models.Supplier, {
      foreignKey: 'supplier_id',
      as: 'supplier'
    });
    
    // Lot has many lot locations (can be stored in multiple locations)
    Lot.hasMany(models.LotLocation, {
      foreignKey: 'lot_id',
      as: 'lotLocations'
    });
    
    // Lot has many transactions
    Lot.hasMany(models.Transaction, {
      foreignKey: 'lot_id',
      as: 'transactions'
    });
  };

  return Lot;
};
