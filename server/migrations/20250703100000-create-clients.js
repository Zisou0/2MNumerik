'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('clients', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom du client ou de l\'entreprise'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        },
        comment: 'Adresse email du client'
      },
      telephone: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Numéro de téléphone du client'
      },
      adresse: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Adresse complète du client'
      },
      type_client: {
        type: Sequelize.ENUM('particulier', 'entreprise', 'association'),
        allowNull: false,
        defaultValue: 'particulier',
        comment: 'Type de client'
      },
      actif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Client actif ou non'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes internes sur le client'
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

    // Add index on nom for searching
    await queryInterface.addIndex('clients', ['nom']);
    // Add index on email for searching
    await queryInterface.addIndex('clients', ['email']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('clients');
  }
};
