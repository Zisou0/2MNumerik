'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all unique clients from existing orders
    const [existingClients] = await queryInterface.sequelize.query(`
      SELECT DISTINCT client 
      FROM orders 
      WHERE client IS NOT NULL AND client != ''
    `);

    // Create client records for each unique client name
    const clientsToInsert = existingClients.map(row => ({
      nom: row.client,
      type_client: 'entreprise', // Default to enterprise
      actif: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    if (clientsToInsert.length > 0) {
      await queryInterface.bulkInsert('clients', clientsToInsert);

      // Update orders to link with new client records
      const [clientRecords] = await queryInterface.sequelize.query(`
        SELECT id, nom FROM clients
      `);

      for (const client of clientRecords) {
        await queryInterface.sequelize.query(`
          UPDATE orders 
          SET client_id = :clientId 
          WHERE client = :clientName
        `, {
          replacements: {
            clientId: client.id,
            clientName: client.nom
          }
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove client_id references from orders
    await queryInterface.sequelize.query(`
      UPDATE orders SET client_id = NULL
    `);

    // Delete all clients (this will also set client_id to NULL due to foreign key constraint)
    await queryInterface.bulkDelete('clients', {}, {});
  }
};
