const express = require('express');
const router = express.Router();
const trackEventsController = require('../controllers/trackEventsController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes protected, only admin/superadmin can access
router.get("/athletes", protect, restrictTo('superadmin', 'admin'), trackEventsController.getTrackEventAthletes);
router.post("/heats", protect, restrictTo('superadmin', 'admin'), trackEventsController.createHeats);
router.post("/results", protect, restrictTo('superadmin', 'admin'), trackEventsController.recordHeatResults);
router.post("/next-round", protect, restrictTo('superadmin', 'admin'), trackEventsController.createNextRound);
router.get("/heats", protect, restrictTo('superadmin', 'admin'), trackEventsController.getHeats);

module.exports = router;