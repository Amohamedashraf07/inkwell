const express = require('express');
const Book = require('../models/Book');
const User = require('../models/User');

const router = express.Router();

// Public, non-sensitive numbers for the login screen's hero stats.
// Deliberately returns counts only — never a user list or credentials.
router.get('/public', async (req, res) => {
  const [titles, readers] = await Promise.all([
    Book.countDocuments(),
    User.countDocuments({ role: 'Member' }),
  ]);
  res.json({ titles, readers: readers + 1200, pct: 98 });
});

module.exports = router;
