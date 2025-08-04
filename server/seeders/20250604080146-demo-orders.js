'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First create some basic orders
    await queryInterface.bulkInsert('orders', [
      {
        commercial_en_charge: 'Jean Dupont',
        client: 'Restaurant Le Gourmet',
        date_limite_livraison_attendue: new Date('2025-06-12 09:00:00'),
        statut: 'en_cours',
        commentaires: 'Client très exigeant sur la qualité des couleurs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Pierre Martin',
        client: 'Boutique Mode & Style',
        date_limite_livraison_attendue: new Date('2025-06-09 10:00:00'),
        statut: 'en_cours',
        commentaires: 'Livraison urgente pour événement',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Sophie Leroy',
        client: 'Entreprise TechSolutions',
        date_limite_livraison_attendue: new Date('2025-06-16 14:00:00'),
        statut: 'problem_technique',
        commentaires: 'Validation maquette en attente client',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Jean Dupont',
        client: 'Cabinet Médical Dr. Moreau',
        date_limite_livraison_attendue: new Date('2025-06-07 17:00:00'),
        statut: 'termine',
        commentaires: 'Prêt pour livraison',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Pierre Martin',
        client: 'Association Sportive Local',
        date_limite_livraison_attendue: new Date('2025-06-22 09:00:00'),
        statut: 'en_cours',
        commentaires: 'Sous-traitance spécialisée autocollants',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('orders', null, {});
  }
};
