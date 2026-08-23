const express = require('express');
const Book = require('../models/Book');
const { requireAuth } = require('../middleware/auth');
const { serialize: serializeBook } = require('./books');

const router = express.Router();

async function serializeLibrary(user) {
  const out = [];
  for (const item of user.library) {
    const book = await Book.findById(item.book);
    if (!book) continue;
    out.push({
      bookId: String(item.book),
      progress: item.progress,
      status: item.status,
      source: item.source,
      book: serializeBook(book),
    });
  }
  return out;
}

router.get('/', requireAuth, async (req, res) => {
  res.json(await serializeLibrary(req.user));
});

router.post('/borrow', requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const already = req.user.library.some(l => String(l.book) === String(bookId));
    if (already) return res.status(409).json({ message: 'This book is already in your library.' });

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    if (book.borrowed >= book.copies) return res.status(409).json({ message: 'No copies available right now.' });

    book.borrowed += 1;
    await book.save();

    req.user.library.unshift({ book: book._id, progress: 0, status: 'Reading', source: 'Borrowed' });
    await req.user.save();

    res.status(201).json(await serializeLibrary(req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:bookId/progress', requireAuth, async (req, res) => {
  try {
    const { progress } = req.body;
    const item = req.user.library.find(l => String(l.book) === String(req.params.bookId));
    if (!item) return res.status(404).json({ message: 'Not in your library.' });
    item.progress = Math.max(0, Math.min(100, Number(progress) || 0));
    item.status = item.progress >= 100 ? 'Finished' : 'Reading';
    await req.user.save();
    res.json(await serializeLibrary(req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/return', requireAuth, async (req, res) => {
  try {
    const { bookId } = req.body;
    const item = req.user.library.find(l => String(l.book) === String(bookId));
    if (!item) return res.status(404).json({ message: 'Not in your library.' });
    if (item.source === 'Purchased') return res.status(400).json({ message: 'Purchased books cannot be returned.' });

    const book = await Book.findById(bookId);
    if (book) { book.borrowed = Math.max(0, book.borrowed - 1); await book.save(); }

    req.user.library = req.user.library.filter(l => String(l.book) !== String(bookId));
    await req.user.save();

    res.json(await serializeLibrary(req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
