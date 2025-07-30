'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('orders', [
      {
        commercial_en_charge: 'Jean Dupont',
        infographe_en_charge: 'Marie Dubois',
        numero_pms: 'PMS-2025-001',
        client: 'Restaurant Le Gourmet',
        produit_details: 'Cartes de visite 85x55mm, papier 350g, recto-verso',
        quantite: 1000,
        date_limite_livraison_estimee: new Date('2025-06-10 14:00:00'),
        date_limite_livraison_attendue: new Date('2025-06-12 09:00:00'),
        etape: 'pré-presse',
        option_finition: 'Pelliculage mat, coins arrondis',
        atelier_concerne: 'petit format',
        statut: 'en_cours',
        commentaires: 'Client très exigeant sur la qualité des couleurs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Pierre Martin',
        infographe_en_charge: null,
        numero_pms: 'PMS-2025-002',
        client: 'Boutique Mode & Style',
        produit_details: 'Flyers A5, papier 170g, recto seul',
        quantite: 5000,
        date_limite_livraison_estimee: new Date('2025-06-08 16:00:00'),
        date_limite_livraison_attendue: new Date('2025-06-09 10:00:00'),
        etape: 'impression',
        option_finition: null,
        atelier_concerne: 'petit format',
        statut: 'en_cours',
        commentaires: 'Livraison urgente pour événement',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Sophie Leroy',
        infographe_en_charge: 'Thomas Bernard',
        numero_pms: 'PMS-2025-003',
        client: 'Entreprise TechSolutions',
        produit_details: 'Bannière publicitaire 3x2m, bâche PVC',
        quantite: 2,
        date_limite_livraison_estimee: new Date('2025-06-15 11:00:00'),
        date_limite_livraison_attendue: new Date('2025-06-16 14:00:00'),
        etape: 'conception',
        option_finition: 'Œillets métalliques, ourlets soudés',
        atelier_concerne: 'grand format',
        statut: 'en_attente',
        commentaires: 'Validation maquette en attente client',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Jean Dupont',
        infographe_en_charge: 'Marie Dubois',
        numero_pms: 'PMS-2025-004',
        client: 'Cabinet Médical Dr. Moreau',
        produit_details: 'Plaquettes A4 tri-pli, papier 200g',
        quantite: 500,
        date_limite_livraison_estimee: new Date('2025-06-07 15:00:00'),
        date_limite_livraison_attendue: new Date('2025-06-07 17:00:00'),
        etape: 'finition',
        option_finition: 'Pliage en Z',
        atelier_concerne: 'petit format',
        statut: 'termine',
        commentaires: 'Prêt pour livraison',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        commercial_en_charge: 'Pierre Martin',
        infographe_en_charge: null,
        numero_pms: 'PMS-2025-005',
        client: 'Association Sportive Local',
        produit_details: 'Autocollants personnalisés 10x10cm',
        quantite: 2000,
        date_limite_livraison_estimee: new Date('2025-06-20 12:00:00'),
        date_limite_livraison_attendue: new Date('2025-06-22 09:00:00'),
        etape: 'découpe',
        option_finition: 'Découpe à la forme',
        atelier_concerne: 'sous-traitance',
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
