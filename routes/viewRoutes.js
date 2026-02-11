const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { allow } = require("../middleware/roles");
const Shipment = require("../models/Shipment");
const User = require("../models/User");

// Početna stranica
router.get("/", (req, res) => res.render("pages/index"));

// Dashboard korisnika
router.get("/dashboard", auth, allow("KORISNIK"), async (req, res) => {
  const shipments = await Shipment.find({ sender: req.user._id });
  res.render("pages/dashboard-user", { 
    user: req.user, 
    shipments, 
    title: "Moje pošiljke", 
    showActions: false, 
    couriers: [] 
  });
});

// Dashboard dostavne službe
router.get("/dashboard-company", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const shipments = await Shipment.find({ status: { $ne: "DOSTAVLJENO" } });
  const couriers = await User.find({ role: "DOSTAVLJAC", company: req.user._id });

  res.render("pages/dashboard-company", { 
    user: req.user, 
    shipments, 
    couriers, 
    showActions: true, 
    title: "Aktivne pošiljke tvrtke" 
  });
});

// Dashboard dostavljača
router.get("/dashboard-courier", auth, allow("DOSTAVLJAC"), async (req, res) => {
  const activeShipments = await Shipment.find({ courier: req.user._id, status: { $ne: "DOSTAVLJENO" } });
  const historyShipments = await Shipment.find({ courier: req.user._id, status: "DOSTAVLJENO" });

  res.render("pages/dashboard-courier", {
    user: req.user,
    activeShipments,
    historyShipments,
    titleActive: "Aktivne pošiljke",
    titleHistory: "Povijest pošiljki",
    showActionsActive: true,  // aktivne pošiljke mogu mijenjati status
    showActionsHistory: false, // povijest ne može
    couriers: []  // dostavljač ne koristi dropdown
  });
});

// Nova pošiljka (KORISNIK)
router.get("/shipments/new", auth, allow("KORISNIK"), async (req, res) => {
  const companies = await User.find({ role: "DOSTAVNA_SLUŽBA" });
  res.render("pages/new-shipment", { companies });
});

// Registracija kurira (tvrtka)
router.get("/register-courier", auth, allow("DOSTAVNA_SLUŽBA"), (req, res) => {
  res.render("pages/register-courier");
});

router.post("/register-courier", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const { name, email, password, phone } = req.body;
  const bcrypt = require("bcryptjs");

  const existing = await User.findOne({ email });
  if (existing) return res.send("Korisnik već postoji");

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email,
    password: hashedPassword,
    phone,
    role: "DOSTAVLJAC",
    company: req.user.id
  });

  res.redirect("/dashboard-company");
});

// Lista kurira tvrtke
router.get("/my-couriers", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const couriers = await User.find({ role: "DOSTAVLJAC", company: req.user.id });
  res.render("pages/my-couriers", { user: req.user, couriers });
});

// Aktivne pošiljke tvrtke
router.get("/shipments/active", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {

  const shipments = await Shipment.find({
    senderCompany: req.user.id,
    status: { $ne: "DOSTAVLJENO" }
  }).populate("courier");

  const couriers = await User.find({
    role: "DOSTAVLJAC",
    company: req.user._id
  });

  res.render("pages/shipments-list", {
    shipments,
    couriers,
    showActions: true,
    user: req.user
  });
});


// Povijest pošiljki tvrtke
router.get("/shipments/history", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {

  const shipments = await Shipment.find({
    senderCompany: req.user._id,
    status: "DOSTAVLJENO"
  }).populate("courier");

  res.render("pages/shipments-list", {
    shipments,
    showActions: false,
    couriers: [],
    user: req.user
  });
});


// Aktivne pošiljke određenog kurira
router.get("/shipments/courier/:id/active", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const courier = await User.findOne({ _id: req.params.id, company: req.user.id });
  if (!courier) return res.status(403).send("Ne možete vidjeti ovog kurira");

  const shipments = await Shipment.find({ courier: courier._id, status: { $ne: "DOSTAVLJENO" } });
  res.render("pages/shipments-list", { 
    user: req.user,
    shipments,
    couriers: [], 
    title: `Aktivne pošiljke ${courier.name}`,
    showActions: false 
  });
});

// Povijest pošiljki određenog kurira
router.get("/shipments/courier/:id/history", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const courier = await User.findOne({ _id: req.params.id, company: req.user.id });
  if (!courier) return res.status(403).send("Ne možete vidjeti ovog kurira");

  const shipments = await Shipment.find({ courier: courier._id, status: "DOSTAVLJENO" });
  res.render("pages/shipments-list", { 
    user: req.user,
    shipments,
    couriers: [], 
    title: `Povijest pošiljki ${courier.name}`,
    showActions: false
  });
});

// Moje pošiljke – korisnik
router.get("/my", auth, allow("KORISNIK"), async (req, res) => {
  const shipments = await Shipment.find({ sender: req.user._id })
    .populate("senderCompany", "name")
    .sort({ createdAt: -1 });

  res.render("pages/my-shipment", { shipments, user: req.user });
});




module.exports = router;
