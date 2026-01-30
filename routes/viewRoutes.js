const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { allow } = require("../middleware/roles");
const Shipment = require("../models/Shipment");

// Početna stranica
router.get("/", (req, res) => res.render("pages/index"));

// Dashboard korisnika
router.get("/dashboard", auth, allow("KORISNIK"), async (req, res) => {
  const shipments = await Shipment.find({ sender: req.user._id });
  res.render("pages/dashboard-user", { user: req.user, shipments });
});

// Dashboard dostavne službe
router.get("/dashboard-company", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const shipments = await Shipment.find();
  const couriers = await User.find({ role: "DOSTAVLJAC" });
  res.render("pages/dashboard-company", { shipments, couriers });
});

// Dashboard dostavljača
router.get("/dashboard-courier", auth, allow("DOSTAVLJAC"), async (req, res) => {
  const shipments = await Shipment.find({ courier: req.user._id });
  res.render("pages/dashboard-courier", { user: req.user, shipments });
});

router.get("/shipments/new", auth, allow("KORISNIK"), (req, res) => {
  res.render("pages/new-shipment");
});

module.exports = router;
