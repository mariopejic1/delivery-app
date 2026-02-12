const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  address: String,
  // Cijena dostave specifična za ovu tvrtku
  deliveryPrice: {
    type: Number,
    required: true,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);