const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderProduct = sequelize.define('OrderProduct', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      comment: 'Foreign key to orders table'
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      comment: 'Foreign key to products table'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      },
      comment: 'Quantity of this specific product in the order'
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Price per unit for this product in this order (optional)'
    },
    finitions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of selected finitions for this product in this order. Each finition object contains: {finition_id, additional_cost, additional_time}'
    },
    numero_pms: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Numéro PMS spécifique à ce produit'
    },
    infograph_en_charge: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Infographe assigné à ce produit spécifique'
    },
    etape: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Étape actuelle pour ce produit (conception, pré-presse, impression, finition, découpe)'
    },
    statut: {
      type: DataTypes.ENUM('problem_technique', 'en_cours', 'termine', 'livre', 'annule'),
      allowNull: false,
      defaultValue: 'en_cours',
      comment: 'Statut spécifique à ce produit'
    },
    estimated_work_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Temps de travail estimé en minutes pour ce produit'
    },
    date_limite_livraison_estimee: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date limite de livraison estimée pour ce produit'
    },
    atelier_concerne: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Atelier qui traite ce produit spécifique'
    },
    commentaires: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Commentaires spécifiques à ce produit'
    },
    bat: {
      type: DataTypes.ENUM('avec', 'sans'),
      allowNull: true,
      comment: 'BAT (Bon à tirer) pour ce produit spécifique'
    },
    express: {
      type: DataTypes.ENUM('oui', 'non'),
      allowNull: false,
      defaultValue: 'non',
      comment: 'Express flag pour ce produit spécifique'
    },
    agent_impression: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Agent d\'impression assigné à ce produit spécifique'
    }
  }, {
    tableName: 'order_products',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['order_id', 'product_id'],
        name: 'unique_order_product'
      }
    ]
  });

  // Define associations
  OrderProduct.associate = function(models) {
    // OrderProduct belongs to Order
    OrderProduct.belongsTo(models.Order, {
      foreignKey: 'order_id',
      as: 'order'
    });
    
    // OrderProduct belongs to Product
    OrderProduct.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
    
    // OrderProduct has many OrderProductFinitions
    OrderProduct.hasMany(models.OrderProductFinition, {
      foreignKey: 'order_product_id',
      as: 'orderProductFinitions'
    });
  };

  return OrderProduct;
};
