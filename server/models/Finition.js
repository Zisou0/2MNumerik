const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Finition = sequelize.define('Finition', {
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
      },
      comment: 'Nom de la finition (ex: Pelliculage mat, Coins arrondis, etc.)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description détaillée de la finition'
    },
    price_modifier: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Modificateur de prix (peut être positif ou négatif)'
    },
    time_modifier: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Modificateur de temps en minutes (peut être positif ou négatif)'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indique si la finition est disponible'
    }
  }, {
    tableName: 'finitions',
    timestamps: true
  });

  // Define associations
  Finition.associate = function(models) {
    // Finition belongs to many products through product_finitions
    Finition.belongsToMany(models.Product, {
      through: models.ProductFinition,
      foreignKey: 'finition_id',
      otherKey: 'product_id',
      as: 'products'
    });
    
    // Finition has many product_finitions
    Finition.hasMany(models.ProductFinition, {
      foreignKey: 'finition_id',
      as: 'productFinitions'
    });
    
    // Finition has many order_product_finitions
    Finition.hasMany(models.OrderProductFinition, {
      foreignKey: 'finition_id',
      as: 'orderProductFinitions'
    });
  };

  return Finition;
};
