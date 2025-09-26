const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { RecordNotFoundError, ValidationFailureError } = require("../utils/ErrorHandling/CustomErrors");
const Athlete = require("../models/Athlete");
const TrackHeatAssignment = require("../models/TrackHeatAssignment");
const TrackEventHeatResult = require("../models/TrackEventHeatResult");
const TrackEventSemifinalResult = require("../models/TrackEventSemifinalResult");
const TrackEventFinalResult = require("../models/TrackEventFinalResult");
const { Op } = require('sequelize');

const getNumberOfHeats = (athleteCount) => {
  if (athleteCount <= 8) return 1;
  if (athleteCount <= 16) return 2;
  if (athleteCount <= 24) return 3;
  if (athleteCount <= 32) return 4;
  if (athleteCount <= 40) return 5;
  if (athleteCount <= 48) return 6;
  if (athleteCount <= 56) return 7;
  if (athleteCount <= 64) return 8;
  return Math.ceil(athleteCount / 8);
};

// distribute athletes per heat
const distributeAthletesPerHeat = (athleteCount, heatCount) => {
  const base = Math.floor(athleteCount / heatCount);
  const remainder = athleteCount % heatCount;
  const distribution = Array(heatCount).fill(base);
  
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }
  
  return distribution;
};

// serpentine distribution
const serpentineDistribution = (athletes, heatCount) => {
  const heats = Array.from({ length: heatCount }, () => []);
  let direction = 1; 
  
  athletes.forEach((athlete, index) => {
    const heatIndex = direction === 1 
      ? index % heatCount 
      : heatCount - 1 - (index % heatCount);
    
    heats[heatIndex].push(athlete);
    
    // Change direction after filling one complete cycle
    if ((index + 1) % heatCount === 0) {
      direction *= -1;
    }
  });
  
  return heats;
};

// Auto update places within a heat
const autoUpdatePlaces = async (event, age_group, gender, year, heat_no, is_semifinal = false) => {
  const heats = await TrackEventHeatResult.findAll({
    where: { 
      event, 
      age_group, 
      gender, 
      year, 
      heat_no,
      is_semifinal,
      timing: { [Op.not]: null }
    },
    order: [['timing', 'ASC']]
  });
  
  let place = 1;
  for (const heat of heats) {
    await heat.update({ place: place++ });
  }
};

// Create heats for an event
exports.createHeats = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.body;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  // Check if this is a track event that requires heats
  const trackEventsWithHeats = ['100m', '200m', '400m', '800m', '100mH', '400mH'];
  if (!trackEventsWithHeats.includes(event)) {
    throw new ValidationFailureError("Heats are only created for specific track events");
  }
  
  const existingHeats = await TrackEventHeatResult.count({
    where: { event, age_group, gender, year, is_semifinal: false }
  });
  
  if (existingHeats > 0) {
    throw new ValidationFailureError("Heats already exist for this event");
  }
  
  // Get approved athletes registered for this event
  const athletes = await Athlete.findAll({
    where: {
      approved: true,
      deleted: false,
      gender,
      age_group,
      year,
      [Op.or]: [
        { selected_events: { [Op.like]: `%${event}%` } },
        { selected_events: { [Op.like]: `%\"${event}\"%` } }
      ]
    },
    attributes: ['athlete_id', 'bib_no', 'name', 'school', 'gender', 'age_group']
  });
  
  const athleteCount = athletes.length;
  
  if (athleteCount === 0) {
    throw new ValidationFailureError("No athletes found for this event");
  }
  
  // Determine number of heats
  const heatCount = getNumberOfHeats(athleteCount);
  const distribution = distributeAthletesPerHeat(athleteCount, heatCount);
  
  // Group athletes by school
  const athletesBySchool = {};
  athletes.forEach(athlete => {
    if (!athletesBySchool[athlete.school]) {
      athletesBySchool[athlete.school] = [];
    }
    athletesBySchool[athlete.school].push(athlete);
  });
  
  // Distribute athletes into heats
  const heats = Array.from({ length: heatCount }, () => []);
  
  // For each school, distribute athletes across different heats
  Object.values(athletesBySchool).forEach(schoolAthletes => {
    if (athleteCount <= 8) {
      schoolAthletes.forEach((athlete, index) => {
        const targetHeat = index % heatCount;
        heats[targetHeat].push(athlete);
      });
    } else {
      // Distribute athletes from same school across different heats
      schoolAthletes.forEach((athlete, index) => {
        const targetHeat = index % heatCount;
        heats[targetHeat].push(athlete);
      });
    }
  });
  
  // Even out the distribution
  for (let i = 0; i < heatCount; i++) {
    while (heats[i].length > distribution[i]) {
      const athlete = heats[i].pop();
      for (let j = 0; j < heatCount; j++) {
        if (heats[j].length < distribution[j]) {
          heats[j].push(athlete);
          break;
        }
      }
    }
    
    while (heats[i].length < distribution[i]) {
      for (let j = 0; j < heatCount; j++) {
        if (heats[j].length > distribution[j]) {
          const athlete = heats[j].pop();
          heats[i].push(athlete);
          break;
        }
      }
    }
  }
  
  // Save heats to database
  for (let i = 0; i < heatCount; i++) {
    for (const athlete of heats[i]) {
      await TrackEventHeatResult.create({
        event,
        age_group,
        gender,
        heat_no: i + 1,
        bib_no: athlete.bib_no,
        athlete_name: athlete.name,
        school: athlete.school,
        year,
        is_semifinal: false
      });
      
      // Create heat assignment record
      await TrackHeatAssignment.create({
        athlete_id: athlete.athlete_id,
        event,
        age_group,
        gender,
        heat_no: i + 1,
        year
      });
    }
  }
  
  res.status(201).json({
    success: true,
    message: `Created ${heatCount} heats for ${event} ${gender} ${age_group}`,
    data: {
      athlete_count: athleteCount,
      heat_count: heatCount,
      distribution
    }
  });
});

