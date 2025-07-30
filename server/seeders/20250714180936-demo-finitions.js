'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('finitions', [
      {
        name: 'Pelliculage mat',
        description: 'Pelliculage mat pour une finition élégante et résistante',
        price_modifier: 5.00,
        time_modifier: 15,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Pelliculage brillant',
        description: 'Pelliculage brillant pour un rendu éclatant',
        price_modifier: 4.50,
        time_modifier: 12,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Coins arrondis',
        description: 'Découpe des coins arrondis pour un aspect moderne',
        price_modifier: 2.00,
        time_modifier: 10,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vernis UV',
        description: 'Vernis UV pour une protection et brillance supérieure',
        price_modifier: 8.00,
        time_modifier: 20,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Découpe à la forme',
        description: 'Découpe personnalisée selon la forme désirée',
        price_modifier: 12.00,
        time_modifier: 30,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Œillets métalliques',
        description: 'Pose d\'œillets métalliques pour suspension',
        price_modifier: 3.00,
        time_modifier: 8,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Pliage',
        description: 'Pliage selon les spécifications client',
        price_modifier: 1.50,
        time_modifier: 5,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Ourlets soudés',
        description: 'Ourlets soudés pour bâches et supports souples',
        price_modifier: 4.00,
        time_modifier: 15,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('finitions', null, {});
  }
};
