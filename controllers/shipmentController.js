const Shipment = require("../models/Shipment");
const Company = require("../models/Company");
const User = require("../models/User");


const Notification = require("../models/Notification");

const sendNotification = async (userId, title, message, shipmentId) => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      shipmentId
    });
  } catch (err) {
    console.error("Greška pri slanju obavijesti:", err);
  }
};


exports.getCreateForm = async (req, res) => {
  const companies = await Company.find();
  res.render("pages/new-shipment", { companies, user: req.session.user });
};


exports.createShipment = async (req, res) => {
    const companies = await Company.find(); 

    try {
        const {
            receiverName, receiverEmail, receiverPhone, receiverAddress,
            width, height, length, weight, paymentMethod, company, description
        } = req.body;

        if (!req.session.user) return res.redirect("/auth/login");

        if (!receiverName || !receiverEmail || !receiverPhone || !receiverAddress || 
            !width || !height || !length || !weight || !company) {
            return res.render("pages/new-shipment", {
                error: "Nisu popunjena sva polja.",
                companies, user: req.session.user
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(receiverEmail)) {
            return res.render("pages/new-shipment", {
                error: "Unesite valjanu email adresu!",
                companies, user: req.session.user
            });
        }

        const phoneRegex = /^\d+$/;
        if (!phoneRegex.test(receiverPhone)) {
            return res.render("pages/new-shipment", {
                error: "Telefon smije sadržavati samo znamenke!",
                companies, user: req.session.user
            });
        }

        const selectedCompany = await Company.findById(company);
        if (!selectedCompany) {
            return res.render("pages/new-shipment", {
                error: "Odabrana tvrtka ne postoji.",
                companies, user: req.session.user
            });
        }

        const shipment = await Shipment.create({
            sender: req.session.user.id,
            company: selectedCompany._id, 
            receiverName,
            receiverEmail,
            receiverPhone,
            receiverAddress,
            description,
            width, height, length, weight,
            price: selectedCompany.deliveryPrice || 0,
            paid: paymentMethod !== "KARTICA",
            status: "CREATED"
        });

        if (paymentMethod === "KARTICA") {
            return res.redirect(`/shipments/payment/${shipment._id}`);
        }

        res.redirect("/shipments/my");

    } catch (err) {
        console.error("Greška pri kreiranju pošiljke:", err);
        res.render("pages/new-shipment", {
            error: "Došlo je do pogreške na serveru. Provjerite jeste li unijeli ispravne brojeve.",
            companies, user: req.session.user
        });
    }
};


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


exports.getCompanyActive = async (req, res) => {
    try {
        const userId = req.session.user.id; 

        const myCompany = await Company.findOne({ owner: userId });
        if (!myCompany) return res.status(404).send("Tvrtka nije pronađena.");

        const shipments = await Shipment.find({ 
            company: myCompany._id, 
            status: { $ne: "DELIVERED" } 
        }).populate("sender courier company");
        
        const couriers = await User.find({ 
            role: "DOSTAVLJAC", 

            $or: [
                { company: userId },
                { company: myCompany._id }
            ],
            active: true 
        });

        res.render("pages/shipments-list", {
            shipments,
            couriers, 
            user: req.session.user,
            showActions: true,
            title: "Aktivne pošiljke"
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Greška pri dohvaćanju podataka.");
    }
};

exports.getCompanyHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const company = await Company.findOne({ owner: userId });

    if (!company) return res.send("Niste povezani s tvrtkom");

    const shipments = await Shipment.find({
      $or: [
        { company: company._id },
        { company: company.owner }
      ],
      status: "DELIVERED"
    }).populate("sender courier company");

    console.log("Pronađeno dostavljenih pošiljki:", shipments.length);

    res.render("pages/shipments-list", {
      shipments,
      couriers: [],
      user: req.session.user,
      showActions: false, 
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
    couriers: [], 
    user: req.session.user,
    showActions: false, 
    title: "Pošiljke kurira"
  });
};

exports.getCourierShipments = async (req, res) => {
  const companyId = req.session.user.company;
  const courierId = req.params.id;

  const shipments = await Shipment.find({
    company: companyId,
    courier: courierId
  }).populate("sender company courier");

  res.render("pages/shipments-list", {
    shipments,
    couriers: [],
    user: req.session.user,
    showActions: false,
    title: "Pošiljke kurira"
  });
};


exports.assignCourier = async (req, res) => {
  try {
    const { shipmentId, courierId } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.send("Pošiljka nije pronađena");

    const courier = await User.findById(courierId);
    if (!courier) return res.send("Kurir nije pronađen");

    shipment.courier = courierId;
    shipment.status = "ASSIGNED";
    await shipment.save();

    await sendNotification(
      shipment.sender, 
      "Kurir je dodijeljen! 🚚", 
      `Vašu pošiljku (ID: ${shipment._id}) preuzeo je kurir ${courier.name}. Kontakt telefon: ${courier.phone || 'Nije naveden'}. Cijena: ${shipment.price} €.`,
      shipment._id
    );

    res.redirect("/shipments/active");
  } catch (err) {
    console.error(err);
    res.send("Greška prilikom dodjele kurira");
  }
};

exports.updateStatusCompany = async (req, res) => {
  try {
    const { shipmentId, status } = req.body;
    const shipment = await Shipment.findById(shipmentId);

    if (!shipment) return res.status(404).send("Pošiljka nije pronađena.");

    shipment.status = status;
    await shipment.save();

    
    await sendNotification(
      shipment.sender, 
      "Status ažuriran od strane tvrtke", 
      `Dostavna služba je promijenila status vaše pošiljke u: ${status}.`,
      shipment._id
    );

    res.redirect("/shipments/active");
  } catch (err) {
    console.error(err);
    res.send("Greška na serveru.");
  }
};


exports.getCourierActive = async (req, res) => {
  try {
    const shipments = await Shipment.find({
      courier: req.session.user.id,
      status: { $ne: "DELIVERED" }
    }).populate("sender company courier");

    res.render("pages/shipments-list", {
      shipments,
      couriers: [], 
      user: req.session.user,
      showActions: false, 
      title: "Moje aktivne pošiljke"
    });
  } catch (err) {
    console.error(err);
    res.send("Došlo je do pogreške prilikom dohvaćanja pošiljki");
  }
};

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

exports.updateStatusCourier = async (req, res) => {
  try {
    const { shipmentId, status } = req.body;

    const shipment = await Shipment.findOne({
      _id: shipmentId,
      courier: req.session.user.id
    });

    if (!shipment) return res.sendStatus(403);

    shipment.status = status;
    await shipment.save();

    let title = "Promjena statusa pošiljke";
    let message = `Status vaše pošiljke ${shipment._id} je promijenjen u: ${status}.`;

    if (status === "IN_TRANSIT") {
      title = "Paket je na putu! 🚚";
      message = `Vaš paket ${shipment._id} je trenutno kod kurira i dostava je u tijeku.`;
    } else if (status === "DELIVERED") {
      title = "Paket dostavljen! ✅";
      message = `Hvala vam što koristite naše usluge. Vaš paket ${shipment._id} je uspješno dostavljen.`;
    }

    await sendNotification(shipment.sender, title, message, shipment._id);

    res.redirect("/shipments/courier-active");
  } catch (err) {
    console.error(err);
    res.send("Greška pri ažuriranju statusa.");
  }
};

exports.paymentPage = (req, res) => {
  res.render("pages/payment", { shipmentId: req.params.id });
};

exports.payShipment = async (req, res) => {
  const { cardNumber, cvv, expiry } = req.body;
  const shipmentId = req.params.id;

  const showError = (msg) => {
    return res.render("pages/payment", { 
      error: msg, 
      shipmentId,
      values: req.body 
    });
  };

  if (!/^\d{16}$/.test(cardNumber)) return showError("Broj kartice mora imati 16 znamenki");
  if (!/^\d{3}$/.test(cvv)) return showError("CVV mora imati 3 znamenke");

  const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!match) return showError("Format mora biti MM/YY");

  const month = parseInt(match[1]);
  const year = 2000 + parseInt(match[2]);
  
  const expiryDate = new Date(year, month, 0); 
  if (expiryDate < new Date()) return showError("Kartica je istekla");

  try {
    await Shipment.findByIdAndUpdate(shipmentId, { paid: true });
    res.redirect("/shipments/my");
  } catch (err) {
    showError("Greška prilikom obrade plaćanja");
  }
};

exports.sendNotification = async (req, res) => {
  const { shipmentId, message } = req.body;

  await Shipment.findByIdAndUpdate(shipmentId, {
    $push: { notifications: { message } }
  });

  res.redirect("back");
};

exports.trackShipment = async (req, res) => {
  try {
    const { trackingId } = req.query; 
    
    if (!trackingId) {
      return res.render("pages/track", { shipment: null, error: null });
    }

    if (!trackingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.render("pages/track", { shipment: null, error: "Neispravan format broja pošiljke." });
    }

    const shipment = await Shipment.findById(trackingId)
      .populate("company", "name phone")
      .populate("courier", "name phone");

    if (!shipment) {
      return res.render("pages/track", { shipment: null, error: "Pošiljka s tim brojem ne postoji." });
    }

    res.render("pages/track", { shipment, error: null });
  } catch (err) {
    console.error(err);
    res.render("pages/track", { shipment: null, error: "Došlo je do pogreške." });
  }
};