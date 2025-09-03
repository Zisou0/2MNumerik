'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First, temporarily change atelier_type to a string to allow updating values
    await queryInterface.changeColumn('atelier_tasks', 'atelier_type', {
      type: Sequelize.STRING,
      allowNull: false
    });
    
    // Now migrate existing data to new atelier_type values
    await queryInterface.sequelize.query(`
      UPDATE atelier_tasks 
      SET atelier_type = CASE 
        WHEN atelier_type = 'sous_traitance' THEN 'type_extern'
        WHEN atelier_type IN ('petit_format', 'grand_format', 'general') THEN 'type_intern'
        ELSE 'type_intern'
      END
    `);
    
    // Remove foreign key constraint for order_id before dropping the column
    try {
      await queryInterface.removeConstraint('atelier_tasks', 'atelier_tasks_ibfk_1');
    } catch (e) {
      console.log('Foreign key constraint not found or already removed');
    }
    
    // Remove indexes (some may not exist, so we'll handle errors gracefully)
    const indexesToRemove = [
      { fields: ['priority'] },
      { fields: ['assigned_to'] },
      { fields: ['due_date'] },
      { fields: ['order_id'] }
    ];
    
    for (const index of indexesToRemove) {
      try {
        await queryInterface.removeIndex('atelier_tasks', index.fields);
      } catch (e) {
        console.log(`Index on ${index.fields.join(', ')} not found or already removed`);
      }
    }
    
    // Remove columns we no longer need
    await queryInterface.removeColumn('atelier_tasks', 'priority');
    await queryInterface.removeColumn('atelier_tasks', 'estimated_duration_minutes');
    await queryInterface.removeColumn('atelier_tasks', 'actual_duration_minutes');
    await queryInterface.removeColumn('atelier_tasks', 'order_id');
    
    // Now set the atelier_type column to use the new enum values
    await queryInterface.changeColumn('atelier_tasks', 'atelier_type', {
      type: Sequelize.ENUM('type_extern', 'type_intern'),
      allowNull: false,
      defaultValue: 'type_extern',
      comment: 'Type de tâche'
    });
  },

  async down (queryInterface, Sequelize) {
    // Re-add the removed columns
    await queryInterface.addColumn('atelier_tasks', 'priority', {
      type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Priorité de la tâche'
    });
    
    await queryInterface.addColumn('atelier_tasks', 'estimated_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Durée estimée en minutes'
    });
    
    await queryInterface.addColumn('atelier_tasks', 'actual_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Durée réelle en minutes'
    });
    
    await queryInterface.addColumn('atelier_tasks', 'order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID de la commande associée (optionnel)'
    });
    
    // Restore old atelier_type enum
    await queryInterface.changeColumn('atelier_tasks', 'atelier_type', {
      type: Sequelize.ENUM('petit_format', 'grand_format', 'sous_traitance', 'general'),
      allowNull: false,
      defaultValue: 'general',
      comment: 'Type d\'atelier concerné'
    });
    
    // Re-add indexes
    await queryInterface.addIndex('atelier_tasks', ['priority']);
    await queryInterface.addIndex('atelier_tasks', ['assigned_to']);
    await queryInterface.addIndex('atelier_tasks', ['due_date']);
    await queryInterface.addIndex('atelier_tasks', ['order_id']);
  }
};
