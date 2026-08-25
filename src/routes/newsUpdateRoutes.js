const express = require("express");
const multer = require("multer");
const newsUpdateController = require("../controllers/newsUpdateController");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });


router.use(protect);
router.get("/", newsUpdateController.getNewsUpdates);
router.get("/active", newsUpdateController.getActiveNewsUpdates);
router.get("/:id", newsUpdateController.getNewsUpdateByID);
router.post("/", restrictTo('admin', 'superadmin'), upload.single("image"), newsUpdateController.createNewsUpdate);
router.put("/:id", restrictTo('admin', 'superadmin'), upload.single("image"), newsUpdateController.updateNewsUpdate);
router.delete("/:id", restrictTo('superadmin'), newsUpdateController.deleteNewsUpdate);

router.delete("/:id/delete", restrictTo('superadmin'), newsUpdateController.hardDeleteNewsUpdate);

module.exports = router;