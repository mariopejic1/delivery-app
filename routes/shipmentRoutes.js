const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const { allow } = require("../middleware/roles");
const controller = require("../controllers/shipmentController");

/* =========================
   USER
========================= */
router.get("/create", auth, allow("KORISNIK"), controller.getCreateForm);
router.post("/create", auth, allow("KORISNIK"), controller.createShipment);
router.get("/my", auth, allow("KORISNIK"), controller.getMyShipments);

/* =========================
   COMPANY
========================= */
/* Originalne rute */
router.get("/company/active", auth, allow("DOSTAVNA_SLUŽBA"), controller.getCompanyActive);
router.get("/company/history", auth, allow("DOSTAVNA_SLUŽBA"), controller.getCompanyHistory);
router.get("/company/courier/:id", auth, allow("DOSTAVNA_SLUŽBA"), controller.getCourierShipments);
router.post("/assign", auth, allow("DOSTAVNA_SLUŽBA"), controller.assignCourier);
router.post("/update-status-company", auth, allow("DOSTAVNA_SLUŽBA"), controller.updateStatusCompany);
router.get("/courier", auth, allow("DOSTAVNA_SLUŽBA"), controller.getShipmentsByCourier);
router.get("/courier-active", auth, allow("DOSTAVLJAC"), controller.getCourierActive);
router.get("/courier-history", auth, allow("DOSTAVLJAC"), controller.getCourierHistory);
router.post("/update-status", auth, allow("DOSTAVLJAC"), controller.updateStatusCourier);
router.get("/track", controller.trackShipment);

/* Alias rute za dashboard i jednostavnije linkove */
router.get("/active", auth, allow("DOSTAVNA_SLUŽBA"), controller.getCompanyActive);
router.get("/history", auth, allow("DOSTAVNA_SLUŽBA"), controller.getCompanyHistory);

/* =========================
   COURIER
========================= */
router.get("/courier/active", auth, allow("DOSTAVLJAC"), controller.getCourierActive);
router.get("/courier/history", auth, allow("DOSTAVLJAC"), controller.getCourierHistory);
router.post("/update-status", auth, allow("DOSTAVLJAC"), controller.updateStatusCourier);

/* =========================
   NOTIFY
========================= */
router.post("/notify", auth, allow("DOSTAVLJAC"), controller.sendNotification);

/* =========================
   PAYMENT
========================= */
router.get("/payment/:id", auth, controller.paymentPage);
router.post("/payment/:id", auth, controller.payShipment);

module.exports = router;
