const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Admin = sequelize.define(
    "Admin",
    {
        admin_id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        contact_no: {
            type: DataTypes.STRING(15),
            allowNull: false,
        },
        user_role:{
            type: DataTypes.ENUM('superadmin', 'admin'),
            notNull: false,
            defaultValue: 'superadmin',
        },
        password:{
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        must_change_password: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_active:{
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        otp_hash: { 
            type: DataTypes.STRING(255), 
            allowNull: true 
        }, 
        otp_expires_at: { 
            type: DataTypes.DATE, 
            allowNull: true 
        }, 
        otp_channel: { 
            type: DataTypes.ENUM('email', 'sms'), 
            allowNull: true 
        }, 

    },
    {
        tableName: "admins",
        timestamps: true,
        underscored: true, 
    },
);

module.exports = Admin;