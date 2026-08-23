const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
  title: String,
  author: String,
  qty: Number,
  price: Number,
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  items: [OrderItemSchema],
  subtotal: Number,
  tax: Number,
  total: Number,
  status: { type: String, default: 'Completed' },
}, { timestamps: { createdAt: 'date', updatedAt: false } });

module.exports = mongoose.model('Order', OrderSchema);
