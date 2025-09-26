const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TrackHeatAssignment = sequelize.define(
  "TrackHeatAssignment",
  {
    assignment_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    athlete_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'register_athletes',
        key: 'athlete_id'
      }
    },
    event: {
      type: DataTypes.STRING(50),
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
    heat_no: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    tableName: "track_heat_assignments",
    timestamps: false,
    underscored: true,
  }
);

module.exports = TrackHeatAssignment;