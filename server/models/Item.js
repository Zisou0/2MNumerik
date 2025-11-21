const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Item = sequelize.define('Item', {
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  Item.associate = function(models) {
    // Item has many lots
    Item.hasMany(models.Lot, {
      foreignKey: 'item_id',
      as: 'lots'
    });
    
    // Item has many transactions
    Item.hasMany(models.Transaction, {
      foreignKey: 'item_id',
      as: 'transactions'
    });
  };

  return Item;
};