const express = require('express');
const router = express.Router();
const heatController = require('../controllers/heatController');
const Athlete = require('../models/Athlete');

router.post("/create-heats", heatController.createHeats);
router.get("/get-heats", heatController.getHeats);
router.patch("/update-heat-results", heatController.updateHeatResults);
router.patch("/bulk-update-heat-results", heatController.bulkUpdateHeatResults);
router.patch("/auto-qualification", heatController.autoUpdateQualification);
router.post("/create-semifinals", heatController.createSemifinals);
router.get("/get-semifinals", heatController.getSemifinals);
router.patch("/update-semifinal-results", heatController.updateSemifinalResults);
router.patch("/bulk-update-semifinal-results", heatController.bulkUpdateSemifinalResults);
router.patch("/update-semifinal-timing", heatController.updateSemifinalTiming);
router.get("/get-finals", heatController.getFinals);
router.patch("/update-final-results", heatController.updateFinalResults);
router.patch("/bulk-update-final-results", heatController.bulkUpdateFinalResults);

router.get("/athletes", async (req, res) => {
  try {
    const athletes = await Athlete.findAll({
      where: { approved: true, deleted: false }, 
      attributes: [
        'athlete_id',
        'bib_no',
        'name',
        'school',
        'gender',
        'age_group',
        'selected_events',
        'year'
      ]
    });
    res.status(200).json({ success: true, data: athletes });
  } catch (err) {
    console.error("Error fetching athletes:", err);
    res.status(500).json({ success: false, message: "Failed to fetch athletes" });
  }
});

router.get("/check-heats", async (req, res) => {
  try {
    const { event, age_group, gender, year } = req.query;
    
    if (!event || !age_group || !gender || !year) {
      return res.status(400).json({ 
        success: false, 
        message: "Event, age group, gender, and year are required" 
      });
    }

    const heatCount = await TrackEventHeatResult.count({
      where: { 
        event, 
        age_group, 
        gender, 
        year, 
        is_semifinal: false 
      }
    });

    res.status(200).json({ 
      success: true, 
      exists: heatCount > 0,
      count: heatCount
    });
  } catch (error) {
    console.error("Error checking heats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check heats" 
    });
  }
});

module.exports = router;