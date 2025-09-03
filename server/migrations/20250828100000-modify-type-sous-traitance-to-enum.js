'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, clean up any existing data that doesn't match our new enum values
    // Set any non-matching values to NULL or map them to valid values
    await queryInterface.sequelize.query(`
      UPDATE order_products 
      SET type_sous_traitance = NULL 
      WHERE type_sous_traitance IS NOT NULL 
      AND type_sous_traitance NOT IN ('Offset', 'Sérigraphie', 'Objet publicitaire', 'Autre')
    `);
    
    // Change the column type to ENUM
    await queryInterface.changeColumn('order_products', 'type_sous_traitance', {
      type: Sequelize.ENUM('Offset', 'Sérigraphie', 'Objet publicitaire', 'Autre'),
      allowNull: true,
      comment: 'Type de sous-traitance pour ce produit spécifique - restreint aux valeurs prédéfinies'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to STRING type
    await queryInterface.changeColumn('order_products', 'type_sous_traitance', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Type de sous-traitance pour ce produit spécifique'
    });
    
    // Remove the ENUM type from the database
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_order_products_type_sous_traitance";');
  }
};
