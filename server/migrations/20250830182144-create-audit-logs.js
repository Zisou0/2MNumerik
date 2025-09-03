'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Can be null for system actions or failed login attempts
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of action: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, etc.'
      },
      table_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Name of the table affected (null for auth actions)'
      },
      record_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'ID of the affected record (can be string for composite keys)'
      },
      old_values: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON string of old values before the change'
      },
      new_values: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON string of new values after the change'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the user (supports IPv6)'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Browser/client user agent string'
      },
      session_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Session identifier for tracking user sessions'
      },
      additional_info: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional context or metadata as JSON'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['table_name']);
    await queryInterface.addIndex('audit_logs', ['record_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['ip_address']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('audit_logs');
  }
};
