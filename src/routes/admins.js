const express = require('express');
const router = express.Router();
const { createAdmin, getAllAdmins, cancelAdmin } = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

router.post("/", protect, restrictTo('superadmin'), createAdmin);
router.get("/", protect, restrictTo('superadmin', 'admin' ), getAllAdmins);
router.patch("/:id/cancel", protect, restrictTo("superadmin"), cancelAdmin);

module.exports = router;
