'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('suppliers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      nom: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom du fournisseur'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        },
        comment: 'Adresse email du fournisseur'
      },
      telephone: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Numéro de téléphone du fournisseur'
      },
      adresse: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Adresse complète du fournisseur'
      },
      specialites: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Spécialités du fournisseur (array of strings: Offset, Sérigraphie, etc.)'
      },
      actif: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Fournisseur actif ou non'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes internes sur le fournisseur'
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
    await queryInterface.addIndex('suppliers', ['nom']);
    await queryInterface.addIndex('suppliers', ['actif']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('suppliers');
  }
};
