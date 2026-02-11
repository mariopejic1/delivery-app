const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  name: { type: String, required: true },

  email: { type: String, unique: true, required: true },

  password: { type: String, required: true },

  phone: String,

  role: {
    type: String,
    enum: ["KORISNIK", "DOSTAVLJAC", "DOSTAVNA_SLUŽBA"],
    default: "KORISNIK"
  },

  // 🔥 KLJUČNO
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
