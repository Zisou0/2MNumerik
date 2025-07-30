const { Order, Product, OrderProduct, Client } = require('../models');
const { getUser } = require('../config/database');
const { Op, Sequelize } = require('sequelize');

class StatisticsController {
  // Get comprehensive business statistics
  static async getBusinessStats(req, res) {
    try {
      const { timeFrame = 'all', startDate, endDate } = req.query;
      
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
      const monthlyTrends = await StatisticsController.getMonthlyTrends(dateFilter);

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
    // Total orders by status
    const ordersByStatus = await Order.findAll({
      attributes: [
        'statut',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: dateFilter,
      group: ['statut']
    });

    // Orders by workshop (now in OrderProduct table)
    const ordersByWorkshop = await OrderProduct.findAll({
      attributes: [
        'atelier_concerne',
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'count']
      ],
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: dateFilter
      }],
      where: {
        atelier_concerne: { [Op.ne]: null }
      },
      group: ['atelier_concerne']
    });

    // Orders by stage (now in OrderProduct table)
    const ordersByStage = await OrderProduct.findAll({
      attributes: [
        'etape',
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('order_id'))), 'count']
      ],
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: dateFilter
      }],
      where: {
        etape: { [Op.ne]: null }
      },
      group: ['etape']
    });

    // Urgent orders (orders with delivery date within 3 days, now checking OrderProduct table)
    const urgentThreshold = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
    const urgentOrders = await OrderProduct.count({
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          ...dateFilter,
          statut: { [Op.notIn]: ['termine', 'livre', 'annule'] }
        }
      }],
      where: {
        date_limite_livraison_estimee: { [Op.lte]: urgentThreshold },
        statut: { [Op.notIn]: ['termine', 'livre', 'annule'] }
      },
      distinct: true,
      col: 'order_id'
    });

    return {
      total: await Order.count({ where: dateFilter }),
      byStatus: StatisticsController.formatGroupedResults(ordersByStatus),
      byWorkshop: StatisticsController.formatGroupedResults(ordersByWorkshop, 'atelier_concerne'),
      byStage: StatisticsController.formatGroupedResults(ordersByStage, 'etape'),
      urgent: urgentOrders
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
  static async getMonthlyTrends(dateFilter) {
    // Get last 12 months of data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyOrders = await Order.findAll({
      attributes: [
        [Sequelize.fn('YEAR', Sequelize.col('createdAt')), 'year'],
        [Sequelize.fn('MONTH', Sequelize.col('createdAt')), 'month'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: twelveMonthsAgo }
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

  // Get dashboard quick stats (lightweight version)
  static async getDashboardStats(req, res) {
    try {
      // Quick stats for dashboard
      const totalOrders = await Order.count();
      const activeOrders = await Order.count({
        where: { statut: { [Op.notIn]: ['termine', 'livre', 'annule'] } }
      });
      const totalClients = await Client.count();
      const activeClients = await Client.count({ where: { actif: true } });
      
      const User = getUser();
      const totalUsers = await User.count();

      // Urgent orders (now checking OrderProduct table)
      const urgentThreshold = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
      const urgentOrders = await OrderProduct.count({
        include: [{
          model: Order,
          as: 'order',
          attributes: [],
          where: {
            statut: { [Op.notIn]: ['termine', 'livre', 'annule'] }
          }
        }],
        where: {
          date_limite_livraison_estimee: { [Op.lte]: urgentThreshold },
          statut: { [Op.notIn]: ['termine', 'livre', 'annule'] }
        },
        distinct: true,
        col: 'order_id'
      });

      res.json({
        success: true,
        stats: {
          orders: {
            total: totalOrders,
            active: activeOrders
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
}

module.exports = StatisticsController;
