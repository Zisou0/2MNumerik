'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('order_products', 'machine_impression', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Machine d\'impression assignée à ce produit spécifique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('order_products', 'machine_impression');
  }
};
