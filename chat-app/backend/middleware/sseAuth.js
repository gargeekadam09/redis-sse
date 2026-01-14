const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Special auth middleware for SSE that accepts token from query parameter
const sseAuth = async (req, res, next) => {
  try {
    // Get token from query parameter (for SSE) or Authorization header (fallback)
    const token = req.query.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = sseAuth;
