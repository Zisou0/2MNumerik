const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    commercial_en_charge: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nom du commercial responsable du projet'
    },
    numero_affaire: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Numéro d\'affaire associé à la commande'
    },
    numero_dm: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Numéro DM associé à la commande'
    },
    client: {
      type: DataTypes.STRING,
      allowNull: true, // Made nullable since we'll use client_id reference
      comment: 'Nom du client (legacy field, use client_id instead)'
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID du client référencé'
    },
    date_limite_livraison_attendue: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date et heure de livraison attendue par le client pour toute la commande'
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'en_cours', 'termine', 'livre', 'annule'),
      allowNull: false,
      defaultValue: 'en_attente',
      comment: 'État actuel de la commande (calculé automatiquement à partir des produits)'
    },
    commentaires: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Commentaires généraux pour toute la commande'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  // Static method to calculate order status from product statuses
  Order.calculateOverallStatus = function(productStatuses) {
    if (!productStatuses || productStatuses.length === 0) {
      return 'en_attente';
    }

    const statusCounts = {
      'en_attente': 0,
      'en_cours': 0,
      'termine': 0,
      'livre': 0,
      'annule': 0
    };

    // Count each status
    productStatuses.forEach(status => {
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    const total = productStatuses.length;
    
    // If any product is cancelled, order is cancelled
    if (statusCounts.annule > 0) {
      return 'annule';
    }
    
    // If all products are delivered, order is delivered
    if (statusCounts.livre === total) {
      return 'livre';
    }
    
    // If all products are finished or delivered, order is finished
    if (statusCounts.termine + statusCounts.livre === total) {
      return 'termine';
    }
    
    // If any product is in progress, order is in progress
    if (statusCounts.en_cours > 0) {
      return 'en_cours';
    }
    
    // Otherwise, order is waiting
    return 'en_attente';
  };

  // Instance method to update status based on products
  Order.prototype.updateStatusFromProducts = async function() {
    const orderProducts = await this.getOrderProducts();
    const productStatuses = orderProducts.map(op => op.statut);
    const newStatus = Order.calculateOverallStatus(productStatuses);
    
    if (this.statut !== newStatus) {
      this.statut = newStatus;
      await this.save();
    }
    
    return newStatus;
  };

  // Define associations
  Order.associate = function(models) {
    // Order belongs to a client
    Order.belongsTo(models.Client, {
      foreignKey: 'client_id',
      as: 'clientInfo'
    });
    
    // Order has many products through order_products
    Order.belongsToMany(models.Product, {
      through: models.OrderProduct,
      foreignKey: 'order_id',
      otherKey: 'product_id',
      as: 'products'
    });
    
    // Order has many order_products
    Order.hasMany(models.OrderProduct, {
      foreignKey: 'order_id',
      as: 'orderProducts'
    });
  };

  return Order;
};
