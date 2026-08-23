const express = require('express');
const Book = require('../models/Book');
const { requireAuth } = require('../middleware/auth');
const { serialize: serializeBook } = require('./books');

const router = express.Router();

async function serializeCart(user) {
  const out = [];
  for (const item of user.cart) {
    const book = await Book.findById(item.book);
    if (book) out.push({ bookId: String(item.book), qty: item.qty, book: serializeBook(book) });
  }
  return out;
}

router.get('/', requireAuth, async (req, res) => {
  res.json(await serializeCart(req.user));
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { bookId, qty } = req.body;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found.' });

    const item = req.user.cart.find(c => String(c.book) === String(bookId));
    if (item) item.qty += (qty || 1);
    else req.user.cart.push({ book: bookId, qty: qty || 1 });
    await req.user.save();
    res.status(201).json(await serializeCart(req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:bookId', requireAuth, async (req, res) => {
  try {
    const item = req.user.cart.find(c => String(c.book) === String(req.params.bookId));
    if (!item) return res.status(404).json({ message: 'Not in cart.' });
    item.qty = Math.max(1, Number(req.body.qty) || 1);
    await req.user.save();
    res.json(await serializeCart(req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:bookId', requireAuth, async (req, res) => {
  req.user.cart = req.user.cart.filter(c => String(c.book) !== String(req.params.bookId));
  await req.user.save();
  res.json(await serializeCart(req.user));
});

module.exports = router;
