const Mindmap = require('../models/mindmapModel');
const asyncHandler = require('express-async-handler');

// @desc    Get all mindmaps for a user
// @route   GET /api/mindmaps
// @access  Private
const getMindmaps = asyncHandler(async (req, res) => {
  const mindmaps = await Mindmap.find({ user: req.user._id });
  res.json(mindmaps);
});

// @desc    Get a single mindmap
// @route   GET /api/mindmaps/:id
// @access  Private
const getMindmapById = asyncHandler(async (req, res) => {
  const mindmap = await Mindmap.findById(req.params.id);

  if (mindmap && (mindmap.user.toString() === req.user._id.toString() || 
      mindmap.isPublic || 
      mindmap.collaborators.some(collab => 
        collab.user.toString() === req.user._id.toString()))) {
    res.json(mindmap);
  } else {
    res.status(404);
    throw new Error('Mindmap not found or not authorized');
  }
});

// @desc    Create a mindmap
// @route   POST /api/mindmaps
// @access  Private
const createMindmap = asyncHandler(async (req, res) => {
  const { title, description, rootNode, tags, isPublic, sourceNoteId } = req.body;

  if (!rootNode || !rootNode.id || !rootNode.text) {
    res.status(400);
    throw new Error('Root node must have id and text properties');
  }

  const mindmap = await Mindmap.create({
    user: req.user._id,
    title,
    description,
    rootNode,
    tags,
    isPublic: isPublic || false,
    sourceNoteId,
  });

  if (mindmap) {
    res.status(201).json(mindmap);
  } else {
    res.status(400);
    throw new Error('Invalid mindmap data');
  }
});

// @desc    Update a mindmap
// @route   PUT /api/mindmaps/:id
// @access  Private
const updateMindmap = asyncHandler(async (req, res) => {
  const { title, description, rootNode, tags, isPublic } = req.body;

  const mindmap = await Mindmap.findById(req.params.id);

  if (mindmap && (mindmap.user.toString() === req.user._id.toString() || 
      mindmap.collaborators.some(collab => 
        collab.user.toString() === req.user._id.toString() && 
        ['write', 'admin'].includes(collab.permission)))) {
    
    mindmap.title = title || mindmap.title;
    mindmap.description = description !== undefined ? description : mindmap.description;
    mindmap.rootNode = rootNode || mindmap.rootNode;
    mindmap.tags = tags || mindmap.tags;
    mindmap.isPublic = isPublic !== undefined ? isPublic : mindmap.isPublic;

    const updatedMindmap = await mindmap.save();
    res.json(updatedMindmap);
  } else {
    res.status(404);
    throw new Error('Mindmap not found or not authorized to update');
  }
});

// @desc    Delete a mindmap
// @route   DELETE /api/mindmaps/:id
// @access  Private
const deleteMindmap = asyncHandler(async (req, res) => {
  const mindmap = await Mindmap.findById(req.params.id);

  if (mindmap && (mindmap.user.toString() === req.user._id.toString() || 
      mindmap.collaborators.some(collab => 
        collab.user.toString() === req.user._id.toString() && 
        collab.permission === 'admin'))) {
    
    await mindmap.deleteOne();
    res.json({ message: 'Mindmap removed' });
  } else {
    res.status(404);
    throw new Error('Mindmap not found or not authorized to delete');
  }
});

// @desc    Share a mindmap with another user
// @route   POST /api/mindmaps/:id/share
// @access  Private
const shareMindmap = asyncHandler(async (req, res) => {
  const { userId, permission } = req.body;
  
  const mindmap = await Mindmap.findById(req.params.id);
  
  if (!mindmap) {
    res.status(404);
    throw new Error('Mindmap not found');
  }
  
  // Check if requester is the owner
  if (mindmap.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to share this mindmap');
  }
  
  // Check if user is already a collaborator
  const existingCollaborator = mindmap.collaborators.find(
    collab => collab.user.toString() === userId
  );
  
  if (existingCollaborator) {
    existingCollaborator.permission = permission;
  } else {
    mindmap.collaborators.push({ user: userId, permission });
  }
  
  const updatedMindmap = await mindmap.save();
  res.json(updatedMindmap);
});

module.exports = {
  getMindmaps,
  getMindmapById,
  createMindmap,
  updateMindmap,
  deleteMindmap,
  shareMindmap,
}; 