'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_products', 'supplier_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID du fournisseur pour la sous-traitance'
    });

    // Add index for better performance
    await queryInterface.addIndex('order_products', ['supplier_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_products', 'supplier_id');
  }
};
