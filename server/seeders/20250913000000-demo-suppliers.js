'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('suppliers', [
      {
        nom: 'Imprimerie Offset Plus',
        email: 'contact@offsetplus.fr',
        telephone: '01 23 45 67 89',
        adresse: '15 Rue de l\'Industrie, 75001 Paris',
        specialites: JSON.stringify(['Offset', 'Autre']),
        actif: true,
        notes: 'Spécialisé dans l\'impression offset haute qualité',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Sérigraphie Pro',
        email: 'info@serigraphiepro.com',
        telephone: '01 34 56 78 90',
        adresse: '28 Avenue de la République, 69001 Lyon',
        specialites: JSON.stringify(['Sérigraphie']),
        actif: true,
        notes: 'Expert en sérigraphie sur tous supports',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Objets Pub Express',
        email: 'commandes@objetspubexpress.fr',
        telephone: '02 45 67 89 01',
        adresse: '42 Rue du Commerce, 33000 Bordeaux',
        specialites: JSON.stringify(['Objet publicitaire', 'Sérigraphie']),
        actif: true,
        notes: 'Large gamme d\'objets publicitaires personnalisés',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'Multi-Print Solutions',
        email: 'contact@multiprintsolutions.fr',
        telephone: '03 56 78 90 12',
        adresse: '8 Boulevard de l\'Innovation, 59000 Lille',
        specialites: JSON.stringify(['Offset', 'Sérigraphie', 'Objet publicitaire', 'Autre']),
        actif: true,
        notes: 'Solutions complètes d\'impression et de communication',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nom: 'GraphiTech Spécialisé',
        email: 'production@graphitech.fr',
        telephone: '04 67 89 01 23',
        adresse: '33 Zone Industrielle, 13000 Marseille',
        specialites: JSON.stringify(['Autre']),
        actif: true,
        notes: 'Technologies d\'impression spécialisées et innovantes',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('suppliers', null, {});
  }
};
