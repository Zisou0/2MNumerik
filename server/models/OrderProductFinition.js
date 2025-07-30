const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderProductFinition = sequelize.define('OrderProductFinition', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    order_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'order_products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Foreign key to order_products table'
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
    assigned_agents: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of assigned agent names/IDs for this specific finition instance'
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Planned start date and time for this finition'
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Planned end date and time for this finition'
    }
  }, {
    tableName: 'order_product_finitions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Define associations
  OrderProductFinition.associate = function(models) {
    // OrderProductFinition belongs to OrderProduct
    OrderProductFinition.belongsTo(models.OrderProduct, {
      foreignKey: 'order_product_id',
      as: 'orderProduct'
    });
    
    // OrderProductFinition belongs to Finition
    OrderProductFinition.belongsTo(models.Finition, {
      foreignKey: 'finition_id',
      as: 'finition'
    });
  };

  return OrderProductFinition;
};
