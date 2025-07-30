'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('product_finitions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to products table'
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
        comment: 'Foreign key to finitions table'
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indique si cette finition est celle par défaut pour ce produit'
      },
      additional_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Coût additionnel spécifique à ce produit pour cette finition'
      },
      additional_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Temps additionnel en minutes spécifique à ce produit pour cette finition'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('product_finitions', ['product_id']);
    await queryInterface.addIndex('product_finitions', ['finition_id']);
    await queryInterface.addIndex('product_finitions', ['product_id', 'finition_id'], {
      unique: true,
      name: 'unique_product_finition'
    });
    await queryInterface.addIndex('product_finitions', ['is_default']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('product_finitions');
  }
};
