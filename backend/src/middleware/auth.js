const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the Bearer token and attaches req.user (the full Mongoose doc)
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not signed in.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Session is no longer valid.' });
    if (user.status === 'Suspended') return res.status(403).json({ message: 'This account has been suspended.' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired — please sign in again.' });
  }
}

// Must be called after requireAuth. Restricts to Admin/Editor accounts.
function requireAdmin(req, res, next) {
  if (!req.user || !['Admin', 'Editor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
