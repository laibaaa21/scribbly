const mongoose = require('mongoose');

// Define schema for individual mindmap nodes
const nodeSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  children: {
    type: [mongoose.Schema.Types.Mixed], // This allows for nested node structure
    default: [],
  },
  // Optional styling attributes
  color: {
    type: String,
    default: null,
  },
  shape: {
    type: String,
    enum: ['circle', 'rectangle', 'ellipse', null],
    default: null,
  },
  notes: {
    type: String,
    default: null,
  },
});

const mindmapSchema = mongoose.Schema(
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
    description: {
      type: String,
      default: '',
    },
    rootNode: nodeSchema,
    tags: [
      {
        type: String,
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
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
    sourceNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Mindmap = mongoose.model('Mindmap', mindmapSchema);

module.exports = Mindmap; 