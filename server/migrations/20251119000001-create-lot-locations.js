'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lot_locations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      lot_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lots',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      minimum_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate lot-location combinations
    await queryInterface.addConstraint('lot_locations', {
      fields: ['lot_id', 'location_id'],
      type: 'unique',
      name: 'unique_lot_location'
    });

    // Add indexes for frequently queried columns
    await queryInterface.addIndex('lot_locations', ['lot_id'], {
      name: 'lot_locations_lot_id_idx'
    });
    
    await queryInterface.addIndex('lot_locations', ['location_id'], {
      name: 'lot_locations_location_id_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('lot_locations');
  }
};
