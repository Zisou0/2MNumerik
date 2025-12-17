const { Order, Product, OrderProduct, Client, AtelierTask, OrderProductFinition } = require('../models');
const { getUser } = require('../config/database');
const { Op, Sequelize } = require('sequelize');

class StatisticsController {
  // Helper method to emit statistics updates via WebSocket
  static emitStatsUpdate(io) {
    if (io) {
      console.log('Emitting stats update to all connected clients');
      io.emit('statsChanged', { 
        timestamp: new Date(),
      });
    }
  }
  // Get comprehensive business statistics
  static async getBusinessStats(req, res) {
    try {
      const { timeFrame = 'all', startDate, endDate, monthsToShow = '12' } = req.query;
      
      // Build date filter
      let dateFilter = {};
      const now = new Date();
      
      switch (timeFrame) {
        case 'last7days':
          const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: sevenDaysAgo } };
          break;
        case 'last30days':
          const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: thirtyDaysAgo } };
          break;
        case 'last90days':
          const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: ninetyDaysAgo } };
          break;
        case 'lastYear':
          const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: oneYearAgo } };
          break;
        case 'custom':
          if (startDate && endDate) {
            dateFilter = { 
              createdAt: { 
                [Op.between]: [new Date(startDate), new Date(endDate)] 
              } 
            };
          }
          break;
        case 'all':
        default:
          dateFilter = {};
          break;
      }

      // Get order statistics
      const orderStats = await StatisticsController.getOrderStatistics(dateFilter);
      
      // Get client statistics
      const clientStats = await StatisticsController.getClientStatistics(dateFilter);
      
      // Get revenue statistics (if orders have price information)
      const revenueStats = await StatisticsController.getRevenueStatistics(dateFilter);
      
      // Get production efficiency stats
      const efficiencyStats = await StatisticsController.getEfficiencyStatistics(dateFilter);
      
      // Get team performance stats
      const teamStats = await StatisticsController.getTeamStatistics(dateFilter);
      
      // Get monthly trends
      const monthlyTrends = await StatisticsController.getMonthlyTrends(dateFilter, parseInt(monthsToShow));

      res.json({
        success: true,
        timeFrame,
        data: {
          orders: orderStats,
          clients: clientStats,
          revenue: revenueStats,
          efficiency: efficiencyStats,
          team: teamStats,
          trends: monthlyTrends
        }
      });

    } catch (error) {
      console.error('Error fetching business statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // Order statistics helper
  static async getOrderStatistics(dateFilter) {
    // Convert Order date filter to OrderProduct date filter
    let orderProductDateFilter = {};
    if (Object.keys(dateFilter).length > 0) {
      // Apply the same date filter to OrderProduct.createdAt
      orderProductDateFilter = dateFilter;
    }

    // Total product orders by status (using OrderProduct model only)
    const ordersByStatus = await OrderProduct.findAll({
      attributes: [
        'statut',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: orderProductDateFilter,
      group: ['statut']
    });

    // Product orders by workshop
    const ordersByWorkshop = await OrderProduct.findAll({
      attributes: [
        'atelier_concerne',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        ...orderProductDateFilter,
        atelier_concerne: { [Op.ne]: null }
      },
      group: ['atelier_concerne']
    });

    // Product orders by stage
    const ordersByStage = await OrderProduct.findAll({
      attributes: [
        'etape',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        ...orderProductDateFilter,
        etape: { [Op.ne]: null }
      },
      group: ['etape']
    });

    // Urgent product orders (with delivery date within 3 days)
    const urgentThreshold = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
    const urgentOrders = await OrderProduct.count({
      where: {
        ...orderProductDateFilter,
        date_limite_livraison_estimee: { [Op.lte]: urgentThreshold },
        statut: { [Op.notIn]: ['termine', 'livre', 'annule'] }
      }
    });

    // Express product orders
    const expressOrders = await OrderProduct.count({
      where: {
        ...orderProductDateFilter,
        express: 'oui'
      }
    });

    // Standard product orders (express = 'non')
    const standardOrders = await OrderProduct.count({
      where: {
        ...orderProductDateFilter,
        express: 'non'
      }
    });

    // Total product orders count
    const totalProductOrders = await OrderProduct.count({
      where: orderProductDateFilter
    });

    return {
      total: totalProductOrders,
      byStatus: StatisticsController.formatGroupedResults(ordersByStatus),
      byWorkshop: StatisticsController.formatGroupedResults(ordersByWorkshop, 'atelier_concerne'),
      byStage: StatisticsController.formatGroupedResults(ordersByStage, 'etape'),
      urgent: urgentOrders,
      express: expressOrders,
      standard: standardOrders
    };
  }

  // Client statistics helper
  static async getClientStatistics(dateFilter) {
    // Total clients
    const totalClients = await Client.count();
    const activeClients = await Client.count({ where: { actif: true } });

    // Clients by type
    const clientsByType = await Client.findAll({
      attributes: [
        'type_client',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['type_client']
    });

    // New clients in timeframe
    const newClients = await Client.count({ where: dateFilter });

    // Top clients by order count - simplified approach
    let topClients = [];
    try {
      // If we have a date filter, get orders first then count by client
      if (Object.keys(dateFilter).length > 0) {
        const ordersWithClients = await Order.findAll({
          where: dateFilter,
          include: [{
            model: Client,
            as: 'clientInfo',
            attributes: ['id', 'nom', 'code_client', 'email', 'telephone', 'adresse', 'type_client']
          }],
          attributes: ['client_id']
        });

        // Count orders per client
        const clientOrderCounts = {};
        ordersWithClients.forEach(order => {
          const clientId = order.client_id;
          const clientName = order.clientInfo?.nom || 'Client inconnu';
          if (clientId) {
            if (!clientOrderCounts[clientId]) {
              clientOrderCounts[clientId] = { id: clientId, nom: clientName, orderCount: 0 };
            }
            clientOrderCounts[clientId].orderCount++;
          }
        });

        // Sort and limit
        topClients = Object.values(clientOrderCounts)
          .sort((a, b) => b.orderCount - a.orderCount)
          .slice(0, 10);
      } else {
        // For all-time data, use a simpler query
        const clientsWithOrderCounts = await Client.findAll({
          attributes: [
            'id',
            'nom',
            [Sequelize.literal('(SELECT COUNT(*) FROM orders WHERE orders.client_id = Client.id)'), 'orderCount']
          ],
          having: Sequelize.literal('orderCount > 0'),
          order: [[Sequelize.literal('orderCount'), 'DESC']],
          limit: 10
        });

        topClients = clientsWithOrderCounts.map(client => ({
          id: client.id,
          nom: client.nom,
          orderCount: parseInt(client.dataValues.orderCount) || 0
        }));
      }
    } catch (error) {
      console.error('Error getting top clients:', error);
      topClients = []; // Fall back to empty array
    }

    return {
      total: totalClients,
      active: activeClients,
      inactive: totalClients - activeClients,
      new: newClients,
      byType: StatisticsController.formatGroupedResults(clientsByType, 'type_client'),
      topClients: topClients
    };
  }

  // Revenue statistics helper
  static async getRevenueStatistics(dateFilter) {
    // Get orders with their products and prices
    const ordersWithRevenue = await Order.findAll({
      where: dateFilter,
      include: [{
        model: Product,
        as: 'products',
        through: {
          as: 'orderProduct',
          attributes: ['quantity', 'unit_price']
        }
      }]
    });

    let totalRevenue = 0;
    let completedRevenue = 0;
    let pendingRevenue = 0;

    ordersWithRevenue.forEach(order => {
      let orderTotal = 0;
      order.products.forEach(product => {
        const quantity = product.orderProduct.quantity || 1;
        const unitPrice = product.orderProduct.unit_price || 0;
        orderTotal += quantity * unitPrice;
      });

      totalRevenue += orderTotal;
      
      if (['termine', 'livre'].includes(order.statut)) {
        completedRevenue += orderTotal;
      } else if (!['annule'].includes(order.statut)) {
        pendingRevenue += orderTotal;
      }
    });

    return {
      total: totalRevenue,
      completed: completedRevenue,
      pending: pendingRevenue,
      cancelled: totalRevenue - completedRevenue - pendingRevenue
    };
  }

  // Production efficiency statistics helper
  static async getEfficiencyStatistics(dateFilter) {
    // Average completion time for finished orders (now using OrderProduct table)
    const completedOrderProducts = await OrderProduct.findAll({
      include: [{
        model: Order,
        as: 'order',
        attributes: ['createdAt', 'updatedAt', 'statut'],
        where: {
          ...dateFilter,
          statut: { [Op.in]: ['termine', 'livre'] }
        }
      }],
      where: {
        date_limite_livraison_estimee: { [Op.ne]: null },
        statut: { [Op.in]: ['termine', 'livre'] }
      },
      attributes: [
        'date_limite_livraison_estimee',
        'order_id'
      ]
    });

    let onTimeDeliveries = 0;
    let totalCompletedOrders = 0;
    let totalCompletionTime = 0;
    const processedOrders = new Set();

    completedOrderProducts.forEach(orderProduct => {
      const orderId = orderProduct.order_id;
      
      // Only count each order once
      if (!processedOrders.has(orderId)) {
        processedOrders.add(orderId);
        totalCompletedOrders++;
        
        const createdDate = new Date(orderProduct.order.createdAt);
        const completedDate = new Date(orderProduct.order.updatedAt);
        const estimatedDate = new Date(orderProduct.date_limite_livraison_estimee);
        
        // Calculate completion time in hours
        const completionTimeHours = (completedDate - createdDate) / (1000 * 60 * 60);
        totalCompletionTime += completionTimeHours;
        
        // Check if delivered on time
        if (completedDate <= estimatedDate) {
          onTimeDeliveries++;
        }
      }
    });

    const averageCompletionTime = totalCompletedOrders > 0 
      ? totalCompletionTime / totalCompletedOrders 
      : 0;

    const onTimePercentage = totalCompletedOrders > 0 
      ? (onTimeDeliveries / totalCompletedOrders) * 100 
      : 0;

    return {
      averageCompletionTime: Math.round(averageCompletionTime),
      onTimeDeliveryRate: Math.round(onTimePercentage * 100) / 100,
      totalCompletedOrders,
      onTimeDeliveries
    };
  }

  // Team performance statistics helper
  static async getTeamStatistics(dateFilter) {
    // Orders by commercial (still in Order table)
    const ordersByCommercial = await Order.findAll({
      attributes: [
        'commercial_en_charge',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        ...dateFilter,
        commercial_en_charge: { [Op.ne]: null }
      },
      group: ['commercial_en_charge'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']]
    });

    // Orders by infographer (now in OrderProduct table as infograph_en_charge)
    const ordersByInfographer = await OrderProduct.findAll({
      attributes: [
        'infograph_en_charge',
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'count']
      ],
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: dateFilter
      }],
      where: {
        infograph_en_charge: { [Op.ne]: null }
      },
      group: ['infograph_en_charge'],
      order: [[Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'DESC']]
    });

    // Active team members
    const User = getUser();
    const activeUsers = await User.count({ 
      attributes: { exclude: ['password'] }
    });

    return {
      activeMembers: activeUsers,
      commercialPerformance: StatisticsController.formatGroupedResults(ordersByCommercial, 'commercial_en_charge'),
      infographerPerformance: StatisticsController.formatGroupedResults(ordersByInfographer, 'infograph_en_charge')
    };
  }

  // Monthly trends helper
  static async getMonthlyTrends(dateFilter, monthsToShow = 12) {
    // Get specified number of months of data
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - monthsToShow);

    const monthlyOrders = await Order.findAll({
      attributes: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'year'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: monthsAgo }
      },
      group: [
        Sequelize.fn('YEAR', Sequelize.col('createdAt')),
        Sequelize.fn('MONTH', Sequelize.col('createdAt'))
      ],
      order: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'ASC'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'ASC']
      ]
    });

    return monthlyOrders.map(item => ({
      year: item.dataValues.year,
      month: item.dataValues.month,
      orders: parseInt(item.dataValues.count)
    }));
  }

  // Helper method to format grouped results
  static formatGroupedResults(results, keyField = null) {
    return results.reduce((acc, item) => {
      const key = keyField ? item[keyField] : item.statut;
      acc[key] = parseInt(item.dataValues.count);
      return acc;
    }, {});
  }

  // Get user statistics by role for dashboard rankings
  static async getUserStatsByRole(req, res) {
    try {
      const User = getUser();

      // Get all users with their roles
      const commercialUsers = await User.findAll({
        where: { role: 'commercial' },
        attributes: ['id', 'username', 'role']
      });

      const infographUsers = await User.findAll({
        where: { role: 'infograph' },
        attributes: ['id', 'username', 'role']
      });

      const atelierUsers = await User.findAll({
        where: { role: 'atelier' },
        attributes: ['id', 'username', 'role']
      });

      // Commercial stats: Count orders assigned to each commercial (current month only)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const commercialStats = await Promise.all(
        commercialUsers.map(async (user) => {
          const orderCount = await Order.count({
            where: {
              commercial_en_charge: user.username,
              statut: { [Op.notIn]: ['annule'] },
              createdAt: {
                [Op.between]: [startOfMonth, endOfMonth]
              }
            }
          });

          return {
            username: user.username,
            productOrderCount: orderCount // Keep the same property name for frontend compatibility
          };
        })
      );

      // Sort commercial users by product order count and get top 3
      const topCommercial = commercialStats
        .sort((a, b) => b.productOrderCount - a.productOrderCount)
        .slice(0, 3);

      // Infograph stats: Count different types of product orders (current month only)
      const infographStats = await Promise.all(
        infographUsers.map(async (user) => {
          // Count atelier petit format, grand format, sous traitance
          const atelierOrderCount = await OrderProduct.count({
            where: {
              infograph_en_charge: user.username,
              atelier_concerne: { [Op.in]: ['petit format', 'grand format', 'sous-traitance'] },
              statut: { [Op.notIn]: ['annule'] },
              createdAt: {
                [Op.between]: [startOfMonth, endOfMonth]
              }
            }
          });

          // Count travail graphique orders (service crea with etape = travail graphique)
          const travailGraphiqueCount = await OrderProduct.count({
            where: {
              infograph_en_charge: user.username,
              atelier_concerne: 'service crea',
              etape: 'travail graphique',
              statut: { [Op.notIn]: ['annule'] },
              createdAt: {
                [Op.between]: [startOfMonth, endOfMonth]
              }
            }
          });

          // Count conception orders (service crea with etape = conception)
          const conceptionCount = await OrderProduct.count({
            where: {
              infograph_en_charge: user.username,
              atelier_concerne: 'service crea',
              etape: 'conception',
              statut: { [Op.notIn]: ['annule'] },
              createdAt: {
                [Op.between]: [startOfMonth, endOfMonth]
              }
            }
          });

          return {
            username: user.username,
            atelierOrderCount: atelierOrderCount, // petit format + grand format + sous traitance
            travailGraphiqueCount: travailGraphiqueCount,
            conceptionCount: conceptionCount
          };
        })
      );

      // Atelier stats: Count product orders and tasks assigned (current month only)
      const atelierStats = await Promise.all(
        atelierUsers.map(async (user) => {
          // Count product orders assigned to this atelier user (agent_impression)
          const productOrderCount = await OrderProduct.count({
            where: {
              agent_impression: user.username,
              statut: { [Op.notIn]: ['annule'] },
              createdAt: {
                [Op.between]: [startOfMonth, endOfMonth]
              }
            }
          });

          // Count tasks assigned (check if user.username is in assigned_to JSON array)
          // Use JSON_CONTAINS for MySQL compatibility with null check
          let taskCount = 0;
          try {
            taskCount = await AtelierTask.count({
              where: {
                [Op.and]: [
                  { assigned_to: { [Op.ne]: null } },
                  Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', 
                      Sequelize.col('assigned_to'), 
                      Sequelize.literal(`'"${user.username}"'`)
                    ), 
                    true
                  ),
                  { status: { [Op.notIn]: ['cancelled'] } },
                  { createdAt: { [Op.between]: [startOfMonth, endOfMonth] } }
                ]
              }
            });
          } catch (jsonError) {
            // Fallback: if JSON_CONTAINS fails, try a simple LIKE query
            console.warn(`JSON_CONTAINS failed for user ${user.username}, using fallback:`, jsonError.message);
            taskCount = await AtelierTask.count({
              where: {
                assigned_to: { 
                  [Op.like]: `%"${user.username}"%` 
                },
                status: { [Op.notIn]: ['cancelled'] },
                createdAt: {
                  [Op.between]: [startOfMonth, endOfMonth]
                }
              }
            });
          }

          return {
            username: user.username,
            productOrderCount: productOrderCount,
            taskCount: taskCount
          };
        })
      );

      // Sort atelier users by product order count and get top 3
      const topAtelier = atelierStats
        .sort((a, b) => b.productOrderCount - a.productOrderCount)
        .slice(0, 3);

      // Atelier finitions stats: Count finitions assigned to each atelier user (current month only)
      console.log('=== DEBUGGING FINITIONS STATS ===');
      console.log('Date range:', startOfMonth, 'to', endOfMonth);
      
      const atelierFinitionsStats = await Promise.all(
        atelierUsers.map(async (user) => {
          console.log(`\n--- Checking finitions for user: ${user.username} (ID: ${user.id}) ---`);
          
          // Search for the user ID in the assigned_agents array
          let finitionCount = 0;
          try {
            // Use JSON_CONTAINS to search for the user ID (not username)
            // Use OrderProduct.createdAt for consistency with atelier product orders statistics
            finitionCount = await OrderProductFinition.count({
              include: [{
                model: OrderProduct,
                as: 'orderProduct',
                attributes: [],
                where: {
                  createdAt: {
                    [Op.between]: [startOfMonth, endOfMonth]
                  }
                }
              }],
              where: {
                [Op.and]: [
                  { assigned_agents: { [Op.ne]: null } },
                  Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', 
                      Sequelize.col('assigned_agents'), 
                      Sequelize.literal(`'${user.id}'`)  // Search for user ID, not username
                    ), 
                    true
                  )
                ]
              }
            });
          } catch (jsonError) {
            // Fallback: try LIKE query with user ID
            console.warn(`JSON_CONTAINS failed for user ${user.username}, using fallback:`, jsonError.message);
            finitionCount = await OrderProductFinition.count({
              include: [{
                model: OrderProduct,
                as: 'orderProduct',
                attributes: [],
                where: {
                  createdAt: {
                    [Op.between]: [startOfMonth, endOfMonth]
                  }
                }
              }],
              where: {
                assigned_agents: { 
                  [Op.like]: `%${user.id}%`  // Search for user ID, not username
                }
              }
            });
          }

          // Count tasks assigned (same logic as atelier stats)
          let taskCount = 0;
          try {
            taskCount = await AtelierTask.count({
              where: {
                [Op.and]: [
                  { assigned_to: { [Op.ne]: null } },
                  Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', 
                      Sequelize.col('assigned_to'), 
                      Sequelize.literal(`'"${user.username}"'`)
                    ), 
                    true
                  ),
                  { status: { [Op.notIn]: ['cancelled'] } },
                  { createdAt: { [Op.between]: [startOfMonth, endOfMonth] } }
                ]
              }
            });
          } catch (jsonError) {
            // Fallback: if JSON_CONTAINS fails, try a simple LIKE query
            console.warn(`JSON_CONTAINS failed for user ${user.username}, using fallback:`, jsonError.message);
            taskCount = await AtelierTask.count({
              where: {
                assigned_to: { 
                  [Op.like]: `%"${user.username}"%` 
                },
                status: { [Op.notIn]: ['cancelled'] },
                createdAt: {
                  [Op.between]: [startOfMonth, endOfMonth]
                }
              }
            });
          }
          
          console.log(`Finitions count for ${user.username} (ID: ${user.id}): ${finitionCount}`);
          console.log(`Tasks count for ${user.username}: ${taskCount}`);

          return {
            username: user.username,
            finitionCount: finitionCount,
            taskCount: taskCount
          };
        })
      );

      // Sort atelier users by finition + task count and get top 3
      const topAtelierFinitions = atelierFinitionsStats
        .sort((a, b) => (b.finitionCount + b.taskCount) - (a.finitionCount + a.taskCount))
        .slice(0, 3);

      res.json({
        success: true,
        data: {
          commercial: {
            ranking: topCommercial,
            all: commercialStats
          },
          infograph: {
            all: infographStats // No ranking for infograph, show all users
          },
          atelier: {
            ranking: topAtelier,
            all: atelierStats
          },
          atelierFinitions: {
            ranking: topAtelierFinitions,
            all: atelierFinitionsStats
          }
        }
      });

    } catch (error) {
      console.error('Error fetching user stats by role:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques utilisateur'
      });
    }
  }

  // Get dashboard quick stats (lightweight version)
  static async getDashboardStats(req, res) {
    try {
      // Quick stats for dashboard - using OrderProduct for accurate product order counts
      const totalProductOrders = await OrderProduct.count();
      const activeProductOrders = await OrderProduct.count({
        where: { statut: { [Op.notIn]: ['annule'] } }
      });
      const totalClients = await Client.count();
      const activeClients = await Client.count({ where: { actif: true } });
      
      const User = getUser();
      const totalUsers = await User.count();

      // Urgent product orders
      const urgentThreshold = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
      const urgentOrders = await OrderProduct.count({
        where: {
          date_limite_livraison_estimee: { [Op.lte]: urgentThreshold },
          statut: { [Op.notIn]: ['annule'] }
        }
      });

      // Express product orders
      const expressOrders = await OrderProduct.count({
        where: {
          express: 'oui'
        }
      });

      res.json({
        success: true,
        stats: {
          orders: {
            total: totalProductOrders,
            active: activeProductOrders,
            express: expressOrders
          },
          clients: {
            total: totalClients,
            active: activeClients
          },
          team: {
            total: totalUsers
          },
          urgent: urgentOrders
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques'
      });
    }
  }

  // Static method to trigger stats update from other controllers
  static triggerStatsUpdate(req) {
    const io = req.app.get('io');
    if (io) {
      console.log('Triggering stats update from external controller');
      StatisticsController.emitStatsUpdate(io);
    }
  }

  // Get employee performance statistics
  static async getEmployeeStats(req, res) {
    try {
      const { employeeId } = req.params;
      const { timeFrame = 'last30days', startDate, endDate, monthsToShow = '12' } = req.query;
      
      // Build date filter
      let dateFilter = {};
      const now = new Date();
      
      switch (timeFrame) {
        case 'last7days':
          const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: sevenDaysAgo } };
          break;
        case 'last30days':
          const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: thirtyDaysAgo } };
          break;
        case 'last90days':
          const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: ninetyDaysAgo } };
          break;
        case 'lastYear':
          const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
          dateFilter = { createdAt: { [Op.gte]: oneYearAgo } };
          break;
        case 'custom':
          if (startDate && endDate) {
            dateFilter = { 
              createdAt: { 
                [Op.between]: [new Date(startDate), new Date(endDate)] 
              } 
            };
          }
          break;
        case 'all':
        default:
          dateFilter = {};
          break;
      }

      // Get employee information
      const User = getUser();
      const employee = await User.findByPk(employeeId, {
        attributes: { exclude: ['password'] }
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employé non trouvé'
        });
      }

      let statsData = {};

      // Get role-specific statistics
      switch (employee.role) {
        case 'commercial':
          statsData = await StatisticsController.getCommercialStats(employee.username, dateFilter, parseInt(monthsToShow));
          break;
        case 'infograph':
          statsData = await StatisticsController.getInfographStats(employee.username, dateFilter, parseInt(monthsToShow));
          break;
        case 'atelier':
          statsData = await StatisticsController.getAtelierStats(employee.username, dateFilter, parseInt(monthsToShow));
          break;
        default:
          statsData = { message: 'Type d\'employé non supporté pour les statistiques' };
      }

      res.json({
        success: true,
        employee: employee.toJSON(),
        ...statsData
      });

    } catch (error) {
      console.error('Error fetching employee statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques de l\'employé'
      });
    }
  }

  // Commercial statistics helper
  static async getCommercialStats(username, dateFilter, monthsToShow) {
    // Current orders (en_cours, problem_technique, termine)
    const currentOrders = await Order.count({
      where: {
        ...dateFilter,
        commercial_en_charge: username,
        statut: { [Op.in]: ['en_cours', 'problem_technique', 'termine'] }
      }
    });

    // Delivered orders (livre)
    const deliveredOrders = await Order.count({
      where: {
        ...dateFilter,
        commercial_en_charge: username,
        statut: 'livre'
      }
    });

    // Cancelled orders (annule)
    const cancelledOrders = await Order.count({
      where: {
        ...dateFilter,
        commercial_en_charge: username,
        statut: 'annule'
      }
    });

    // Monthly trends
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - monthsToShow);

    const monthlyTrends = await Order.findAll({
      attributes: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'year'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        commercial_en_charge: username,
        createdAt: { [Op.gte]: monthsAgo }
      },
      group: [
        Sequelize.fn('YEAR', Sequelize.col('createdAt')),
        Sequelize.fn('MONTH', Sequelize.col('createdAt'))
      ],
      order: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'ASC'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'ASC']
      ]
    });

    // Top clients
    const topClients = await Order.findAll({
      attributes: [
        'client_id',
        [Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'count']
      ],
      include: [{
        model: Client,
        as: 'clientInfo',
        attributes: ['nom']
      }],
      where: {
        ...dateFilter,
        commercial_en_charge: username,
        client_id: { [Op.ne]: null }
      },
      group: ['client_id', 'clientInfo.id'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'DESC']],
      limit: 10
    });

    const formattedTrends = monthlyTrends.map(item => ({
      year: item.dataValues.year,
      month: item.dataValues.month,
      monthName: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][item.dataValues.month - 1],
      count: parseInt(item.dataValues.count)
    }));

    const formattedTopClients = topClients.map(item => ({
      name: item.clientInfo?.nom || 'Client inconnu',
      count: parseInt(item.dataValues.count)
    }));

    return {
      commercial: {
        currentOrders,
        deliveredOrders,
        cancelledOrders
      },
      monthlyTrends: formattedTrends,
      topItems: formattedTopClients
    };
  }

  // Infograph statistics helper
  static async getInfographStats(username, dateFilter, monthsToShow) {
    // Apply date filter directly to OrderProduct.createdAt for consistency with RoleBasedStats
    let orderProductFilter = {
      infograph_en_charge: username,
      ...dateFilter
    };

    // Total products assigned to this infograph
    const totalProducts = await OrderProduct.count({
      where: orderProductFilter
    });

    // Completed products
    const completedProducts = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        statut: { [Op.in]: ['termine', 'livre'] }
      }
    });

    // Travail graphique products (service crea with etape = travail graphique)
    const travailGraphiqueProducts = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        atelier_concerne: 'service crea',
        etape: 'travail graphique'
      }
    });

    // Conception products (service crea with etape = conception)
    const conceptionProducts = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        atelier_concerne: 'service crea',
        etape: 'conception'
      }
    });

    // Atelier products (petit format, grand format, sous-traitance)
    const atelierProducts = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        atelier_concerne: { [Op.in]: ['petit format', 'grand format', 'sous-traitance', 'soustraitance'] }
      }
    });

    // Monthly trends
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - monthsToShow);

    const monthlyTrends = await OrderProduct.findAll({
      attributes: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'year'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        infograph_en_charge: username,
        createdAt: { [Op.gte]: monthsAgo }
      },
      group: [
        Sequelize.fn('YEAR', Sequelize.col('createdAt')),
        Sequelize.fn('MONTH', Sequelize.col('createdAt'))
      ],
      order: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'ASC'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'ASC']
      ]
    });

    // Top products
    const topProducts = await OrderProduct.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('OrderProduct.id')), 'count']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['name']
      }],
      where: orderProductFilter,
      group: ['product.id'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('OrderProduct.id')), 'DESC']],
      limit: 10
    });

    const formattedTrends = monthlyTrends.map(item => ({
      year: item.dataValues.year,
      month: item.dataValues.month,
      monthName: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][item.dataValues.month - 1],
      count: parseInt(item.dataValues.count)
    }));

    const formattedTopProducts = topProducts.map(item => ({
      name: item.product?.name || 'Produit inconnu',
      count: parseInt(item.dataValues.count)
    }));

    return {
      infograph: {
        totalProducts,
        completedProducts,
        travailGraphiqueProducts,
        conceptionProducts,
        atelierProducts
      },
      monthlyTrends: formattedTrends,
      topItems: formattedTopProducts
    };
  }

  // Atelier statistics helper
  static async getAtelierStats(username, dateFilter, monthsToShow) {
    // Apply date filter directly to OrderProduct.createdAt for consistency with RoleBasedStats
    let orderProductFilter = {
      agent_impression: username,
      ...dateFilter
    };

    // Current orders (en_cours, problem_technique, termine)
    const currentOrders = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        statut: { [Op.in]: ['en_cours', 'problem_technique', 'termine'] }
      }
    });

    // Delivered orders (livre)
    const deliveredOrders = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        statut: 'livre'
      }
    });

    // Cancelled orders (annule)
    const cancelledOrders = await OrderProduct.count({
      where: {
        ...orderProductFilter,
        statut: 'annule'
      }
    });

    // Total tasks assigned
    let totalTasks = 0;
    try {
      totalTasks = await AtelierTask.count({
        where: {
          [Op.and]: [
            { assigned_to: { [Op.ne]: null } },
            Sequelize.where(
              Sequelize.fn('JSON_CONTAINS', 
                Sequelize.col('assigned_to'), 
                Sequelize.literal(`'"${username}"'`)
              ), 
              true
            ),
            { status: { [Op.notIn]: ['cancelled'] } },
            dateFilter
          ]
        }
      });
    } catch (jsonError) {
      // Fallback: if JSON_CONTAINS fails, try a simple LIKE query
      console.warn(`JSON_CONTAINS failed for user ${username}, using fallback:`, jsonError.message);
      totalTasks = await AtelierTask.count({
        where: {
          assigned_to: { 
            [Op.like]: `%"${username}"%` 
          },
          status: { [Op.notIn]: ['cancelled'] },
          ...dateFilter
        }
      });
    }

    // Monthly trends for products
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - monthsToShow);

    const monthlyTrends = await OrderProduct.findAll({
      attributes: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'year'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        agent_impression: username,
        createdAt: { [Op.gte]: monthsAgo }
      },
      group: [
        Sequelize.fn('YEAR', Sequelize.col('createdAt')),
        Sequelize.fn('MONTH', Sequelize.col('createdAt'))
      ],
      order: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'ASC'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'ASC']
      ]
    });

    // Top products
    const topProducts = await OrderProduct.findAll({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('OrderProduct.id')), 'count']
      ],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['name']
      }],
      where: orderProductFilter,
      group: ['product.id'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('OrderProduct.id')), 'DESC']],
      limit: 10
    });

    const formattedTrends = monthlyTrends.map(item => ({
      year: item.dataValues.year,
      month: item.dataValues.month,
      monthName: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][item.dataValues.month - 1],
      count: parseInt(item.dataValues.count)
    }));

    const formattedTopProducts = topProducts.map(item => ({
      name: item.product?.name || 'Produit inconnu',
      count: parseInt(item.dataValues.count)
    }));

    return {
      atelier: {
        currentOrders,
        deliveredOrders,
        cancelledOrders,
        totalTasks
      },
      monthlyTrends: formattedTrends,
      topItems: formattedTopProducts
    };
  }
}

module.exports = StatisticsController;
