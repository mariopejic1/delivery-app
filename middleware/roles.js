exports.allow = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.redirect("/auth/login");
    if (!roles.includes(req.user.role)) {
      return res.status(403).send("Nemate pristup ovoj stranici");
    }
    next();
  };
};