// Get heats for an event
exports.getHeats = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.query;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  const heats = await TrackEventHeatResult.findAll({
    where: { event, age_group, gender, year, is_semifinal: false },
    order: [['heat_no', 'ASC'], ['place', 'ASC'], ['timing', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    data: heats
  });
});

// Update heat results with auto place update
exports.updateHeatResults = catchAsync(async (req, res, _next) => {
  const { heat_id, timing } = req.body;
  
  if (!heat_id) {
    throw new ValidationFailureError("Heat ID is required");
  }
  
  const heat = await TrackEventHeatResult.findByPk(heat_id);
  if (!heat) {
    throw new RecordNotFoundError("Heat record not found");
  }
  
  await heat.update({
    timing: timing || null
  });
  
  // Auto update places for this heat
  await autoUpdatePlaces(
    heat.event, 
    heat.age_group, 
    heat.gender, 
    heat.year, 
    heat.heat_no, 
    heat.is_semifinal
  );
  
  res.status(200).json({
    success: true,
    message: "Heat results updated successfully"
  });
});

// Bulk update heat results
exports.bulkUpdateHeatResults = catchAsync(async (req, res, _next) => {
  const { results } = req.body;
  
  if (!Array.isArray(results) || results.length === 0) {
    throw new ValidationFailureError("Results array is required");
  }
  
  const transaction = await TrackEventHeatResult.sequelize.transaction();
  
  try {
    const heatRecords = [];
    for (const result of results) {
      const heat = await TrackEventHeatResult.findByPk(result.heat_id, { transaction });
      if (heat) {
        heatRecords.push(heat);
      }
    }
    
    // Update all timings
    for (const result of results) {
      const heat = await TrackEventHeatResult.findByPk(result.heat_id, { transaction });
      if (heat) {
        await heat.update({ timing: result.timing || null }, { transaction });
      }
    }
    
    const uniqueHeatCombinations = new Map();
    
    for (const heat of heatRecords) {
      const key = `${heat.event}-${heat.age_group}-${heat.gender}-${heat.year}-${heat.heat_no}-${heat.is_semifinal}`;
      if (!uniqueHeatCombinations.has(key)) {
        uniqueHeatCombinations.set(key, {
          event: heat.event,
          age_group: heat.age_group,
          gender: heat.gender,
          year: heat.year,
          heat_no: heat.heat_no,
          is_semifinal: heat.is_semifinal
        });
      }
    }
    
    for (const combination of uniqueHeatCombinations.values()) {
      console.log('Updating places for:', combination);
      
      const heatAthletes = await TrackEventHeatResult.findAll({
        where: { 
          event: combination.event, 
          age_group: combination.age_group, 
          gender: combination.gender, 
          year: combination.year,
          heat_no: combination.heat_no,
          is_semifinal: combination.is_semifinal
        },
        transaction
      });
      
      console.log(`Found ${heatAthletes.length} athletes for heat ${combination.heat_no}`);
      
      // Sort athletes by timing
      const sortedAthletes = heatAthletes
        .filter(athlete => athlete.timing !== null) 
        .sort((a, b) => {
          const timeA = parseFloat(a.timing);
          const timeB = parseFloat(b.timing);
          return timeA - timeB;
        });
      
      console.log(`Sorted ${sortedAthletes.length} athletes with timing:`);
      sortedAthletes.forEach((athlete, index) => {
        console.log(`${index + 1}. ${athlete.athlete_name}: ${athlete.timing}`);
      });
      
      let place = 1;
      for (const athlete of sortedAthletes) {
        await athlete.update({ place: place++ }, { transaction });
        console.log(`Assigned place ${place-1} to athlete ${athlete.athlete_name} with time ${athlete.timing}`);
      }
      
      // Reset place for athletes without timing
      const athletesWithoutTiming = heatAthletes.filter(athlete => athlete.timing === null);
      for (const athlete of athletesWithoutTiming) {
        await athlete.update({ place: null }, { transaction });
        console.log(`Reset place for athlete ${athlete.athlete_name} (no timing)`);
      }
    }
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      message: "Bulk heat results updated successfully with automatic place assignment"
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in bulkUpdateHeatResults:', error);
    throw error;
  }
});

