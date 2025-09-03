const XLSX = require('xlsx');
const mysqldump = require('mysqldump');
const { Order, Product, OrderProduct, Client, User, Finition, ProductFinition, OrderProductFinition, AtelierTask } = require('../models');
const { Op } = require('sequelize');

class ExportController {
  // Export dashboard table data to Excel
  static async exportDashboardTable(req, res) {
    try {
      // Fetch orders with order products that have "livré" status
      const orders = await Order.findAll({
        include: [
          {
            model: OrderProduct,
            as: 'orderProducts',
            where: {
              statut: 'livre'
            },
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
      // First, get all users to create a lookup map
      const users = await User.findAll({
        attributes: ['id', 'username'],
        raw: true
      });
      
      // Create a map of user IDs to usernames
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user.username;
      });

      // Fetch all tasks with related data (order relationship was removed in migration)
      // Only export tasks with status "completed"
      const tasks = await AtelierTask.findAll({
        where: {
          status: 'completed'
        },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['username']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      // Transform tasks data for export with all available fields
      const tasksData = [];
      
      tasks.forEach(task => {
        // Parse assigned users and convert IDs to names
        let assignedNames = [];
        if (task.assigned_to) {
          let assignedIds = [];
          
          if (Array.isArray(task.assigned_to)) {
            assignedIds = task.assigned_to;
          } else if (typeof task.assigned_to === 'string') {
            try {
              const parsed = JSON.parse(task.assigned_to);
              assignedIds = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              // If it's not JSON, try to split by comma or treat as single value
              assignedIds = task.assigned_to.includes(',') 
                ? task.assigned_to.split(',').map(id => id.trim())
                : [task.assigned_to];
            }
          } else {
            assignedIds = [task.assigned_to];
          }
          
          // Convert IDs to usernames
          assignedNames = assignedIds.map(id => {
            // Check if it's already a name (string) or an ID (number)
            const numericId = parseInt(id);
            if (!isNaN(numericId) && userMap[numericId]) {
              return userMap[numericId];
            }
            // If it's not a numeric ID or not found in userMap, return as is (might already be a name)
            return id;
          }).filter(name => name && name.trim() !== '');
        }

        // Create base row data
        const baseRowData = {
          'ID': task.id,
          'Titre': task.title || '',
          'Description': task.description || '',
          'Statut': task.status || '',
          'Type Atelier': task.atelier_type || '',
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
        };

        // If there are assigned users, create one row per user
        if (assignedNames.length > 0) {
          assignedNames.forEach(assignedName => {
            tasksData.push({
              'Assigné à': assignedName,
              ...baseRowData
            });
          });
        } else {
          // If no assigned users, create one row with empty assignment
          tasksData.push({
            'Assigné à': '',
            ...baseRowData
          });
        }
      });

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

  // Export finitions table data to Excel
  static async exportFinitionsTable(req, res) {
    try {
      // First, get all users to create a lookup map
      const users = await User.findAll({
        attributes: ['id', 'username'],
        raw: true
      });
      
      // Create a map of user IDs to usernames
      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user.username;
      });

      // Fetch all finitions with related order product finitions
      const orderProductFinitions = await OrderProductFinition.findAll({
        include: [
          {
            model: Finition,
            as: 'finition',
            attributes: ['id', 'name', 'description']
          },
          {
            model: OrderProduct,
            as: 'orderProduct',
            attributes: ['id', 'quantity', 'numero_pms'],
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name']
              },
              {
                model: Order,
                as: 'order',
                attributes: ['id', 'numero_affaire'],
                include: [
                  {
                    model: Client,
                    as: 'clientInfo',
                    attributes: ['id', 'nom']
                  }
                ]
              }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Transform finitions data for export
      const finitionsData = [];
      
      orderProductFinitions.forEach(opf => {
        // Parse assigned agents and convert IDs to names
        let agentNames = [];
        if (opf.assigned_agents) {
          let agentIds = [];
          
          if (Array.isArray(opf.assigned_agents)) {
            agentIds = opf.assigned_agents;
          } else if (typeof opf.assigned_agents === 'string') {
            try {
              const parsed = JSON.parse(opf.assigned_agents);
              agentIds = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              // If it's not JSON, try to split by comma or treat as single value
              agentIds = opf.assigned_agents.includes(',') 
                ? opf.assigned_agents.split(',').map(id => id.trim())
                : [opf.assigned_agents];
            }
          } else {
            agentIds = [opf.assigned_agents];
          }
          
          // Convert IDs to usernames
          agentNames = agentIds.map(id => {
            // Check if it's already a name (string) or an ID (number)
            const numericId = parseInt(id);
            if (!isNaN(numericId) && userMap[numericId]) {
              return userMap[numericId];
            }
            // If it's not a numeric ID or not found in userMap, return as is (might already be a name)
            return id;
          }).filter(name => name && name.trim() !== '');
        }

        // Create base row data
        const totalQuantity = opf.orderProduct?.quantity || 0;
        const numberOfAgents = agentNames.length > 0 ? agentNames.length : 1;
        
        // Special case: if quantity is 1, each agent gets 1
        let quantityPerAgent;
        if (totalQuantity === 1) {
          quantityPerAgent = 1;
        } else {
          quantityPerAgent = numberOfAgents > 0 ? Math.round(totalQuantity / numberOfAgents) : totalQuantity;
        }

        const baseRowData = {
          'PMS': opf.orderProduct?.numero_pms || '',
          'Article': opf.orderProduct?.product?.name || '',
          'La Finition': opf.finition?.name || '',
          'Date Début': opf.start_date ? 
            new Date(opf.start_date).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '',
          'Date Fin': opf.end_date ? 
            new Date(opf.end_date).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '',
          'N° Affaire': opf.orderProduct?.order?.numero_affaire || '',
          'Client': opf.orderProduct?.order?.clientInfo?.nom || '',
          'Description Finition': opf.finition?.description || '',
          'Date Création': opf.created_at ? 
            new Date(opf.created_at).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '',
          'Date Modification': opf.updated_at ? 
            new Date(opf.updated_at).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : ''
        };

        // If there are agents, create one row per agent with appropriate quantity
        if (agentNames.length > 0) {
          agentNames.forEach((agentName, index) => {
            let agentQuantity;
            
            // Special case: if original quantity is 1, everyone gets 1
            if (totalQuantity === 1) {
              agentQuantity = 1;
            } else {
              // Normal case: split quantity
              agentQuantity = quantityPerAgent;
              if (index === agentNames.length - 1) {
                // For the last agent, give them any remaining quantity due to rounding
                const assignedSoFar = quantityPerAgent * (agentNames.length - 1);
                agentQuantity = totalQuantity - assignedSoFar;
              }
            }

            finitionsData.push({
              'Agent Finition': agentName,
              'Quantité': agentQuantity,
              ...baseRowData
            });
          });
        } else {
          // If no agents, create one row with full quantity
          finitionsData.push({
            'Agent Finition': '',
            'Quantité': totalQuantity,
            ...baseRowData
          });
        }
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(finitionsData);

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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Finitions');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for file download
      const filename = `finitions_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the buffer
      res.send(buffer);

    } catch (error) {
      console.error('Finitions export error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export des finitions'
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
