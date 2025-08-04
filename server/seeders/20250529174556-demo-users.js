'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        email: 'admin@2mnumerik.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date()
      },
      {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        created_at: new Date()
      },
      {
        username: 'commercial1',
        email: 'commercial@2mnumerik.com',
        password: hashedPassword,
        role: 'commercial',
        created_at: new Date()
      },
      {
        username: 'infograph1',
        email: 'infograph@2mnumerik.com',
        password: hashedPassword,
        role: 'infograph',
        created_at: new Date()
      },
      {
        username: 'atelier1',
        email: 'atelier@2mnumerik.com',
        password: hashedPassword,
        role: 'atelier',
        created_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
