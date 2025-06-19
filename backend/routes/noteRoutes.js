const express = require('express');
const router = express.Router();
const {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  shareNote,
  getNotesByFolder,
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getNotes).post(protect, createNote);
router.route('/search').get(protect, searchNotes);
router
  .route('/:id')
  .get(protect, getNoteById)
  .put(protect, updateNote)
  .delete(protect, deleteNote);
router.route('/:id/share').post(protect, shareNote);
router.route('/folder/:folderId').get(protect, getNotesByFolder);

module.exports = router; 