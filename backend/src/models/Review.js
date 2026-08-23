const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, required: true },
}, { timestamps: { createdAt: 'date', updatedAt: false } });

// one review per user per book — resubmitting updates it
ReviewSchema.index({ book: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);
