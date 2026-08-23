const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const LibraryItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  progress: { type: Number, default: 0 },
  status: { type: String, default: 'Reading' }, // Reading | Finished | Unread
  source: { type: String, default: 'Borrowed' }, // Borrowed | Purchased
}, { _id: false });

const CartItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  qty: { type: Number, default: 1 },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Member', 'Editor', 'Admin'], default: 'Member' },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  library: { type: [LibraryItemSchema], default: [] },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
  cart: { type: [CartItemSchema], default: [] },
}, { timestamps: { createdAt: 'joined', updatedAt: true } });

UserSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// how many books this user currently has borrowed (not purchased)
UserSchema.methods.borrowedCount = function () {
  return this.library.filter(l => l.source !== 'Purchased').length;
};

UserSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    username: this.username,
    role: this.role,
    status: this.status,
    joined: this.joined,
    borrowed: this.borrowedCount(),
  };
};

module.exports = mongoose.model('User', UserSchema);
