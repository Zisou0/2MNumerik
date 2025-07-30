'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'estimated_work_time_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Temps de travail estimé en minutes (défini par le chef d\'atelier)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'estimated_work_time_minutes');
  }
};
