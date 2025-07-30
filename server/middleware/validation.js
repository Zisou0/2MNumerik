// Validation middleware for user registration
const validateRegistration = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Check required fields
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  // Validate username
  if (username.length < 3) {
    errors.push('Le nom d\'utilisateur doit contenir au moins 3 caractères');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Format d\'email invalide');
  }

  // Validate password
  if (password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0] });
  }

  next();
};

// Validation middleware for user login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Format d\'email invalide' });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin
};