// Auto update qualification status
exports.autoUpdateQualification = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.body;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  // Get all heats for this event with valid timing
  const heats = await TrackEventHeatResult.findAll({
    where: { 
      event, 
      age_group, 
      gender, 
      year, 
      is_semifinal: false,
      timing: { [Op.not]: null } 
    },
    order: [['heat_no', 'ASC'], ['timing', 'ASC']]
  });
  
  if (heats.length === 0) {
    throw new RecordNotFoundError("No heats with results found for this event");
  }
  
  const heatGroups = {};
  heats.forEach(heat => {
    if (!heatGroups[heat.heat_no]) {
      heatGroups[heat.heat_no] = [];
    }
    heatGroups[heat.heat_no].push(heat);
  });
  
  const heatCount = Object.keys(heatGroups).length;
  const athleteCount = heats.length;
  
  await TrackEventHeatResult.update(
    { qualification_status: null },
    { where: { event, age_group, gender, year, is_semifinal: false } }
  );
  
  // Apply qualification rules based on number of athletes
  if (athleteCount <= 8) {
    // Direct final - no qualification needed
    return res.status(200).json({
      success: true,
      message: "Direct final - no qualification needed"
    });
  }
  
  let qualifiedAthletes = [];
  const allAthletes = heats.sort((a, b) => a.timing - b.timing);
  
  if (athleteCount <= 16) {
    // 2 heats: Top 3 in each heat + next 2 fastest
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(3, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 2) break;
      }
    }
  } 
  else if (athleteCount <= 24) {
    // 3 heats: Top 2 in each heat + next 2 fastest
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(2, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 2) break;
      }
    }
  }
  else if (athleteCount <= 32) {
    // 4 heats: Top 3 in each heat + next 4 fastest
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(3, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 4) break;
      }
    }
  }
  else if (athleteCount <= 40) {
    // 5 heats: Top 2 in each heat + next 6 fastest
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(2, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 6) break;
      }
    }
  }
  else if (athleteCount <= 48) {
    // 6 heats: Top 2 in each heat + next 4 fastest
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(2, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 4) break;
      }
    }
  }
  else if (athleteCount <= 56) {
    // 7 heats: Top 2 in each heat + next 10 fastest 
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(2, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 10) break; 
      }
    }
  }
  else if (athleteCount <= 64) {
    // 8 heats: Top 1 in each heat + next 16 fastest
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      if (sortedHeat.length > 0) {
        qualifiedAthletes.push({ ...sortedHeat[0].dataValues, qualType: 'Q' });
      }
    });

    // Add next fastest across all heats
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 16) break; 
      }
    }
  }
  else {
    // More than 64 athletes: General rule for many heats
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      if (sortedHeat.length > 0) {
        qualifiedAthletes.push({ ...sortedHeat[0].dataValues, qualType: 'Q' });
      }
    });

    // Add next fastest across all heats 
    const needed = 24 - qualifiedAthletes.length;
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.heat_id === athlete.heat_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= needed) break;
      }
    }
  }
  
  // Update qualification status in database
  for (const athlete of qualifiedAthletes) {
    await TrackEventHeatResult.update(
      { qualification_status: athlete.qualType },
      { where: { heat_id: athlete.heat_id } }
    );
  }
  
  res.status(200).json({
    success: true,
    message: `Qualification status updated for ${qualifiedAthletes.length} athletes`,
    data: {
      qualified_count: qualifiedAthletes.length,
      heat_count: heatCount,
      athlete_count: athleteCount
    }
  });
});

