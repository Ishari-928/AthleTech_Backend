// models/NewsUpdate.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const NewsUpdate = sequelize.define("NewsUpdate", {
    news_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    news_topic: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    news_description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    image: {
        type: DataTypes.STRING, // Store Cloudinary URL
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
    },
}, {
  tableName: "news_updates",
  timestamps: true,
});

module.exports = NewsUpdate;