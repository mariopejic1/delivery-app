const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { allow } = require("../middleware/roles");
const Shipment = require("../models/Shipment");
const User = require("../models/User");
const { sendNotification } = require("../controllers/shipmentController");

// Kreiranje pošiljke
router.get("/create", auth, allow("KORISNIK"), (req, res) => {
  // preusmjeravanje na controller ako želiš, ali može i direktno ovdje
  res.redirect("/shipments/new"); // ili renderaj formu ovdje
});
router.post("/create", auth, allow("KORISNIK"), require("../controllers/shipmentController").createShipment);

// Dodjela kurira – samo tvrtka
router.post("/assign", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const { shipmentId, courierId } = req.body;

  const courier = await User.findOne({ _id: courierId, company: req.user._id });
  if (!courier) return res.status(403).send("Ne možete dodijeliti pošiljku ovom kuriru");

  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) return res.status(404).send("Pošiljka ne postoji");

  if (shipment.senderCompany?.toString() !== req.user._id.toString()) {
    return res.status(403).send("Ova pošiljka ne pripada vašoj službi");
  }

  shipment.courier = courier._id;
  shipment.status = "UPUĆENO";
  await shipment.save();

  res.redirect(req.get("referer") || "/shipments/active");
});

// Promjena statusa – tvrtka
router.post("/update-status-company", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const { shipmentId, status } = req.body;
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) return res.status(404).send("Pošiljka ne postoji");

  if (shipment.senderCompany?.toString() !== req.user._id.toString()) {
    return res.status(403).send("Ne možete mijenjati ovu pošiljku");
  }

  shipment.status = status;
  await shipment.save();
  res.redirect(req.get("referer") || "/shipments/active");
});

// Promjena statusa – kurir
router.post("/update-status", auth, allow("DOSTAVLJAC"), async (req, res) => {
  const { shipmentId, status } = req.body;
  const shipment = await Shipment.findOne({ _id: shipmentId, courier: req.user._id });
  if (!shipment) return res.status(403).send("Ne možete mijenjati ovu pošiljku");

  shipment.status = status;
  await shipment.save();
  res.redirect(req.get("referer") || "/my-shipments");
});

// Slanje notifikacije – kurir
router.post("/notify", auth, allow("DOSTAVLJAC"), sendNotification);

// Aktivne pošiljke tvrtke
router.get("/active", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  try {
    const shipments = await Shipment.find({
      senderCompanyName: req.user.name, // filtriraj po imenu tvrtke
      status: { $in: ["NA_CEKANJU", "UPUĆENO"] }
    })
      .populate("courier", "name")
      .sort({ createdAt: -1 });

    const couriers = await User.find({
      role: "DOSTAVLJAC",
      company: req.user._id
    }).select("name _id");

    res.render("pages/shipments-list", {
      shipments,
      couriers,
      showActions: true,
      user: req.user,
      title: "Aktivne pošiljke"
    });
  } catch (err) {
    console.log(err);
    res.send("Greška pri dohvaćanju pošiljki tvrtke");
  }
});


// Povijest tvrtke
router.get("/history", auth, allow("DOSTAVNA_SLUŽBA"), async (req, res) => {
  const shipments = await Shipment.find({
    senderCompany: req.user._id,
    status: "DOSTAVLJENO"
  })
      .populate("senderCompany", "name")
    .populate("courier", "name")
    .sort({ createdAt: -1 });

  res.render("pages/shipments-list", {
    shipments,
    couriers: [],
    showActions: false,
    user: req.user,
    title: "Povijest pošiljki"
  });
});

// Aktivne pošiljke za kurira
router.get("/my-shipments", auth, allow("DOSTAVLJAC"), async (req, res) => {
  try {
    const shipments = await Shipment.find({
      courier: req.user._id,              // samo pošiljke dodijeljene ovom kuriru
      senderCompanyName: { $ne: null },   // imaju tvrtku
      status: { $ne: "DOSTAVLJENO" }     // samo aktivne
    });

    res.render("pages/shipments-list", {
      shipments,
      title: "Moje aktivne pošiljke",
      showActions: true,
      couriers: [],
      user: req.user
    });
  } catch (err) {
    console.log(err);
    res.send("Greška pri dohvaćanju pošiljki");
  }
});


// Moje pošiljke – korisnik
router.get("/my", auth, allow("KORISNIK"), async (req, res) => {
  const shipments = await Shipment.find({ sender: req.user._id })
    .populate("senderCompany", "name")
    .sort({ createdAt: -1 });

  res.render("pages/my-shipment", { shipments, user: req.user });
});

// Payment rute (ostavi kako je)
router.get("/payment/:id", auth, (req, res) => {
  res.render("pages/payment", { shipmentId: req.params.id });
});
router.post("/payment/:id", auth, async (req, res) => {
  await Shipment.findByIdAndUpdate(req.params.id, { paid: true });
  res.redirect("/dashboard");
});

module.exports = router;