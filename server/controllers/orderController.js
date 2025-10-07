const { Order, Product, OrderProduct, OrderProductFinition, Finition, Client, Supplier } = require('../models');
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
        infograph, // Alternative parameter name for frontend compatibility
        infograph_null, // Special parameter to include orders with no assigned graphiste
        agent_impression, // Filter by atelier user (agent impression)
        machine_impression, // Filter by machine impression
        etape,
        express,
        bat,
        pack_fin_annee,
        type_sous_traitance,
        search,
        date_from,
        date_to,
        timeFilter,
        sortBy = 'date_limite_livraison_estimee',
        sortOrder = 'ASC'
      } = req.query;

      // Build where clause for filtering (order-level fields only)
      const whereClause = {};
      const includeClause = [];
      
      // Order-level filters - handle commercial with multi-select support
      if (commercial) {
        const commercialValues = commercial.includes(',') ? commercial.split(',') : [commercial];
        whereClause.commercial_en_charge = { [Op.in]: commercialValues };
      }
      
      // Build product-level filters with multi-select support
      const productWhere = {};
      
      // Handle atelier filter - support multiple values
      if (atelier) {
        const atelierValues = atelier.includes(',') ? atelier.split(',') : [atelier];
        productWhere.atelier_concerne = { [Op.in]: atelierValues };
      }
      
      // Handle infograph filter - support multiple values and null values
      if (infographe || infograph || req.query.infograph_null) {
        const infographValue = infographe || infograph;
        const includeNull = req.query.infograph_null === 'true';
        
        if (infographValue && includeNull) {
          // Both specific users and null values
          const infographValues = infographValue.includes(',') ? infographValue.split(',') : [infographValue];
          productWhere.infograph_en_charge = { 
            [Op.or]: [
              { [Op.in]: infographValues },
              { [Op.is]: null }
            ]
          };
        } else if (includeNull) {
          // Only null values (no graphiste assigned)
          productWhere.infograph_en_charge = { [Op.is]: null };
        } else if (infographValue) {
          // Only specific users
          const infographValues = infographValue.includes(',') ? infographValue.split(',') : [infographValue];
          productWhere.infograph_en_charge = { [Op.in]: infographValues };
        }
      }
      
      // Handle agent_impression filter - support multiple values
      if (agent_impression) {
        const agentValues = agent_impression.includes(',') ? agent_impression.split(',') : [agent_impression];
        productWhere.agent_impression = { [Op.in]: agentValues };
      }
      if (machine_impression) productWhere.machine_impression = { [Op.like]: `%${machine_impression}%` };
      
      // Handle etape filter - support multiple values
      if (etape) {
        const etapeValues = etape.includes(',') ? etape.split(',') : [etape];
        productWhere.etape = { [Op.in]: etapeValues };
      }
      
      if (express) productWhere.express = express;
      if (bat) productWhere.bat = bat;
      if (pack_fin_annee !== undefined && pack_fin_annee !== '') {
        productWhere.pack_fin_annee = pack_fin_annee === 'true';
      }
      
      // Handle type_sous_traitance filter - support multiple values
      if (type_sous_traitance) {
        const sousTraitanceValues = type_sous_traitance.includes(',') ? type_sous_traitance.split(',') : [type_sous_traitance];
        productWhere.type_sous_traitance = { [Op.in]: sousTraitanceValues };
      }
      
      // PMS Search - only search in numero_pms field
      if (search) {
        productWhere.numero_pms = { [Op.like]: `%${search}%` };
      }
      
      // Date range filtering for delivery dates
      if (date_from || date_to) {
        const dateCondition = {};
        if (date_from) dateCondition[Op.gte] = new Date(date_from);
        if (date_to) dateCondition[Op.lte] = new Date(date_to + 'T23:59:59'); // Include full day
        productWhere.date_limite_livraison_estimee = dateCondition;
      }
      
      // Status filtering should be at product level since we're showing product rows - support multiple values
      if (statut) {
        const statusValues = statut.includes(',') ? statut.split(',') : [statut];
        productWhere.statut = { [Op.in]: statusValues };
      } else {
        // By default, exclude cancelled and delivered products for dashboard view
        productWhere.statut = { [Op.notIn]: ['annule', 'livre'] };
      }
      
      // Apply role-based filtering
      const userRole = req.user.role;
      if (userRole === 'atelier') {
        // Atelier can see products with:
        // 1. petit format/grand format with etape 'impression' or 'finition'
        // 2. sous-traitance with etape 'pré-presse', 'en production', or 'controle qualité'
        productWhere[Op.or] = [
          {
            atelier_concerne: { [Op.in]: ['petit format', 'grand format'] },
            etape: { [Op.in]: ['impression', 'finition'] }
          },
          {
            atelier_concerne: 'sous-traitance',
            etape: { [Op.in]: ['pré-presse', 'en production', 'controle qualité'] }
          }
        ];
      } else if (userRole === 'infograph') {
        // Infograph can see products with etape: conception, pré-presse, travail graphique, impression, finition
        // Note: etape filter was already set above on line 40: if (etape) productWhere.etape = etape;
      }
      // Commercial (or any other role) can see everything - no additional filtering
      
      // Handle client filtering separately if not part of search
      if (client && !search) {
        // For complex queries with sorting by delivery date, we'll handle client filtering differently
        // to avoid subquery issues with clientInfo joins
        if (sortBy === 'date_limite_livraison_estimee') {
          // Only use the legacy client field for the initial sorting query
          whereClause.client = { [Op.like]: `%${client}%` };
        } else {
          // For simple queries, use both legacy and new client fields
          whereClause[Op.or] = [
            { client: { [Op.like]: `%${client}%` } }, // Legacy client field
            { '$clientInfo.nom$': { [Op.like]: `%${client}%` } } // New client relationship
          ];
        }
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
        
        // Build include array for the first query
        const firstQueryIncludes = [
          {
            model: OrderProduct,
            as: 'orderProducts',
            attributes: [],
            where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
            required: Object.keys(productWhere).length > 0
          }
        ];
        
        // Add Client model if client filtering is needed
        if (client && !search) {
          firstQueryIncludes.push({
            model: Client,
            as: 'clientInfo',
            attributes: [],
            required: false
          });
        }
        
        const orderedIds = await Order.findAll({
          attributes: ['id'],
          include: firstQueryIncludes,
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
            orders: []
          });
        }
        
        // Create a clean where clause without client filter since we already filtered by IDs
        const cleanWhereClause = { ...whereClause };
        if (client && !search) {
          delete cleanWhereClause[Op.or];
        }
        
        // Now get the full data with proper includes
        queryOptions = {
          where: {
            ...cleanWhereClause,
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
          ]
        };
      } else {
        // Standard query for other sorts
        queryOptions = {
          where: whereClause,
          order: [[sortBy, sortOrder]],
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
        
        // Build include array for the second query
        const secondQueryIncludes = [
          {
            model: OrderProduct,
            as: 'orderProducts',
            attributes: [],
            where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
            required: Object.keys(productWhere).length > 0
          }
        ];
        
        // Add Client model if client filtering is needed
        if (client && !search) {
          secondQueryIncludes.push({
            model: Client,
            as: 'clientInfo',
            attributes: [],
            required: false
          });
        }
        
        const orderedIds = await Order.findAll({
          attributes: ['id'],
          include: secondQueryIncludes,
          where: whereClause,
          group: ['Order.id'],
          order: [
            [Sequelize.fn('MIN', Sequelize.col('orderProducts.date_limite_livraison_estimee')), 'ASC'],
            ['createdAt', 'DESC']
          ],
          subQuery: false,
          raw: true
        })
        
        // Create a clean where clause without client filter since we already filtered by IDs
        const cleanWhereClause = { ...queryOptions.where };
        if (client && !search) {
          delete cleanWhereClause[Op.or];
        }
        
        // Then get full orders with details
        queryOptions.where = {
          ...cleanWhereClause,
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
        orders: rows
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
      
      const userRole = req.user.role;
      
      // Build include with role-based filtering
      const orderProductsInclude = {
        model: OrderProduct,
        as: 'orderProducts',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'estimated_creation_time']
          },
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'nom', 'email', 'telephone', 'specialites'],
            required: false // Left join - not all products have suppliers
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
      };
      
      // Apply role-based filtering to orderProducts
      if (userRole === 'atelier') {
        // Atelier can see products with:
        // 1. petit format/grand format with etape 'impression' or 'finition'
        // 2. sous-traitance with etape 'pré-presse', 'en production', or 'controle qualité'
        orderProductsInclude.where = {
          [Op.or]: [
            {
              atelier_concerne: { [Op.in]: ['petit format', 'grand format'] },
              etape: { [Op.in]: ['impression', 'finition'] }
            },
            {
              atelier_concerne: 'sous-traitance',
              etape: { [Op.in]: ['pré-presse', 'en production', 'controle qualité'] }
            }
          ]
        };
      } else if (userRole === 'infograph') {
        // Infograph can see products with etape: conception, pré-presse, travail graphique, impression, finition
        // However, for getOrderById, we don't apply strict filtering to allow viewing order details
        // The role-based restrictions are applied at the dashboard level (getAllOrders)
        // orderProductsInclude.where = {
        //   etape: { [Op.in]: ['conception', 'pré-presse', 'travail graphique', 'impression', 'finition'] }
        // };
      }
      // Commercial (or any other role) can see everything - no additional filtering
      
      const order = await Order.findOne({
        where: { id },
        include: [
          orderProductsInclude,
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

        if (product.bat !== undefined && product.bat !== '' && !['avec', 'sans', 'valider'].includes(product.bat)) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Le champ BAT doit être "avec", "sans" ou "valider"' 
          });
        }

        if (product.pack_fin_annee !== undefined && product.pack_fin_annee !== '' && !['true', 'false', true, false].includes(product.pack_fin_annee)) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Le champ Pack fin d\'année doit être "true" ou "false"' 
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
      const uniqueProductIds = [...new Set(productIds)]; // Remove duplicates for validation
      const existingProducts = await Product.findAll({
        where: { id: uniqueProductIds },
        transaction
      });

      if (existingProducts.length !== uniqueProductIds.length) {
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
        machine_impression: product.machine_impression || null,
        etape: product.etape || null,
        statut: product.statut || 'en_cours',
        estimated_work_time_minutes: product.estimated_work_time_minutes || null,
        date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
        atelier_concerne: product.atelier_concerne || null,
        commentaires: product.commentaires || null,
        bat: product.bat || null,
        express: product.express || null,
        pack_fin_annee: product.pack_fin_annee === 'true' || product.pack_fin_annee === true,
        type_sous_traitance: product.type_sous_traitance || null,
        supplier_id: product.supplier_id || null
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
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'nom', 'email', 'telephone', 'specialites'],
                required: false
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
        // Send notifications to infograph users for all new products
        if (completeOrder.orderProducts && completeOrder.orderProducts.length > 0) {
          completeOrder.orderProducts.forEach(orderProduct => {
            io.to('role-infograph').emit('orderEtapeChanged', {
              orderId: completeOrder.id,
              orderProductId: orderProduct.id,
              productId: orderProduct.product_id,
              orderNumber: orderProduct.numero_pms || `Commande #${completeOrder.id}`,
              productName: orderProduct.product?.name || 'Produit non spécifié',
              client: completeOrder.client || completeOrder.clientInfo?.nom || 'Client non spécifié',
              fromEtape: null, // New creation, so from null
              toEtape: orderProduct.etape || 'nouveau',
              message: 'Nouvelle commande ajoutée',
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
              orderProductId: orderProduct.id,
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
          } else if (['conception', 'pré-presse', 'travail graphique', 'impression', 'finition'].includes(etape)) {
            // Commercial can set any etape
          } else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Étape non valide' });
          }
        } else if (userRole === 'infograph') {
          // Infograph can transition: conception -> pré-presse -> travail graphique -> impression -> finition
          if ((order.etape === 'conception' && etape === 'pré-presse') ||
              (order.etape === 'pré-presse' && etape === 'travail graphique') ||
              (order.etape === 'travail graphique' && etape === 'impression') ||
              (order.etape === 'impression' && etape === 'finition')) {
            // Allowed transitions
          } else {
            await transaction.rollback();
            return res.status(400).json({ message: 'Transition d\'étape non autorisée pour votre rôle' });
          }
        } else if (userRole === 'atelier') {
          // Atelier can only work on 'impression' orders but cannot change etape
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
        const uniqueProductIds = [...new Set(productIds)]; // Remove duplicates for validation
        const existingProducts = await Product.findAll({
          where: { id: uniqueProductIds },
          transaction
        });

        if (existingProducts.length !== uniqueProductIds.length) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Un ou plusieurs produits spécifiés n\'existent pas' 
          });
        }

        // Handle products update intelligently
        // Separate existing products (with orderProductId) from new products
        const existingOrderProducts = products.filter(p => p.orderProductId);
        const newProducts = products.filter(p => !p.orderProductId);
        
        // Get current OrderProduct IDs for this order
        const currentOrderProducts = await OrderProduct.findAll({
          where: { order_id: id },
          attributes: ['id'],
          transaction
        });
        const currentOrderProductIds = currentOrderProducts.map(op => op.id);
        
        // Find OrderProducts to delete (not in the existing products list)
        const orderProductIdsToKeep = existingOrderProducts.map(p => p.orderProductId);
        const orderProductIdsToDelete = currentOrderProductIds.filter(
          id => !orderProductIdsToKeep.includes(id)
        );
        
        // Delete OrderProducts that are no longer needed
        if (orderProductIdsToDelete.length > 0) {
          await OrderProduct.destroy({
            where: { id: orderProductIdsToDelete },
            transaction
          });
        }

        // Update existing OrderProducts
        for (const product of existingOrderProducts) {
          await OrderProduct.update({
            product_id: product.productId,
            quantity: product.quantity,
            unit_price: product.unitPrice || null,
            numero_pms: product.numero_pms || null,
            infograph_en_charge: product.infograph_en_charge || null,
            agent_impression: product.agent_impression || null,
            machine_impression: product.machine_impression || null,
            etape: product.etape || null,
            statut: product.statut || 'en_cours',
            estimated_work_time_minutes: product.estimated_work_time_minutes || null,
            date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
            atelier_concerne: product.atelier_concerne || null,
            commentaires: product.commentaires || null,
            bat: product.bat || null,
            express: product.express || null,
            pack_fin_annee: product.pack_fin_annee === 'true' || product.pack_fin_annee === true,
            type_sous_traitance: product.type_sous_traitance || null,
            supplier_id: product.supplier_id || null
          }, {
            where: { id: product.orderProductId },
            transaction
          });

          // Update finitions for existing product
          await OrderProductFinition.destroy({
            where: { order_product_id: product.orderProductId },
            transaction
          });

          if (product.finitions && Array.isArray(product.finitions)) {
            const finitionsToCreate = product.finitions.map(finition => ({
              order_product_id: product.orderProductId,
              finition_id: finition.finition_id,
              assigned_agents: finition.assigned_agents || null,
              start_date: finition.start_date ? new Date(finition.start_date) : null,
              end_date: finition.end_date ? new Date(finition.end_date) : null
            }));
            
            await OrderProductFinition.bulkCreate(finitionsToCreate, { transaction });
          }
        }

        // Create new order-product relationships (only for products without orderProductId)
        if (newProducts.length > 0) {
          const orderProducts = newProducts.map(product => ({
            order_id: id,
            product_id: product.productId,
            quantity: product.quantity,
            unit_price: product.unitPrice || null,
            // Product-specific fields
            numero_pms: product.numero_pms || null,
            infograph_en_charge: product.infograph_en_charge || null,
            agent_impression: product.agent_impression || null,
            machine_impression: product.machine_impression || null,
            etape: product.etape || null,
            statut: product.statut || 'en_cours',
            estimated_work_time_minutes: product.estimated_work_time_minutes || null,
            date_limite_livraison_estimee: product.date_limite_livraison_estimee ? new Date(product.date_limite_livraison_estimee) : null,
            atelier_concerne: product.atelier_concerne || null,
            commentaires: product.commentaires || null,
            bat: product.bat || null,
            express: product.express || null,
            pack_fin_annee: product.pack_fin_annee === 'true' || product.pack_fin_annee === true,
            type_sous_traitance: product.type_sous_traitance || null,
            supplier_id: product.supplier_id || null
          }));

          const createdOrderProducts = await OrderProduct.bulkCreate(orderProducts, { transaction, returning: true });

          // Create finitions for each new order product
          for (let i = 0; i < newProducts.length; i++) {
            const product = newProducts[i];
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
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'nom', 'email', 'telephone', 'specialites'],
                required: false
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
        // Atelier can only see orders with etape 'impression'
        whereClause.etape = { [Op.in]: ['impression'] };
      } else if (userRole === 'infograph') {
        // Infograph can see orders with etape: conception, pré-presse, travail graphique, impression, finition, en production, controle qualité
        whereClause.etape = { [Op.in]: ['conception', 'pré-presse', 'travail graphique', 'impression', 'finition', 'en production', 'controle qualité'] };
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
        // Atelier can see products with:
        // 1. petit format/grand format with etape 'impression' or 'finition'
        // 2. sous-traitance with etape 'pré-presse', 'en production', or 'controle qualité'
        productWhere[Op.or] = [
          {
            atelier_concerne: { [Op.in]: ['petit format', 'grand format'] },
            etape: { [Op.in]: ['impression', 'finition'] }
          },
          {
            atelier_concerne: 'sous-traitance',
            etape: { [Op.in]: ['pré-presse', 'en production', 'controle qualité'] }
          }
        ];
      } else if (userRole === 'infograph') {
        // Infograph can see products with etape: conception, pré-presse, travail graphique, impression, finition, en production, controle qualité
        productWhere.etape = { [Op.in]: ['conception', 'pré-presse', 'travail graphique', 'impression', 'finition', 'en production', 'controle qualité'] };
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

  // Get history orders (delivered and cancelled orders) with pagination
  static async getHistoryOrders(req, res) {
    try {
      const { 
        statut, 
        commercial, 
        client, 
        atelier,
        infographe,
        agent_impression,
        machine_impression,
        etape,
        express,
        bat,
        pack_fin_annee,
        type_sous_traitance,
        search,
        page = 1,
        limit = 30
      } = req.query;

      // Parse pagination parameters
      const pageNumber = parseInt(page) || 1;
      const limitNumber = parseInt(limit) || 30;

      // Build where clause for order-level filtering
      const whereClause = {};
      
      // Order-level filters - handle commercial with multi-select support
      if (commercial) {
        const commercialValues = commercial.includes(',') ? commercial.split(',') : [commercial];
        whereClause.commercial_en_charge = { [Op.in]: commercialValues };
      }
      
      // Build product-level filters for history orders
      const productWhere = {};
      
      // History orders: only delivered and cancelled, or specific status if provided
      if (statut) {
        if (statut === 'livre' || statut === 'annule') {
          productWhere.statut = statut;
        } else {
          // Invalid status for history
          return res.json({
            message: 'Historique des commandes récupéré avec succès',
            orders: []
          });
        }
      } else {
        // Show both delivered and cancelled
        productWhere.statut = { [Op.in]: ['livre', 'annule'] };
      }
      
      // Apply other product-level filters with multi-select support
      if (atelier) {
        const atelierValues = atelier.includes(',') ? atelier.split(',') : [atelier];
        productWhere.atelier_concerne = { [Op.in]: atelierValues };
      }
      
      // Handle infograph filter - support multiple values
      if (infographe) {
        const infographValues = infographe.includes(',') ? infographe.split(',') : [infographe];
        productWhere.infograph_en_charge = { [Op.in]: infographValues };
      }
      
      // Handle agent_impression filter - support multiple values
      if (agent_impression) {
        const agentValues = agent_impression.includes(',') ? agent_impression.split(',') : [agent_impression];
        productWhere.agent_impression = { [Op.in]: agentValues };
      }
      if (machine_impression) productWhere.machine_impression = { [Op.like]: `%${machine_impression}%` };
      
      // Handle etape filter - support multiple values
      if (etape) {
        const etapeValues = etape.includes(',') ? etape.split(',') : [etape];
        productWhere.etape = { [Op.in]: etapeValues };
      }
      
      if (express) productWhere.express = express;
      if (bat) productWhere.bat = bat;
      if (pack_fin_annee !== undefined && pack_fin_annee !== '') {
        productWhere.pack_fin_annee = pack_fin_annee === 'true';
      }
      
      // Handle type_sous_traitance filter - support multiple values
      if (type_sous_traitance) {
        const sousTraitanceValues = type_sous_traitance.includes(',') ? type_sous_traitance.split(',') : [type_sous_traitance];
        productWhere.type_sous_traitance = { [Op.in]: sousTraitanceValues };
      }
      
      // PMS Search
      if (search) {
        productWhere.numero_pms = { [Op.like]: `%${search}%` };
      }
      
      // First, get the total count for pagination metadata  
      let totalCount;
      
      if (client) {
        // When client filtering is needed, use a simpler approach
        // First get all orders that match the client search (both legacy client field and clientInfo.nom)
        const matchingOrders = await Order.findAll({
          where: {
            ...whereClause,
            [Op.or]: [
              { client: { [Op.like]: `%${client}%` } }
            ]
          },
          include: [
            {
              model: Client,
              as: 'clientInfo',
              where: {
                nom: { [Op.like]: `%${client}%` }
              },
              required: false
            }
          ],
          attributes: ['id']
        });
        
        // Extract order IDs that match client search (either by legacy field or clientInfo)
        const orderIds = [];
        matchingOrders.forEach(order => {
          orderIds.push(order.id);
        });
        
        // Also get orders where clientInfo matches but the main query didn't catch them
        const clientMatchingOrders = await Order.findAll({
          include: [
            {
              model: Client,
              as: 'clientInfo',
              where: {
                nom: { [Op.like]: `%${client}%` }
              },
              required: true
            }
          ],
          where: whereClause,
          attributes: ['id']
        });
        
        clientMatchingOrders.forEach(order => {
          if (!orderIds.includes(order.id)) {
            orderIds.push(order.id);
          }
        });
        
        if (orderIds.length === 0) {
          totalCount = 0;
        } else {
          // Count order products for matching orders
          totalCount = await OrderProduct.count({
            where: {
              ...productWhere,
              order_id: { [Op.in]: orderIds }
            },
            distinct: true
          });
        }
      } else {
        // No client filtering, use normal count
        totalCount = await OrderProduct.count({
          where: productWhere,
          include: [
            {
              model: Order,
              as: 'order',
              where: whereClause,
              required: true
            }
          ],
          distinct: true
        });
      }

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limitNumber);
      const offset = (pageNumber - 1) * limitNumber;

      // Query for the paginated order products directly
      let orderProducts;
      
      if (client) {
        // When client filtering is needed, use the same approach as count
        // First get all orders that match the client search
        const matchingOrders = await Order.findAll({
          where: {
            ...whereClause,
            [Op.or]: [
              { client: { [Op.like]: `%${client}%` } }
            ]
          },
          include: [
            {
              model: Client,
              as: 'clientInfo',
              where: {
                nom: { [Op.like]: `%${client}%` }
              },
              required: false
            }
          ],
          attributes: ['id']
        });
        
        // Extract order IDs that match client search
        const orderIds = [];
        matchingOrders.forEach(order => {
          orderIds.push(order.id);
        });
        
        // Also get orders where clientInfo matches
        const clientMatchingOrders = await Order.findAll({
          include: [
            {
              model: Client,
              as: 'clientInfo',
              where: {
                nom: { [Op.like]: `%${client}%` }
              },
              required: true
            }
          ],
          where: whereClause,
          attributes: ['id']
        });
        
        clientMatchingOrders.forEach(order => {
          if (!orderIds.includes(order.id)) {
            orderIds.push(order.id);
          }
        });
        
        if (orderIds.length === 0) {
          orderProducts = [];
        } else {
          // Get order products for matching orders
          orderProducts = await OrderProduct.findAll({
            where: {
              ...productWhere,
              order_id: { [Op.in]: orderIds }
            },
            include: [
              {
                model: Order,
                as: 'order',
                include: [
                  {
                    model: Client,
                    as: 'clientInfo',
                    attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client'],
                    required: false
                  }
                ]
              },
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
            ],
            limit: limitNumber,
            offset: offset,
            order: [
              ['updatedAt', 'DESC'], // OrderProduct's updatedAt for recency
              ['id', 'ASC'] // Secondary sort for consistent ordering
            ]
          });
        }
      } else {
        // No client filtering, use normal query
        orderProducts = await OrderProduct.findAll({
          where: productWhere,
          include: [
            {
              model: Order,
              as: 'order',
              where: whereClause,
              required: true,
              include: [
                {
                  model: Client,
                  as: 'clientInfo',
                  attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client'],
                  required: false
                }
              ]
            },
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
          ],
          limit: limitNumber,
          offset: offset,
          order: [
            ['updatedAt', 'DESC'], // OrderProduct's updatedAt for recency
            ['id', 'ASC'] // Secondary sort for consistent ordering
          ],
          distinct: true
        });
      }

      // Format the response to match the expected structure
      const formattedOrders = [];
      const orderMap = new Map();

      orderProducts.forEach(orderProduct => {
        const order = orderProduct.order;
        if (!orderMap.has(order.id)) {
          orderMap.set(order.id, {
            ...order.toJSON(),
            orderProducts: []
          });
          formattedOrders.push(orderMap.get(order.id));
        }
        // Remove the nested order data from orderProduct to avoid duplication
        const cleanOrderProduct = { ...orderProduct.toJSON() };
        delete cleanOrderProduct.order;
        orderMap.get(order.id).orderProducts.push(cleanOrderProduct);
      });

      // Create pagination metadata
      const pagination = {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalCount: totalCount,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
      };

      res.json({
        message: 'Historique des commandes récupéré avec succès',
        orders: formattedOrders,
        pagination: pagination
      });
    } catch (error) {
      console.error('Get history orders error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Get history order statistics
  static async getHistoryOrderStats(req, res) {
    try {
      // Query OrderProduct table to get history stats
      const stats = await OrderProduct.findAll({
        attributes: [
          'statut',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: {
          statut: { [Op.in]: ['livre', 'annule'] }
        },
        group: ['statut']
      });

      // Format the stats
      const formattedStats = {
        livre: 0,
        annule: 0
      };

      stats.forEach(stat => {
        if (stat.statut === 'livre' || stat.statut === 'annule') {
          formattedStats[stat.statut] = parseInt(stat.dataValues.count);
        }
      });

      const total = formattedStats.livre + formattedStats.annule;

      res.json({
        message: 'Statistiques historique récupérées avec succès',
        stats: {
          ...formattedStats,
          total
        }
      });
    } catch (error) {
      console.error('Get history order stats error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Helper function to check if finitions are completed for status change to 'termine'
  static async checkFinitionsCompleted(orderProductId, atelierConcerne, etape, userRole = null) {
    // Special case: infograph users can always mark 'service crea' as 'termine'
    if (userRole === 'infograph' && atelierConcerne === 'service crea') {
      return true;
    }
    
    // If atelier is 'sous-traitance', check if 'controle qualité' etape is done
    if (atelierConcerne === 'sous-traitance') {
      return etape === 'controle qualité';
    }
    
    // For other ateliers (petit format, grand format, service crea), check if finitions are done
    if (['petit format', 'grand format', 'service crea'].includes(atelierConcerne)) {
      return etape === 'finition';
    }
    
    // Default case - allow completion if we don't have specific rules
    return true;
  }

  // Update individual order product
  static async updateOrderProduct(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { orderId, orderProductId } = req.params;
      const {
        productId, // Add productId support
        quantity,
        numero_pms,
        infograph_en_charge,
        agent_impression,
        machine_impression,
        date_limite_livraison_estimee,
        etape,
        atelier_concerne,
        statut,
        estimated_work_time_minutes,
        bat,
        express,
        pack_fin_annee,
        commentaires,
        type_sous_traitance,
        supplier_id,
        finitions
      } = req.body;

      // Find the order product by its unique ID
      const orderProduct = await OrderProduct.findOne({
        where: {
          id: orderProductId,
          order_id: orderId
        },
        transaction
      });

      if (!orderProduct) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
      }

      // Store the original etape and status for notification checking
      const originalEtape = orderProduct.etape;
      const originalStatus = orderProduct.statut;

      // Validate product exists if productId is being changed
      if (productId && productId !== orderProduct.product_id) {
        const productExists = await Product.findByPk(productId, { transaction });
        if (!productExists) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Le produit spécifié n\'existe pas' });
        }
      }

      // Validation: Check if trying to change status to 'termine'
      if (statut === 'termine' && originalStatus !== 'termine') {
        const currentAtelier = atelier_concerne || orderProduct.atelier_concerne;
        const currentEtape = etape !== undefined ? etape : orderProduct.etape;
        const userRole = req.user.role;
        
        const finitionsCompleted = await OrderController.checkFinitionsCompleted(
          orderProductId, 
          currentAtelier, 
          currentEtape,
          userRole
        );
        
        if (!finitionsCompleted) {
          await transaction.rollback();
          let errorMessage = 'Impossible de marquer comme terminé. ';
          
          if (currentAtelier === 'sous-traitance') {
            errorMessage += 'L\'étape "contrôle qualité" doit être terminée.';
          } else {
            errorMessage += 'L\'étape "finition" doit être terminée.';
          }
          
          return res.status(400).json({ message: errorMessage });
        }
      }

      // Check permissions
      const userRole = req.user.role;
      
      // Validation: Check if trying to change status to 'livre'
      if (statut === 'livre' && originalStatus !== 'livre') {
        if (userRole === 'atelier' || userRole === 'infograph') {
          await transaction.rollback();
          return res.status(403).json({ 
            message: 'Vous n\'avez pas l\'autorisation de changer le statut vers "livré". Seuls les administrateurs et commerciaux peuvent effectuer cette action.' 
          });
        }
      }
      
      // Removed infograph assignment restrictions - any infograph can edit any product

      // Validate finitions if provided
      if (finitions && Array.isArray(finitions)) {
        for (const finition of finitions) {
          if (!finition.finition_id || typeof finition.finition_id !== 'number') {
            await transaction.rollback();
            return res.status(400).json({ 
              message: 'Chaque finition doit avoir un ID valide' 
            });
          }
        }
      }

      // Update the order product
      await orderProduct.update({
        product_id: productId, // Add product_id update support
        quantity,
        numero_pms,
        infograph_en_charge,
        agent_impression,
        machine_impression,
        date_limite_livraison_estimee,
        etape,
        atelier_concerne,
        statut,
        estimated_work_time_minutes,
        bat,
        express,
        pack_fin_annee: pack_fin_annee === 'true' || pack_fin_annee === true,
        commentaires,
        type_sous_traitance,
        supplier_id
      }, { transaction });

      // Update finitions if provided
      if (finitions && Array.isArray(finitions)) {
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
      }

      // Note: Removed automatic order status update to keep status at product level
      // Individual product statuses remain independent of overall order status

      // Return updated order product with product info
      const updatedOrderProduct = await OrderProduct.findOne({
        where: {
          id: orderProductId,
          order_id: orderId
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
        ],
        transaction
      });

      await transaction.commit();

      // Emit real-time event for order product update (after commit)
      const io = req.app.get('io');
      if (io) {
        // Check if product etape changed to 'conception' or 'pré-presse' for infograph notification
        const productEtapeChangedToConception = (originalEtape === null || originalEtape === undefined) && 
                                               etape === 'conception';
        const productEtapeChangedToPrePress = (originalEtape === null || originalEtape === undefined || originalEtape !== 'pré-presse') && 
                                              etape === 'pré-presse';
        
        if (productEtapeChangedToConception) {
          // Fetch complete order with client info for notification
          const orderWithClient = await Order.findByPk(orderId, {
            include: [
              {
                model: Client,
                as: 'clientInfo',
                attributes: ['id', 'nom', 'code_client']
              }
            ]
          });
          
          // Send specific notification to infograph users about new order product available
          io.to('role-infograph').emit('orderEtapeChanged', {
            orderId: parseInt(orderId),
            orderProductId: parseInt(updatedOrderProduct.id),
            productId: parseInt(updatedOrderProduct.product_id),
            orderNumber: updatedOrderProduct.numero_pms || `Commande #${orderId}`,
            productName: updatedOrderProduct.product?.name || 'Produit non spécifié',
            client: orderWithClient?.client || orderWithClient?.clientInfo?.nom || 'Client non spécifié',
            fromEtape: originalEtape,
            toEtape: 'conception',
            message: 'Nouveau produit disponible en conception',
            timestamp: new Date().toISOString()
          });
        }
        
        if (productEtapeChangedToPrePress) {
          // Fetch complete order with client info for notification
          const orderWithClient = await Order.findByPk(orderId, {
            include: [
              {
                model: Client,
                as: 'clientInfo',
                attributes: ['id', 'nom', 'code_client']
              }
            ]
          });
          
          // Send specific notification to infograph users about new order product in pre-press
          io.to('role-infograph').emit('orderEtapeChanged', {
            orderId: parseInt(orderId),
            orderProductId: parseInt(updatedOrderProduct.id),
            productId: parseInt(updatedOrderProduct.product_id),
            orderNumber: updatedOrderProduct.numero_pms || `Commande #${orderId}`,
            productName: updatedOrderProduct.product?.name || 'Produit non spécifié',
            client: orderWithClient?.client || orderWithClient?.clientInfo?.nom || 'Client non spécifié',
            fromEtape: originalEtape,
            toEtape: 'pré-presse',
            message: 'Nouveau produit disponible en pré-presse',
            timestamp: new Date().toISOString()
          });
        }
        
        // Check if product etape changed TO 'impression' for atelier notification
        const productEtapeChangedToImpression = originalEtape !== 'impression' && etape === 'impression';
        
        if (productEtapeChangedToImpression) {
          // Fetch complete order with client info for notification
          const orderWithClient = await Order.findByPk(orderId, {
            include: [
              {
                model: Client,
                as: 'clientInfo',
                attributes: ['id', 'nom', 'code_client']
              }
            ]
          });
          
          // Send specific notification to atelier users about new order product ready for printing
          io.to('role-atelier').emit('orderEtapeChanged', {
            orderId: parseInt(orderId),
            orderProductId: parseInt(updatedOrderProduct.id),
            productId: parseInt(updatedOrderProduct.product_id),
            orderNumber: updatedOrderProduct.numero_pms || `Commande #${orderId}`,
            productName: updatedOrderProduct.product?.name || 'Produit non spécifié',
            client: orderWithClient?.client || orderWithClient?.clientInfo?.nom || 'Client non spécifié',
            fromEtape: originalEtape,
            toEtape: 'impression',
            message: 'Nouveau produit prêt pour impression',
            timestamp: new Date().toISOString()
          });
        }
        
        // Check if product status changed TO 'termine' for commercial notification
        const productStatusChangedToTermine = originalStatus !== 'termine' && statut === 'termine';
        
        if (productStatusChangedToTermine) {
          // Fetch complete order with client info for notification
          const orderWithClient = await Order.findByPk(orderId, {
            include: [
              {
                model: Client,
                as: 'clientInfo',
                attributes: ['id', 'nom', 'code_client']
              }
            ]
          });
          
          // Send specific notification to commercial users about completed order product
          io.to('role-commercial').emit('orderStatusChanged', {
            orderId: parseInt(orderId),
            orderProductId: parseInt(updatedOrderProduct.id),
            productId: parseInt(updatedOrderProduct.product_id),
            orderNumber: updatedOrderProduct.numero_pms || `Commande #${orderId}`,
            productName: updatedOrderProduct.product?.name || 'Produit non spécifié',
            client: orderWithClient?.client || orderWithClient?.clientInfo?.nom || 'Client non spécifié',
            fromStatus: originalStatus,
            toStatus: 'termine',
            message: 'Produit terminé',
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
      // Only rollback if transaction is still active
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error('Update order product error:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  // Delete individual order product
  static async deleteOrderProduct(req, res) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      const { orderId, orderProductId } = req.params;
      
      // Find the order product by its unique ID
      const orderProduct = await OrderProduct.findOne({
        where: {
          id: orderProductId,
          order_id: orderId
        },
        transaction
      });

      if (!orderProduct) {
        await transaction.rollback();
        return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
      }

      // Check permissions - only admin and commercial can delete order products
      const userRole = req.user.role;
      if (userRole !== 'admin' && userRole !== 'commercial') {
        await transaction.rollback();
        return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à supprimer des produits de commande' });
      }

      // Delete the order product (finitions will be deleted automatically due to CASCADE)
      await orderProduct.destroy({ transaction });

      // Check if this was the last product in the order
      const remainingProducts = await OrderProduct.count({
        where: { order_id: orderId },
        transaction
      });

      if (remainingProducts === 0) {
        // If no products remain, delete the entire order
        const order = await Order.findByPk(orderId, { transaction });
        if (order) {
          await order.destroy({ transaction });
          
          await transaction.commit();

          // Emit real-time event for order deletion
          const io = req.app.get('io');
          if (io) {
            io.emit('orderDeleted', { orderId: parseInt(orderId) });
          }

          return res.json({
            message: 'Produit supprimé avec succès. La commande a été supprimée car elle ne contenait plus de produits.',
            orderDeleted: true
          });
        }
      }

      await transaction.commit();

      // Fetch the complete order with remaining products for real-time update
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

      // Emit real-time event for order update
      const io = req.app.get('io');
      if (io) {
        io.emit('orderUpdated', completeOrder);
      }

      res.json({
        message: 'Produit supprimé avec succès',
        orderDeleted: false
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Delete order product error:', error);
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
