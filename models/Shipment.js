const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverName: { type: String, required: true },
  receiverEmail: { type: String, required: true },
  receiverPhone: { type: String },                  
  receiverAddress: { type: String, required: true },
  description: { type: String },                   
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  length: { type: Number, required: true },
  weight: { type: Number, required: true },
  price: { type: Number, required: true },         
  paymentMethod: { 
    type: String, 
    enum: ["GOTOVINA", "KARTICA"], 
    required: true 
  },
  paid: {
  type: Boolean,
  default: false
  },
  status: { 
    type: String, 
    enum: ["NA_CEKANJU", "UPUĆENO", "DOSTAVLJENO"], 
    default: "NA_CEKANJU" 
  },
  courier: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  notifications: [{
    message: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Shipment", shipmentSchema);
