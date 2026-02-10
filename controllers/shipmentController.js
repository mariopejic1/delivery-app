const Shipment = require("../models/Shipment");
const User = require("../models/User");
const mongoose = require("mongoose"); 
// Izračun cijene pošiljke
function calculatePrice(w, h, l, weight) {
  const volumetric = (w * h * l) / 5000;
  const chargeable = Math.max(volumetric, weight);
  return Math.round(chargeable * 5 + 10);
}

exports.createShipment = async (req, res) => {
  try {
    const {
      receiverName,
      receiverEmail,
      receiverPhone,
      receiverAddress,
      description,
      width,
      height,
      length,
      weight,
      paymentMethod,
      senderCompanyName // sada šaljemo ime tvrtke, ne ID
    } = req.body;

    if (!senderCompanyName) {
      return res.status(400).send("Morate odabrati dostavnu službu");
    }

    // Dohvati tvrtku po imenu
    const company = await User.findOne({ name: senderCompanyName, role: "DOSTAVNA_SLUŽBA" });
    if (!company) return res.status(400).send("Odabrana tvrtka ne postoji");

    const price = calculatePrice(width, height, length, weight);

    const shipment = await Shipment.create({
      sender: req.user.id,             // korisnik koji kreira pošiljku
      senderCompany: company.id,       // id tvrtke
      senderCompanyName: company.name,  // ime tvrtke za filtriranje/prikaz
      receiverName,
      receiverEmail,
      receiverPhone,
      receiverAddress,
      description,
      width,
      height,
      length,
      weight,
      paymentMethod,
      price,
      paid: paymentMethod !== "KARTICA",
      status: "NA_CEKANJU",
      courier: null
    });

    if (paymentMethod === "KARTICA") {
      return res.redirect(`/shipments/payment/${shipment._id}`);
    }

    res.redirect("/shipments/my");
  } catch (err) {
    console.error(err);
    res.status(500).send("Greška prilikom kreiranja pošiljke");
  }
};


// Prikaz “mojih pošiljki” (KORISNIK)
exports.getMyShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({ sender: req.user._id })
      .populate("senderCompany", "name")  // da prikažemo ime tvrtke
      .sort({ createdAt: -1 });

    res.render("pages/my-shipment", { shipments, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Greška pri dohvaćanju pošiljki");
  }
};

exports.getShipmentForm = async (req, res) => {
  try {
    const companies = await User.find({ role: "DOSTAVNA_SLUŽBA" }).select("name _id");
    res.render("pages/create-shipment", { companies });
  } catch (err) {
    console.error(err);
    res.status(500).send("Greška prilikom učitavanja forme");
  }
};

// ostale funkcije (assignCourier, updateStatusCompany, sendNotification) možeš zadržati
// ali najbolje je koristiti rute iz shipmentRoutes.js (vidi dolje)

/* ============================================
   TVRTKA DODJELJUJE KURIRA I MIJENJA STATUS
============================================ */
exports.assignCourier = async (req, res) => {
  try {
    const { shipmentId, courierId } = req.body;
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).send("Pošiljka ne postoji");

    if (!shipment.senderCompanyName) {
      shipment.senderCompanyName = req.user.name; // sada po imenu
    }

    shipment.courier = courierId;
    shipment.status = "UPUĆENO";

    await shipment.save();
    res.redirect(req.headers.referer || "/shipments/active");
  } catch (err) {
    console.log(err);
    res.send("Greška prilikom dodjele kurira");
  }
};


/* ============================================
   TVRTKA MIJENJA STATUS POŠILJKE
============================================ */
exports.updateStatusCompany = async (req, res) => {
  try {
    const { shipmentId, status } = req.body;
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) return res.status(404).send("Pošiljka ne postoji");

    // Samo tvrtka koja je dodijelila kurira može mijenjati status
    if (!shipment.senderCompany) {
      return res.status(403).send("Pošiljka još nije preuzeta od strane tvrtke");
    }

    // Provjera da li je ulogirana osoba tvrtka koja preuzima pošiljku
    const senderCompanyId = shipment.senderCompany.toString();
    const userId = req.user._id.toString();

    if (senderCompanyId !== userId) {
      return res.status(403).send("Ne možete mijenjati ovu pošiljku");
    }

    shipment.status = status;
    await shipment.save();
    res.redirect(req.headers.referer || "/dashboard-company");

  } catch (err) {
    console.log(err);
    res.send("Greška prilikom mijenjanja statusa pošiljke");
  }
};

/* ============================================
   DOSTAVLJAČ MOŽE SLATI NOTIFIKACIJE
============================================ */
exports.sendNotification = async (req, res) => {
  try {
    const { shipmentId, message } = req.body;
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) return res.status(404).send("Pošiljka ne postoji");

    shipment.notifications.push({ message });
    await shipment.save();
    res.redirect(req.headers.referer || "/dashboard-courier");

  } catch (err) {
    console.log(err);
    res.send("Greška prilikom slanja notifikacije");
  }
};
