const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

router.get('/suggestions', async (req, res) => {
  try {
    res.json(aiService.getSuggestions());
  } catch (e) {
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

module.exports = router;
