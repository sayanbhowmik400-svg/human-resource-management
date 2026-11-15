const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Password rule: at least 8 characters, containing at least one letter and one number
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { empId, name, email, password, role } = req.body;

    if (!empId || !name || !email || !password) {
      return res.status(400).json({ message: "Please fill in every field." });
    }
    if (!["Employee", "HR"].includes(role)) {
      return res.status(400).json({ message: "Role must be Employee or HR." });
    }
    if (!PASSWORD_RULE.test(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include a letter and a number." });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { empId }] });
    if (existing) {
      return res.status(409).json({ message: "An account with this email or employee ID already exists." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      empId, name, email: email.toLowerCase(), password: hash, role,
      isVerified: false // In production, a verification email would be sent here.
    });

    res.status(201).json({
      message: "Account created. A verification email would be sent in production — you can sign in now.",
      user
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong creating your account.", error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong signing in.", error: err.message });
  }
});

module.exports = router;