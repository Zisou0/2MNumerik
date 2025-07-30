'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('atelier_tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Titre de la tâche'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description détaillée de la tâche'
      },
      assigned_to: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Nom de la personne assignée à la tâche'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Priorité de la tâche'
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Statut de la tâche'
      },
      atelier_type: {
        type: Sequelize.ENUM('petit_format', 'grand_format', 'sous_traitance', 'general'),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Type d\'atelier concerné'
      },
      estimated_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Durée estimée en minutes'
      },
      actual_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Durée réelle en minutes'
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date d\'échéance'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de début effectif'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date de fin effective'
      },
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID de la commande associée (optionnel)'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'ID de l\'utilisateur qui a créé la tâche'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes additionnelles'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('atelier_tasks', ['status']);
    await queryInterface.addIndex('atelier_tasks', ['priority']);
    await queryInterface.addIndex('atelier_tasks', ['atelier_type']);
    await queryInterface.addIndex('atelier_tasks', ['assigned_to']);
    await queryInterface.addIndex('atelier_tasks', ['due_date']);
    await queryInterface.addIndex('atelier_tasks', ['order_id']);
    await queryInterface.addIndex('atelier_tasks', ['created_by']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('atelier_tasks');
  }
};
