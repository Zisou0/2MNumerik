'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('products', [
      {
        name: 'Custom Website',
        estimated_creation_time: 720, // 12 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Mobile App',
        estimated_creation_time: 1440, // 24 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Logo Design',
        estimated_creation_time: 180, // 3 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'E-commerce Platform',
        estimated_creation_time: 2160, // 36 hours
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Database Design',
        estimated_creation_time: 480, // 8 hours
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {});
  }
};
