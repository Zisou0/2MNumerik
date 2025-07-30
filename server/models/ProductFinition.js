const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductFinition = sequelize.define('ProductFinition', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Foreign key to products table'
    },
    finition_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'finitions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Foreign key to finitions table'
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indique si cette finition est celle par défaut pour ce produit'
    },
    additional_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Coût additionnel spécifique à ce produit pour cette finition'
    },
    additional_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Temps additionnel en minutes spécifique à ce produit pour cette finition'
    }
  }, {
    tableName: 'product_finitions',
    timestamps: true
  });

  // Define associations
  ProductFinition.associate = function(models) {
    // ProductFinition belongs to Product
    ProductFinition.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
    
    // ProductFinition belongs to Finition
    ProductFinition.belongsTo(models.Finition, {
      foreignKey: 'finition_id',
      as: 'finition'
    });
  };

  return ProductFinition;
};
