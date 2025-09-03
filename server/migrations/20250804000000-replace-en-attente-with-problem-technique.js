'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, modify the ENUM to include both old and new values
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('en_attente', 'problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE order_products 
      MODIFY COLUMN statut ENUM('en_attente', 'problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);

    // Now update the data
    await queryInterface.sequelize.query(`
      UPDATE orders SET statut = 'problem_technique' WHERE statut = 'en_attente';
    `);

    await queryInterface.sequelize.query(`
      UPDATE order_products SET statut = 'problem_technique' WHERE statut = 'en_attente';
    `);
    
    // Finally, remove 'en_attente' from the ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE order_products 
      MODIFY COLUMN statut ENUM('problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Reverse the changes: change 'problem_technique' back to 'en_attente'
    
    // First, add 'en_attente' back to the ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('en_attente', 'problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_attente';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE order_products 
      MODIFY COLUMN statut ENUM('en_attente', 'problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_attente';
    `);

    // Update the data
    await queryInterface.sequelize.query(`
      UPDATE orders SET statut = 'en_attente' WHERE statut = 'problem_technique';
    `);

    await queryInterface.sequelize.query(`
      UPDATE order_products SET statut = 'en_attente' WHERE statut = 'problem_technique';
    `);
    
    // Finally, remove 'problem_technique' from the ENUM
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_attente';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE order_products 
      MODIFY COLUMN statut ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_attente';
    `);
  }
};