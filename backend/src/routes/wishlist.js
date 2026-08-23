const express = require('express');
const Book = require('../models/Book');
const { requireAuth } = require('../middleware/auth');
const { serialize: serializeBook } = require('./books');

const router = express.Router();

async function serializeWishlist(user) {
  const out = [];
  for (const bookId of user.wishlist) {
    const book = await Book.findById(bookId);
    if (book) out.push({ bookId: String(bookId), book: serializeBook(book) });
  }
  return out;
}

router.get('/', requireAuth, async (req, res) => {
  res.json(await serializeWishlist(req.user));
});

router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const idx = req.user.wishlist.findIndex(id => String(id) === String(bookId));
    let wishlisted;
    if (idx > -1) { req.user.wishlist.splice(idx, 1); wishlisted = false; }
    else { req.user.wishlist.push(bookId); wishlisted = true; }
    await req.user.save();
    res.json({ wishlisted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
