'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lots', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      lot_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      manufacturing_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expiration_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      received_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      initial_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        }
      },
      status: {
        type: Sequelize.ENUM('active', 'expired', 'recalled', 'depleted'),
        allowNull: false,
        defaultValue: 'active'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add indexes for frequently queried columns
    await queryInterface.addIndex('lots', ['item_id'], {
      name: 'lots_item_id_idx'
    });
    
    await queryInterface.addIndex('lots', ['supplier_id'], {
      name: 'lots_supplier_id_idx'
    });
    
    await queryInterface.addIndex('lots', ['status'], {
      name: 'lots_status_idx'
    });
    
    await queryInterface.addIndex('lots', ['expiration_date'], {
      name: 'lots_expiration_date_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lots');
  }
};
