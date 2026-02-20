'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MySQL: Modify the ENUM column to add 'pending' value
    await queryInterface.changeColumn('order_products', 'express', {
      type: Sequelize.ENUM('oui', 'non', 'pending'),
      allowNull: false,
      defaultValue: 'non',
      comment: 'Express flag pour ce produit spécifique: oui (approved), non (not requested or rejected), pending (awaiting approval)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // First update any 'pending' values to 'non'
    await queryInterface.sequelize.query(`
      UPDATE order_products SET express = 'non' WHERE express = 'pending';
    `);
    
    // Then change the column back to only 'oui' and 'non'
    await queryInterface.changeColumn('order_products', 'express', {
      type: Sequelize.ENUM('oui', 'non'),
      allowNull: false,
      defaultValue: 'non',
      comment: 'Express flag pour ce produit spécifique'
    });
  }
};
