'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('clients', [
      {
        id: 1,
        nom: 'Restaurant Le Gourmet',
        code_client: 'REST001',
        email: 'contact@legourmet.fr',
        telephone: '01 23 45 67 89',
        adresse: '15 rue de la Gastronomie, 75001 Paris',
        type_client: 'entreprise',
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        nom: 'Boutique Mode & Style',
        code_client: 'BOUT002',
        email: 'info@mode-style.fr',
        telephone: '01 34 56 78 90',
        adresse: '42 avenue de la Mode, 75008 Paris',
        type_client: 'entreprise',
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        nom: 'Entreprise TechSolutions',
        code_client: 'TECH003',
        email: 'contact@techsolutions.com',
        telephone: '01 45 67 89 01',
        adresse: '123 rue de la Technologie, 92100 Boulogne',
        type_client: 'entreprise',
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        nom: 'Cabinet Médical Dr. Moreau',
        code_client: 'MED004',
        email: 'cabinet@drmoreau.fr',
        telephone: '01 56 78 90 12',
        adresse: '7 place de la Santé, 75013 Paris',
        type_client: 'entreprise',
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        nom: 'Association Sportive Local',
        code_client: 'ASSO005',
        email: 'contact@aslocal.org',
        telephone: '01 67 89 01 23',
        adresse: '88 boulevard du Sport, 94200 Ivry',
        type_client: 'association',
        actif: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('clients', null, {});
  }
};
