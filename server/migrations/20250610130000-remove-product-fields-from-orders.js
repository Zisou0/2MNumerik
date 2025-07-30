'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the produit_details and quantite columns from orders table
    await queryInterface.removeColumn('orders', 'produit_details');
    await queryInterface.removeColumn('orders', 'quantite');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the columns if we need to rollback
    await queryInterface.addColumn('orders', 'produit_details', {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Description du produit commandé'
    });
    
    await queryInterface.addColumn('orders', 'quantite', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Nombre d\'unités commandées'
    });
  }
};
