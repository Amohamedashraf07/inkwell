require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const bookRoutes = require('./src/routes/books');
const libraryRoutes = require('./src/routes/library');
const wishlistRoutes = require('./src/routes/wishlist');
const cartRoutes = require('./src/routes/cart');
const orderRoutes = require('./src/routes/orders');
const reviewRoutes = require('./src/routes/reviews');
const userRoutes = require('./src/routes/users');
const statsRoutes = require('./src/routes/stats');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'inkwell-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ message: 'Upload too large. Please use a smaller image (max ~7MB).' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed request body.' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Inkwell API listening on port ${PORT}`));
});