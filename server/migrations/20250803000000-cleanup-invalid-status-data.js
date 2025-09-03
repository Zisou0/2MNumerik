'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Starting data cleanup for statut fields...');
    
    // First, let's see what invalid data exists
    try {
      const [ordersCheck] = await queryInterface.sequelize.query(`
        SELECT DISTINCT statut, COUNT(*) as count 
        FROM orders 
        WHERE statut NOT IN ('en_attente', 'en_cours', 'termine', 'livre', 'annule') 
           OR statut IS NULL 
           OR statut = ''
        GROUP BY statut;
      `);
      
      if (ordersCheck.length > 0) {
        console.log('Found invalid statut values in orders table:', ordersCheck);
      }

      const [orderProductsCheck] = await queryInterface.sequelize.query(`
        SELECT DISTINCT statut, COUNT(*) as count 
        FROM order_products 
        WHERE statut NOT IN ('en_attente', 'en_cours', 'termine', 'livre', 'annule') 
           OR statut IS NULL 
           OR statut = ''
        GROUP BY statut;
      `);
      
      if (orderProductsCheck.length > 0) {
        console.log('Found invalid statut values in order_products table:', orderProductsCheck);
      }
    } catch (error) {
      console.log('Could not check existing data (tables might not exist yet):', error.message);
    }

    // Clean up orders table - set any invalid statut to 'en_cours'
    try {
      const [ordersResult] = await queryInterface.sequelize.query(`
        UPDATE orders 
        SET statut = 'en_cours' 
        WHERE statut NOT IN ('en_attente', 'en_cours', 'termine', 'livre', 'annule') 
           OR statut IS NULL 
           OR statut = '';
      `);
      
      console.log(`Updated ${ordersResult.affectedRows || 0} orders with invalid statut`);
    } catch (error) {
      console.log('Could not update orders table (might not exist yet):', error.message);
    }

    // Clean up order_products table - set any invalid statut to 'en_cours'
    try {
      const [orderProductsResult] = await queryInterface.sequelize.query(`
        UPDATE order_products 
        SET statut = 'en_cours' 
        WHERE statut NOT IN ('en_attente', 'en_cours', 'termine', 'livre', 'annule') 
           OR statut IS NULL 
           OR statut = '';
      `);
      
      console.log(`Updated ${orderProductsResult.affectedRows || 0} order_products with invalid statut`);
    } catch (error) {
      console.log('Could not update order_products table (might not exist yet):', error.message);
    }
    
    // Additional cleanup for any whitespace-only values
    try {
      await queryInterface.sequelize.query(`
        UPDATE orders 
        SET statut = 'en_cours' 
        WHERE LENGTH(TRIM(statut)) = 0;
      `);
      
      await queryInterface.sequelize.query(`
        UPDATE order_products 
        SET statut = 'en_cours' 
        WHERE LENGTH(TRIM(statut)) = 0;
      `);
    } catch (error) {
      console.log('Could not perform whitespace cleanup:', error.message);
    }
    
    console.log('Data cleanup completed successfully');
  },

  async down(queryInterface, Sequelize) {
    // No rollback needed for data cleanup - we can't restore invalid data
    console.log('Rollback not needed for data cleanup migration');
  }
};
