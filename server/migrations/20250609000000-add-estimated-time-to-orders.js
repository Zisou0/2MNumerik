'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'estimated_time', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Temps estimé total en heures pour cette commande'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'estimated_time');
  }
};
