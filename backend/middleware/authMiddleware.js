const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        throw new Error('User not found');
      }

      // Add user and subscription tier to request
      req.user = user;
      req.subscription_tier = decoded.subscription_tier || user.subscription_tier || 'personal';

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
};

// Middleware to check subscription tier
const checkTier = (requiredTier) => {
  return (req, res, next) => {
    const userTier = req.subscription_tier || 'personal';
    
    if (userTier === 'corporate' || userTier === requiredTier) {
      next();
    } else {
      res.status(403);
      throw new Error(`This feature requires ${requiredTier} subscription`);
    }
  };
};

module.exports = { protect, admin, checkTier }; 