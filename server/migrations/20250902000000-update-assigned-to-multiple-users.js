'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, add a temporary column
    await queryInterface.addColumn('atelier_tasks', 'assigned_to_temp', {
      type: Sequelize.JSON,
      allowNull: true
    });

    // Get existing data safely
    const tasks = await queryInterface.sequelize.query(
      'SELECT id, assigned_to FROM atelier_tasks',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Convert existing data safely
    for (const task of tasks) {
      let assignedUsers = [];
      if (task.assigned_to && typeof task.assigned_to === 'string' && task.assigned_to.trim() !== '') {
        // Clean up the string and split by common separators
        const cleanAssigned = task.assigned_to.trim();
        if (cleanAssigned !== 'null' && cleanAssigned !== 'undefined' && cleanAssigned !== '') {
          assignedUsers = cleanAssigned
            .split(/[,;]/) // Split by comma or semicolon
            .map(user => user.trim())
            .filter(user => user && user !== 'null' && user !== 'undefined');
        }
      }
      
      await queryInterface.sequelize.query(
        'UPDATE atelier_tasks SET assigned_to_temp = ? WHERE id = ?',
        {
          replacements: [JSON.stringify(assignedUsers), task.id],
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }

    // Remove old column and rename temp column
    await queryInterface.removeColumn('atelier_tasks', 'assigned_to');
    await queryInterface.renameColumn('atelier_tasks', 'assigned_to_temp', 'assigned_to');
  },

  down: async (queryInterface, Sequelize) => {
    // Add temporary string column
    await queryInterface.addColumn('atelier_tasks', 'assigned_to_temp', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Convert JSON back to string
    const tasks = await queryInterface.sequelize.query(
      'SELECT id, assigned_to FROM atelier_tasks',
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const task of tasks) {
      let assignedString = '';
      if (task.assigned_to) {
        try {
          const assignedUsers = typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;
          if (Array.isArray(assignedUsers)) {
            assignedString = assignedUsers.join(', ');
          } else {
            assignedString = '';
          }
        } catch (e) {
          // If not valid JSON, treat as string
          assignedString = typeof task.assigned_to === 'string' ? task.assigned_to : '';
        }
      }
      
      await queryInterface.sequelize.query(
        'UPDATE atelier_tasks SET assigned_to_temp = ? WHERE id = ?',
        {
          replacements: [assignedString, task.id],
          type: Sequelize.QueryTypes.UPDATE
        }
      );
    }

    // Remove JSON column and rename temp column
    await queryInterface.removeColumn('atelier_tasks', 'assigned_to');
    await queryInterface.renameColumn('atelier_tasks', 'assigned_to_temp', 'assigned_to');
  }
};
