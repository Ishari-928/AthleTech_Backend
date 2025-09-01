// routes/eventRoutes.js
const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/active", eventController.getAllActiveEvents);
router.get("/:id", eventController.getEventById);

// Super admin only routes
router.get("/admin/all", eventController.requireSuperAdmin, eventController.getAllEvents);
router.post("/", eventController.requireSuperAdmin, eventController.createEvent);
router.patch("/:id/toggle-status", eventController.requireSuperAdmin, eventController.toggleEventStatus);
router.put("/:id", eventController.requireSuperAdmin, eventController.updateEvent);
router.delete("/:id", eventController.requireSuperAdmin, eventController.deleteEvent);
router.delete("/:id/hard", eventController.requireSuperAdmin, eventController.hardDeleteEvent);

module.exports = router;