'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'bat', {
      type: Sequelize.ENUM('avec', 'sans'),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('orders', 'express', {
      type: Sequelize.ENUM('oui', 'non'),
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('orders', 'bat');
    await queryInterface.removeColumn('orders', 'express');
    
    // Remove the ENUM types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_bat";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_express";');
  }
};
