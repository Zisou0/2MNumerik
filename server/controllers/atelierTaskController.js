const { AtelierTask, User } = require('../models');
const { Op } = require('sequelize');

class AtelierTaskController {
  // Get all atelier tasks with filtering and pagination
  static async getTasks(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        exclude_status,
        atelier_type,
        search,
        assigned_to
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (status) {
        // Support comma-separated statuses
        const statuses = status.split(',');
        where.status = { [Op.in]: statuses };
      }

      // Exclude specific statuses (for main view to exclude completed/cancelled)
      if (exclude_status) {
        const excludeStatuses = exclude_status.split(',');
        where.status = { [Op.notIn]: excludeStatuses };
      }

      if (atelier_type) where.atelier_type = atelier_type;
      if (assigned_to) {
        // Search in JSON array for assigned users
        where.assigned_to = { [Op.like]: `%"${assigned_to}"%` };
      }

      // Search in title and description
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows: tasks } = await AtelierTask.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [
          ['createdAt', 'DESC'] // Order by creation date
        ],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        tasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalTasks: count,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get task by ID
  static async getTask(req, res) {
    try {
      const { id } = req.params;
      
      const task = await AtelierTask.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      if (!task) {
        return res.status(404).json({ message: 'Tâche non trouvée' });
      }

      res.json(task);
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Create new task
  static async createTask(req, res) {
    try {
      const {
        title,
        description,
        assigned_to,
        status = 'pending',
        atelier_type = 'type_extern',
        start_date,
        end_date,
        notes
      } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'Le titre est requis' });
      }

      // Ensure assigned_to is properly formatted as array
      let assignedUsers = [];
      if (assigned_to) {
        if (Array.isArray(assigned_to)) {
          assignedUsers = assigned_to.filter(user => user && user.trim());
        } else if (typeof assigned_to === 'string' && assigned_to.trim()) {
          assignedUsers = [assigned_to.trim()];
        }
      }

      const task = await AtelierTask.create({
        title,
        description,
        assigned_to: assignedUsers,
        status,
        atelier_type,
        started_at: start_date ? new Date(start_date) : null,
        completed_at: end_date ? new Date(end_date) : null,
        created_by: req.user ? req.user.id : null,
        notes
      });

      // Fetch the created task with associations
      const createdTask = await AtelierTask.findByPk(task.id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      // Emit real-time event for task creation
      const io = req.app.get('io');
      if (io) {
        io.emit('atelierTaskCreated', createdTask);
      }

      res.status(201).json(createdTask);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update task
  static async updateTask(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        assigned_to,
        status,
        atelier_type,
        start_date,
        end_date,
        notes
      } = req.body;

      const task = await AtelierTask.findByPk(id);

      if (!task) {
        return res.status(404).json({ message: 'Tâche non trouvée' });
      }

      // Handle assigned_to formatting
      let assignedUsers = task.assigned_to;
      if (assigned_to !== undefined) {
        if (Array.isArray(assigned_to)) {
          assignedUsers = assigned_to.filter(user => user && user.trim());
        } else if (typeof assigned_to === 'string' && assigned_to.trim()) {
          assignedUsers = [assigned_to.trim()];
        } else if (assigned_to === null || assigned_to === '') {
          assignedUsers = [];
        }
      }

      await task.update({
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        assigned_to: assignedUsers,
        status: status !== undefined ? status : task.status,
        atelier_type: atelier_type !== undefined ? atelier_type : task.atelier_type,
        started_at: start_date !== undefined ? (start_date ? new Date(start_date) : null) : task.started_at,
        completed_at: end_date !== undefined ? (end_date ? new Date(end_date) : null) : task.completed_at,
        notes: notes !== undefined ? notes : task.notes
      });

      // Fetch updated task with associations
      const updatedTask = await AtelierTask.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      // Emit real-time event for task update
      const io = req.app.get('io');
      if (io) {
        io.emit('atelierTaskUpdated', updatedTask);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Delete task
  static async deleteTask(req, res) {
    try {
      const { id } = req.params;
      
      const task = await AtelierTask.findByPk(id);

      if (!task) {
        return res.status(404).json({ message: 'Tâche non trouvée' });
      }

      await task.destroy();

      // Emit real-time event for task deletion
      const io = req.app.get('io');
      if (io) {
        io.emit('atelierTaskDeleted', { id: task.id });
      }

      res.json({ message: 'Tâche supprimée avec succès' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get task statistics
  static async getTaskStats(req, res) {
    try {
      const { atelier_type, status } = req.query;
      const baseWhere = atelier_type ? { atelier_type } : {};

      // If status filter is provided, only count those statuses
      if (status) {
        const statuses = status.split(',');
        const where = { ...baseWhere, status: { [Op.in]: statuses } };
        
        const stats = await Promise.all([
          AtelierTask.count({ where }),
          AtelierTask.count({ where: { ...baseWhere, status: 'pending' } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'in_progress' } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'completed' } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'cancelled' } })
        ]);

        res.json({
          stats: {
            total: stats[0],
            pending: stats[1],
            in_progress: stats[2],
            completed: stats[3],
            cancelled: stats[4],
            overdue: 0 // Not applicable for history
          }
        });
      } else {
        // Regular stats for all tasks
        const stats = await Promise.all([
          AtelierTask.count({ where: { ...baseWhere } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'pending' } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'in_progress' } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'completed' } }),
          AtelierTask.count({ where: { ...baseWhere, status: 'cancelled' } }),
          AtelierTask.count({
            where: {
              ...baseWhere,
              due_date: {
                [Op.lt]: new Date()
              },
              status: {
                [Op.not]: 'completed'
              }
            }
          })
        ]);

        res.json({
          stats: {
            total: stats[0],
            pending: stats[1],
            in_progress: stats[2],
            completed: stats[3],
            cancelled: stats[4],
            overdue: stats[5]
          }
        });
      }
    } catch (error) {
      console.error('Get task stats error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get tasks by assigned person
  static async getTasksByAssignee(req, res) {
    try {
      const { assigned_to } = req.params;
      const { status } = req.query;

      const where = { assigned_to };
      if (status) where.status = status;

      const tasks = await AtelierTask.findAll({
        where,
        order: [
          ['createdAt', 'DESC']
        ]
      });

      res.json(tasks);
    } catch (error) {
      console.error('Get tasks by assignee error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update task status
  static async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const task = await AtelierTask.findByPk(id);

      if (!task) {
        return res.status(404).json({ message: 'Tâche non trouvée' });
      }

      await task.update({ status });

      const updatedTask = await AtelierTask.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      // Emit real-time event for task status update
      const io = req.app.get('io');
      if (io) {
        io.emit('atelierTaskUpdated', updatedTask);
      }

      res.json(updatedTask);
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = AtelierTaskController;
