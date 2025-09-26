const express = require('express');
const router = express.Router();
const fieldEventsController = require('../controllers/fieldEventsController');
const { protect, restrictTo } = require('../middleware/auth');

router.get("/", protect, restrictTo('superadmin', 'admin'), fieldEventsController.getFieldEvents);
router.get("/athletes", protect, restrictTo('superadmin', 'admin'), fieldEventsController.getFieldEventAthletes);
router.post("/performance", protect, restrictTo('superadmin', 'admin'), fieldEventsController.updateFieldEventPerformance);

module.exports = router;