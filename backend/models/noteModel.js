const mongoose = require('mongoose');

const noteSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '#ffffff',
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        permission: {
          type: String,
          enum: ['read', 'write', 'admin'],
          default: 'read',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add text index for content and title to enable text search
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

const Note = mongoose.model('Note', noteSchema);

module.exports = Note; 