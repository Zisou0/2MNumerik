require('dotenv').config();
const { Sequelize } = require('sequelize');
const models = require('../models');

let sequelize;

const initializeDatabase = async () => {
  try {
    // Use the models/index.js sequelize instance
    sequelize = models.sequelize;

    // Test the connection
    await sequelize.authenticate();
    console.log('Connected to 2MNumerik database');

    // Note: Don't use sync() in production, use migrations instead
    // await sequelize.sync({ alter: false });
    console.log('Database ready - use migrations for schema changes');
    
    return sequelize;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const getSequelize = () => {
  if (!sequelize) {
    return models.sequelize;
  }
  return sequelize;
};

const getUser = () => {
  return models.User;
};

const getOrder = () => {
  return models.Order;
};

const closeDatabase = async () => {
  if (sequelize) {
    await sequelize.close();
    console.log('Database connections closed');
  }
};

module.exports = {
  initializeDatabase,
  getSequelize,
  getUser,
  getOrder,
  closeDatabase
};
