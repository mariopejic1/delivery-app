const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const User = require("../models/User");

// Profil korisnika (svi)
router.get("/profile", auth, async (req, res) => {
  res.render("pages/profile", { user: req.user });
});

// Edit profile
router.post("/profile", auth, async (req, res) => {
  const { name, email, phone } = req.body;
  req.user.name = name;
  req.user.email = email;
  req.user.phone = phone;
  await req.user.save();
  res.redirect("/users/profile");
});

module.exports = router;
