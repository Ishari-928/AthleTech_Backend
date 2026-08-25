const { Op } = require('sequelize');

exports.calculateNumberOfHeats = (athleteCount) => {
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

exports.distributeAthletesEvenly = (athleteCount, heatCount) => {
  const base = Math.floor(athleteCount / heatCount);
  const remainder = athleteCount % heatCount;
  const distribution = Array(heatCount).fill(base);
  
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }
  
  return distribution;
};

exports.serpentineDistribution = (athletes, heatCount) => {
  const heats = Array.from({ length: heatCount }, () => []);
  let direction = 1;
  
  athletes.forEach((athlete, index) => {
    const heatIndex = direction === 1 
      ? index % heatCount 
      : heatCount - 1 - (index % heatCount);
    
    heats[heatIndex].push(athlete);
    
    if ((index + 1) % heatCount === 0) {
      direction *= -1;
    }
  });
  
  return heats;
};

exports.getQualificationRules = (athleteCount, heatCount) => {
  if (athleteCount <= 8) {
    return { directFinal: true };
  } else if (athleteCount <= 16) {
    return { perHeat: 3, nextFastest: 2 }; // 2 heats: Top 3 + next 2
  } else if (athleteCount <= 24) {
    return { perHeat: 2, nextFastest: 2 }; // 3 heats: Top 2 + next 2
  } else if (athleteCount <= 32) {
    return { perHeat: 3, nextFastest: 4 }; // 4 heats: Top 3 + next 4
  } else if (athleteCount <= 40) {
    return { perHeat: 2, nextFastest: 6 }; // 5 heats: Top 2 + next 6
  } else if (athleteCount <= 48) {
    return { perHeat: 2, nextFastest: 4 }; // 6 heats: Top 2 + next 4
  } else if (athleteCount <= 56) {
    return { perHeat: 2, nextFastest: 10 }; // 7 heats: Top 2 + next 10 = 24
  } else if (athleteCount <= 64) {
    return { perHeat: 1, nextFastest: 16 }; // 8 heats: Top 1 + next 16 = 24
  } else {
    // more than 64 athletes: Top 1 per heat + enough to reach 24
    const needed = 24 - heatCount;
    return { perHeat: 1, nextFastest: needed };
  }
};

// Semifinal qualification rules 
exports.getSemifinalQualificationRules = (semifinalHeatCount) => {
  if (semifinalHeatCount === 1) {
    return { perHeat: 8, nextFastest: 0 }; 
  } else if (semifinalHeatCount === 2) {
    return { perHeat: 3, nextFastest: 2 }; // Top 3 each + next 2 = 8 finalists
  } else if (semifinalHeatCount === 3) {
    return { perHeat: 2, nextFastest: 2 }; // Top 2 each + next 2 = 8 finalists
  } else {
    // 4 or more semifinal heats
    return { perHeat: 2, nextFastest: 8 - (semifinalHeatCount * 2) };
  }
};

// Auto update places within a heat
exports.autoUpdatePlaces = async (model, event, age_group, gender, year, heat_no, is_semifinal = false) => {
  const heats = await model.findAll({
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