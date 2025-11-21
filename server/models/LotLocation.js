const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LotLocation = sequelize.define('LotLocation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    lot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lots',
        key: 'id'
      }
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'lot_locations',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['lot_id', 'location_id'],
        name: 'unique_lot_location'
      }
    ]
  });

  // Define associations
  LotLocation.associate = function(models) {
    // LotLocation belongs to Lot
    LotLocation.belongsTo(models.Lot, {
      foreignKey: 'lot_id',
      as: 'lot'
    });
    
    // LotLocation belongs to Location
    LotLocation.belongsTo(models.Location, {
      foreignKey: 'location_id',
      as: 'location'
    });
  };

  return LotLocation;
};
