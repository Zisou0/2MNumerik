'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('finitions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom de la finition (ex: Pelliculage mat, Coins arrondis, etc.)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description détaillée de la finition'
      },
      price_modifier: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Modificateur de prix (peut être positif ou négatif)'
      },
      time_modifier: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Modificateur de temps en minutes (peut être positif ou négatif)'
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indique si la finition est disponible'
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

    // Add index on name for searching
    await queryInterface.addIndex('finitions', ['name']);
    // Add index on active status
    await queryInterface.addIndex('finitions', ['active']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('finitions');
  }
};
