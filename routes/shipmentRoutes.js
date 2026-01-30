const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { allow } = require("../middleware/roles");
const { createShipment, assignCourier, updateStatus, sendNotification } = require("../controllers/shipmentController");
const Shipment = require("../models/Shipment");

// Kreiranje pošiljke (KORISNIK)
router.post("/create", auth, allow("KORISNIK"), createShipment);

// Dodjela kurira (DOSTAVNA_SLUGA)
router.post("/assign", auth, allow("DOSTAVNA_SLUŽBA"), assignCourier);

// Promjena statusa (DOSTAVLJAC)
router.post("/status", auth, allow("DOSTAVLJAC"), updateStatus);

// Slanje notifikacije (DOSTAVLJAC)
router.post("/notify", auth, allow("DOSTAVLJAC"), sendNotification);

// Payment stranice
router.get("/payment/:id", auth, (req, res) => {
  res.render("pages/payment", { shipmentId: req.params.id });
});

router.post("/payment/:id", auth, async (req, res) => {
  await Shipment.findByIdAndUpdate(req.params.id, { paid: true });
  res.redirect("/dashboard");
});


module.exports = router;
