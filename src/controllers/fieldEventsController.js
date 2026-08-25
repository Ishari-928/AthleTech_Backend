const FieldEvents = require('../models/FieldEvents');
const Athlete = require('../models/Athlete');
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { RecordNotFoundError, ValidationFailureError } = require("../utils/ErrorHandling/CustomErrors");
const { Op } = require('sequelize');

function parsePerformanceValue(performance) {
  if (!performance || performance.toString().trim() === '') {
    return null;
  }
  
  const numericStr = performance.toString().trim().replace(/[^0-9.]/g, '');
  
  const value = parseFloat(numericStr);
  
  return isNaN(value) || value < 0 ? null : value;
}

function formatPerformanceValue(value) {
  return value !== null ? `${value.toFixed(2)}M` : null;
}

exports.getFieldEvents = catchAsync(async (req, res, _next) => {
  const { year, gender, age_group, event_name, school, search } = req.query;
  
  let whereClause = {};
  
  if (year && year !== 'all') {
    whereClause.year = year;
  }
  
  if (gender && gender !== 'all') {
    whereClause.gender = gender;
  }
  
  if (age_group && age_group !== 'all') {
    whereClause.age_group = age_group;
  }
  
  if (event_name && event_name !== 'all') {
    whereClause.event_name = event_name;
  }
  
  if (school && school !== 'all') {
    whereClause.school = school;
  }
  
  try {
    const performances = await FieldEvents.findAll({
      where: whereClause,
      include: [{
        model: Athlete,
        as: 'Athlete',
        attributes: ['bib_no', 'name'],
        where: { approved: true, deleted: false }
      }],
      order: [
        ['event_name', 'ASC'],
        ['gender', 'ASC'],
        ['age_group', 'ASC'],
        ['best_performance', 'DESC']
      ]
    });
    
    res.status(200).json({
      success: true,
      message: "Field events performances",
      data: performances,
    });
  } catch (error) {
    console.error('Error in getFieldEvents:', error);
    throw new ValidationFailureError("Error fetching field events data");
  }
});

exports.updateFieldEventPerformance = catchAsync(async (req, res, _next) => {
  const {
    athlete_id,
    event_name,
    attempt_1,
    attempt_2,
    attempt_3,
    attempt_4,
    attempt_5,
    attempt_6,
    year,
    gender,
    age_group,
    school
  } = req.body;

  console.log('=== DEBUG: Starting updateFieldEventPerformance ===');
  console.log('Request body:', req.body);
  
  if (!athlete_id || !event_name || !year || !gender || !age_group || !school) {
    console.log('Validation failed: Missing required fields');
    throw new ValidationFailureError("Missing required fields");
  }
  
  const attempts = [attempt_1, attempt_2, attempt_3, attempt_4, attempt_5, attempt_6].map(
    attempt => {
      const result = attempt === '' ? null : attempt;
      console.log(`Processing attempt: "${attempt}" ->`, result);
      return result;
    }
  );
  
  console.log('All processed attempts:', attempts);
  
  const attemptValues = attempts.map(attempt => {
    const parsed = parsePerformanceValue(attempt);
    console.log(`Parsed attempt "${attempt}":`, parsed);
    return parsed;
  });
  
  console.log('Parsed attempt values:', attemptValues);
  
  let bestPerformanceValue = null;
  let bestPerformanceIndex = -1;
  
  attemptValues.forEach((value, index) => {
    console.log(`Checking attempt ${index + 1}:`, value);
    if (value !== null) {
      if (bestPerformanceValue === null || value > bestPerformanceValue) {
        bestPerformanceValue = value;
        bestPerformanceIndex = index;
        console.log(`New best performance: ${value} at index ${index}`);
      }
    } else {
      console.log(`Attempt ${index + 1} is null, skipping`);
    }
  });
  
  console.log('Final best performance value:', bestPerformanceValue);
  console.log('Best performance index:', bestPerformanceIndex);
  
  const bestPerformance = bestPerformanceValue !== null ? 
    formatPerformanceValue(bestPerformanceValue) : null;
  
  console.log('Formatted best performance:', bestPerformance);
  
  const existingPerformance = await FieldEvents.findOne({
    where: {
      athlete_id,
      event_name,
      year,
      gender,
      age_group
    }
  });
  
  console.log('Existing performance found:', existingPerformance ? 'Yes' : 'No');
  
  if (existingPerformance) {
    console.log('Updating existing performance with best_performance:', bestPerformance);
    const updateResult = await existingPerformance.update({
      attempt_1,
      attempt_2,
      attempt_3,
      attempt_4,
      attempt_5,
      attempt_6,
      best_performance: bestPerformance
    });
    
    console.log('Update result:', updateResult.toJSON());
    
    await recalculatePlaces(event_name, year, gender, age_group);
    
    console.log('=== DEBUG: Performance updated successfully ===');
    
    return res.status(200).json({
      success: true,
      message: "Performance updated successfully",
      data: existingPerformance
    });
  } else {
    console.log('Creating new performance with best_performance:', bestPerformance);
    const newPerformance = await FieldEvents.create({
      athlete_id,
      event_name,
      attempt_1,
      attempt_2,
      attempt_3,
      attempt_4,
      attempt_5,
      attempt_6,
      best_performance: bestPerformance,
      year,
      gender,
      age_group,
      school
    });
    
    console.log('New performance created:', newPerformance.toJSON());
    
    await recalculatePlaces(event_name, year, gender, age_group);
    
    console.log('=== DEBUG: Performance created successfully ===');
    
    return res.status(201).json({
      success: true,
      message: "Performance created successfully",
      data: newPerformance
    });
  }
});

