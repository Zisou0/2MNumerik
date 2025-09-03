const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
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
    estimated_creation_time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'Estimated creation time in minutes'
    },
    atelier_types: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      validate: {
        isValidAtelierTypes(value) {
          if (value === null || value === undefined) return;
          if (!Array.isArray(value)) {
            throw new Error('atelier_types must be an array');
          }
          const validTypes = ['petit_format', 'grand_format', 'sous_traitance', 'service_crea'];
          const invalidTypes = value.filter(type => !validTypes.includes(type));
          if (invalidTypes.length > 0) {
            throw new Error(`Invalid atelier types: ${invalidTypes.join(', ')}`);
          }
        }
      },
      comment: 'Array of atelier types assigned to the product'
    }
  }, {
    tableName: 'products',
    timestamps: true
  });

  // Define associations
  Product.associate = function(models) {
    // Product belongs to many orders through order_products
    Product.belongsToMany(models.Order, {
      through: models.OrderProduct,
      foreignKey: 'product_id',
      otherKey: 'order_id',
      as: 'orders'
    });
    
    // Product has many order_products
    Product.hasMany(models.OrderProduct, {
      foreignKey: 'product_id',
      as: 'orderProducts'
    });

    // Product belongs to many finitions through product_finitions
    Product.belongsToMany(models.Finition, {
      through: models.ProductFinition,
      foreignKey: 'product_id',
      otherKey: 'finition_id',
      as: 'finitions'
    });
    
    // Product has many product_finitions
    Product.hasMany(models.ProductFinition, {
      foreignKey: 'product_id',
      as: 'productFinitions'
    });
  };

  return Product;
};
