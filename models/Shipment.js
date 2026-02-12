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
  receiverEmail: String,    
  receiverPhone: String,    
  receiverAddress: String,  

  price: { 
    type: Number, 
    default: 0 
  },

  status: {
    type: String,
    enum: ["CREATED", "ASSIGNED", "IN_TRANSIT", "DELIVERED"],
    default: "CREATED"
  },

  history: [
  {
    status: String,
    updatedAt: { type: Date, default: Date.now },
    message: String
  }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Shipment", shipmentSchema);
