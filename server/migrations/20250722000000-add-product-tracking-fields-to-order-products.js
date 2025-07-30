'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_products', 'numero_pms', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Numéro PMS spécifique à ce produit'
    });

    await queryInterface.addColumn('order_products', 'infograph_en_charge', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Infographe assigné à ce produit spécifique'
    });

    await queryInterface.addColumn('order_products', 'etape', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Étape actuelle pour ce produit (conception, pré-presse, impression, finition, découpe)'
    });

    await queryInterface.addColumn('order_products', 'statut', {
      type: Sequelize.ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'Statut spécifique à ce produit'
    });

    await queryInterface.addColumn('order_products', 'estimated_work_time_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Temps de travail estimé en minutes pour ce produit'
    });

    await queryInterface.addColumn('order_products', 'date_limite_livraison_estimee', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date limite de livraison estimée pour ce produit'
    });

    await queryInterface.addColumn('order_products', 'atelier_concerne', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Atelier qui traite ce produit spécifique'
    });

    await queryInterface.addColumn('order_products', 'commentaires', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Commentaires spécifiques à ce produit'
    });

    await queryInterface.addColumn('order_products', 'bat', {
      type: Sequelize.ENUM('avec', 'sans'),
      allowNull: true,
      comment: 'BAT (Bon à tirer) pour ce produit spécifique'
    });

    await queryInterface.addColumn('order_products', 'express', {
      type: Sequelize.ENUM('oui', 'non'),
      allowNull: false,
      defaultValue: 'non',
      comment: 'Express flag pour ce produit spécifique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('order_products', 'numero_pms');
    await queryInterface.removeColumn('order_products', 'infograph_en_charge');
    await queryInterface.removeColumn('order_products', 'etape');
    await queryInterface.removeColumn('order_products', 'statut');
    await queryInterface.removeColumn('order_products', 'estimated_work_time_minutes');
    await queryInterface.removeColumn('order_products', 'date_limite_livraison_estimee');
    await queryInterface.removeColumn('order_products', 'atelier_concerne');
    await queryInterface.removeColumn('order_products', 'commentaires');
    await queryInterface.removeColumn('order_products', 'bat');
    await queryInterface.removeColumn('order_products', 'express');
  }
};
