// src/routes/athlete.js
const express = require('express');
const router = express.Router();
const athleteController = require('../controllers/athletesController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.get("/", athleteController.getAllAthletes);
router.get("/:id", athleteController.getAthleteById);
router.post("/", upload.array("payment_slip"), athleteController.createAthlete);
router.put("/:id", upload.single("payment_slip"), athleteController.updateAthlete);
router.patch("/:id/approve", athleteController.approveAthlete);
router.delete("/:id", athleteController.deleteAthlete); // This is now soft delete

module.exports = router;