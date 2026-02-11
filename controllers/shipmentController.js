const Shipment = require("../models/Shipment");
const Company = require("../models/Company");
const User = require("../models/User");

/* =================================
   PRICE CALCULATION
================================= */
function calculatePrice(w, h, l, weight) {
  const volumetric = (w * h * l) / 5000;
  const chargeable = Math.max(volumetric, weight);
  return Math.round(chargeable * 5 + 10);
}

/* =================================
   GET CREATE FORM (User bira company)
================================= */
exports.getCreateForm = async (req, res) => {
  const companies = await Company.find();
  res.render("pages/new-shipment", { companies, user: req.session.user });
};

/* =================================
   CREATE SHIPMENT (USER)
================================= */
exports.createShipment = async (req, res) => {
  try {
    const {
      receiverName,
      receiverEmail,
      receiverPhone,
      receiverAddress,
      width,
      height,
      length,
      weight,
      paymentMethod,
      company,
      description
    } = req.body;

    if (!req.session.user) return res.redirect("/auth/login");

    if (!company) {
      const companies = await Company.find();
      return res.render("pages/new-shipment", {
        error: "Molimo odaberite tvrtku",
        companies,
        user: req.session.user
      });
    }

    const price = calculatePrice(width, height, length, weight);

    const shipment = await Shipment.create({
      sender: req.session.user.id,
      company, // ObjectId tvrtke
      receiverName,
      receiverEmail,
      receiverPhone,
      receiverAddress,
      description,
      width,
      height,
      length,
      weight,
      price,
      paid: paymentMethod !== "KARTICA",
      status: "CREATED" // standardno
    });

    if (paymentMethod === "KARTICA") {
      return res.redirect(`/shipments/payment/${shipment._id}`);
    }

    res.redirect("/shipments/my");
  } catch (err) {
    console.error(err);
    const companies = await Company.find();
    res.render("pages/new-shipment", {
      error: "Došlo je do pogreške prilikom kreiranja pošiljke",
      companies,
      user: req.session.user
    });
  }
};

/* =================================
   GET MY SHIPMENTS (USER)
================================= */
exports.getMyShipments = async (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");

  const shipments = await Shipment.find({ sender: req.session.user.id })
    .populate("company courier");

  res.render("pages/my-shipment", {
    shipments,
    user: req.session.user,
    showActions: true
  });
};

/* =================================
   COMPANY SHIPMENTS
================================= */

/* Active shipments */
exports.getCompanyActive = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Dohvat tvrtke gdje je korisnik owner
    const company = await Company.findOne({ owner: userId });
    if (!company) return res.send("Niste povezani s tvrtkom");

    const shipments = await Shipment.find({
      company: company.owner,
      status: { $ne: "DELIVERED" } // statusi iz modela: CREATED, ASSIGNED, IN_TRANSIT, DELIVERED
    }).populate("sender courier");

    const couriers = await User.find({
        role: "DOSTAVLJAC",
        company: company.owner
      });
      
      console.log("Company:", company);
console.log("All shipments in DB for this company:", await Shipment.find({company: company._id}));
    console.log(typeof company._id);
      console.log(company)
    console.log("Couriers:", couriers);

    res.render("pages/shipments-list", {
      shipments,
      couriers,
      user: req.session.user,
      showActions: true,
      title: "Aktivne pošiljke"
    });
  } catch (err) {
    console.error(err);
    res.send("Došlo je do pogreške prilikom dohvaćanja pošiljki");
  }
};

/* =================================
   COMPANY SHIPMENT HISTORY
================================= */
exports.getCompanyHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const company = await Company.findOne({ owner: userId });

    if (!company) return res.send("Niste povezani s tvrtkom");

    // Tražimo pošiljke koje pripadaju ILI firmi ILI vlasniku (radi sigurnosti dok ne očistiš bazu)
    const shipments = await Shipment.find({
      $or: [
        { company: company._id },
        { company: company.owner }
      ],
      status: "DELIVERED"
    }).populate("sender courier");

    console.log("Pronađeno dostavljenih pošiljki:", shipments.length);

    res.render("pages/shipments-list", {
      shipments,
      couriers: [],
      user: req.session.user,
      showActions: false, // Povijest se ne smije mijenjati
      title: "Povijest pošiljki"
    });
  } catch (err) {
    console.error(err);
    res.send("Greška.");
  }
};


exports.getShipmentsByCourier = async (req, res) => {
  const courierId = req.query.courierId;

  if (!courierId) return res.redirect("/my-couriers");

  const shipments = await Shipment.find({ courier: courierId })
    .populate("sender company courier");

  res.render("pages/shipments-list", {
    shipments,
    couriers: [], // ovdje ne prikazujemo dropdown za dodjelu
    user: req.session.user,
    showActions: false, // isključujemo status/dodjelu
    title: "Pošiljke kurira"
  });
};

exports.getShipmentsByCourier = async (req, res) => {
  const courierId = req.query.courierId;

  if (!courierId) return res.redirect("/my-couriers");

  const shipments = await Shipment.find({ courier: courierId })
    .populate("sender company courier");

  res.render("pages/shipments-list", {
    shipments,
    couriers: [], // ovdje ne prikazujemo dropdown za dodjelu
    user: req.session.user,
    showActions: false, // isključujemo status/dodjelu
    title: "Pošiljke kurira"
  });
};

