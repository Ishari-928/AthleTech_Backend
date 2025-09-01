const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const HeatAssignment = sequelize.define(
  "HeatAssignment",
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
    heat_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'track_event_heats',
        key: 'heat_id'
      }
    },
    lane: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    performance_time: {
      type: DataTypes.DECIMAL(8, 3), // Stores time in seconds with milliseconds
      allowNull: true,
    },
    place_in_heat: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    qualified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    qualification_type: {
      type: DataTypes.ENUM('Q', 'q_time'), // Q = place qualified, q = time qualified
      allowNull: true,
    },
  },
  {
    tableName: "heat_assignments",
    timestamps: true,
    underscored: true,
  }
);

module.exports = HeatAssignment;