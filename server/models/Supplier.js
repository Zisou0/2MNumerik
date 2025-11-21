const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Supplier = sequelize.define('Supplier', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nom du fournisseur'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Adresse email du fournisseur'
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Numéro de téléphone du fournisseur'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse complète du fournisseur'
    },
    specialites: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Spécialités du fournisseur (array of strings: Offset, Sérigraphie, etc.)'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Fournisseur actif ou non'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes sur le fournisseur'
    }
  }, {
    tableName: 'suppliers',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  // Define associations
  Supplier.associate = function(models) {
    // Supplier has many order products (for sous-traitance)
    Supplier.hasMany(models.OrderProduct, {
      foreignKey: 'supplier_id',
      as: 'orderProducts'
    });
    
    // Supplier has many lots
    Supplier.hasMany(models.Lot, {
      foreignKey: 'supplier_id',
      as: 'lots'
    });
  };

  return Supplier;
};