// Create semifinals
exports.createSemifinals = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.body;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  // Get all qualified athletes
  const qualifiedAthletes = await TrackEventHeatResult.findAll({
    where: { 
      event, 
      age_group, 
      gender, 
      year, 
      is_semifinal: false,
      qualification_status: { [Op.in]: ['Q', 'qt'] }
    },
    order: [['heat_no', 'ASC'], ['timing', 'ASC']]
  });
  
  if (qualifiedAthletes.length === 0) {
    throw new RecordNotFoundError("No qualified athletes found for semifinals");
  }
  
  // Check if semifinals already exist
  const existingSemifinals = await TrackEventSemifinalResult.count({
    where: { event, age_group, gender, year }
  });
  
  if (existingSemifinals > 0) {
    throw new ValidationFailureError("Semifinals already exist for this event");
  }
  
  // Rank athletes by timing for serpentine distribution
  const rankedAthletes = qualifiedAthletes.sort((a, b) => a.timing - b.timing);
  
  // Determine number of semifinal heats
  const semifinalHeatCount = Math.ceil(rankedAthletes.length / 8);
  
  // Use serpentine distribution
  const semifinalHeats = serpentineDistribution(rankedAthletes, semifinalHeatCount);
  
  // Save semifinals to database
  for (let i = 0; i < semifinalHeats.length; i++) {
    for (const athlete of semifinalHeats[i]) {
      await TrackEventSemifinalResult.create({
        event,
        age_group,
        gender,
        heat_no: i + 1,
        bib_no: athlete.bib_no,
        athlete_name: athlete.athlete_name,
        school: athlete.school,
        year,
        qualification_status: null
      });
    }
  }
  
  res.status(201).json({
    success: true,
    message: `Created ${semifinalHeatCount} semifinal heats`,
    data: {
      athlete_count: rankedAthletes.length,
      heat_count: semifinalHeatCount
    }
  });
});

// Get semifinals
exports.getSemifinals = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.query;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  const semifinals = await TrackEventSemifinalResult.findAll({
    where: { event, age_group, gender, year },
    order: [['heat_no', 'ASC'], ['timing', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    data: semifinals
  });
});

// Update semifinal results and create finals
exports.updateSemifinalResults = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.body;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  // Get all semifinal heats with timing
  const semifinals = await TrackEventSemifinalResult.findAll({
    where: { 
      event, 
      age_group, 
      gender, 
      year,
      timing: { [Op.not]: null } 
    },
    order: [['heat_no', 'ASC'], ['timing', 'ASC']]
  });
  
  if (semifinals.length === 0) {
    throw new RecordNotFoundError("No semifinal results found for this event");
  }
  
  // Group by heat no
  const heatGroups = {};
  semifinals.forEach(heat => {
    if (!heatGroups[heat.heat_no]) {
      heatGroups[heat.heat_no] = [];
    }
    heatGroups[heat.heat_no].push(heat);
  });
  
  const heatCount = Object.keys(heatGroups).length;
  
  await TrackEventSemifinalResult.update(
    { qualification_status: null },
    { where: { event, age_group, gender, year } }
  );
  
  let qualifiedAthletes = [];
  const allAthletes = semifinals.sort((a, b) => a.timing - b.timing);
  
  if (heatCount === 1) {
    // 1 semifinal heat 
    qualifiedAthletes = semifinals.map(athlete => ({
      ...athlete.dataValues,
      qualType: 'Q'
    }));
  } 
  else if (heatCount === 2) {
    // 2 semifinals
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(3, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next 2 fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.semifinal_id === athlete.semifinal_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 2) break;
      }
    }
  }
  else if (heatCount === 3) {
    // 3 semifinals 
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(2, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Get next 2 fastest (qt)
    let nextFastestCount = 0;
    for (const athlete of allAthletes) {
      if (!qualifiedAthletes.some(q => q.semifinal_id === athlete.semifinal_id)) {
        qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
        nextFastestCount++;
        if (nextFastestCount >= 2) break;
      }
    }
  }
  else {
    //  4 or more semifinal heats
    const perHeatQualifiers = 2;
    Object.values(heatGroups).forEach(heat => {
      const sortedHeat = heat.sort((a, b) => a.timing - b.timing);
      for (let i = 0; i < Math.min(perHeatQualifiers, sortedHeat.length); i++) {
        qualifiedAthletes.push({ ...sortedHeat[i].dataValues, qualType: 'Q' });
      }
    });
    
    // Calculate how many more needed to reach 8 finalists
    const needed = 8 - qualifiedAthletes.length;
    if (needed > 0) {
      let nextFastestCount = 0;
      for (const athlete of allAthletes) {
        if (!qualifiedAthletes.some(q => q.semifinal_id === athlete.semifinal_id)) {
          qualifiedAthletes.push({ ...athlete.dataValues, qualType: 'qt' });
          nextFastestCount++;
          if (nextFastestCount >= needed) break;
        }
      }
    }
  }
  
  // Update qualification status
  for (const athlete of qualifiedAthletes) {
    await TrackEventSemifinalResult.update(
      { qualification_status: athlete.qualType },
      { where: { semifinal_id: athlete.semifinal_id } }
    );
  }
  
  const existingFinals = await TrackEventFinalResult.count({
    where: { event, age_group, gender, year }
  });
  
  if (existingFinals === 0) {
    for (const athlete of qualifiedAthletes) {
      await TrackEventFinalResult.create({
        event,
        age_group,
        gender,
        bib_no: athlete.bib_no,
        athlete_name: athlete.athlete_name,
        school: athlete.school,
        year,
        timing: null,
        place: null
      });
    }
  }
  
  res.status(200).json({
    success: true,
    message: `Semifinal results updated and ${existingFinals > 0 ? 'finals already existed' : 'finals created'} for ${qualifiedAthletes.length} athletes`,
    data: {
      qualified_count: qualifiedAthletes.length,
      semifinal_heat_count: heatCount
    }
  });
});

