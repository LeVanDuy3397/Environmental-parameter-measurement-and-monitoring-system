const sequelize = require('./config/database');
const User = require('./models/User');
const Region = require('./models/Region');
const RegionHistory = require('./models/RegionHistory');

(async () => {
  try {
    await sequelize.sync({ alter: true });
    await User.sync();
    await Region.sync();
    await RegionHistory.sync();
    console.log('Database synced');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing database:', err);
    process.exit(1);
  }
})();
