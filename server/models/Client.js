const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nom du client ou de l\'entreprise'
    },
    code_client: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Code client unique pour identification'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Adresse email du client'
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Numéro de téléphone du client'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Adresse complète du client'
    },
    
    type_client: {
      type: DataTypes.ENUM('particulier', 'entreprise', 'association'),
      allowNull: false,
      defaultValue: 'particulier',
      comment: 'Type de client'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Client actif ou non'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes internes sur le client'
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  // Define associations
  Client.associate = function(models) {
    // Client has many orders
    Client.hasMany(models.Order, {
      foreignKey: 'client_id',
      as: 'orders'
    });
  };

  return Client;
};
