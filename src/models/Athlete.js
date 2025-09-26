const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');
const HeatAssignment = require('../models/HeatAssignment');


const Athlete = sequelize.define(
    "Athlete", 
    {
        athlete_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        bib_no: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: { isEmail: true },
        },
        contact_no: {
            type: DataTypes.STRING(15),
            allowNull: false,
        },
        gender: {
            type: DataTypes.STRING(10),
            allowNull: false,
        },
        school: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        dob: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        age_group: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        selected_events: {
            type: DataTypes.TEXT,
            allowNull: false,
            get() {
                const raw = this.getDataValue("selected_events");
                try {
                    return raw ? JSON.parse(raw) : null;
                } catch {
                    return raw; 
                }
            },
            set(val) {
                if (typeof val === "string") {
                    this.setDataValue("selected_events", val);
                } else {
                    this.setDataValue("selected_events", JSON.stringify(val ?? []));
                }
            },
        },
        registrationfee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        total_registrationfee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        paymentSlip: {
            type: DataTypes.BLOB("long"),
            allowNull: false,
        },
        year: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        approved: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false, 
        },
        deleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        tableName: "register_athletes",
        timestamps: true,
        underscored: true, // tells Sequelize to use snake_case for auto-generated columns
    },
);

Athlete.hasMany(HeatAssignment, {
  foreignKey: 'athlete_id',
  as: 'HeatAssignments'
});

module.exports = Athlete;