'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'valider' to the bat ENUM in order_products table
    await queryInterface.sequelize.query(
      "ALTER TABLE `order_products` MODIFY COLUMN `bat` ENUM('avec', 'sans', 'valider')"
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove 'valider' from the bat ENUM (revert to original values)
    await queryInterface.sequelize.query(
      "ALTER TABLE `order_products` MODIFY COLUMN `bat` ENUM('avec', 'sans')"
    );
  }
};
