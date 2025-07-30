'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('atelier_tasks', [
      {
        title: 'Préparation des plaques pour impression grand format',
        description: 'Préparer les plaques d\'impression pour la commande de banderoles publicitaires',
        assigned_to: 'Marie Dubois',
        priority: 'high',
        status: 'pending',
        atelier_type: 'grand_format',
        estimated_duration_minutes: 120,
        due_date: new Date('2025-07-23 10:00:00'),
        notes: 'Vérifier la qualité des couleurs avant impression',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Découpe coins arrondis - Cartes de visite',
        description: 'Découpe des coins arrondis pour lot de 1000 cartes de visite Restaurant Le Gourmet',
        assigned_to: 'Jean Martin',
        priority: 'medium',
        status: 'in_progress',
        atelier_type: 'petit_format',
        estimated_duration_minutes: 45,
        started_at: new Date('2025-07-21 09:30:00'),
        due_date: new Date('2025-07-22 14:00:00'),
        notes: 'Utiliser la machine de découpe n°2',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Pelliculage mat - Plaquettes publicitaires',
        description: 'Application du pelliculage mat sur 500 plaquettes tri-pli',
        assigned_to: 'Sophie Laurent',
        priority: 'medium',
        status: 'completed',
        atelier_type: 'petit_format',
        estimated_duration_minutes: 60,
        actual_duration_minutes: 55,
        started_at: new Date('2025-07-20 14:00:00'),
        completed_at: new Date('2025-07-20 14:55:00'),
        due_date: new Date('2025-07-21 17:00:00'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Contrôle qualité autocollants personnalisés',
        description: 'Vérification de la qualité et conformité des autocollants avant livraison',
        assigned_to: 'Pierre Moreau',
        priority: 'urgent',
        status: 'pending',
        atelier_type: 'sous_traitance',
        estimated_duration_minutes: 30,
        due_date: new Date('2025-07-22 08:00:00'),
        notes: 'Commande urgente - client VIP',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Maintenance machine d\'impression offset',
        description: 'Maintenance préventive mensuelle de la machine offset principale',
        assigned_to: 'Technicien Atelier',
        priority: 'medium',
        status: 'pending',
        atelier_type: 'general',
        estimated_duration_minutes: 180,
        due_date: new Date('2025-07-25 08:00:00'),
        notes: 'Prévoir arrêt de production de 3h',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Assemblage brochures 20 pages',
        description: 'Assemblage et reliure de 200 brochures institutionnelles',
        assigned_to: 'Claire Dupont',
        priority: 'low',
        status: 'pending',
        atelier_type: 'petit_format',
        estimated_duration_minutes: 240,
        due_date: new Date('2025-07-26 16:00:00'),
        notes: 'Reliure spirale métallique',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Préparation fichiers pour impression numérique',
        description: 'Vérification et optimisation des fichiers PDF pour impression',
        assigned_to: 'Marie Dubois',
        priority: 'high',
        status: 'in_progress',
        atelier_type: 'general',
        estimated_duration_minutes: 90,
        started_at: new Date('2025-07-21 11:00:00'),
        due_date: new Date('2025-07-22 09:00:00'),
        notes: 'Vérifier résolution et profils colorimétrique',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Nettoyage et calibrage imprimantes',
        description: 'Nettoyage hebdomadaire et calibrage couleur des imprimantes numériques',
        assigned_to: 'Technicien Atelier',
        priority: 'medium',
        status: 'cancelled',
        atelier_type: 'general',
        estimated_duration_minutes: 120,
        due_date: new Date('2025-07-21 18:00:00'),
        notes: 'Reporté à la semaine prochaine',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('atelier_tasks', null, {});
  }
};
