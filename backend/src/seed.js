/* ============================================================
   Run with: npm run seed
   Wipes and reloads the book catalog + creates two demo
   accounts (admin123 / user123) so you have something to log
   into right after deploying. Safe to re-run any time.
   ============================================================ */
require('dotenv').config();
const connectDB = require('./config/db');
const Book = require('./models/Book');
const User = require('./models/User');
const Order = require('./models/Order');
const Review = require('./models/Review');

const PALETTE = ['#8A5A3D', '#5F7A68', '#3E5C76', '#B24A32', '#6B4C6B', '#C69749', '#3F5747', '#7A4F3A'];

const books = [
  { title: 'The Glass Meridian', author: 'Elena Vasko', genre: 'Sci-Fi', year: 2023, rating: 4.6, copies: 12, borrowed: 5, spine: PALETTE[0], desc: 'A cartographer discovers a coastline that only exists at dusk, and must decide whether to map it or protect it.', pages: 342, price: 14.99 },
  { title: 'Six Ways to Leave a Room', author: 'Priya Nathan', genre: 'Fiction', year: 2022, rating: 4.3, copies: 8, borrowed: 3, spine: PALETTE[1], desc: 'An interlinked story collection about the small exits people make from their own lives.', pages: 288, price: 12.5 },
  { title: 'The Quiet Ledger', author: 'Marcus Oduya', genre: 'Business', year: 2021, rating: 4.1, copies: 15, borrowed: 3, spine: PALETTE[2], desc: 'A former auditor explains how the most important decisions in a company never appear on its balance sheet.', pages: 256, price: 18.0 },
  { title: 'Salt for the Widow', author: 'Corinne Adair', genre: 'Mystery', year: 2020, rating: 4.7, copies: 10, borrowed: 4, spine: PALETTE[3], desc: 'A coastal inheritance dispute turns into a decades-old murder investigation.', pages: 398, price: 15.75 },
  { title: 'Letters I Never Folded', author: 'Haruto Sen', genre: 'Poetry', year: 2023, rating: 4.9, copies: 6, borrowed: 1, spine: PALETTE[4], desc: 'A quiet, devastating collection about distance, migration, and handwriting.', pages: 112, price: 9.99 },
  { title: 'The Architecture of Regret', author: 'Dana Whitfield', genre: 'Romance', year: 2019, rating: 4.0, copies: 9, borrowed: 2, spine: PALETTE[5], desc: 'Two rival architects are forced to rebuild the same theatre they once fell in love inside.', pages: 301, price: 13.25 },
  { title: 'Empire of Small Things', author: 'Grace Odenike', genre: 'History', year: 2018, rating: 4.4, copies: 11, borrowed: 2, spine: PALETTE[6], desc: 'A ground-level history of trade told through the objects that crossed empires unnoticed.', pages: 412, price: 19.5 },
  { title: 'Notes from a Borrowed Life', author: 'Theo Marsh', genre: 'Biography', year: 2022, rating: 4.2, copies: 7, borrowed: 1, spine: PALETTE[7], desc: 'A memoir about growing up in the houses other people were paying off.', pages: 264, price: 16.0 },
  { title: 'The Static Between Stations', author: 'Elena Vasko', genre: 'Sci-Fi', year: 2024, rating: 4.5, copies: 14, borrowed: 6, spine: PALETTE[2], desc: 'A radio operator on a generation ship starts receiving replies from a decommissioned station.', pages: 356, price: 14.0 },
  { title: 'Everything We Kept', author: 'Priya Nathan', genre: 'Fiction', year: 2020, rating: 3.9, copies: 13, borrowed: 2, spine: PALETTE[1], desc: 'Three sisters clear out their childhood home and find they remember none of it the same way.', pages: 274, price: 11.25 },
  { title: 'The Boardroom Weather', author: 'Marcus Oduya', genre: 'Business', year: 2023, rating: 4.0, copies: 16, borrowed: 1, spine: PALETTE[0], desc: 'Why company culture behaves like a climate system, and how to read its forecasts.', pages: 228, price: 17.0 },
  { title: 'A Field Guide to Leaving', author: 'Corinne Adair', genre: 'Mystery', year: 2021, rating: 4.3, copies: 8, borrowed: 3, spine: PALETTE[3], desc: 'A missing-persons detective realizes every case on her desk is the same family.', pages: 319, price: 13.99 },
];

async function run() {
  await connectDB();

  console.log('Clearing existing catalog, orders, and reviews...');
  await Promise.all([Book.deleteMany({}), Order.deleteMany({}), Review.deleteMany({})]);

  console.log('Inserting book catalog...');
  const createdBooks = await Book.insertMany(books);

  console.log('Setting up demo accounts (admin123 / user123, password: "12345")...');
  await User.deleteMany({ username: { $in: ['admin123', 'user123'] } });

  const admin = new User({ name: 'Owen Bright', email: 'owen.bright@inkwell.com', username: 'admin123', role: 'Admin' });
  await admin.setPassword('12345');
  await admin.save();

  const reader = new User({
    name: 'Sana Kapoor', email: 'sana.kapoor@mail.com', username: 'user123', role: 'Member',
    library: [
      { book: createdBooks[1]._id, progress: 64, status: 'Reading', source: 'Borrowed' },
      { book: createdBooks[4]._id, progress: 100, status: 'Finished', source: 'Borrowed' },
    ],
  });
  await reader.setPassword('12345');
  await reader.save();

  console.log('Done. Log in with admin123 / 12345 (Admin Login tab) or user123 / 12345 (User Login tab).');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
