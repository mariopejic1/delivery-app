const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

exports.getLoginPage = (req, res) => {
  res.render('pages/login'); // login.ejs
};

exports.getRegisterPage = (req, res) => {
  res.render('pages/register'); // register.ejs
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('pages/login', { error: 'Molimo unesite email i lozinku' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.render('pages/login', { error: 'Korisnik s ovim emailom ne postoji.' });
    }

    if (user.active === false || user.role === "BIVSI_DOSTAVLJAC") {
      return res.render('pages/login', { 
        error: 'Ovaj račun ne postoji.' 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('pages/login', { error: 'Neispravna lozinka.' });
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company
    };

    res.redirect('/');

  } catch (err) {
    console.error("Login Error:", err);
    res.render('pages/login', { error: 'Došlo je do pogreške na serveru.' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, deliveryPrice } = req.body;

    if (!name || !email || !password || !role) {
      return res.render('pages/register', { error: 'Molimo popunite sva polja' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('pages/register', { error: 'Korisnik već postoji' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'DOSTAVNA_SLUŽBA') {

      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role,
        phone
      });
      await newUser.save();

      const newCompany = new Company({
        name,
        phone,
        owner: newUser._id,
        deliveryPrice: deliveryPrice || 0 
      });
      await newCompany.save();

      newUser.company = newCompany._id;
      await newUser.save();

      req.session.user = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        company: newCompany._id
      };

      return res.redirect('/'); 
    } else {

      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone
      });
      
      req.session.user = {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      };
      
      return res.redirect('/');
    }

  } catch (err) {
    console.error(err);
    res.render('pages/register', { error: 'Greška prilikom registracije' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.log(err);
    res.redirect('/auth/login');
  });
};

exports.getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render("pages/edit-profile", { user, error: null, success: null });
  } catch (err) {
    res.redirect("/auth/profile");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone },
      { new: true, runValidators: true }
    );

    req.session.user.name = updatedUser.name;
    req.session.user.email = updatedUser.email;

    res.render("pages/edit-profile", { 
      user: updatedUser, 
      success: "Podaci su uspješno ažurirani!", 
      error: null 
    });
  } catch (err) {
    console.error(err);

    const msg = err.code === 11000 ? "Email je već u upotrebi" : "Greška pri ažuriranju";
    const user = await User.findById(req.session.user.id);
    res.render("pages/edit-profile", { user, error: msg, success: null });
  }
};