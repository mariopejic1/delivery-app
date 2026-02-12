const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth } = require("../middleware/auth");

router.get("/profile", auth, userController.getProfile);

router.get("/profile/edit", auth, userController.getEditProfile);

router.post("/profile/update", auth, userController.updateProfile);

router.post('/profile/delete', userController.deleteProfile);
module.exports = router;