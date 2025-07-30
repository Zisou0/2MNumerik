'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove product-specific fields from orders table that are now in order_products
    await queryInterface.removeColumn('orders', 'numero_pms');
    await queryInterface.removeColumn('orders', 'infographe_en_charge');
    await queryInterface.removeColumn('orders', 'etape');
    await queryInterface.removeColumn('orders', 'option_finition');
    await queryInterface.removeColumn('orders', 'atelier_concerne');
    await queryInterface.removeColumn('orders', 'estimated_time');
    await queryInterface.removeColumn('orders', 'estimated_work_time_minutes');
    await queryInterface.removeColumn('orders', 'bat');
    await queryInterface.removeColumn('orders', 'express');
    await queryInterface.removeColumn('orders', 'date_limite_livraison_estimee');
  },

  async down(queryInterface, Sequelize) {
    // Re-add the fields if rollback is needed
    await queryInterface.addColumn('orders', 'numero_pms', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      comment: 'Code de référence interne'
    });

    await queryInterface.addColumn('orders', 'infographe_en_charge', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nom du designer ou infographe responsable'
    });

    await queryInterface.addColumn('orders', 'etape', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Stade du projet (pré-presse, impression, etc.)'
    });

    await queryInterface.addColumn('orders', 'option_finition', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Finitions spécifiques (coins arrondis, pelliculage, etc.)'
    });

    await queryInterface.addColumn('orders', 'atelier_concerne', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Atelier qui traite la commande (petit format, grand format, sous-traitance)'
    });

    await queryInterface.addColumn('orders', 'estimated_time', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Temps estimé total en heures pour cette commande'
    });

    await queryInterface.addColumn('orders', 'estimated_work_time_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Temps de travail estimé en minutes (défini par le chef d\'atelier)'
    });

    await queryInterface.addColumn('orders', 'bat', {
      type: Sequelize.ENUM('avec', 'sans'),
      allowNull: true,
      comment: 'BAT (Bon À Tirer) - avec ou sans'
    });

    await queryInterface.addColumn('orders', 'express', {
      type: Sequelize.ENUM('oui', 'non'),
      allowNull: true,
      comment: 'Commande express - oui ou non'
    });

    await queryInterface.addColumn('orders', 'date_limite_livraison_estimee', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date et heure de livraison prévue (planning)'
    });
  }
};
