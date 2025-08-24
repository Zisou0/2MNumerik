'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'atelier_type', {
      type: Sequelize.ENUM('petit_format', 'grand_format', 'sous_traitance', 'service_crea'),
      allowNull: true,
      defaultValue: null,
      comment: 'Type d\'atelier assigné au produit'
    });

    // Add index for better performance
    await queryInterface.addIndex('products', ['atelier_type']);
  },

  async down (queryInterface, Sequelize) {
    // Remove the index first
    await queryInterface.removeIndex('products', ['atelier_type']);
    
    // Remove the column
    await queryInterface.removeColumn('products', 'atelier_type');
    
    // Remove the ENUM type (note: this might cause issues if other tables use the same ENUM)
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_atelier_type";');
  }
};
