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
        created_at: new Date()
      },
      {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        created_at: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
