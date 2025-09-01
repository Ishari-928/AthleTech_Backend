const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Athlete = require('../models/Athlete');
const HeatAssignment = require('../models/HeatAssignment');

const TrackEventHeat = sequelize.define(
  "TrackEventHeat",
  {
    heat_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    event_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    age_group: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    round: {
      type: DataTypes.ENUM('heat', 'semifinal', 'final'),
      allowNull: false,
    },
    heat_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed'),
      defaultValue: 'scheduled',
    },
  },
  {
    tableName: "track_event_heats",
    timestamps: true,
    underscored: true,
  }
);

TrackEventHeat.hasMany(HeatAssignment, {
  foreignKey: 'heat_id',
  as: 'HeatAssignments'
});

HeatAssignment.belongsTo(Athlete, {
  foreignKey: 'athlete_id',
  as: 'Athlete',
  targetKey: 'athlete_id'
});

HeatAssignment.belongsTo(TrackEventHeat, {
  foreignKey: 'heat_id',
  as: 'Heat',
  sourceKey: 'heat_id'
});


module.exports = TrackEventHeat;