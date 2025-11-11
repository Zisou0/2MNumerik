const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockLevel = sequelize.define('StockLevel', {
    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'items',
        key: 'id'
      }
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    minimum_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'stock_levels',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
  });

  // Define associations
  StockLevel.associate = function(models) {
    // StockLevel belongs to Item
    StockLevel.belongsTo(models.Item, {
      foreignKey: 'item_id',
      as: 'item'
    });
    
    // StockLevel belongs to Location
    StockLevel.belongsTo(models.Location, {
      foreignKey: 'location_id',
      as: 'location'
    });
  };

  return StockLevel;
};