const Shipment = require("../models/Shipment");

function calculatePrice(w, h, l, weight) {
  const volumetric = (w * h * l) / 5000;
  const chargeable = Math.max(volumetric, weight);
  return Math.round(chargeable * 5 + 10);
}

exports.createShipment = async (req, res) => {

  const {
    receiverName,
    receiverPhone,
    receiverAddress,
    description,
    width,
    height,
    length,
    weight,
    paymentMethod
  } = req.body;

  const price = calculatePrice(width, height, length, weight);

  const shipment = await Shipment.create({
    sender: req.user._id,
    receiverName,
    receiverPhone,
    receiverAddress,
    description,
    width,
    height,
    length,
    weight,
    paymentMethod,
    price,
    paid: paymentMethod !== "KARTICA"
  });

  // AKO kartica → idi na payment stranicu
  if (paymentMethod === "KARTICA") {
    return res.redirect(`/payment/${shipment._id}`);
  }

  res.redirect("/dashboard");
};


// Dodjela kurira (dostavna služba)
exports.assignCourier = async (req, res) => {
  const { shipmentId, courierId } = req.body;
  const shipment = await Shipment.findById(shipmentId);
  shipment.courier = courierId;
  shipment.status = "UPUĆENO";
  await shipment.save();
  res.redirect("/dashboard-company");
};

// Promjena statusa pošiljke (dostavljac)
exports.updateStatus = async (req, res) => {
  const { shipmentId, status } = req.body;
  const shipment = await Shipment.findById(shipmentId);
  shipment.status = status;
  await shipment.save();
  res.redirect("/dashboard-courier");
};

// Slanje notifikacije primatelju (dostavljac)
exports.sendNotification = async (req, res) => {
  const { shipmentId, message } = req.body;
  const shipment = await Shipment.findById(shipmentId);
  shipment.notifications.push({ message });
  await shipment.save();
  res.redirect("/dashboard-courier");
};
