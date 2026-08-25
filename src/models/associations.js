const Athlete = require('./Athlete');
const TrackEventHeatResult = require('./TrackEventHeatResult');
const TrackEventSemifinalResult = require('./TrackEventSemifinalResult');
const TrackEventFinalResult = require('./TrackEventFinalResult');
const TrackHeatAssignment = require('./TrackHeatAssignment');

// Set up all associations
function setupAssociations() {
  // Athlete -> TrackEventHeatResult
  Athlete.hasMany(TrackEventHeatResult, {
    foreignKey: 'bib_no',
    sourceKey: 'bib_no',
    as: 'track_event_heat_results'
  });

  TrackEventHeatResult.belongsTo(Athlete, {
    foreignKey: 'bib_no',
    targetKey: 'bib_no',
    as: 'athlete'
  });

  // Athlete -> TrackEventSemifinalResult
  Athlete.hasMany(TrackEventSemifinalResult, {
    foreignKey: 'bib_no',
    sourceKey: 'bib_no',
    as: 'track_event_semifinal_results'
  });

  TrackEventSemifinalResult.belongsTo(Athlete, {
    foreignKey: 'bib_no',
    targetKey: 'bib_no',
    as: 'athlete'
  });

  // Athlete -> TrackEventFinalResult
  Athlete.hasMany(TrackEventFinalResult, {
    foreignKey: 'bib_no',
    sourceKey: 'bib_no',
    as: 'track_event_final_results'
  });

  TrackEventFinalResult.belongsTo(Athlete, {
    foreignKey: 'bib_no',
    targetKey: 'bib_no',
    as: 'athlete'
  });

  // Athlete -> TrackHeatAssignment
  Athlete.hasMany(TrackHeatAssignment, {
    foreignKey: 'athlete_id',
    as: 'track_heat_assignments'
  });

  TrackHeatAssignment.belongsTo(Athlete, {
    foreignKey: 'athlete_id',
    as: 'athlete'
  });
}

module.exports = { setupAssociations };