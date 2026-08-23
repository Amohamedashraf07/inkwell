const express = require('express');
const Book = require('../models/Book');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const PALETTE = ['#8A5A3D', '#5F7A68', '#3E5C76', '#B24A32', '#6B4C6B', '#C69749', '#3F5747', '#7A4F3A'];

// Fetch a real cover from the free Google Books API — no key required.
async function fetchCoverFromGoogleBooks(title, author) {
  try {
    const q = encodeURIComponent(`intitle:${title}${author ? ' inauthor:' + author : ''}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
    if (!res.ok) return '';
    const data = await res.json();
    const item = data.items && data.items[0];
    const img = item && item.volumeInfo && item.volumeInfo.imageLinks;
    if (!img) return '';
    return (img.thumbnail || img.smallThumbnail || '').replace('http://', 'https://').replace('zoom=1', 'zoom=2');
  } catch (e) {
    return '';
  }
}

function coverUrl(book) {
  if (book.cover) return book.cover;
  return `https://picsum.photos/seed/inkwell-${book._id}/400/600`;
}

function serialize(book) {
  return {
    _id: book._id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    year: book.year,
    rating: book.rating,
    copies: book.copies,
    borrowed: book.borrowed,
    spine: book.spine,
    desc: book.desc,
    pages: book.pages,
    price: book.price,
    cover: book.cover,
    coverUrl: coverUrl(book),
  };
}

router.get('/', async (req, res) => {
  const books = await Book.find().sort({ createdAt: -1 });
  res.json(books.map(serialize));
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, author, genre, year, copies, rating, price, pages, desc, cover } = req.body;
    if (!title || !author) return res.status(400).json({ message: 'Title and author are required.' });

    let coverToUse = cover || '';
    if (!coverToUse) coverToUse = await fetchCoverFromGoogleBooks(title, author);

    const book = await Book.create({
      title, author, genre: genre || 'Fiction', year: year || new Date().getFullYear(),
      copies: copies || 5, borrowed: 0, rating: rating ?? 4.0, price: price ?? 12.99,
      pages: pages || 250, desc: desc || '', cover: coverToUse,
      spine: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    });
    res.status(201).json(serialize(book));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const patch = { ...req.body };
    delete patch.borrowed; // never let clients directly overwrite the live borrowed count
    const book = await Book.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!book) return res.status(404).json({ message: 'Book not found.' });
    res.json(serialize(book));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found.' });
  res.json({ ok: true });
});

module.exports = router;
module.exports.serialize = serialize;
module.exports.fetchCoverFromGoogleBooks = fetchCoverFromGoogleBooks;
