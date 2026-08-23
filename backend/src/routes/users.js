const express = require('express');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function serialize(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    status: u.status,
    joined: u.joined,
    borrowed: u.borrowedCount(),
  };
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find().sort({ joined: -1 });
  res.json(users.map(serialize));
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const taken = await User.findOne({ username: username.trim() });
    if (taken) return res.status(409).json({ message: 'That login ID is already in use.' });

    const user = new User({ name, email, username: username.trim(), role: role || 'Member' });
    await user.setPassword(password);
    await user.save();
    res.status(201).json(serialize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, username, password, role, status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (username && username.trim() !== user.username) {
      const clash = await User.findOne({ username: username.trim(), _id: { $ne: user._id } });
      if (clash) return res.status(409).json({ message: 'That login ID is already in use.' });
      user.username = username.trim();
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) await user.setPassword(password);

    await user.save();
    res.json(serialize(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: "You can't remove the account you're signed in with." });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ ok: true });
});

module.exports = router;
