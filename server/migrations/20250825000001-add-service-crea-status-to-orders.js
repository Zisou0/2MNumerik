'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new status values for service crea to orders table
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('problem_technique', 'en_cours', 'attente_validation', 'modification', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);
  },

  async down(queryInterface, Sequelize) {
    // First, update any records that have the new status values to a fallback value
    await queryInterface.sequelize.query(`
      UPDATE orders SET statut = 'en_cours' WHERE statut IN ('attente_validation', 'modification');
    `);
    
    // Then remove the new status values from the ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);
  }
};
