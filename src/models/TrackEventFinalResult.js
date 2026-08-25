const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TrackEventFinalResult = sequelize.define(
  "TrackEventFinalResult",
  {
    final_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
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
    bib_no: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    athlete_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    school: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    timing: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },
    place: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }
  },
  {
    tableName: "track_event_final_results",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['event', 'age_group', 'gender', 'year']
      }
    ]
  }
);


module.exports = TrackEventFinalResult;