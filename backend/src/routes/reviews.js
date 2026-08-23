const express = require('express');
const Review = require('../models/Review');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:bookId', async (req, res) => {
  const reviews = await Review.find({ book: req.params.bookId }).sort({ date: -1 });
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  res.json({
    count: reviews.length,
    average,
    reviews: reviews.map(r => ({ userId: r.user, userName: r.userName, rating: r.rating, text: r.text, date: r.date })),
  });
});

router.post('/:bookId', requireAuth, async (req, res) => {
  try {
    const { rating, text } = req.body;
    if (!rating || !text) return res.status(400).json({ message: 'Add a star rating and a comment.' });

    const review = await Review.findOneAndUpdate(
      { book: req.params.bookId, user: req.user._id },
      { rating, text, userName: req.user.name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
