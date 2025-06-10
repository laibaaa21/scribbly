const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      subscription_tier: user.subscription_tier,
      isAdmin: user.isAdmin,
      preferences: user.preferences,
      token: generateToken(user._id, user.subscription_tier),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, subscription_tier } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    username,
    email,
    password,
    subscription_tier: subscription_tier || 'personal',
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      subscription_tier: user.subscription_tier,
      isAdmin: user.isAdmin,
      preferences: user.preferences,
      token: generateToken(user._id, user.subscription_tier),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      subscription_tier: user.subscription_tier,
      isAdmin: user.isAdmin,
      preferences: user.preferences,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.subscription_tier = req.body.subscription_tier || user.subscription_tier;
    
    if (req.body.preferences) {
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences,
      };
    }
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      subscription_tier: updatedUser.subscription_tier,
      isAdmin: updatedUser.isAdmin,
      preferences: updatedUser.preferences,
      token: generateToken(updatedUser._id, updatedUser.subscription_tier),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// Generate JWT
const generateToken = (id, subscription_tier) => {
  return jwt.sign(
    { 
      id,
      subscription_tier: subscription_tier || 'personal'
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '30d',
    }
  );
};

module.exports = {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
}; 