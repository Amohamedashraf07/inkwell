const express = require('express');
const Book = require('../models/Book');
const Order = require('../models/Order');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function serializeOrder(order) {
  return {
    id: order._id,
    userId: order.user,
    userName: order.userName,
    items: order.items,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    status: order.status,
    date: order.date,
  };
}

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    if (req.user.cart.length === 0) return res.status(400).json({ message: 'Your cart is empty.' });

    const items = [];
    for (const c of req.user.cart) {
      const book = await Book.findById(c.book);
      if (!book) continue;
      items.push({ book: book._id, title: book.title, author: book.author, qty: c.qty, price: book.price });
    }
    if (items.length === 0) return res.status(400).json({ message: 'Your cart is empty.' });

    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const order = await Order.create({
      user: req.user._id, userName: req.user.name, items, subtotal, tax, total, status: 'Completed',
    });

    // add purchased books to the reader's library if not already owned
    for (const i of items) {
      const owned = req.user.library.some(l => String(l.book) === String(i.book));
      if (!owned) req.user.library.unshift({ book: i.book, progress: 0, status: 'Unread', source: 'Purchased' });
    }
    req.user.cart = [];
    await req.user.save();

    res.status(201).json(serializeOrder(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ date: -1 });
  res.json(orders.map(serializeOrder));
});

router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  const orders = await Order.find().sort({ date: -1 });
  res.json(orders.map(serializeOrder));
});

module.exports = router;
