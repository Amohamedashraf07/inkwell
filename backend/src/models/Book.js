const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  genre: { type: String, default: 'Fiction' },
  year: { type: Number, default: () => new Date().getFullYear() },
  rating: { type: Number, default: 4.0, min: 0, max: 5 },
  copies: { type: Number, default: 5, min: 0 },
  borrowed: { type: Number, default: 0, min: 0 },
  spine: { type: String, default: '#8A5A3D' },
  desc: { type: String, default: '' },
  pages: { type: Number, default: 250 },
  price: { type: Number, default: 12.99, min: 0 },
  cover: { type: String, default: '' }, // real cover URL fetched from Google Books, or '' for placeholder
}, { timestamps: true });

module.exports = mongoose.model('Book', BookSchema);