/* Shipments of specific courier */
exports.getCourierShipments = async (req, res) => {
  const companyId = req.session.user.company;
  const courierId = req.params.id;

  const shipments = await Shipment.find({
    company: companyId,
    courier: courierId
  }).populate("sender");

  res.render("pages/shipments-list", {
    shipments,
    couriers: [],
    user: req.session.user,
    showActions: false,
    title: "Pošiljke kurira"
  });
};

/* =================================
   ASSIGN COURIER (COMPANY)
================================= */
exports.assignCourier = async (req, res) => {
  try {
    const { shipmentId, courierId } = req.body;

    // Dohvat pošiljke iz baze
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.send("Pošiljka nije pronađena");

    // Ažuriranje kurira i statusa pošiljke
    shipment.courier = courierId;
    shipment.status = "ASSIGNED"; // ili "UPUĆENO"
    await shipment.save();

    // Preusmjeri na aktivne pošiljke tvrtke
    res.redirect("/shipments/active");
  } catch (err) {
    console.error(err);
    res.send("Greška prilikom dodjele kurira");
  }
};


/* =================================
   UPDATE STATUS (COMPANY)
================================= */
exports.updateStatusCompany = async (req, res) => {
  try {
    const { shipmentId, status } = req.body;
    
    // DEBUG: Ispiši što dobivaš iz forme
    console.log("Pokušavam ažurirati pošiljku ID:", shipmentId);

    // Nađi pošiljku samo po ID-u, bez obzira na tvrtku (samo za test!)
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) {
        console.log("Pošiljka s tim ID-om uopće ne postoji u bazi!");
        return res.status(404).send("Pošiljka nije pronađena.");
    }

    console.log("Pronađena pošiljka. Njezina tvrtka u bazi je:", shipment.company);

    shipment.status = status;
    await shipment.save();

    res.redirect("/shipments/active");
  } catch (err) {
    console.error(err);
    res.send("Greška na serveru.");
  }
};


/* =================================
   COURIER
================================= */

/* Active shipments for courier */
exports.getCourierActive = async (req, res) => {
  try {
    const shipments = await Shipment.find({
      courier: req.session.user.id,
      status: { $ne: "DELIVERED" }
    }).populate("sender company courier");

    res.render("pages/shipments-list", {
      shipments,
      couriers: [], // ne prikazujemo dropdown
      user: req.session.user,
      showActions: false, // kurir ne mijenja status
      title: "Moje aktivne pošiljke"
    });
  } catch (err) {
    console.error(err);
    res.send("Došlo je do pogreške prilikom dohvaćanja pošiljki");
  }
};

// Povijest pošiljki (status = DELIVERED)
exports.getCourierHistory = async (req, res) => {
  try {
    const shipments = await Shipment.find({
      courier: req.session.user.id,
      status: "DELIVERED"
    }).populate("sender company courier");

    res.render("pages/shipments-list", {
      shipments,
      couriers: [],
      user: req.session.user,
      showActions: false,
      title: "Povijest pošiljki"
    });
  } catch (err) {
    console.error(err);
    res.send("Došlo je do pogreške prilikom dohvaćanja povijesti pošiljki");
  }
};

/* Update status courier */
exports.updateStatusCourier = async (req, res) => {
  const { shipmentId, status } = req.body;

  const shipment = await Shipment.findOne({
    _id: shipmentId,
    courier: req.session.user.id
  });

  if (!shipment) return res.sendStatus(403);

  shipment.status = status;
  await shipment.save();

  // Vrati kurira na njegovu stranicu aktivnih pošiljki
  res.redirect("/shipments/courier-active");
};

/* =================================
   PAYMENT
================================= */
exports.paymentPage = (req, res) => {
  res.render("pages/payment", { shipmentId: req.params.id });
};

exports.payShipment = async (req, res) => {
  const { cardNumber, cvv, expiry } = req.body;
  const shipmentId = req.params.id;

  // Pomoćna funkcija za vraćanje greške na stranicu
  const showError = (msg) => {
    return res.render("pages/payment", { 
      error: msg, 
      shipmentId,
      // Vraćamo i podatke da se polja ne isprazne (osim CVV-a)
      values: req.body 
    });
  };

  if (!/^\d{16}$/.test(cardNumber)) return showError("Broj kartice mora imati 16 znamenki");
  if (!/^\d{3}$/.test(cvv)) return showError("CVV mora imati 3 znamenke");

  const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) return showError("Format mora biti MM/YY");

  const month = parseInt(match[1]);
  const year = 2000 + parseInt(match[2]);
  
  // Postavljamo na zadnji dan u mjesecu radi preciznije provjere
  const expiryDate = new Date(year, month, 0); 
  if (expiryDate < new Date()) return showError("Kartica je istekla");

  try {
    await Shipment.findByIdAndUpdate(shipmentId, { paid: true });
    res.redirect("/shipments/my");
  } catch (err) {
    showError("Greška prilikom obrade plaćanja");
  }
};

/* =================================
   NOTIFICATIONS
================================= */
exports.sendNotification = async (req, res) => {
  const { shipmentId, message } = req.body;

  await Shipment.findByIdAndUpdate(shipmentId, {
    $push: { notifications: { message } }
  });

  res.redirect("back");
};
