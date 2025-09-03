'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_products', 'type_sous_traitance', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Type de sous-traitance pour ce produit spécifique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_products', 'type_sous_traitance');
  }
};
