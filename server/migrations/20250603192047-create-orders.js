'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      commercial_en_charge: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom du commercial responsable du projet'
      },
      infographe_en_charge: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nom du designer ou infographe responsable'
      },
      numero_pms: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Code de référence interne'
      },
      client: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nom du client'
      },
      produit_details: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Description du produit commandé'
      },
      quantite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Nombre d\'unités commandées'
      },
      date_limite_livraison_estimee: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date et heure de livraison prévue (planning)'
      },
      date_limite_livraison_attendue: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date et heure de livraison attendue (client)'
      },
      etape: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Stade du projet (conception, pré-presse, travail graphique, impression, finition)'
      },
      option_finition: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Finitions spécifiques (coins arrondis, pelliculage, etc.)'
      },
      atelier_concerne: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Atelier qui traite la commande (petit format, grand format, sous-traitance)'
      },
      statut: {
        type: Sequelize.ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule'),
        allowNull: false,
        defaultValue: 'en_attente',
        comment: 'État actuel'
      },
      commentaires: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Informations supplémentaires pertinentes'
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
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('orders');
  }
};
