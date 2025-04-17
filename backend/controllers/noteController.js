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
  const { title, content, tags, isArchived, isPinned, color } = req.body;

  const note = await Note.findById(req.params.id);

  if (note && (note.user.toString() === req.user._id.toString() || 
    note.collaborators.some(collab => 
      collab.user.toString() === req.user._id.toString() && 
      ['write', 'admin'].includes(collab.permission)))) {
    
    note.title = title || note.title;
    note.content = content || note.content;
    note.tags = tags || note.tags;
    note.isArchived = isArchived !== undefined ? isArchived : note.isArchived;
    note.isPinned = isPinned !== undefined ? isPinned : note.isPinned;
    note.color = color || note.color;

    const updatedNote = await note.save();
    res.json(updatedNote);
  } else {
    res.status(404);
    throw new Error('Note not found or not authorized to update');
  }
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

module.exports = {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  shareNote,
}; 