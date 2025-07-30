'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add finitions column to order_products table to store selected finitions as JSON
    await queryInterface.addColumn('order_products', 'finitions', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'JSON array of selected finitions for this product in this order. Each finition object contains: {finition_id, additional_cost, additional_time}'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_products', 'finitions');
  }
};
