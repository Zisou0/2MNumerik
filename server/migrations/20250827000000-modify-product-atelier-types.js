'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, add a new temporary column to store the array of ateliers
    await queryInterface.addColumn('products', 'atelier_types_temp', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Array of atelier types assigned to the product'
    });

    // Migrate existing single atelier_type values to the new array column
    await queryInterface.sequelize.query(`
      UPDATE products 
      SET atelier_types_temp = CASE 
        WHEN atelier_type IS NOT NULL THEN JSON_ARRAY(atelier_type)
        ELSE NULL 
      END
    `);

    // Remove the old ENUM column
    await queryInterface.removeColumn('products', 'atelier_type');

    // Rename the temp column to the final name
    await queryInterface.renameColumn('products', 'atelier_types_temp', 'atelier_types');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back the original ENUM column
    await queryInterface.addColumn('products', 'atelier_type', {
      type: Sequelize.ENUM('petit_format', 'grand_format', 'sous_traitance', 'service_crea'),
      allowNull: true,
      defaultValue: null
    });

    // Migrate back - take the first atelier from the array
    await queryInterface.sequelize.query(`
      UPDATE products 
      SET atelier_type = CASE 
        WHEN atelier_types IS NOT NULL AND JSON_LENGTH(atelier_types) > 0 
        THEN JSON_UNQUOTE(JSON_EXTRACT(atelier_types, '$[0]'))
        ELSE NULL 
      END
    `);

    // Remove the JSON column
    await queryInterface.removeColumn('products', 'atelier_types');
  }
};
