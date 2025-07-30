'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add code_client column
    await queryInterface.addColumn('clients', 'code_client', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Code client unique pour identification'
    });

    // Add numero_affaire column
    await queryInterface.addColumn('clients', 'numero_affaire', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Numéro d\'affaire associé au client'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('clients', ['code_client']);
    await queryInterface.addIndex('clients', ['numero_affaire']);
  },

  async down (queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('clients', ['code_client']);
    await queryInterface.removeIndex('clients', ['numero_affaire']);
    
    // Remove columns
    await queryInterface.removeColumn('clients', 'code_client');
    await queryInterface.removeColumn('clients', 'numero_affaire');
  }
};