async function recalculatePlaces(event_name, year, gender, age_group) {
  try {
    const performances = await FieldEvents.findAll({
      where: {
        event_name,
        year,
        gender,
        age_group,
        best_performance: { [Op.ne]: null }
      }
    });
    
    const performancesWithValues = performances.map(performance => {
      const value = parsePerformanceValue(performance.best_performance);
      return {
        ...performance.toJSON(),
        numericValue: value
      };
    });
    
    const validPerformances = performancesWithValues.filter(p => p.numericValue !== null);
    validPerformances.sort((a, b) => b.numericValue - a.numericValue);
    
    for (let i = 0; i < validPerformances.length; i++) {
      await FieldEvents.update(
        { place: i + 1 },
        { where: { performance_id: validPerformances[i].performance_id } }
      );
    }
    
    const invalidPerformances = performancesWithValues.filter(p => p.numericValue === null);
    for (const performance of invalidPerformances) {
      await FieldEvents.update(
        { place: null },
        { where: { performance_id: performance.performance_id } }
      );
    }
    
    console.log(`Recalculated places for ${validPerformances.length} performances in ${event_name}, ${gender}, ${age_group}`);
  } catch (error) {
    console.error('Error in recalculatePlaces:', error);
  }
}

exports.getFieldEventAthletes = catchAsync(async (req, res, _next) => {
  const { event_name, year, gender, age_group, school } = req.query;
  
  let whereClause = {
    approved: true,
    deleted: false
  };
  
  if (year && year !== 'all') {
    whereClause.year = year;
  }
  
  if (gender && gender !== 'all') {
    whereClause.gender = gender;
  }
  
  if (age_group && age_group !== 'all') {
    whereClause.age_group = age_group;
  }
  
  if (school && school !== 'all') {
    whereClause.school = school;
  }
  
  try {
    const athletes = await Athlete.findAll({
      where: whereClause,
      attributes: ['athlete_id', 'bib_no', 'name', 'school', 'age_group', 'gender', 'selected_events']
    });
    
    const athleteEvents = [];
    
    athletes.forEach(athlete => {
      let events;
      
      try {
        if (Array.isArray(athlete.selected_events)) {
          events = athlete.selected_events;
        } else if (typeof athlete.selected_events === 'string') {
          try {
            events = JSON.parse(athlete.selected_events);
          } catch (parseError) {
            events = athlete.selected_events.split(',').map(event => event.trim());
          }
        } else {
          events = [];
        }
      } catch (e) {
        console.error('Error parsing selected_events for athlete', athlete.athlete_id, ':', e);
        events = [];
      }
      
      const fieldEvents = events.filter(event => 
        ['Long Jump', 'High Jump', 'Shot Put', 'Javelin Throw', 'Discus Throw', 'Triple Jump']
          .includes(event)
      );
      
      if (event_name && event_name !== 'all') {
        if (fieldEvents.includes(event_name)) {
          athleteEvents.push({
            ...athlete.toJSON(),
            event_name: event_name
          });
        }
      } else {
        fieldEvents.forEach(event => {
          athleteEvents.push({
            ...athlete.toJSON(),
            event_name: event
          });
        });
      }
    });
    
    res.status(200).json({
      success: true,
      message: "Field event athletes",
      data: athleteEvents,
    });
  } catch (error) {
    console.error('Error in getFieldEventAthletes:', error);
    throw new ValidationFailureError("Error fetching field event athletes");
  }
});