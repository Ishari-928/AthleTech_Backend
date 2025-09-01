const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Athlete = require("./Athlete");

const FieldEvents = sequelize.define(
  "FieldEvents",
  {
    performance_id: {
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
    event_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    attempt_1: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    attempt_2: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    attempt_3: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    attempt_4: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    attempt_5: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    attempt_6: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    best_performance: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    place: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    age_group: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    school: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: "field_events_performance",
    timestamps: true,
    underscored: true,
  }
);

FieldEvents.belongsTo(Athlete, {
  foreignKey: 'athlete_id',
  as: 'Athlete'
});

Athlete.hasMany(FieldEvents, {
  foreignKey: 'athlete_id',
  as: 'FieldEvents'
});



module.exports = FieldEvents;