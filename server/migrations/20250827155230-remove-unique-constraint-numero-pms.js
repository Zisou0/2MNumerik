'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the unique constraint from numero_pms column
    // We need to first remove the column and then add it back without the unique constraint
    await queryInterface.removeColumn('order_products', 'numero_pms');
    
    await queryInterface.addColumn('order_products', 'numero_pms', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Numéro PMS spécifique à ce produit'
    });
  },

  async down(queryInterface, Sequelize) {
    // Restore the unique constraint
    await queryInterface.removeColumn('order_products', 'numero_pms');
    
    await queryInterface.addColumn('order_products', 'numero_pms', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Numéro PMS spécifique à ce produit'
    });
  }
};
