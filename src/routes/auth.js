const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post("/login", auth.login);
router.post("/logout", auth.logout);

router.post("/request-otp", auth.requestOtp);
// router.post("/change-password-with-otp", auth.changePasswordWithOtp);
router.post("/change-password-with-otp", protect, auth.changePasswordWithOtp);
router.post("/reset-password-with-otp", auth.resetPasswordWithOtp);
// Add this route
router.post("/forgot-password", auth.forgotPassword);

module.exports = router;
