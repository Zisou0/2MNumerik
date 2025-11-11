const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Location = sequelize.define('Location', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    type: {
      type: DataTypes.ENUM('main_depot', 'workshop', 'store', 'supplier', 'customer'),
      allowNull: false
    }
  }, {
    tableName: 'locations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false // Only created_at in migration
  });

  // Define associations
  Location.associate = function(models) {
    // Location has many stock levels
    Location.hasMany(models.StockLevel, {
      foreignKey: 'location_id',
      as: 'stockLevels'
    });
    
    // Location has many transactions as from_location
    Location.hasMany(models.Transaction, {
      foreignKey: 'from_location',
      as: 'outgoingTransactions'
    });
    
    // Location has many transactions as to_location
    Location.hasMany(models.Transaction, {
      foreignKey: 'to_location',
      as: 'incomingTransactions'
    });
  };

  return Location;
};