const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (password.length < 5) {
      return res.status(400).json({ message: 'Password must be at least 5 characters.' });
    }
    const taken = await User.findOne({ username: username.trim() });
    if (taken) return res.status(409).json({ message: 'That login ID is already taken.' });

    const user = new User({ name: name.trim(), email: email.trim(), username: username.trim(), role: 'Member' });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, wantAdmin } = req.body;
    const user = await User.findOne({ username: (username || '').trim() });
    if (!user) return res.status(401).json({ message: 'Invalid ID or password.' });

    const isAdmin = ['Admin', 'Editor'].includes(user.role);
    if (wantAdmin && !isAdmin) return res.status(401).json({ message: 'Invalid admin ID or password.' });
    if (!wantAdmin && isAdmin) return res.status(401).json({ message: 'Invalid ID or password.' });

    const ok = await user.checkPassword(password || '');
    if (!ok) return res.status(401).json({ message: 'Invalid ID or password.' });

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'This account has been suspended by an admin.' });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 5) {
      return res.status(400).json({ message: 'New password must be at least 5 characters.' });
    }
    const ok = await req.user.checkPassword(currentPassword || '');
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect.' });
    await req.user.setPassword(newPassword);
    await req.user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
