const attachUser = (req, res, next) => {
  // provjeri je li korisnik u sessionu
  res.locals.user = req.session.user || null;
  next();
};

module.exports = { attachUser };