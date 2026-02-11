const User = require("../models/User");

// Prikaz profila
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render("pages/profile", { user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Greška pri dohvaćanju profila");
    }
};

// Prikaz forme za editiranje
exports.getEditProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render("pages/edit-profile", { user, error: null });
    } catch (err) {
        res.redirect("/users/profile");
    }
};

// Snimanje promjena
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        // Pronađi i ažuriraj
        const user = await User.findById(req.session.user.id);
        user.name = name;
        user.email = email;
        user.phone = phone;
        await user.save();

        // Osvježi session
        req.session.user.name = name;
        req.session.user.email = email;

        res.redirect("/users/profile");
    } catch (err) {
        const user = await User.findById(req.session.user.id);
        const errorMsg = err.code === 11000 ? "Email je već u upotrebi" : "Greška pri spremanju";
        res.render("pages/edit-profile", { user, error: errorMsg });
    }
};