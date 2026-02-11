// controllers/authController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');

// GET stranice
exports.getLoginPage = (req, res) => {
  res.render('pages/login'); // login.ejs
};

exports.getRegisterPage = (req, res) => {
  res.render('pages/register'); // register.ejs
};

// POST login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('pages/login', { error: 'Molimo unesite email i lozinku' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.render('pages/login', { error: 'Korisnik ne postoji' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.render('pages/login', { error: 'Neispravna lozinka' });
  }

  // Spremi korisnika u session
  req.session.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company
  };

  // redirect na profil ili početnu
  res.redirect('/');
};

// POST registracija
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.render('pages/register', { error: 'Molimo popunite sva polja' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('pages/register', { error: 'Korisnik već postoji' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let companyId = null;

    // Ako je role DOSTAVNA_SLUŽBA, kreiraj Company dokument
    if (role === 'DOSTAVNA_SLUŽBA') {
    // 1. Kreiraj korisnika prvo (bez company)
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone
    });
    await newUser.save();

    // 2. Kreiraj Company i postavi owner
    const newCompany = new Company({
      name,
      phone,
      owner: newUser._id
    });
    await newCompany.save();

    // 3. Poveži korisnika s tvrtkom
    newUser.company = newCompany._id;
    await newUser.save();

    // 4. Logiraj korisnika u session
    req.session.user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      company: newCompany._id
    };

    return res.redirect('/users/profile');
  }
  } catch (err) {
    console.error(err);
    res.render('pages/register', { error: 'Greška prilikom registracije' });
  }
};


// Logout
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

// Obrada ažuriranja podataka
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.session.user.id;

    // Pronađi korisnika i ažuriraj polja (osim role i company)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, phone },
      { new: true, runValidators: true }
    );

    // 🔥 KLJUČNO: Osvježi session s novim podacima
    req.session.user.name = updatedUser.name;
    req.session.user.email = updatedUser.email;

    res.render("pages/edit-profile", { 
      user: updatedUser, 
      success: "Podaci su uspješno ažurirani!", 
      error: null 
    });
  } catch (err) {
    console.error(err);
    // Ako je email već zauzet (unique error)
    const msg = err.code === 11000 ? "Email je već u upotrebi" : "Greška pri ažuriranju";
    const user = await User.findById(req.session.user.id);
    res.render("pages/edit-profile", { user, error: msg, success: null });
  }
};