// Bulk update semifinal results
exports.bulkUpdateSemifinalResults = catchAsync(async (req, res, _next) => {
  const { results } = req.body;
  
  if (!Array.isArray(results) || results.length === 0) {
    throw new ValidationFailureError("Results array is required");
  }
  
  const transaction = await TrackEventSemifinalResult.sequelize.transaction();
  
  try {
    const firstSemifinal = await TrackEventSemifinalResult.findByPk(results[0].semifinal_id, { transaction });
    if (!firstSemifinal) {
      throw new RecordNotFoundError("Semifinal record not found");
    }
    
    const { event, age_group, gender, year, heat_no } = firstSemifinal;
    
    console.log('Processing semifinal heat:', { event, age_group, gender, year, heat_no });
    
    for (const result of results) {
      const semifinal = await TrackEventSemifinalResult.findByPk(result.semifinal_id, { transaction });
      if (semifinal) {
        await semifinal.update({ timing: result.timing || null }, { transaction });
        console.log(`Updated timing for ${semifinal.athlete_name}: ${result.timing}`);
      }
    }
    
    const allAthletesInSemifinal = await TrackEventSemifinalResult.findAll({
      where: { 
        event, 
        age_group, 
        gender, 
        year,
        heat_no
      },
      transaction
    });
    
    console.log(`Total athletes in semifinal heat ${heat_no}:`, allAthletesInSemifinal.length);
    
    const athletesWithTiming = allAthletesInSemifinal
      .filter(athlete => athlete.timing !== null && !isNaN(parseFloat(athlete.timing)))
      .sort((a, b) => parseFloat(a.timing) - parseFloat(b.timing));
    
    console.log(`Athletes with valid timing:`, athletesWithTiming.length);
    
    let place = 1;
    for (const athlete of athletesWithTiming) {
      await athlete.update({ place: place++ }, { transaction });
      console.log(`Place ${place-1}: ${athlete.athlete_name} - ${athlete.timing}s`);
    }
    
    const athletesWithoutTiming = allAthletesInSemifinal.filter(athlete => 
      athlete.timing === null || isNaN(parseFloat(athlete.timing))
    );
    
    for (const athlete of athletesWithoutTiming) {
      await athlete.update({ place: null }, { transaction });
      console.log(`Reset place for: ${athlete.athlete_name}`);
    }
    
    await transaction.commit();
    
    const updatedAthletes = await TrackEventSemifinalResult.findAll({
      where: { event, age_group, gender, year, heat_no },
      order: [['place', 'ASC']]
    });
    
    console.log('Final places after update:');
    updatedAthletes.forEach(athlete => {
      console.log(`- ${athlete.athlete_name}: Place ${athlete.place}, Time ${athlete.timing}`);
    });
    
    res.status(200).json({
      success: true,
      message: `Semifinal results updated. Assigned places to ${athletesWithTiming.length} athletes.`,
      data: {
        heat_no,
        athletes_updated: athletesWithTiming.length,
        places_assigned: place - 1
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error in bulkUpdateSemifinalResults:', error);
    throw error;
  }
});

exports.updateSemifinalTiming = catchAsync(async (req, res, _next) => {
  const { semifinal_id, timing } = req.body;
  
  if (!semifinal_id) {
    throw new ValidationFailureError("Semifinal ID is required");
  }
  
  const semifinal = await TrackEventSemifinalResult.findByPk(semifinal_id);
  if (!semifinal) {
    throw new RecordNotFoundError("Semifinal record not found");
  }
  
  await semifinal.update({
    timing: timing || null
  });
  
  const semifinalHeat = await TrackEventSemifinalResult.findAll({
    where: { 
      event: semifinal.event, 
      age_group: semifinal.age_group, 
      gender: semifinal.gender, 
      year: semifinal.year,
      heat_no: semifinal.heat_no,
      timing: { [Op.not]: null }
    },
    order: [['timing', 'ASC']]
  });
  
  let place = 1;
  for (const athlete of semifinalHeat) {
    await athlete.update({ place: place++ });
  }
  
  res.status(200).json({
    success: true,
    message: "Semifinal timing updated successfully"
  });
});

// Get finals
exports.getFinals = catchAsync(async (req, res, _next) => {
  const { event, age_group, gender, year = new Date().getFullYear() } = req.query;
  
  if (!event || !age_group || !gender) {
    throw new ValidationFailureError("Event, age group, and gender are required");
  }
  
  const finals = await TrackEventFinalResult.findAll({
    where: { event, age_group, gender, year },
    order: [['timing', 'ASC'], ['place', 'ASC']]
  });
  
  res.status(200).json({
    success: true,
    data: finals
  });
});

// Update final results with auto place update
exports.updateFinalResults = catchAsync(async (req, res, _next) => {
  const { final_id, timing } = req.body;
  
  if (!final_id) {
    throw new ValidationFailureError("Final ID is required");
  }
  
  const final = await TrackEventFinalResult.findByPk(final_id);
  if (!final) {
    throw new RecordNotFoundError("Final record not found");
  }
  
  await final.update({
    timing: timing || null
  });
  
  // Auto update places based on timing
  const allFinals = await TrackEventFinalResult.findAll({
    where: { 
      event: final.event, 
      age_group: final.age_group, 
      gender: final.gender, 
      year: final.year,
      timing: { [Op.not]: null }
    },
    order: [['timing', 'ASC']]
  });
  
  let place = 1;
  for (const finalRecord of allFinals) {
    await finalRecord.update({ place: place++ });
  }
  
  res.status(200).json({
    success: true,
    message: "Final results updated successfully"
  });
});

// Bulk update final results
exports.bulkUpdateFinalResults = catchAsync(async (req, res, _next) => {
  const { results } = req.body; 
  
  if (!Array.isArray(results) || results.length === 0) {
    throw new ValidationFailureError("Results array is required");
  }
  
  const transaction = await TrackEventFinalResult.sequelize.transaction();
  
  try {
    for (const result of results) {
      const final = await TrackEventFinalResult.findByPk(result.final_id, { transaction });
      if (final) {
        await final.update({ timing: result.timing || null }, { transaction });
      }
    }
  
    const uniqueEvents = new Set();
    for (const result of results) {
      const final = await TrackEventFinalResult.findByPk(result.final_id, { transaction });
      if (final) {
        const key = `${final.event}-${final.age_group}-${final.gender}-${final.year}`;
        uniqueEvents.add(key);
      }
    }
    
    for (const key of uniqueEvents) {
      const [event, age_group, gender, year] = key.split('-');
      const finals = await TrackEventFinalResult.findAll({
        where: { 
          event, 
          age_group, 
          gender, 
          year: parseInt(year),
          timing: { [Op.not]: null }
        },
        order: [['timing', 'ASC']],
        transaction
      });
      
      let place = 1;
      for (const finalRecord of finals) {
        await finalRecord.update({ place: place++ }, { transaction });
      }
    }
    
    await transaction.commit();
    
    res.status(200).json({
      success: true,
      message: "Bulk final results updated successfully"
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});