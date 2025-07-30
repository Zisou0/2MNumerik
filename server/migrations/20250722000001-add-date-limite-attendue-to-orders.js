'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'date_limite_livraison_attendue', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date limite de livraison attendue par le client pour toute la commande'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'date_limite_livraison_attendue');
  }
};
