const Athlete = require('../models/Athlete');
const TrackEventHeat = require('../models/TrackEventHeat');
const HeatAssignment = require('../models/HeatAssignment');
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { ValidationFailureError } = require("../utils/ErrorHandling/CustomErrors");
const { Op } = require('sequelize');

const TRACK_EVENTS = ['60M', '100M', '200M', '400M', '800M', '100MH', '400MH'];
const LANES_PER_TRACK = 8;

exports.getTrackEventAthletes = catchAsync(async (req, res, _next) => {
  const { event_name, year, gender, age_group } = req.query;
  
  if (!event_name || !TRACK_EVENTS.includes(event_name.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: "Valid event name is required"
    });
  }
  
  let whereClause = {
    approved: true,
    deleted: false
  };
  
  if (year && year !== 'all') whereClause.year = year;
  if (gender && gender !== 'all') whereClause.gender = gender;
  if (age_group && age_group !== 'all') whereClause.age_group = age_group;
  
  const athletes = await Athlete.findAll({
    where: whereClause,
    attributes: ['athlete_id', 'bib_no', 'name', 'school', 'age_group', 'gender', 'selected_events']
  });
  
  console.log('All athletes selected_events:', athletes.map(a => a.selected_events));
  
  // Filter athletes 
  const eventAthletes = athletes.filter(athlete => {
    try {
      let events = [];
      if (Array.isArray(athlete.selected_events)) {
        events = athlete.selected_events;
      } else if (typeof athlete.selected_events === 'string') {
        events = JSON.parse(athlete.selected_events || '[]');
      }
      
      return events.some(event => 
        event && event.toUpperCase() === event_name.toUpperCase()
      );
    } catch (error) {
      console.error('Error parsing selected_events:', error);
      return false;
    }
  });
  
  console.log(`Found ${eventAthletes.length} athletes for event ${event_name}`);
  
  res.status(200).json({
    success: true,
    message: "Track event athletes",
    data: eventAthletes,
  });
});

exports.createHeats = catchAsync(async (req, res, _next) => {
  const { event_name, year } = req.body;
  
  if (!event_name || !year) {
    throw new ValidationFailureError("Event name and year are required");
  }
  
  if (!TRACK_EVENTS.includes(event_name.toUpperCase())) {
    throw new ValidationFailureError("This event does not require heat management");
  }
  
  const athletes = await Athlete.findAll({
    where: {
      approved: true,
      deleted: false,
      year: parseInt(year)
    },
    attributes: ['athlete_id', 'bib_no', 'name', 'school', 'gender', 'age_group', 'selected_events']
  });
  
  console.log(`Found ${athletes.length} total athletes for year ${year}`);
  
  const eventAthletes = athletes.filter(athlete => {
    try {
      let events = [];
      if (Array.isArray(athlete.selected_events)) {
        events = athlete.selected_events;
      } else if (typeof athlete.selected_events === 'string') {
        events = JSON.parse(athlete.selected_events || '[]');
      }
      
      return events.some(event => 
        event && event.toUpperCase() === event_name.toUpperCase()
      );
    } catch (error) {
      console.error('Error parsing selected_events:', error);
      return false;
    }
  });
  
  console.log(`Found ${eventAthletes.length} athletes registered for ${event_name}`);
  
  if (eventAthletes.length === 0) {
    throw new ValidationFailureError("No athletes found for this event");
  }
  
  const groupedAthletes = {};
  eventAthletes.forEach(athlete => {
    const groupKey = `${athlete.gender}-${athlete.age_group}`;
    if (!groupedAthletes[groupKey]) {
      groupedAthletes[groupKey] = [];
    }
    groupedAthletes[groupKey].push(athlete);
  });
  
  console.log('Grouped athletes:', Object.keys(groupedAthletes).map(key => ({
    group: key,
    count: groupedAthletes[key].length
  })));
  
  const allCreatedHeats = [];
  
  for (const [groupKey, groupAthletes] of Object.entries(groupedAthletes)) {
    const [gender, age_group] = groupKey.split('-');
    
    console.log(`Creating heats for ${gender} ${age_group} with ${groupAthletes.length} athletes`);
    
    const numberOfHeats = calculateNumberOfHeats(groupAthletes.length);
    console.log(`Need ${numberOfHeats} heats for ${groupAthletes.length} athletes`);
    
    const heatDistribution = distributeAthletesToHeats(groupAthletes, numberOfHeats);
    
    for (let i = 0; i < numberOfHeats; i++) {
      const heatNumber = i + 1;
      
      const heat = await TrackEventHeat.create({
        event_name: event_name.toUpperCase(),
        age_group,
        gender,
        round: 'heat',
        heat_number: heatNumber,
        year: parseInt(year),
        status: 'scheduled'
      });
      
      console.log(`Created heat ${heatNumber} for ${gender} ${age_group}`);
      
      const heatAthletes = heatDistribution[i];
      
      for (const athlete of heatAthletes) {
        await HeatAssignment.create({
          athlete_id: athlete.athlete_id,
          heat_id: heat.heat_id,
          lane: null,
          qualified: false
        });
      }
      
      allCreatedHeats.push({
        heat,
        athletes: heatAthletes,
        gender,
        age_group,
        heat_number: heatNumber
      });
    }
  }
  
  res.status(201).json({
    success: true,
    message: `Created heats for ${event_name}`,
    data: {
      total_athletes: eventAthletes.length,
      number_of_groups: Object.keys(groupedAthletes).length,
      total_heats: allCreatedHeats.length,
      heats: allCreatedHeats
    }
  });
});

