const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Region = sequelize.define('Region', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  ip: { type: DataTypes.STRING, allowNull: false, unique: true },
  is_online: { type: DataTypes.BOOLEAN, defaultValue: false }, // true: online, false: offline
});

module.exports = Region;
