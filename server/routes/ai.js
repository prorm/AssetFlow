const express = require('express');
const { auth } = require('../middleware/auth');
const { askGroq } = require('../services/groqService');
const { AssetCategory } = require('../models');

const router = express.Router();

router.post('/smart-search', auth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const categories = await AssetCategory.find({}, '_id name').lean();
    const categoryInstructions = categories.map(c => `"${c.name}" -> "${c._id}"`).join(', ');

    const systemPrompt = `You are a smart search parser for an asset management system.
Convert the user's natural language query into a JSON object for filtering assets.
The available fields and their valid values are:
1. "categoryId": A string ID. Map user intent to one of the following categories: ${categoryInstructions}. If no category matches, omit this field.
2. "status": Must be one of exactly: "Available", "Allocated", "Reserved", "UnderMaintenance", "Lost", "Retired", "Disposed". Omit if not specified.
3. "location": A string representing a location. Omit if not specified.
4. "search": A string to search by asset tag or serial number. Omit if not specified.

Return ONLY a JSON object with these keys if they are found in the query. For example: {"categoryId": "...", "status": "..."}`;

    const parsedFilters = await askGroq(systemPrompt, query);
    
    // If the groq call fails (e.g. returns null), just return an empty filter object so the app continues to function.
    if (!parsedFilters) {
      return res.json({ success: true, data: {} });
    }

    res.json({ success: true, data: parsedFilters });
  } catch (error) {
    console.error('Error in smart search:', error);
    // Fail soft approach
    res.json({ success: true, data: {} });
  }
});

module.exports = router;
