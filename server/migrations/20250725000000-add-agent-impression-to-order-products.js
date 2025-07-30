'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_products', 'agent_impression', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Agent d\'impression assigné à ce produit spécifique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_products', 'agent_impression');
  }
};
