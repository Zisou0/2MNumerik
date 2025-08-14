const { Order, Product, OrderProduct, OrderProductFinition, Finition, Client } = require('../models');
const { Op, Sequelize } = require('sequelize');

class OrderController {
  // Get all orders with optional filtering
  static async getAllOrders(req, res) {
    try {
      const { 
        statut, 
        commercial, 
        client, 
        atelier,
        infographe,
        etape,
        express,
        bat,
        search,
        date_from,
        date_to,
        timeFilter,
        page = 1, 
        limit = 10,
        sortBy = 'date_limite_livraison_estimee',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause for filtering (order-level fields only)
      const whereClause = {};
      const includeClause = [];
      
      // Order-level filters
      if (commercial) whereClause.commercial_en_charge = { [Op.like]: `%${commercial}%` };
      
      // Build product-level filters
      const productWhere = {};
      if (atelier) productWhere.atelier_concerne = atelier;
      if (infographe) productWhere.infograph_en_charge = { [Op.like]: `%${infographe}%` };
      if (etape) productWhere.etape = etape;
      if (express) productWhere.express = express;
      if (bat) productWhere.bat = bat;
      
      // Date range filtering for delivery dates
      if (date_from || date_to) {
        const dateCondition = {};
        if (date_from) dateCondition[Op.gte] = new Date(date_from);
        if (date_to) dateCondition[Op.lte] = new Date(date_to + 'T23:59:59'); // Include full day
        productWhere.date_limite_livraison_estimee = dateCondition;
      }
      
      // Status filtering should be at product level since we're showing product rows
      if (statut) {
        productWhere.statut = statut;
      } else {
        // By default, exclude cancelled and delivered products for dashboard view
        productWhere.statut = { [Op.notIn]: ['annule', 'livre'] };
      }
      
      // Role-based filtering - now applied at product level
      const userRole = req.user.role;
      if (userRole === 'atelier') {
        // Atelier can only see products with etape 'impression' or 'finition' or 'découpe'
        productWhere.etape = { [Op.in]: ['impression', 'finition', 'découpe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see products with etape: conception, pré-presse, impression, finition, découpe
        productWhere.etape = { [Op.in]: ['conception', 'pré-presse', 'impression', 'finition', 'découpe'] };
      }
      
      // Handle client filtering separately if not part of search
      if (client && !search) {
        whereClause[Op.or] = [
          { client: { [Op.like]: `%${client}%` } }, // Legacy client field
          { '$clientInfo.nom$': { [Op.like]: `%${client}%` } } // New client relationship
        ];
      }

      // Time-based filtering
      if (timeFilter) {
        const now = new Date();
        let dateCondition = {};
        
        switch (timeFilter) {
          case 'active':
            // Show only orders that are not finished (not 'termine', 'livre', or 'annule')
            whereClause.statut = { [Op.notIn]: ['termine', 'livre', 'annule'] };
            break;
          case 'last30days':
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            dateCondition = {
              [Op.or]: [
                // Orders created in last 30 days
                { createdAt: { [Op.gte]: thirtyDaysAgo } },
                // Or active orders regardless of age
                { statut: { [Op.notIn]: ['termine', 'livre', 'annule'] } }
              ]
            };
            Object.assign(whereClause, dateCondition);
            break;
          case 'last90days':
            const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
            dateCondition = {
              [Op.or]: [
                // Orders created in last 90 days
                { createdAt: { [Op.gte]: ninetyDaysAgo } },
                // Or active orders regardless of age
                { statut: { [Op.notIn]: ['termine', 'livre', 'annule'] } }
              ]
            };
            Object.assign(whereClause, dateCondition);
            break;
          case 'all':
          default:
            // No additional filtering
            break;
        }
      }

      let queryOptions;

      if (sortBy === 'date_limite_livraison_estimee') {
        // Special handling for sorting by product delivery dates
        // First, get order IDs sorted by earliest delivery date
        const orderedIds = await Order.findAll({
          attributes: ['id'],
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              attributes: [],
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: Object.keys(productWhere).length > 0
            }
          ],
          where: whereClause,
          group: ['Order.id'],
          order: [
            [Sequelize.fn('MIN', Sequelize.col('orderProducts.date_limite_livraison_estimee')), 'ASC'],
            ['createdAt', 'DESC']
          ],
          subQuery: false,
          raw: true
        });

        const orderIds = orderedIds.map(o => o.id);
        
        // If no orders match the criteria, return empty result
        if (orderIds.length === 0) {
          return res.json({
            message: 'Commandes récupérées avec succès',
            orders: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              totalOrders: 0,
              hasNextPage: false,
              hasPrevPage: page > 1
            }
          });
        }
        
        // Now get the full data with proper includes
        queryOptions = {
          where: {
            ...whereClause,
            id: { [Op.in]: orderIds }
          },
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: false, // Left join to get all products for each order
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'estimated_creation_time']
                },
                {
                  model: OrderProductFinition,
                  as: 'orderProductFinitions',
                  include: [
                    {
                      model: Finition,
                      as: 'finition',
                      attributes: ['id', 'name', 'description']
                    }
                  ]
                }
              ]
            },
            {
              model: Client,
              as: 'clientInfo',
              attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
            }
          ],
          // Preserve the custom order from the first query
          order: [
            [Sequelize.literal(`FIELD(Order.id, ${orderIds.join(',')})`)]
          ],
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      } else {
        // Standard query for other sorts
        queryOptions = {
          where: whereClause,
          order: [[sortBy, sortOrder]],
          limit: parseInt(limit),
          offset: parseInt(offset),
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: Object.keys(productWhere).length > 0,
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'estimated_creation_time']
                },
                {
                  model: OrderProductFinition,
                  as: 'orderProductFinitions',
                  include: [
                    {
                      model: Finition,
                      as: 'finition',
                      attributes: ['id', 'name', 'description']
                    }
                  ]
                }
              ]
            },
            {
              model: Client,
              as: 'clientInfo',
              attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
            }
          ]
        };
      }

      // Get count and rows separately for better control
      let totalCount;
      let rows;

      if (sortBy === 'date_limite_livraison_estimee') {
        // Special handling for sorting by product delivery dates
        // First, get order IDs sorted by earliest delivery date
        const orderedIds = await Order.findAll({
          attributes: ['id'],
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              attributes: [],
              where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
              required: Object.keys(productWhere).length > 0
            }
          ],
          where: whereClause,
          group: ['Order.id'],
          order: [
            [Sequelize.fn('MIN', Sequelize.col('orderProducts.date_limite_livraison_estimee')), 'ASC'],
            ['createdAt', 'DESC']
          ],
          subQuery: false,
          raw: true
        })
        
        // Then get full orders with details
        queryOptions.where = {
          ...queryOptions.where,
          id: { [Op.in]: orderedIds.map(o => o.id) }
        }
      }

      // Execute the main query
      const result = await Order.findAndCountAll(queryOptions)
      rows = result.rows
      
      // Calculate the actual count of order-product combinations that will be displayed
      let actualProductCount = 0
      rows.forEach(order => {
        if (order.orderProducts && order.orderProducts.length > 0) {
          actualProductCount += order.orderProducts.length
        }
      })
      
      // For the dashboard, we want to show the count of actual displayed rows (order-product combinations)
      // rather than the count of orders
      totalCount = actualProductCount

      res.json({
        message: 'Commandes récupérées avec succès',
        orders: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalOrders: totalCount,
          hasNextPage: page * limit < totalCount,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get order by ID
  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      
      // Build where clause with role-based filtering
      const whereClause = { id };
      const userRole = req.user.role;
      
      if (userRole === 'atelier') {
        // Atelier can only see orders with etape 'impression' or 'decoupe'
        whereClause.etape = { [Op.in]: ['impression', 'decoupe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see orders with etape: conception, pré-presse, impression, finition, découpe
        whereClause.etape = { [Op.in]: ['conception', 'pré-presse', 'impression', 'finition', 'découpe'] };
      }
      // Commercial (or any other role) can see everything - no additional filtering
      
      const order = await Order.findOne({
        where: whereClause,
        include: [
          {
            model: OrderProduct,
            as: 'orderProducts',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'estimated_creation_time']
              },
              {
                model: OrderProductFinition,
                as: 'orderProductFinitions',
                include: [
                  {
                    model: Finition,
                    as: 'finition',
                    attributes: ['id', 'name', 'description']
                  }
                ]
              }
            ]
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
          }
        ]
      });
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      res.json({
        message: 'Commande trouvée',
        order: order
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Create new order
  static async createOrder(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const {
        commercial_en_charge,
        numero_affaire,
        numero_dm,
        client,
        client_id, // Add client_id support
        products, // Array of {productId, quantity, unitPrice?, numero_pms, infograph_en_charge, etc.}
        date_limite_livraison_attendue,
        statut = 'en_cours'
      } = req.body;

      // Validate required fields - updated for new structure
      if (!commercial_en_charge || (!client && !client_id) || !products || !Array.isArray(products) || products.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Les champs commercial, client et produits sont requis' 
        });
      }

      // Validate products array
      for (const product of products) {
        if (!product.productId || !product.quantity || product.quantity <= 0) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Chaque produit doit avoir un ID valide et une quantité supérieure à 0' 
          });
        }

        // Validate required product fields
        if (product.express !== undefined && product.express !== '' && !['oui', 'non'].includes(product.express)) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Le champ Express doit être "oui" ou "non"' 
          });
        }

        if (product.bat !== undefined && product.bat !== '' && !['avec', 'sans'].includes(product.bat)) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Le champ BAT doit être "avec" ou "sans"' 
          });
        }

        // Validate finitions if provided
        if (product.finitions && Array.isArray(product.finitions)) {
          for (const finition of product.finitions) {
            if (!finition.finition_id || typeof finition.finition_id !== 'number') {
              await transaction.rollback();
              return res.status(400).json({ 
                message: 'Chaque finition doit avoir un ID valide' 
              });
            }
          }
        }
      }

      // Check if all products exist
      const productIds = products.map(p => p.productId);
      const existingProducts = await Product.findAll({
        where: { id: productIds },
        transaction
      });

      if (existingProducts.length !== productIds.length) {
        await transaction.rollback();
        return res.status(400).json({ 
          message: 'Un ou plusieurs produits spécifiés n\'existent pas' 
        });
      }

      // Create the order - updated for new structure
      const order = await Order.create({
        commercial_en_charge,
        numero_affaire,
        numero_dm,
        client: client || null, // Keep for backward compatibility
        client_id: client_id || null, // New client reference
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : null,
        statut
      }, { transaction });

      // Create order-product relationships with product-specific fields
      const orderProducts = products.map(product => ({
        order_id: order.id,
        product_id: product.productId,
        quantity: product.quantity,
        unit_price: product.unitPrice || null,
        // Product-specific fields
        numero_pms: product.numero_pms || null,
        infograph_en_charge: product.infograph_en_charge || null,
        agent_impression: product.agent_impression || null,
        etape: product.etape || null,
        statut: product.statut || 'en_cours',
        estimated_work_time_minutes: product.estimated_work_time_minutes || null,
        date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
        atelier_concerne: product.atelier_concerne || null,
        commentaires: product.commentaires || null,
        bat: product.bat || null,
        express: product.express || null
      }));

      const createdOrderProducts = await OrderProduct.bulkCreate(orderProducts, { transaction, returning: true });

      // Create finitions for each order product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const orderProduct = createdOrderProducts[i];
        
        if (product.finitions && Array.isArray(product.finitions)) {
          const finitionsToCreate = product.finitions.map(finition => ({
            order_product_id: orderProduct.id,
            finition_id: finition.finition_id,
            assigned_agents: finition.assigned_agents || null,
            start_date: finition.start_date ? new Date(finition.start_date) : null,
            end_date: finition.end_date ? new Date(finition.end_date) : null
          }));
          
          await OrderProductFinition.bulkCreate(finitionsToCreate, { transaction });
        }
      }

      await transaction.commit();

      // Fetch the complete order with products
      const completeOrder = await Order.findByPk(order.id, {
        include: [
          {
            model: OrderProduct,
            as: 'orderProducts',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'estimated_creation_time']
              },
              {
                model: OrderProductFinition,
                as: 'orderProductFinitions',
                include: [
                  {
                    model: Finition,
                    as: 'finition',
                    attributes: ['id', 'name', 'description']
                  }
                ]
              }
            ]
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
          }
        ]
      });

      // Emit real-time event for order creation
      const io = req.app.get('io');
      if (io) {
        // Check if any products were created with etape "conception" for infograph notification
        const productsWithConception = completeOrder.orderProducts?.filter(
          orderProduct => orderProduct.etape === 'conception'
        ) || [];
        
        if (productsWithConception.length > 0) {
          // Send specific notifications to infograph users for each product in conception
          productsWithConception.forEach(orderProduct => {
            io.to('role-infograph').emit('orderEtapeChanged', {
              orderId: completeOrder.id,
              productId: orderProduct.product_id,
              orderNumber: orderProduct.numero_pms || `Commande #${completeOrder.id}`,
              productName: orderProduct.product?.name || 'Produit non spécifié',
              client: completeOrder.client || completeOrder.clientInfo?.nom || 'Client non spécifié',
              fromEtape: null, // New creation, so from null
              toEtape: 'conception',
              message: 'Nouveau produit disponible en conception',
              timestamp: new Date().toISOString()
            });
          });
        }
        
        // Check if any products were created with etape "impression" for atelier notification
        const productsWithImpression = completeOrder.orderProducts?.filter(
          orderProduct => orderProduct.etape === 'impression'
        ) || [];
        
        if (productsWithImpression.length > 0) {
          // Send specific notifications to atelier users for each product in impression
          productsWithImpression.forEach(orderProduct => {
            io.to('role-atelier').emit('orderEtapeChanged', {
              orderId: completeOrder.id,
              productId: orderProduct.product_id,
              orderNumber: orderProduct.numero_pms || `Commande #${completeOrder.id}`,
              productName: orderProduct.product?.name || 'Produit non spécifié',
              client: completeOrder.client || completeOrder.clientInfo?.nom || 'Client non spécifié',
              fromEtape: null, // New creation, so from null
              toEtape: 'impression',
              message: 'Nouveau produit prêt pour impression',
              timestamp: new Date().toISOString()
            });
          });
        }
        
        // Standard order creation notification
        io.emit('orderCreated', completeOrder);
      }

      res.status(201).json({
        message: 'Commande créée avec succès',
        order: completeOrder
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Create order error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce numéro PMS existe déjà' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update order
  static async updateOrder(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { id } = req.params;
      const {
        commercial_en_charge,
        infographe_en_charge,
        numero_pms,
        numero_affaire,
        numero_dm,
        client,
        client_id, // Add client_id support
        products, // Array of {productId, quantity, unitPrice?} - optional for updates
        date_limite_livraison_estimee,
        date_limite_livraison_attendue,
        etape,
        option_finition,
        atelier_concerne,
        statut,
        commentaires,
        estimated_work_time_minutes,
        bat, // New BAT field
        express // New Express field
      } = req.body;

      const order = await Order.findByPk(id, { transaction });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      // Role-based access control - check if user can access this order
      const userRole = req.user.role;
      // Note: Both Infograph and Atelier users can edit orders regardless of order-level etape
      // Their permissions are controlled at the product level and field level
      // Commercial (or any other role) can update everything - no additional filtering
      // Removed restrictive etape-based access control for atelier users

      // Store the original etape for notification checking
      const originalEtape = order.etape;
      
      // Business logic for etape transitions based on user role
      if (etape !== undefined && etape !== order.etape) {
        if (userRole === 'commercial') {
          // Commercial can change etape from undefined to 'conception'
          if (order.etape === null && etape === 'conception') {
            // Allowed transition
          } else if (['conception', 'pré-presse', 'impression', 'finition', 'découpe', 'impression-decoupe'].includes(etape)) {
            // Commercial can set any etape
          } else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Étape non valide' });
          }
        } else if (userRole === 'infograph') {
          // Infograph can transition: conception -> pré-presse -> impression -> finition/découpe
          if ((order.etape === 'conception' && etape === 'pré-presse') ||
              (order.etape === 'pré-presse' && etape === 'impression') ||
              (order.etape === 'impression' && ['finition', 'découpe'].includes(etape))) {
            // Allowed transitions
          } else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Transition d\'étape non autorisée pour votre rôle' });
          }
        } else if (userRole === 'atelier') {
          // Atelier can only work on 'impression' and 'decoupe' orders but cannot change etape
          // Only prevent the update if they're actually trying to change the etape
          if (etape !== undefined && etape !== order.etape) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à changer l\'étape de cette commande' });
          }
        }
      }

      // If products are being updated
      if (products && Array.isArray(products)) {
        // Validate products array
        for (const product of products) {
          if (!product.productId || !product.quantity || product.quantity <= 0) {
            await transaction.rollback();
            return res.status(400).json({ 
              message: 'Chaque produit doit avoir un ID valide et une quantité supérieure à 0' 
            });
          }

          // Validate finitions if provided
          if (product.finitions && Array.isArray(product.finitions)) {
            for (const finition of product.finitions) {
              if (!finition.finition_id || typeof finition.finition_id !== 'number') {
                await transaction.rollback();
                return res.status(400).json({ 
                  message: 'Chaque finition doit avoir un ID valide' 
                });
              }
            }
          }
        }

        // Check if all products exist
        const productIds = products.map(p => p.productId);
        const existingProducts = await Product.findAll({
          where: { id: productIds },
          transaction
        });

        if (existingProducts.length !== productIds.length) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Un ou plusieurs produits spécifiés n\'existent pas' 
          });
        }

        // Remove existing order-product relationships and their finitions
        await OrderProduct.destroy({
          where: { order_id: id },
          transaction
        });

        // Create new order-product relationships
        const orderProducts = products.map(product => ({
          order_id: id,
          product_id: product.productId,
          quantity: product.quantity,
          unit_price: product.unitPrice || null,
          // Product-specific fields
          numero_pms: product.numero_pms || null,
          infograph_en_charge: product.infograph_en_charge || null,
          agent_impression: product.agent_impression || null,
          etape: product.etape || null,
          statut: product.statut || 'en_cours',
          estimated_work_time_minutes: product.estimated_work_time_minutes || null,
          date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
          atelier_concerne: product.atelier_concerne || null,
          commentaires: product.commentaires || null,
          bat: product.bat || null,
          express: product.express || null
        }));

        const createdOrderProducts = await OrderProduct.bulkCreate(orderProducts, { transaction, returning: true });

        // Create finitions for each order product
        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          const orderProduct = createdOrderProducts[i];
          
          if (product.finitions && Array.isArray(product.finitions)) {
            const finitionsToCreate = product.finitions.map(finition => ({
              order_product_id: orderProduct.id,
              finition_id: finition.finition_id,
              assigned_agents: finition.assigned_agents || null,
              start_date: finition.start_date ? new Date(finition.start_date) : null,
              end_date: finition.end_date ? new Date(finition.end_date) : null
            }));
            
            await OrderProductFinition.bulkCreate(finitionsToCreate, { transaction });
          }
        }
      }

      // Update other fields
      await order.update({
        commercial_en_charge: commercial_en_charge || order.commercial_en_charge,
        infographe_en_charge: infographe_en_charge !== undefined ? infographe_en_charge : order.infographe_en_charge,
        numero_pms: numero_pms || order.numero_pms,
        numero_affaire: numero_affaire !== undefined ? numero_affaire : order.numero_affaire,
        numero_dm: numero_dm !== undefined ? numero_dm : order.numero_dm,
        client: client !== undefined ? client : order.client,
        client_id: client_id !== undefined ? client_id : order.client_id,
        date_limite_livraison_estimee: date_limite_livraison_estimee ? new Date(date_limite_livraison_estimee) : order.date_limite_livraison_estimee,
        date_limite_livraison_attendue: date_limite_livraison_attendue ? new Date(date_limite_livraison_attendue) : order.date_limite_livraison_attendue,
        etape: etape !== undefined ? etape : order.etape,
        option_finition: option_finition !== undefined ? option_finition : order.option_finition,
        atelier_concerne: atelier_concerne !== undefined ? atelier_concerne : order.atelier_concerne,
        statut: statut || order.statut,
        commentaires: commentaires !== undefined ? commentaires : order.commentaires,
        estimated_work_time_minutes: estimated_work_time_minutes !== undefined ? estimated_work_time_minutes : order.estimated_work_time_minutes,
        bat: bat !== undefined ? bat : order.bat, // New BAT field
        express: express !== undefined ? express : order.express // New Express field
      }, { transaction });

      await transaction.commit();

      // Fetch the updated order with products
      const updatedOrder = await Order.findByPk(id, {
        include: [
          {
            model: OrderProduct,
            as: 'orderProducts',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'estimated_creation_time']
              },
              {
                model: OrderProductFinition,
                as: 'orderProductFinitions',
                include: [
                  {
                    model: Finition,
                    as: 'finition',
                    attributes: ['id', 'name', 'description']
                  }
                ]
              }
            ]
          },
          {
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
          }
        ]
      });

      // Emit real-time event for order update
      const io = req.app.get('io');
      if (io) {
        // Check if etape changed TO 'conception' from any other state (but not if it was already 'conception')
        const newEtape = etape !== undefined ? etape : updatedOrder.etape;
        const etapeChangedToConception = originalEtape !== 'conception' && newEtape === 'conception';
        
        if (etapeChangedToConception) {
          // Send specific notification to infograph users about new order available
          const notificationData = {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.numero_pms || `Commande #${updatedOrder.id}`,
            client: updatedOrder.client || updatedOrder.clientInfo?.nom || 'Client non spécifié',
            fromEtape: originalEtape,
            toEtape: 'conception',
            message: 'Nouvelle commande disponible en conception',
            timestamp: new Date().toISOString()
          };
          
          io.to('role-infograph').emit('orderEtapeChanged', notificationData);
        }
        
        // Check if etape changed TO 'impression' for atelier notification
        const etapeChangedToImpression = originalEtape !== 'impression' && newEtape === 'impression';
        
        if (etapeChangedToImpression) {
          // Send specific notification to atelier users about new order available for printing
          const atelierNotificationData = {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.numero_pms || `Commande #${updatedOrder.id}`,
            client: updatedOrder.client || updatedOrder.clientInfo?.nom || 'Client non spécifié',
            fromEtape: originalEtape,
            toEtape: 'impression',
            message: 'Nouvelle commande prête pour impression',
            timestamp: new Date().toISOString()
          };
          
          io.to('role-atelier').emit('orderEtapeChanged', atelierNotificationData);
        }
        
        // Standard order update notification
        io.emit('orderUpdated', updatedOrder);
      }

      res.json({
        message: 'Commande mise à jour avec succès',
        order: updatedOrder
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update order error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: 'Ce numéro PMS existe déjà' });
      }
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Delete order
  static async deleteOrder(req, res) {
    try {
      const { id } = req.params;

      // Build where clause with role-based filtering
      const whereClause = { id };
      const userRole = req.user.role;
      
      if (userRole === 'atelier') {
        // Atelier can only see orders with etape 'impression' or 'decoupe'
        whereClause.etape = { [Op.in]: ['impression', 'decoupe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see orders with etape: conception, pré-presse, impression, finition, découpe
        whereClause.etape = { [Op.in]: ['conception', 'pré-presse', 'impression', 'finition', 'découpe'] };
      }
      // Commercial (or any other role) can see everything - no additional filtering

      const order = await Order.findOne({ where: whereClause });
      if (!order) {
        return res.status(404).json({ message: 'Commande non trouvée' });
      }

      // Additional business rule: Only allow deletion for certain roles
      if (userRole === 'atelier') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des commandes' });
      } else if (userRole === 'infograph') {
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des commandes' });
      }
      // Only commercial and admin can delete orders

      // OrderProduct records will be automatically deleted due to CASCADE
      await order.destroy();

      // Emit real-time event for order deletion
      const io = req.app.get('io');
      if (io) {
        io.emit('orderDeleted', { id: parseInt(id) });
      }

      res.json({
        message: 'Commande supprimée avec succès'
      });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get order statistics
  static async getOrderStats(req, res) {
    try {
      // Build product-level where clause for consistency with dashboard filtering
      const productWhere = {
        statut: { [Op.notIn]: ['annule', 'livre'] }
      };

      // Apply role-based filtering at product level
      const userRole = req.user.role;
      if (userRole === 'atelier') {
        // Atelier can only see products with etape 'impression' or 'finition' or 'découpe'
        productWhere.etape = { [Op.in]: ['impression', 'finition', 'découpe'] };
      } else if (userRole === 'infograph') {
        // Infograph can see products with etape: conception, pré-presse, impression, finition, découpe
        productWhere.etape = { [Op.in]: ['conception', 'pré-presse', 'impression', 'finition', 'découpe'] };
      }

      // Query OrderProduct table to get stats at product level
      const stats = await OrderProduct.findAll({
        attributes: [
          'statut',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: productWhere,
        group: ['statut']
      });

      // Format the stats
      const formattedStats = {
        problem_technique: 0,
        en_cours: 0,
        termine: 0,
        livre: 0,
        annule: 0
      };

      stats.forEach(stat => {
        formattedStats[stat.statut] = parseInt(stat.dataValues.count);
      });

      const totalProducts = Object.values(formattedStats).reduce((sum, count) => sum + count, 0);

      res.json({
        message: 'Statistiques récupérées avec succès',
        stats: {
          ...formattedStats,
          total: totalProducts
        }
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update individual order product
  static async updateOrderProduct(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { orderId, productId } = req.params;
      const {
        quantity,
        numero_pms,
        infograph_en_charge,
        agent_impression,
        date_limite_livraison_estimee,
        etape,
        atelier_concerne,
        statut,
        estimated_work_time_minutes,
        bat,
        express,
        commentaires
      } = req.body;

      // Find the order product
      const orderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        transaction
      });

      if (!orderProduct) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
      }

      // Store the original etape for notification checking
      const originalEtape = orderProduct.etape;

      // Check permissions
      const userRole = req.user.role;
      // Removed infograph assignment restrictions - any infograph can edit any product

      // Update the order product
      await orderProduct.update({
        quantity,
        numero_pms,
        infograph_en_charge,
        agent_impression,
        date_limite_livraison_estimee,
        etape,
        atelier_concerne,
        statut,
        estimated_work_time_minutes,
        bat,
        express,
        commentaires
      }, { transaction });

      // Update overall order status if product status changed
      if (statut) {
        const order = await Order.findByPk(orderId, { transaction });
        if (order) {
          await order.updateStatusFromProducts();
        }
      }

      await transaction.commit();

      // Return updated order product with product info
      const updatedOrderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'estimated_creation_time']
          },
          {
            model: OrderProductFinition,
            as: 'orderProductFinitions',
            include: [
              {
                model: Finition,
                as: 'finition',
                attributes: ['id', 'name', 'description']
              }
            ]
          }
        ]
      });      // Emit real-time event for order product update
      const io = req.app.get('io');
      if (io) {
        // Check if product etape changed from null/undefined to 'conception' for infograph notification
        const productEtapeChangedToConception = (originalEtape === null || originalEtape === undefined) && 
                                               etape === 'conception';
        
        if (productEtapeChangedToConception) {
          // Send specific notification to infograph users about new order product available
          io.to('role-infograph').emit('orderEtapeChanged', {
            orderId: parseInt(orderId),
            productId: parseInt(productId),
            orderNumber: updatedOrderProduct.numero_pms || `Commande #${orderId}`,
            productName: updatedOrderProduct.product?.name || 'Produit non spécifié',
            fromEtape: originalEtape,
            toEtape: 'conception',
            message: 'Nouveau produit disponible en conception',
            timestamp: new Date().toISOString()
          });
        }
        
        // Check if product etape changed TO 'impression' for atelier notification
        const productEtapeChangedToImpression = originalEtape !== 'impression' && etape === 'impression';
        
        if (productEtapeChangedToImpression) {
          // Send specific notification to atelier users about new order product ready for printing
          io.to('role-atelier').emit('orderEtapeChanged', {
            orderId: parseInt(orderId),
            productId: parseInt(productId),
            orderNumber: updatedOrderProduct.numero_pms || `Commande #${orderId}`,
            productName: updatedOrderProduct.product?.name || 'Produit non spécifié',
            fromEtape: originalEtape,
            toEtape: 'impression',
            message: 'Nouveau produit prêt pour impression',
            timestamp: new Date().toISOString()
          });
        }
        
        // Fetch the complete order with all products for real-time update
        const completeOrder = await Order.findByPk(orderId, {
          include: [
            {
              model: OrderProduct,
              as: 'orderProducts',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'estimated_creation_time']
                },
                {
                  model: OrderProductFinition,
                  as: 'orderProductFinitions',
                  include: [
                    {
                      model: Finition,
                      as: 'finition',
                      attributes: ['id', 'name', 'description']
                    }
                  ]
                }
              ]
            },
            {
              model: Client,
              as: 'clientInfo',
              attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
            }
          ]
        });

        io.emit('orderUpdated', completeOrder);
      }

      res.json({
        message: 'Produit mis à jour avec succès',
        orderProduct: updatedOrderProduct
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update order product error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Update order product finitions
  static async updateOrderProductFinitions(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { orderId, productId } = req.params;
      const { finitions } = req.body;

      // Validate input
      if (!Array.isArray(finitions)) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Les finitions doivent être un tableau' });
      }

      // Find the order product
      const orderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        transaction
      });

      if (!orderProduct) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
      }

      // Validate finitions
      for (const finition of finitions) {
        if (!finition.finition_id || typeof finition.finition_id !== 'number') {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Chaque finition doit avoir un ID valide' 
          });
        }
      }

      // Remove existing finitions for this order product
      await OrderProductFinition.destroy({
        where: { order_product_id: orderProduct.id },
        transaction
      });

      // Create new finitions
      if (finitions.length > 0) {
        const finitionsToCreate = finitions.map(finition => ({
          order_product_id: orderProduct.id,
          finition_id: finition.finition_id,
          assigned_agents: finition.assigned_agents || null,
          start_date: finition.start_date ? new Date(finition.start_date) : null,
          end_date: finition.end_date ? new Date(finition.end_date) : null
        }));
        
        await OrderProductFinition.bulkCreate(finitionsToCreate, { transaction });
      }

      await transaction.commit();

      // Return updated order product with finitions
      const updatedOrderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'estimated_creation_time']
          },
          {
            model: OrderProductFinition,
            as: 'orderProductFinitions',
            include: [
              {
                model: Finition,
                as: 'finition',
                attributes: ['id', 'name', 'description']
              }
            ]
          }
        ]
      });

      res.json({
        message: 'Finitions mises à jour avec succès',
        orderProduct: updatedOrderProduct
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Update order product finitions error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get finitions for a specific order product
  static async getOrderProductFinitions(req, res) {
    try {
      const { orderId, productId } = req.params;

      // Find the order product
      const orderProduct = await OrderProduct.findOne({
        where: {
          order_id: orderId,
          product_id: productId
        },
        include: [
          {
            model: OrderProductFinition,
            as: 'orderProductFinitions',
            include: [
              {
                model: Finition,
                as: 'finition',
                attributes: ['id', 'name', 'description']
              }
            ]
          }
        ]
      });

      if (!orderProduct) {
        return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
      }

      res.json({
        message: 'Finitions récupérées avec succès',
        finitions: orderProduct.orderProductFinitions
      });
    } catch (error) {
      console.error('Get order product finitions error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = OrderController;
