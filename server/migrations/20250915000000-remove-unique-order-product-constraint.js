'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Remove the unique constraint to allow duplicate products in orders
    await queryInterface.removeIndex('order_products', 'unique_order_product');
  },

  async down (queryInterface, Sequelize) {
    // Recreate the unique constraint if rolling back
    await queryInterface.addIndex('order_products', ['order_id', 'product_id'], {
      unique: true,
      name: 'unique_order_product'
    });
  }
};