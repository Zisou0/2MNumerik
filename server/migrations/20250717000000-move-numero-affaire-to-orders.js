'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, add numero_affaire and numero_dm columns to orders table
    await queryInterface.addColumn('orders', 'numero_affaire', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Numéro d\'affaire associé à la commande'
    });

    await queryInterface.addColumn('orders', 'numero_dm', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Numéro DM associé à la commande'
    });

    // Copy existing numero_affaire values from clients to orders
    // This query will update orders with their client's numero_affaire
    await queryInterface.sequelize.query(`
      UPDATE orders 
      SET numero_affaire = (
        SELECT clients.numero_affaire 
        FROM clients 
        WHERE clients.id = orders.client_id
      )
      WHERE orders.client_id IS NOT NULL;
    `);

    // Remove the index on clients.numero_affaire first
    try {
      await queryInterface.removeIndex('clients', ['numero_affaire']);
    } catch (error) {
      // Index might not exist, continue
      console.log('Index on clients.numero_affaire might not exist, continuing...');
    }

    // Remove numero_affaire column from clients table
    await queryInterface.removeColumn('clients', 'numero_affaire');

    // Add indexes for better performance on orders table
    await queryInterface.addIndex('orders', ['numero_affaire']);
    await queryInterface.addIndex('orders', ['numero_dm']);
  },

  async down(queryInterface, Sequelize) {
    // Add numero_affaire back to clients table
    await queryInterface.addColumn('clients', 'numero_affaire', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Numéro d\'affaire associé au client'
    });

    // Copy numero_affaire values back from orders to clients
    // This assumes one-to-one relationship during rollback
    await queryInterface.sequelize.query(`
      UPDATE clients 
      SET numero_affaire = (
        SELECT orders.numero_affaire 
        FROM orders 
        WHERE orders.client_id = clients.id 
        AND orders.numero_affaire IS NOT NULL
        LIMIT 1
      );
    `);

    // Remove indexes from orders table
    await queryInterface.removeIndex('orders', ['numero_affaire']);
    await queryInterface.removeIndex('orders', ['numero_dm']);

    // Remove columns from orders table
    await queryInterface.removeColumn('orders', 'numero_affaire');
    await queryInterface.removeColumn('orders', 'numero_dm');

    // Add index back to clients table
    await queryInterface.addIndex('clients', ['numero_affaire']);
  }
};
