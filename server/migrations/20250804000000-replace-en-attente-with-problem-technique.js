'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update the orders table
    await queryInterface.sequelize.query(`
      UPDATE orders SET statut = 'problem_technique' WHERE statut = 'en_attente';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);

    // Update the order_products table
    await queryInterface.sequelize.query(`
      UPDATE order_products SET statut = 'problem_technique' WHERE statut = 'en_attente';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE order_products 
      MODIFY COLUMN statut ENUM('problem_technique', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_cours';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Reverse the changes: change 'problem_technique' back to 'en_attente'
    
    // Revert orders table
    await queryInterface.sequelize.query(`
      UPDATE orders SET statut = 'en_attente' WHERE statut = 'problem_technique';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE orders 
      MODIFY COLUMN statut ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_attente';
    `);

    // Revert order_products table
    await queryInterface.sequelize.query(`
      UPDATE order_products SET statut = 'en_attente' WHERE statut = 'problem_technique';
    `);
    
    await queryInterface.sequelize.query(`
      ALTER TABLE order_products 
      MODIFY COLUMN statut ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule') NOT NULL DEFAULT 'en_attente';
    `);
  }
};