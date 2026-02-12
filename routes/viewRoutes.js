const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { allow } = require("../middleware/roles");
const Shipment = require("../models/Shipment");
const User = require("../models/User");
const Notification = require("../models/Notification"); 


router.get('/', async (req, res) => {
  const { trackingId } = req.query;
  let shipment = null;
  let error = null;

  if (trackingId) {
    try {
      if (trackingId.match(/^[0-9a-fA-F]{24}$/)) {

        shipment = await Shipment.findById(trackingId).populate('sender company courier');
        if (!shipment) error = "Pošiljka nije pronađena.";
      } else {
        error = "Neispravan format koda pošiljke.";
      }
    } catch (err) {
      error = "Došlo je do pogreške pri pretraživanju.";
    }
  }

  res.render('pages/index', { 
    user: req.session.user || null,
    shipment,
    error
  });
});

router.get("/dashboard-user", auth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

    const latestNotifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(3);

    res.render("pages/dashboard-user", {
      user: req.session.user,
      unreadCount, 
      latestNotifications
    });
  } catch (err) {
    console.error(err);
    res.render("pages/dashboard-user", { user: req.session.user, unreadCount: 0, latestNotifications: [] });
  }
});

router.get("/notifications", auth, async (req, res) => {
  try {
    const currentUser = req.session.user || req.user;
    const userId = currentUser.id || currentUser._id;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 });
    
    await Notification.updateMany(
      { user: userId, isRead: false }, 
      { $set: { isRead: true } }
    );
    
    res.render("pages/notifications", { 
      notifications, 
      user: currentUser,
      unreadCount: 0 
    });
  } catch (err) {
    console.error("Greška kod notifikacija:", err);
    res.status(500).send("Došlo je do pogreške pri učitavanju obavijesti.");
  }
});

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

router.get("/dashboard-courier", auth, allow("DOSTAVLJAC"), async (req, res) => {
  const activeShipments = await Shipment.find({ courier: req.user._id, status: { $ne: "DOSTAVLJENO" } });
  const historyShipments = await Shipment.find({ courier: req.user._id, status: "DOSTAVLJENO" });

  res.render("pages/dashboard-courier", {
    user: req.user,
    activeShipments,
    historyShipments,
    titleActive: "Aktivne pošiljke",
    titleHistory: "Povijest pošiljki",
    showActionsActive: true,  
    showActionsHistory: false, 
    couriers: []  
  });
});

router.get("/shipments/new", auth, async (req, res) => {
  try {
    const Company = require("../models/Company");

    const allCompanies = await Company.find(); 
    
    res.render("pages/new-shipment", { 
      companies: allCompanies, 
      user: req.session.user 
    });
  } catch (err) {
    res.status(500).send("Greška pri učitavanju tvrtki.");
  }
});

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

router.get("/my-couriers", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {

  const couriers = await User.find({ 
    role: "DOSTAVLJAC", 
    company: req.user.id,
    active: { $ne: false } 
  });
  res.render("pages/my-couriers", { user: req.user, couriers });
});

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

router.get("/my", auth, allow("KORISNIK"), async (req, res) => {
    const shipments = await Shipment.find({ sender: req.user._id })
        .populate("company", "name")
        .populate("courier", "name phone")
        .sort({ createdAt: -1 });

    res.render("pages/my-shipment", { shipments, user: req.user });
});

router.post("/couriers/delete/:id", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  try {
    const courierId = req.params.id;
    const companyId = req.session.user ? req.session.user.id : req.user._id;

    await User.findOneAndUpdate(
      { _id: courierId, company: companyId },
      { $set: { active: false, role: "BIVSI_DOSTAVLJAC" } } 
    );

    res.redirect("/my-couriers");
  } catch (err) {
    console.error(err);
    res.status(500).send("Greška pri uklanjanju kurira.");
  }
});

module.exports = router;