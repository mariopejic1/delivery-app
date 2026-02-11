const Company = require("../models/Company");
const User = require("../models/User");

exports.createCompany = async (req, res) => {
  const { name, address } = req.body;

  const company = await Company.create({
    name,
    address,
    owner: req.session.user._id
  });

  req.session.user.company = company._id;

  await User.findByIdAndUpdate(req.session.user._id, {
    company: company._id
  });

  res.redirect("/company/dashboard");
};


exports.dashboard = async (req, res) => {

  const company = await Company.findById(req.session.user.company);

  const couriers = await User.find({
    role: "DOSTAVLJAC",
    company: company._id
  });

  res.render("pages/dashboard-company", {
    company,
    couriers
  });
};
