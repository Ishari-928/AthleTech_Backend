const express = require("express");
const multer = require("multer");
const coachController = require("../controllers/coachController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Routes
router.get("/", coachController.getCoaches);
router.get("/active", coachController.getActiveCoaches);
router.get("/:id", coachController.getCoachByID);

// Create coach - admin and superadmin can do this
router.post(
  "/",
  protect,
  restrictTo('admin', 'superadmin'),
  upload.single("profile_image"),
  coachController.createCoach
);

// Update coach - admin and superadmin can do this
router.put(
  "/:id",
  protect,
  restrictTo('admin', 'superadmin'),
  upload.single("profile_image"),
  coachController.updateCoach
);

// Soft delete - only superadmin can do this
router.delete(
  "/:id",
  protect,
  restrictTo('superadmin'),
  coachController.deleteCoach
);

// Hard delete - only superadmin can do this
router.delete(
  "/:id/delete",
  protect,
  restrictTo('superadmin'),
  coachController.hardDeleteCoach
);

module.exports = router;