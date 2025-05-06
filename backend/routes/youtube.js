const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/youtube/suggest
 * @desc    Proxy for FastAPI YouTube suggestions
 * @access  Private
 */
router.post('/suggest', protect, async (req, res) => {
  try {
    const { query, max_results = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Forward the request to the FastAPI backend
    const response = await axios.post('http://localhost:8000/YtSuggestion', {
      query,
      max_results
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('YouTube proxy error:', error.message);
    
    // Return a more detailed error for debugging
    res.status(500).json({ 
      message: 'Failed to get YouTube suggestions',
      error: error.message,
      details: error.response ? error.response.data : 'No response data'
    });
  }
});

module.exports = router; 