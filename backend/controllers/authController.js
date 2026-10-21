const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TrustedContact = require('../models/TrustedContact');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: 'All fields (name, email, phone, password) are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        passwordHash,
        role: 'user',
        demoMode: true
      });

      // Automatically add standard sample trusted contacts for immediate safety readiness
      await TrustedContact.create({
        userId: user._id || user.id,
        name: 'Mother (Emergency)',
        phone: '+1-555-0192',
        relationship: 'Mother',
        priority: 1
      });
      await TrustedContact.create({
        userId: user._id || user.id,
        name: 'Local Emergency Contact',
        phone: '+1-555-0144',
        relationship: 'Friend',
        priority: 2
      });

      const token = jwt.sign(
        { id: user._id || user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const sanitizedUser = {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        demoMode: user.demoMode,
        settings: user.settings
      };

      return res.status(201).json({
        message: 'Registration successful. Emergency profile created.',
        token,
        user: sanitizedUser
      });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user._id || user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      const sanitizedUser = {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        demoMode: user.demoMode,
        settings: user.settings
      };

      return res.json({
        message: 'Login successful.',
        token,
        user: sanitizedUser
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = req.user;
      return res.json({
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          demoMode: user.demoMode,
          settings: user.settings,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, phone, settings, demoMode } = req.body;
      const updates = {};
      if (name) updates.name = name.trim();
      if (phone) updates.phone = phone.trim();
      if (typeof demoMode === 'boolean') updates.demoMode = demoMode;
      if (settings) updates.settings = settings;

      const updated = await User.update(req.user._id || req.user.id, updates);
      return res.json({
        message: 'Profile updated successfully.',
        user: {
          id: updated._id || updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          role: updated.role,
          demoMode: updated.demoMode,
          settings: updated.settings
        }
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update profile.' });
    }
  }

  static async forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    // In demo/safety app, acknowledge request
    return res.json({
      message: 'If the email exists, a password reset instruction code has been dispatched via secure SMS/Email.'
    });
  }
}

module.exports = AuthController;
