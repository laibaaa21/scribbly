const Note = require('../models/noteModel');
const asyncHandler = require('express-async-handler');

// @desc    Get all notes for a user
// @route   GET /api/notes
// @access  Private
const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ user: req.user._id });
  res.json(notes);
});

// @desc    Get a single note
// @route   GET /api/notes/:id
// @access  Private
const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (note && (note.user.toString() === req.user._id.toString() || 
    note.collaborators.some(collab => 
      collab.user.toString() === req.user._id.toString()))) {
    res.json(note);
  } else {
    res.status(404);
    throw new Error('Note not found or not authorized');
  }
});

// @desc    Create a note
// @route   POST /api/notes
// @access  Private
const createNote = asyncHandler(async (req, res) => {
  const { title, content, tags, color } = req.body;

  const note = await Note.create({
    user: req.user._id,
    title,
    content,
    tags,
    color,
  });

  if (note) {
    res.status(201).json(note);
  } else {
    res.status(400);
    throw new Error('Invalid note data');
  }
});

// @desc    Update a note
// @route   PUT /api/notes/:id
// @access  Private
const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }

  // Check for user
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Make sure the logged in user matches the note user
  if (note.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const updatedNote = await Note.findByIdAndUpdate(
    req.params.id,
    {
      title: req.body.title !== undefined ? req.body.title : note.title,
      content: req.body.content !== undefined ? req.body.content : note.content,
      folderId: req.body.folderId !== undefined ? req.body.folderId : note.folderId,
      updatedAt: Date.now()
    },
    { new: true }
  );

  res.status(200).json(updatedNote);
});

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (note && (note.user.toString() === req.user._id.toString() || 
    note.collaborators.some(collab => 
      collab.user.toString() === req.user._id.toString() && 
      collab.permission === 'admin'))) {
    
    await note.deleteOne();
    res.json({ message: 'Note removed' });
  } else {
    res.status(404);
    throw new Error('Note not found or not authorized to delete');
  }
});

// @desc    Search notes
// @route   GET /api/notes/search
// @access  Private
const searchNotes = asyncHandler(async (req, res) => {
  const searchTerm = req.query.term;
  
  if (!searchTerm) {
    res.status(400);
    throw new Error('Search term is required');
  }

  const notes = await Note.find({
    $and: [
      { user: req.user._id },
      { $text: { $search: searchTerm } }
    ]
  });

  res.json(notes);
});

// @desc    Share a note with another user
// @route   POST /api/notes/:id/share
// @access  Private
const shareNote = asyncHandler(async (req, res) => {
  const { userId, permission } = req.body;
  
  const note = await Note.findById(req.params.id);
  
  if (!note) {
    res.status(404);
    throw new Error('Note not found');
  }
  
  // Check if requester is the owner
  if (note.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to share this note');
  }
  
  // Check if user is already a collaborator
  const existingCollaborator = note.collaborators.find(
    collab => collab.user.toString() === userId
  );
  
  if (existingCollaborator) {
    existingCollaborator.permission = permission;
  } else {
    note.collaborators.push({ user: userId, permission });
  }
  
  const updatedNote = await note.save();
  res.json(updatedNote);
});

// @desc    Get notes by folder
// @route   GET /api/notes/folder/:folderId
// @access  Private
const getNotesByFolder = asyncHandler(async (req, res) => {
  const notes = await Note.find({
    user: req.user.id,
    folderId: req.params.folderId
  }).sort({ updatedAt: -1 });

  res.status(200).json(notes);
});

module.exports = {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  shareNote,
  getNotesByFolder,
}; 