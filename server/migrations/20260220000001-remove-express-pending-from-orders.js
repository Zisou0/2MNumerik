'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Before removing the column, migrate any pending express requests to product level
    // MySQL syntax with JOIN
    await queryInterface.sequelize.query(`
      UPDATE order_products op
      INNER JOIN orders o ON op.order_id = o.id 
      SET op.express = 'pending'
      WHERE o.express_pending = true 
        AND op.express = 'non';
    `);
    
    // Now remove the column from orders table
    await queryInterface.removeColumn('orders', 'express_pending');
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the column
    await queryInterface.addColumn('orders', 'express_pending', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if an express request is pending admin approval'
    });
    
    // Migrate back: if any product has express='pending', set order's express_pending to true
    // MySQL syntax with JOIN
    await queryInterface.sequelize.query(`
      UPDATE orders o
      INNER JOIN order_products op ON op.order_id = o.id 
      SET o.express_pending = true
      WHERE op.express = 'pending';
    `);
    
    // Reset pending products to 'non'
    await queryInterface.sequelize.query(`
      UPDATE order_products SET express = 'non' WHERE express = 'pending';
    `);
  }
};