function calculateNumberOfHeats(athleteCount) {
  if (athleteCount <= LANES_PER_TRACK) return 1;
  if (athleteCount <= 16) return 2;
  if (athleteCount <= 24) return 3;
  if (athleteCount <= 32) return 4;
  if (athleteCount <= 40) return 5;
  if (athleteCount <= 48) return 6;
  return Math.ceil(athleteCount / LANES_PER_TRACK);
}

function distributeAthletesToHeats(athletes, numberOfHeats) {
  const athletesBySchool = {};
  athletes.forEach(athlete => {
    if (!athletesBySchool[athlete.school]) {
      athletesBySchool[athlete.school] = [];
    }
    athletesBySchool[athlete.school].push(athlete);
  });
  
  const heats = Array.from({ length: numberOfHeats }, () => []);
  const schoolDistribution = {};
  
  Object.keys(athletesBySchool).forEach(school => {
    schoolDistribution[school] = 0;
    const schoolAthletes = athletesBySchool[school];
    
    schoolAthletes.forEach(athlete => {
      let assigned = false;
      
      for (let i = 0; i < numberOfHeats; i++) {
        const athletesFromSameSchoolInHeat = heats[i].filter(a => a.school === school).length;
        if (athletesFromSameSchoolInHeat < 2) {
          heats[i].push(athlete);
          schoolDistribution[school]++;
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        const smallestHeat = heats.reduce((minHeat, heat, index) => 
          heat.length < minHeat.heat.length ? { heat, index } : minHeat, 
          { heat: heats[0], index: 0 }
        );
        smallestHeat.heat.push(athlete);
        schoolDistribution[school]++;
      }
    });
  });
  
  balanceHeats(heats);
  
  return heats;
}

function balanceHeats(heats) {
  const totalAthletes = heats.flat().length;
  const targetSize = Math.ceil(totalAthletes / heats.length);
  
  let balanced = false;
  while (!balanced) {
    balanced = true;
    
    for (let i = 0; i < heats.length; i++) {
      for (let j = i + 1; j < heats.length; j++) {
        if (heats[i].length > targetSize + 1 && heats[j].length < targetSize) {
          const athleteToMove = findAthleteToMove(heats[i], heats[j]);
          if (athleteToMove) {
            heats[i] = heats[i].filter(a => a.athlete_id !== athleteToMove.athlete_id);
            heats[j].push(athleteToMove);
            balanced = false;
          }
        }
      }
    }
  }
}

function findAthleteToMove(sourceHeat, targetHeat) {
  for (const athlete of sourceHeat) {
    const athletesFromSameSchoolInTarget = targetHeat.filter(a => a.school === athlete.school).length;
    if (athletesFromSameSchoolInTarget < 2) {
      return athlete;
    }
  }
  return null;
}

exports.recordHeatResults = catchAsync(async (req, res, _next) => {
  const { heat_id, results } = req.body;
  
  if (!heat_id || !Array.isArray(results)) {
    throw new ValidationFailureError("Heat ID and results array are required");
  }
  
  const heat = await TrackEventHeat.findByPk(heat_id, {
    include: [{
      model: HeatAssignment,
      as: 'HeatAssignments',
      include: [{
        model: Athlete,
        as: 'Athlete'
      }]
    }]
  });
  
  if (!heat) {
    throw new ValidationFailureError("Heat not found");
  }
  
  for (const result of results) {
    const assignment = await HeatAssignment.findOne({
      where: {
        heat_id,
        athlete_id: result.athlete_id
      }
    });
    
    if (assignment) {
      await assignment.update({
        performance_time: result.time,
        place_in_heat: result.place
      });
    }
  }
  
  await determineQualifiers(heat_id);
  
  res.status(200).json({
    success: true,
    message: "Heat results recorded successfully"
  });
});

async function determineQualifiers(heatId) {
  const heat = await TrackEventHeat.findByPk(heatId);
  const allHeats = await TrackEventHeat.findAll({
    where: {
      event_name: heat.event_name,
      age_group: heat.age_group,
      gender: heat.gender,
      year: heat.year,
      round: 'heat'
    },
    include: [{
      model: HeatAssignment,
      as: 'HeatAssignments',
      include: [{
        model: Athlete,
        as: 'Athlete'
      }]
    }]
  });
  
  const allPerformances = [];
  
  
  for (const h of allHeats) {
    for (const assignment of h.HeatAssignments) {
      if (assignment.performance_time) {
        allPerformances.push({
          assignment_id: assignment.assignment_id,
          athlete_id: assignment.athlete_id,
          time: assignment.performance_time,
          heat_number: h.heat_number,
          place: assignment.place_in_heat
        });
      }
    }
  }
  
  allPerformances.sort((a, b) => a.time - b.time);
  
  const totalAthletes = allPerformances.length;
  const qualificationRules = getQualificationRules(totalAthletes);
  
  let qualifiedCount = 0;
  const heatWinners = new Set();
  
  for (const heat of allHeats) {
    const heatPerformances = allPerformances.filter(p => 
      p.heat_number === heat.heat_number
    ).sort((a, b) => a.place - b.place);
    
    for (let i = 0; i < qualificationRules.heatQ && i < heatPerformances.length; i++) {
      const performance = heatPerformances[i];
      await HeatAssignment.update(
        { qualified: true, qualification_type: 'Q' },
        { where: { assignment_id: performance.assignment_id } }
      );
      qualifiedCount++;
      heatWinners.add(performance.assignment_id);
    }
  }
  
  if (qualifiedCount < qualificationRules.totalQualifiers) {
    const remainingSpots = qualificationRules.totalQualifiers - qualifiedCount;
    const timeQualifiers = allPerformances
      .filter(p => !heatWinners.has(p.assignment_id))
      .slice(0, remainingSpots);
    
    for (const qualifier of timeQualifiers) {
      await HeatAssignment.update(
        { qualified: true, qualification_type: 'q_time' },
        { where: { assignment_id: qualifier.assignment_id } }
      );
    }
  }
}

function getQualificationRules(totalAthletes) {
  if (totalAthletes <= 8) {
    return { heatQ: 0, totalQualifiers: totalAthletes }; 
  } else if (totalAthletes <= 16) {
    return { heatQ: 3, totalQualifiers: 8 }; 
  } else if (totalAthletes <= 24) {
    return { heatQ: 2, totalQualifiers: 8 }; 
  } else if (totalAthletes <= 32) {
    return { heatQ: 3, totalQualifiers: 16 }; 
  } else {
    return { heatQ: 2, totalQualifiers: Math.min(24, Math.ceil(totalAthletes * 0.5)) };
  }
}

exports.createNextRound = catchAsync(async (req, res, _next) => {
  const { event_name, year, gender, age_group, round } = req.body;
  
  if (!event_name || !year || !gender || !age_group || !round) {
    throw new ValidationFailureError("Missing required parameters");
  }
  
  if (!['semifinal', 'final'].includes(round)) {
    throw new ValidationFailureError("Round must be 'semifinal' or 'final'");
  }
  
  const previousRound = round === 'semifinal' ? 'heat' : 'semifinal';
  
  const qualifiers = await HeatAssignment.findAll({
    include: [{
      model: TrackEventHeat,
      as: 'Heat',
      where: {
        event_name: event_name.toUpperCase(),
        age_group,
        gender,
        year,
        round: previousRound
      }
    }, {
      model: Athlete,
      as: 'Athlete'
    }],
    where: {
      qualified: true
    }
  });
  
  if (qualifiers.length === 0) {
    throw new ValidationFailureError("No qualifiers found for the next round");
  }
  
  const numberOfHeats = calculateNumberOfHeats(qualifiers.length);
  const heats = [];
  
  for (let i = 0; i < numberOfHeats; i++) {
    const heat = await TrackEventHeat.create({
      event_name: event_name.toUpperCase(),
      age_group,
      gender,
      round,
      heat_number: i + 1,
      year,
      status: 'scheduled'
    });
    heats.push(heat);
  }
  
  const athletes = qualifiers.map(q => q.Athlete);
  const heatDistribution = distributeAthletesToHeats(athletes, numberOfHeats);
  
  for (let i = 0; i < numberOfHeats; i++) {
    for (const athlete of heatDistribution[i]) {
      await HeatAssignment.create({
        athlete_id: athlete.athlete_id,
        heat_id: heats[i].heat_id,
        qualified: false
      });
    }
  }
  
  res.status(201).json({
    success: true,
    message: `Created ${numberOfHeats} ${round} heats`,
    data: {
      round,
      number_of_heats: numberOfHeats,
      total_qualifiers: qualifiers.length
    }
  });
});

exports.getHeats = catchAsync(async (req, res, _next) => {
  const { event_name, year, gender, age_group, round } = req.query;
  
  const whereClause = {};
  if (event_name) whereClause.event_name = event_name.toUpperCase();
  if (year) whereClause.year = year;
  if (gender) whereClause.gender = gender;
  if (age_group) whereClause.age_group = age_group;
  if (round) whereClause.round = round;
  
  const heats = await TrackEventHeat.findAll({
    where: whereClause,
    include: [{
      model: HeatAssignment,
      as: 'HeatAssignments',
      include: [{
        model: Athlete,
        as: 'Athlete',
        attributes: ['athlete_id', 'bib_no', 'name', 'school', 'gender', 'age_group']
      }]
    }],
    order: [
      ['heat_number', 'ASC']
    ]
  });
  
  res.status(200).json({
    success: true,
    message: "Heat information",
    data: heats
  });
});