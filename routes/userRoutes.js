const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth"); // ✅ ispravljeno
const User = require("../models/User");


// =====================
// PROFIL
// =====================
router.get("/profile", auth, async (req, res) => {
  const user = await User.findById(req.session.user.id);

  res.render("pages/profile", { user });
});


// =====================
// EDIT PROFILA
// =====================
router.post("/profile", auth, async (req, res) => {
  const { name, email, phone } = req.body;

  const user = await User.findById(req.session.user.id);

  user.name = name;
  user.email = email;
  user.phone = phone;

  await user.save();

  // update session (da se odmah vidi novo ime u headeru)
  req.session.user.name = name;
  req.session.user.email = email;

  res.redirect("/users/profile");
});


module.exports = router;
