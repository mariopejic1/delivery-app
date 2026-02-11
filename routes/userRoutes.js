const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth } = require("../middleware/auth");

// Pregled profila
router.get("/profile", auth, userController.getProfile);

// Stranica s formom za editiranje
router.get("/profile/edit", auth, userController.getEditProfile);

// Slanje forme (POST)
router.post("/profile/update", auth, userController.updateProfile);

module.exports = router;