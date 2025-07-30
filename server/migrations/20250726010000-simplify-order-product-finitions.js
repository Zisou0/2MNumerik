'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove unnecessary columns from order_product_finitions table
    try {
      await queryInterface.removeColumn('order_product_finitions', 'actual_start_date');
      await queryInterface.removeColumn('order_product_finitions', 'actual_end_date');
      await queryInterface.removeColumn('order_product_finitions', 'status');
      await queryInterface.removeColumn('order_product_finitions', 'priority');
      await queryInterface.removeColumn('order_product_finitions', 'estimated_duration_minutes');
      await queryInterface.removeColumn('order_product_finitions', 'actual_duration_minutes');
      await queryInterface.removeColumn('order_product_finitions', 'additional_cost');
      await queryInterface.removeColumn('order_product_finitions', 'cost_override');
      await queryInterface.removeColumn('order_product_finitions', 'notes');
      await queryInterface.removeColumn('order_product_finitions', 'quality_notes');
      await queryInterface.removeColumn('order_product_finitions', 'completion_percentage');

      // Remove related indexes that are no longer needed
      await queryInterface.removeIndex('order_product_finitions', ['status']);
      await queryInterface.removeIndex('order_product_finitions', ['priority']);
    } catch (error) {
      console.log('Some columns or indexes may already be removed:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    // Re-add the removed columns if rollback is needed
    await queryInterface.addColumn('order_product_finitions', 'actual_start_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Actual start date and time (for tracking)'
    });

    await queryInterface.addColumn('order_product_finitions', 'actual_end_date', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Actual end date and time (for tracking)'
    });

    await queryInterface.addColumn('order_product_finitions', 'status', {
      type: Sequelize.ENUM('en_attente', 'en_cours', 'termine', 'annule'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'Status of this specific finition instance'
    });

    await queryInterface.addColumn('order_product_finitions', 'priority', {
      type: Sequelize.ENUM('normal', 'urgent', 'critique'),
      allowNull: false,
      defaultValue: 'normal',
      comment: 'Priority level for this finition'
    });

    await queryInterface.addColumn('order_product_finitions', 'estimated_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Estimated duration in minutes for this finition instance'
    });

    await queryInterface.addColumn('order_product_finitions', 'actual_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Actual duration in minutes (calculated from actual start/end)'
    });

    await queryInterface.addColumn('order_product_finitions', 'additional_cost', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Additional cost specific to this finition instance'
    });

    await queryInterface.addColumn('order_product_finitions', 'cost_override', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Override cost if different from template'
    });

    await queryInterface.addColumn('order_product_finitions', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Specific notes for this finition instance'
    });

    await queryInterface.addColumn('order_product_finitions', 'quality_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Quality control notes and observations'
    });

    await queryInterface.addColumn('order_product_finitions', 'completion_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Completion percentage (0-100)'
    });

    // Re-add indexes
    await queryInterface.addIndex('order_product_finitions', ['status']);
    await queryInterface.addIndex('order_product_finitions', ['priority']);
  }
};
