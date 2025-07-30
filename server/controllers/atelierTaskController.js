const { AtelierTask, Order, User } = require('../models');
const { Op } = require('sequelize');

class AtelierTaskController {
  // Get all atelier tasks with filtering and pagination
  static async getTasks(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        priority,
        atelier_type,
        assigned_to,
        search,
        order_id,
        due_date_from,
        due_date_to
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Apply filters
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (atelier_type) where.atelier_type = atelier_type;
      if (assigned_to) where.assigned_to = { [Op.like]: `%${assigned_to}%` };
      if (order_id) where.order_id = order_id;

      // Search in title and description
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } }
        ];
      }

      // Date range filter
      if (due_date_from || due_date_to) {
        where.due_date = {};
        if (due_date_from) where.due_date[Op.gte] = new Date(due_date_from);
        if (due_date_to) where.due_date[Op.lte] = new Date(due_date_to);
      }

      const { count, rows: tasks } = await AtelierTask.findAndCountAll({
        where,
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'client']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [
          ['priority', 'DESC'], // Urgent tasks first
          ['due_date', 'ASC'],  // Then by due date
          ['createdAt', 'DESC'] // Finally by creation date
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
            model: Order,
            as: 'order',
            attributes: ['id', 'client']
          },
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
        priority = 'medium',
        status = 'pending',
        atelier_type = 'general',
        estimated_duration_minutes,
        due_date,
        order_id,
        notes
      } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'Le titre est requis' });
      }

      const task = await AtelierTask.create({
        title,
        description,
        assigned_to,
        priority,
        status,
        atelier_type,
        estimated_duration_minutes,
        due_date: due_date ? new Date(due_date) : null,
        order_id: order_id || null,
        created_by: req.user ? req.user.id : null,
        notes
      });

      // Fetch the created task with associations
      const createdTask = await AtelierTask.findByPk(task.id, {
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'client']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

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
        priority,
        status,
        atelier_type,
        estimated_duration_minutes,
        actual_duration_minutes,
        due_date,
        order_id,
        notes
      } = req.body;

      const task = await AtelierTask.findByPk(id);

      if (!task) {
        return res.status(404).json({ message: 'Tâche non trouvée' });
      }

      await task.update({
        title: title !== undefined ? title : task.title,
        description: description !== undefined ? description : task.description,
        assigned_to: assigned_to !== undefined ? assigned_to : task.assigned_to,
        priority: priority !== undefined ? priority : task.priority,
        status: status !== undefined ? status : task.status,
        atelier_type: atelier_type !== undefined ? atelier_type : task.atelier_type,
        estimated_duration_minutes: estimated_duration_minutes !== undefined ? estimated_duration_minutes : task.estimated_duration_minutes,
        actual_duration_minutes: actual_duration_minutes !== undefined ? actual_duration_minutes : task.actual_duration_minutes,
        due_date: due_date !== undefined ? (due_date ? new Date(due_date) : null) : task.due_date,
        order_id: order_id !== undefined ? order_id : task.order_id,
        notes: notes !== undefined ? notes : task.notes
      });

      // Fetch updated task with associations
      const updatedTask = await AtelierTask.findByPk(id, {
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'client']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

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

      res.json({ message: 'Tâche supprimée avec succès' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get task statistics
  static async getTaskStats(req, res) {
    try {
      const { atelier_type } = req.query;
      const where = atelier_type ? { atelier_type } : {};

      const stats = await Promise.all([
        AtelierTask.count({ where: { ...where } }),
        AtelierTask.count({ where: { ...where, status: 'pending' } }),
        AtelierTask.count({ where: { ...where, status: 'in_progress' } }),
        AtelierTask.count({ where: { ...where, status: 'completed' } }),
        AtelierTask.count({ where: { ...where, status: 'cancelled' } }),
        AtelierTask.count({ where: { ...where, priority: 'urgent' } }),
        AtelierTask.count({ where: { ...where, priority: 'high' } }),
        AtelierTask.count({
          where: {
            ...where,
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
          urgent: stats[5],
          high_priority: stats[6],
          overdue: stats[7]
        }
      });
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
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'client']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['due_date', 'ASC'],
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
      const { status, actual_duration_minutes } = req.body;

      const task = await AtelierTask.findByPk(id);

      if (!task) {
        return res.status(404).json({ message: 'Tâche non trouvée' });
      }

      const updateData = { status };
      
      // Add actual duration if provided
      if (actual_duration_minutes !== undefined) {
        updateData.actual_duration_minutes = actual_duration_minutes;
      }

      await task.update(updateData);

      const updatedTask = await AtelierTask.findByPk(id, {
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'client']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Update task status error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = AtelierTaskController;
