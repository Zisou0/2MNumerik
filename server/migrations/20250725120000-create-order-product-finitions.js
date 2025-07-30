'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('order_product_finitions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      order_product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'order_products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to order_products table'
      },
      finition_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'finitions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to finitions table (template)'
      },
      assigned_agents: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of assigned agent names/IDs for this specific finition instance'
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Planned start date and time for this finition'
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Planned end date and time for this finition'
      },
      actual_start_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Actual start date and time (for tracking)'
      },
      actual_end_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Actual end date and time (for tracking)'
      },
      status: {
        type: Sequelize.ENUM('en_attente', 'en_cours', 'termine', 'annule'),
        allowNull: false,
        defaultValue: 'en_attente',
        comment: 'Status of this specific finition instance'
      },
      priority: {
        type: Sequelize.ENUM('normal', 'urgent', 'critique'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Priority level for this finition'
      },
      estimated_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Estimated duration in minutes for this finition instance'
      },
      actual_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual duration in minutes (calculated from actual start/end)'
      },
      additional_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Additional cost specific to this finition instance'
      },
      cost_override: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Override cost if different from template'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Specific notes for this finition instance'
      },
      quality_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Quality control notes and observations'
      },
      completion_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Completion percentage (0-100)'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('order_product_finitions', ['order_product_id']);
    await queryInterface.addIndex('order_product_finitions', ['finition_id']);
    await queryInterface.addIndex('order_product_finitions', ['status']);
    await queryInterface.addIndex('order_product_finitions', ['start_date']);
    await queryInterface.addIndex('order_product_finitions', ['end_date']);
    await queryInterface.addIndex('order_product_finitions', ['priority']);
    
    // Composite index for efficient querying
    await queryInterface.addIndex('order_product_finitions', ['order_product_id', 'finition_id'], {
      name: 'idx_order_product_finition'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('order_product_finitions');
  }
};
