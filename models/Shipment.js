const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema({

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  company: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },

  courier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  receiverName: String,
  address: String,
  weight: Number,
  price: Number,

  status: {
    type: String,
    enum: ["CREATED", "ASSIGNED", "IN_TRANSIT", "DELIVERED"],
    default: "CREATED"
  }

}, { timestamps: true });

module.exports = mongoose.model("Shipment", shipmentSchema);
