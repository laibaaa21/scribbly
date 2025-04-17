const express = require('express');
const router = express.Router();
const {
  getMindmaps,
  getMindmapById,
  createMindmap,
  updateMindmap,
  deleteMindmap,
  shareMindmap,
} = require('../controllers/mindmapController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getMindmaps).post(protect, createMindmap);
router
  .route('/:id')
  .get(protect, getMindmapById)
  .put(protect, updateMindmap)
  .delete(protect, deleteMindmap);
router.route('/:id/share').post(protect, shareMindmap);

module.exports = router; 