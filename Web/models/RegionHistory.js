const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RegionHistory = sequelize.define('RegionHistory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  regionId: { type: DataTypes.INTEGER, allowNull: false },
  temperature: { type: DataTypes.FLOAT, allowNull: false },
  humidity: { type: DataTypes.FLOAT, allowNull: false },
  dust: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
});

module.exports = RegionHistory;
