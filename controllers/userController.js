const User = require("../models/User");
const Company = require('../models/Company');

// Prikaz profila
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).populate('company');
        // Pošto smo uradili .populate('company'), cijena je sada u user.company.price
        res.render("pages/profile", { user, company: user.company });
    } catch (err) {
        console.error(err);
        res.status(500).send("Greška pri dohvaćanju profila");
    }
};

// Prikaz forme za editiranje
exports.getEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).populate('company');
        res.render("pages/edit-profile", { user, company: user.company, error: null });
    } catch (err) {
        res.redirect("/users/profile");
    }
};

// Snimanje promjena
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, deliveryPrice } = req.body;
        const userId = req.session.user.id;

        const user = await User.findById(userId);
        user.name = name;
        user.email = email;
        user.phone = phone;
        await user.save();

        if (user.role === 'DOSTAVNA_SLUŽBA' && user.company) {
            await Company.findByIdAndUpdate(user.company, {
                // PROMIJENJENO: deliveryPrice umjesto price
                deliveryPrice: parseFloat(deliveryPrice) || 0 
            });
        }

        req.session.user.name = name;
        req.session.user.email = email;

        res.redirect("/users/profile");
    } catch (err) {
        console.error("Greška pri snimanju:", err);
        const user = await User.findById(req.session.user.id).populate('company');
        res.render("pages/edit-profile", { user, company: user.company, error: "Greška pri spremanju podataka" });
    }
};
// Brisanje vlastitog profila
exports.deleteProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Opcionalno: Ako želiš da brisanjem korisnika nestane i njegova tvrtka
        await Company.findOneAndDelete({ owner: userId });

        // 1. Obriši korisnika iz baze
        await User.findByIdAndDelete(userId);

        // 2. Uništi sesiju
        req.session.destroy((err) => {
            if (err) {
                console.error("Greška pri uništavanju sesije:", err);
                return res.redirect("/");
            }
            res.clearCookie("connect.sid");
            res.redirect("/"); 
        });
    } catch (err) {
        console.error("Greška pri brisanju profila:", err);
        res.status(500).send("Došlo je do pogreške prilikom brisanja profila.");
    }
};