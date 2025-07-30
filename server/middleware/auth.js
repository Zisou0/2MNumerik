const jwt = require('jsonwebtoken');
const { getUser, getSequelize } = require('../config/database');

// Middleware to check database connection
const checkConnection = (req, res, next) => {
  try {
    const sequelize = getSequelize();
    if (!sequelize) {
      return res.status(500).json({ message: 'Base de données non disponible' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Base de données non disponible' });
  }
};

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const User = getUser();
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide' });
  }
};

module.exports = {
  checkConnection,
  authenticateToken
};
