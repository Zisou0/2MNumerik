'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First, add the client_id column to orders table
    await queryInterface.addColumn('orders', 'client_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null initially for existing records
      references: {
        model: 'clients',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID du client référencé'
    });

    // Add index on client_id for better performance
    await queryInterface.addIndex('orders', ['client_id']);
  },

  async down (queryInterface, Sequelize) {
    // Remove the foreign key constraint and column
    await queryInterface.removeColumn('orders', 'client_id');
  }
};
