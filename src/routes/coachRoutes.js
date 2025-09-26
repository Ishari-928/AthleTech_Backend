const express = require("express");
const multer = require("multer");
const coachController = require("../controllers/coachController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, 
  }
});

router.get("/", coachController.getCoaches);
router.get("/active", coachController.getActiveCoaches);
router.get("/:id", coachController.getCoachByID);

router.post(
  "/",
  protect,
  restrictTo('admin', 'superadmin'),
  upload.single("profile_image"),
  coachController.createCoach
);

router.put(
  "/:id",
  protect,
  restrictTo('admin', 'superadmin'),
  upload.single("profile_image"),
  coachController.updateCoach
);

router.delete(
  "/:id",
  protect,
  restrictTo('superadmin'),
  coachController.deleteCoach
);

router.delete(
  "/:id/delete",
  protect,
  restrictTo('superadmin'),
  coachController.hardDeleteCoach
);

module.exports = router;