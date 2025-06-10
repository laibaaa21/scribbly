const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    subscription_tier: {
      type: String,
      enum: ['personal', 'corporate'],
      default: 'personal',
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    preferences: {
      theme: {
        type: String,
        default: 'light',
      },
      fontSize: {
        type: Number,
        default: 14,
      },
      language: {
        type: String,
        default: 'en',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User; 