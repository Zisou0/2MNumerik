'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('products', [
      {
        name: 'Custom Website',
        estimated_creation_time: 720, // 12 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Mobile App',
        estimated_creation_time: 1440, // 24 hours
        atelier_types: JSON.stringify(['grand_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Logo Design',
        estimated_creation_time: 180, // 3 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'E-commerce Platform',
        estimated_creation_time: 2160, // 36 hours
        atelier_types: JSON.stringify(['grand_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Database Design',
        estimated_creation_time: 480, // 8 hours
        atelier_types: JSON.stringify(['petit_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Business Card Design',
        estimated_creation_time: 120, // 2 hours
        atelier_types: JSON.stringify(['petit_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Brochure Design',
        estimated_creation_time: 300, // 5 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Poster Design',
        estimated_creation_time: 240, // 4 hours
        atelier_types: JSON.stringify(['grand_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Banner Design',
        estimated_creation_time: 360, // 6 hours
        atelier_types: JSON.stringify(['grand_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Social Media Graphics',
        estimated_creation_time: 150, // 2.5 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Packaging Design',
        estimated_creation_time: 600, // 10 hours
        atelier_types: JSON.stringify(['service_crea', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Corporate Identity',
        estimated_creation_time: 1200, // 20 hours
        atelier_types: JSON.stringify(['service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Annual Report Design',
        estimated_creation_time: 1800, // 30 hours
        atelier_types: JSON.stringify(['grand_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Product Catalog',
        estimated_creation_time: 960, // 16 hours
        atelier_types: JSON.stringify(['grand_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Trade Show Display',
        estimated_creation_time: 720, // 12 hours
        atelier_types: JSON.stringify(['grand_format', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vehicle Wrap Design',
        estimated_creation_time: 480, // 8 hours
        atelier_types: JSON.stringify(['grand_format', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Menu Design',
        estimated_creation_time: 200, // 3.3 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Flyer Design',
        estimated_creation_time: 100, // 1.7 hours
        atelier_types: JSON.stringify(['petit_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Magazine Layout',
        estimated_creation_time: 1440, // 24 hours
        atelier_types: JSON.stringify(['grand_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Book Cover Design',
        estimated_creation_time: 300, // 5 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Invitation Card',
        estimated_creation_time: 120, // 2 hours
        atelier_types: JSON.stringify(['petit_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Signage Design',
        estimated_creation_time: 540, // 9 hours
        atelier_types: JSON.stringify(['grand_format', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'T-shirt Design',
        estimated_creation_time: 180, // 3 hours
        atelier_types: JSON.stringify(['petit_format', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Web Graphics Package',
        estimated_creation_time: 360, // 6 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Presentation Template',
        estimated_creation_time: 240, // 4 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Billboard Design',
        estimated_creation_time: 600, // 10 hours
        atelier_types: JSON.stringify(['grand_format', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sticker Design',
        estimated_creation_time: 90, // 1.5 hours
        atelier_types: JSON.stringify(['petit_format']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Newsletter Template',
        estimated_creation_time: 300, // 5 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Exhibition Stand Design',
        estimated_creation_time: 1080, // 18 hours
        atelier_types: JSON.stringify(['grand_format', 'service_crea', 'sous_traitance']),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Digital Advertisement',
        estimated_creation_time: 150, // 2.5 hours
        atelier_types: JSON.stringify(['petit_format', 'service_crea']),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('products', null, {});
  }
};
