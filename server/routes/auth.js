const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Conditionally load Resend only if API key exists
let resend = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch (e) {
    console.log('[AUTH] Resend package not available, OTP emails disabled.');
  }
}

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  status: user.status,
});

// ─── POST /api/auth/signup ──────────────────────────────────────────────
// Creates Employee, sends OTP for email verification before issuing token.
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'Employee', // hardcoded — never trust client input
    });

    // Generate 6-digit OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    // Send email via Resend (or log in dev mode)
    if (resend) {
      await resend.emails.send({
        from: 'AssetFlow <onboarding@resend.dev>',
        to: user.email,
        subject: 'Verify your AssetFlow Account',
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
      });
    } else {
      console.log(`[DEV MODE] Signup OTP for ${user.email} is ${otp}`);
    }

    res.status(201).json({ requiresVerification: true, email: user.email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/verify-otp ──────────────────────────────────────────
// Final step of signup — verifies OTP and issues JWT token.
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }

    if (user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP.' });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────
// Direct login — no OTP required. Admin-created and seeded users log in directly.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is inactive.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/forgot-password (mock) ──────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    // In production, send a reset email here.
    res.json({ message: 'If this email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
