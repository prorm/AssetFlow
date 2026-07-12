const express = require('express');
const { auth } = require('../middleware/auth');
const { askGroq } = require('../services/groqService');
const { AssetCategory, Department } = require('../models');

const router = express.Router();

router.post('/smart-search', auth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Fetch categories and departments for the AI to map against
    const categories = await AssetCategory.find({}, '_id name').lean();
    const departments = await Department.find({}, '_id name').lean();

    const categoryInstructions = categories.map(c => `"${c.name}" -> "${c._id}"`).join(', ');
    const departmentInstructions = departments.map(d => `"${d.name}" -> "${d._id}"`).join(', ');

    const systemPrompt = `You are a smart search parser for an enterprise asset management system called AssetFlow.
Your job is to convert a user's natural language query into a JSON filter object that can be used to query assets.

## Available Filter Fields

1. "categoryId": A MongoDB ObjectId string. Map the user's intent to one of these categories: ${categoryInstructions}.
   - SYNONYM GUIDE for categories:
     - "laptops", "computers", "PCs", "desktops", "monitors", "keyboards", "phones", "tablets" → look for "Electronics" or the closest match
     - "chairs", "tables", "desks", "shelves", "cabinets", "sofas" → look for "Furniture" or the closest match
     - "cars", "trucks", "bikes", "vans", "motorcycles", "scooters" → look for "Vehicles" or the closest match
     - "projectors", "printers", "scanners", "routers", "switches" → look for "Electronics" or "Equipment" or the closest match
   - If no category matches at all, omit this field entirely.

2. "status": Must be EXACTLY one of: "Available", "Allocated", "Reserved", "UnderMaintenance", "Lost", "Retired", "Disposed".
   - SYNONYM GUIDE for status:
     - "available", "free", "idle", "not in use", "unassigned", "spare" → "Available"
     - "allocated", "in use", "assigned", "given out", "checked out", "lent" → "Allocated"
     - "reserved", "booked", "held" → "Reserved"
     - "maintenance", "under maintenance", "broken", "faulty", "defective", "repair", "being fixed", "out of service" → "UnderMaintenance"
     - "lost", "missing", "gone", "can't find", "disappeared" → "Lost"
     - "retired", "decommissioned", "phased out" → "Retired"
     - "disposed", "thrown away", "scrapped", "recycled" → "Disposed"
   - If the user mentions "overdue" or "late" or "past due", set status to "Allocated" and also set "overdue" to true.
   - YOU MUST include this field if the user mentions ANY status-related word. Be aggressive about detecting status intent.

3. "departmentId": A MongoDB ObjectId string. Map to one of: ${departmentInstructions}.
   - Match phrases like "in engineering", "from HR", "marketing department", "sales team" to the closest department.
   - If no department matches, omit this field.

4. "search": A free-text string for searching by asset name, tag, or serial number.
   - Only use this for specific asset names or identifiers the user mentions (e.g., "MacBook", "AF-0042").
   - Do NOT put generic category words here — use categoryId instead.

5. "overdue": A boolean. Set to true ONLY when the user asks about "overdue", "late", "past due", or "not returned on time" items.

6. "condition": Must be one of: "New", "Good", "Fair", "Poor", "Damaged".
   - Match "damaged", "broken condition", "poor condition", "worn out" to the appropriate value.
   - Only set this if the user specifically asks about physical condition, NOT operational status.

## Rules
- Return ONLY a valid JSON object with the applicable keys. Do NOT include keys for fields you cannot determine.
- Be aggressive about extracting meaning. If the user says "show me laptops", that means categoryId should map to Electronics. If they say "broken items", status should be "UnderMaintenance".
- If the user's query is too vague to extract any filters, return an empty object: {}
- NEVER return explanatory text, only the JSON object.

## Examples
- "show available laptops" → {"categoryId": "<electronics_id>", "status": "Available"}
- "find broken assets" → {"status": "UnderMaintenance"}
- "overdue items in engineering" → {"status": "Allocated", "overdue": true, "departmentId": "<engineering_id>"}
- "missing vehicles" → {"categoryId": "<vehicles_id>", "status": "Lost"}
- "MacBook Pro" → {"search": "MacBook Pro"}
- "damaged furniture" → {"categoryId": "<furniture_id>", "condition": "Damaged"}`;

    const parsedFilters = await askGroq(systemPrompt, query);
    console.log("AI Parsed Filters:", parsedFilters);
    
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
