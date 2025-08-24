const XLSX = require('xlsx');
const mysqldump = require('mysqldump');
const { Order, Product, OrderProduct, Client, User, Finition, ProductFinition, OrderProductFinition, AtelierTask } = require('../models');
const { Op } = require('sequelize');

class ExportController {
  // Export dashboard table data to Excel
  static async exportDashboardTable(req, res) {
    try {
      // Fetch orders with all related data (same logic as the dashboard)
      const orders = await Order.findAll({
        include: [
          {
            model: OrderProduct,
            as: 'orderProducts',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client']
          }
        ],
        where: {
          statut: {
            [Op.notIn]: ['annule', 'livre']
          }
        },
        order: [['createdAt', 'DESC']]
      });

      // Flatten orders to order-product rows (same logic as dashboard)
      const flatRows = [];
      orders.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          order.orderProducts.forEach(orderProduct => {
            // Get the actual product status (prioritize product status over order status)
            const productStatus = orderProduct.statut || order.statut;
            
            flatRows.push({
              // Order-level fields
              'N° Affaire': order.numero_affaire || '',
              'N° DM': order.numero_dm || '',
              'Client': order.clientInfo?.nom || order.client || '',
              'Commercial': order.commercial_en_charge || '',
              'Date Limite Livraison Attendue': order.date_limite_livraison_attendue ? 
                new Date(order.date_limite_livraison_attendue).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '',
              
              // Product-level fields
              'Produit': orderProduct.product?.name || orderProduct.productInfo?.name || 'Produit',
              'Quantité': orderProduct.quantity || '',
              'N° PMS': orderProduct.numero_pms || '',
              'Statut': productStatus || '',
              'Étape': orderProduct.etape || '',
              'Atelier': orderProduct.atelier_concerne || '',
              'Graphiste': orderProduct.infograph_en_charge || '',
              'Agent Impression': orderProduct.agent_impression || '',
              'Délai Estimé': orderProduct.date_limite_livraison_estimee ? 
                new Date(orderProduct.date_limite_livraison_estimee).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '',
              'Temps Estimé (min)': orderProduct.estimated_work_time_minutes || '',
              'BAT': orderProduct.bat || '',
              'Express': orderProduct.express || '',
              'Pack Fin Année': orderProduct.pack_fin_annee ? 'Oui' : 'Non',
              'Commentaires': orderProduct.commentaires || '',
              
              // Timestamp fields
              'Date Création': order.createdAt ? 
                new Date(order.createdAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : '',
              'Date Modification': order.updatedAt ? 
                new Date(order.updatedAt).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''
            });
          });
        }
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(flatRows);

      // Auto-size columns
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10; // minimum width
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = cell.v.toString();
            maxWidth = Math.max(maxWidth, cellValue.length);
          }
        }
        colWidths.push({ wch: Math.min(maxWidth, 50) }); // cap at 50 characters
      }
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dashboard');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for file download
      const filename = `dashboard_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the buffer
      res.send(buffer);

    } catch (error) {
      console.error('Dashboard export error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export du tableau de bord'
      });
    }
  }

  // Export tasks table data to Excel
  static async exportTasksTable(req, res) {
    try {
      // Fetch all tasks with related data
      const tasks = await AtelierTask.findAll({
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'numero_affaire', 'numero_dm'],
            include: [
              {
                model: Client,
                as: 'clientInfo',
                attributes: ['nom']
              }
            ]
          },
          {
            model: User,
            as: 'creator',
            attributes: ['username']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Transform tasks data for export
      const tasksData = tasks.map(task => ({
        'ID': task.id,
        'Titre': task.title || '',
        'Description': task.description || '',
        'Assigné à': task.assigned_to || '',
        'Priorité': task.priority || '',
        'Statut': task.status || '',
        'Type Atelier': task.atelier_type || '',
        'Durée Estimée (min)': task.estimated_duration_minutes || '',
        'Durée Réelle (min)': task.actual_duration_minutes || '',
        'Date Échéance': task.due_date ? 
          new Date(task.due_date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
        'Date Début': task.started_at ? 
          new Date(task.started_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
        'Date Fin': task.completed_at ? 
          new Date(task.completed_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
        'Commande Associée': task.order ? 
          `${task.order.numero_affaire || ''} - ${task.order.clientInfo?.nom || ''}` : '',
        'Créé par': task.creator?.username || '',
        'Notes': task.notes || '',
        'Date Création': task.createdAt ? 
          new Date(task.createdAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
        'Date Modification': task.updatedAt ? 
          new Date(task.updatedAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : ''
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(tasksData);

      // Auto-size columns
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10; // minimum width
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellValue = cell.v.toString();
            maxWidth = Math.max(maxWidth, cellValue.length);
          }
        }
        colWidths.push({ wch: Math.min(maxWidth, 50) }); // cap at 50 characters
      }
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for file download
      const filename = `tasks_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the buffer
      res.send(buffer);

    } catch (error) {
      console.error('Tasks export error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export des tâches'
      });
    }
  }

  // Export all database tables to Excel
  static async exportDatabase(req, res) {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          message: 'Accès réservé aux administrateurs' 
        });
      }

      const format = req.query.format || 'excel'; // Default to excel

      if (format === 'sql') {
        return ExportController.exportDatabaseSQL(req, res);
      }

      // Excel export (existing logic)
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Export Users table
      const users = await User.findAll({
        attributes: { exclude: ['password'] }, // Don't export passwords
        raw: true
      });
      
      if (users.length > 0) {
        const usersWorksheet = XLSX.utils.json_to_sheet(users);
        XLSX.utils.book_append_sheet(workbook, usersWorksheet, 'Users');
      }

      // Export Clients table
      const clients = await Client.findAll({ raw: true });
      if (clients.length > 0) {
        const clientsWorksheet = XLSX.utils.json_to_sheet(clients);
        XLSX.utils.book_append_sheet(workbook, clientsWorksheet, 'Clients');
      }

      // Export Products table
      const products = await Product.findAll({ raw: true });
      if (products.length > 0) {
        const productsWorksheet = XLSX.utils.json_to_sheet(products);
        XLSX.utils.book_append_sheet(workbook, productsWorksheet, 'Products');
      }

      // Export Orders table
      const orders = await Order.findAll({ raw: true });
      if (orders.length > 0) {
        const ordersWorksheet = XLSX.utils.json_to_sheet(orders);
        XLSX.utils.book_append_sheet(workbook, ordersWorksheet, 'Orders');
      }

      // Export OrderProducts table (junction table)
      const orderProducts = await OrderProduct.findAll({ raw: true });
      if (orderProducts.length > 0) {
        const orderProductsWorksheet = XLSX.utils.json_to_sheet(orderProducts);
        XLSX.utils.book_append_sheet(workbook, orderProductsWorksheet, 'OrderProducts');
      }

      // Export Finitions table
      const finitions = await Finition.findAll({ raw: true });
      if (finitions.length > 0) {
        const finitionsWorksheet = XLSX.utils.json_to_sheet(finitions);
        XLSX.utils.book_append_sheet(workbook, finitionsWorksheet, 'Finitions');
      }

      // Export ProductFinitions table (junction table)
      const productFinitions = await ProductFinition.findAll({ raw: true });
      if (productFinitions.length > 0) {
        const productFinitionsWorksheet = XLSX.utils.json_to_sheet(productFinitions);
        XLSX.utils.book_append_sheet(workbook, productFinitionsWorksheet, 'ProductFinitions');
      }

      // Export OrderProductFinitions table (junction table)
      const orderProductFinitions = await OrderProductFinition.findAll({ raw: true });
      if (orderProductFinitions.length > 0) {
        const orderProductFinitionsWorksheet = XLSX.utils.json_to_sheet(orderProductFinitions);
        XLSX.utils.book_append_sheet(workbook, orderProductFinitionsWorksheet, 'OrderProductFinitions');
      }

      // Export AtelierTasks table
      const atelierTasks = await AtelierTask.findAll({ raw: true });
      if (atelierTasks.length > 0) {
        const atelierTasksWorksheet = XLSX.utils.json_to_sheet(atelierTasks);
        XLSX.utils.book_append_sheet(workbook, atelierTasksWorksheet, 'AtelierTasks');
      }

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for file download
      const filename = `database_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the buffer
      res.send(buffer);

    } catch (error) {
      console.error('Database export error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export de la base de données'
      });
    }
  }

  // Export database as SQL dump
  static async exportDatabaseSQL(req, res) {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          message: 'Accès réservé aux administrateurs' 
        });
      }

      // Get database configuration from config file
      const env = process.env.NODE_ENV || 'development';
      const config = require('../config/config.js')[env];
      
      const dbConfig = {
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database,
        port: config.port || 3306
      };

      // Create SQL dump
      const dumpOptions = {
        connection: dbConfig,
        dumpToFile: false, // We want the SQL as a string
        compressFile: false,
        includeViewStructure: true,
        includeStructure: true,
        includeData: true,
        tables: [
          'Users',
          'Clients', 
          'Products',
          'Orders',
          'OrderProducts',
          'Finitions',
          'ProductFinitions',
          'OrderProductFinitions',
          'AtelierTasks',
          'SequelizeMeta'
        ]
      };

      const result = await mysqldump(dumpOptions);
      
      // Set headers for SQL file download
      const filename = `database_export_${new Date().toISOString().split('T')[0]}.sql`;
      
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(result.dump.data, 'utf8'));

      // Send the SQL dump
      res.send(result.dump.data);

    } catch (error) {
      console.error('SQL export error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export SQL de la base de données'
      });
    }
  }
}

module.exports = ExportController;
