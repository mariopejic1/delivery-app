const User = require("../models/User");
const Company = require('../models/Company');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).populate('company');
        res.render("pages/profile", { user, company: user.company });
    } catch (err) {
        console.error(err);
        res.status(500).send("Greška pri dohvaćanju profila");
    }
};

exports.getEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id).populate('company');
        res.render("pages/edit-profile", { user, company: user.company, error: null });
    } catch (err) {
        res.redirect("/users/profile");
    }
};

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

exports.deleteProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;

        await Company.findOneAndDelete({ owner: userId });

        await User.findByIdAndDelete(userId);

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