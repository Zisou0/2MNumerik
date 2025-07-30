'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('order_products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to orders table'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to products table'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        },
        comment: 'Quantity of this specific product in the order'
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price per unit for this product in this order (optional)'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('order_products', ['order_id']);
    await queryInterface.addIndex('order_products', ['product_id']);
    await queryInterface.addIndex('order_products', ['order_id', 'product_id'], {
      unique: true,
      name: 'unique_order_product'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('order_products');
  }
};
