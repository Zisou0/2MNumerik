const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'user'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const saltRounds = 10;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      }
    }
  });

  // Instance method to verify password
  User.prototype.verifyPassword = async function(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  };

  // Instance method to get user data without password
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  };

  // Static method to find user by email or username
  User.findByEmailOrUsername = async function(email, username) {
    const { Op } = require('sequelize');
    return await User.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { username: username }
        ]
      }
    });
  };

  return User;
};
