'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add lot_id column to transactions table
    await queryInterface.addColumn('transactions', 'lot_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily nullable for migration
      references: {
        model: 'lots',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    // Add index for lot_id
    await queryInterface.addIndex('transactions', ['lot_id'], {
      name: 'transactions_lot_id_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('transactions', 'transactions_lot_id_idx');
    
    // Remove column
    await queryInterface.removeColumn('transactions', 'lot_id');
  }
};
