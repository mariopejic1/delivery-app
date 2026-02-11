const router = require("express").Router();
const { auth } = require("../middleware/auth");
const controller = require("../controllers/companyController");

router.get("/dashboard", auth, controller.dashboard);
router.post("/create", auth, controller.createCompany);

module.exports = router;
