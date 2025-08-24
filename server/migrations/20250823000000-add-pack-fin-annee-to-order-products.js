'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_products', 'pack_fin_annee', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indique si ce produit fait partie d\'un pack fin d\'année'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_products', 'pack_fin_annee');
  }
};
