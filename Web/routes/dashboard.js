const express = require('express');
const router = express.Router();
const Region = require('../models/Region');
const RegionHistory = require('../models/RegionHistory');
const { checkAllDevicesStatus } = require('../utils/deviceControl');

// Dashboard page
router.get('/', async (req, res) => {
  const regions = await Region.findAll();
  // Check online status for all devices
  await checkAllDevicesStatus(regions);
  res.render('dashboard', { regions });
});

// Region detail (real-time handled by client)
router.get('/region/:id', async (req, res) => {
  const region = await Region.findByPk(req.params.id);
  if (!region) {
    req.flash('error_msg', 'Region not found');
    return res.redirect('/dashboard');
  }
  
  // Check if device is online
  const { pingIP } = require('../utils/deviceControl');
  const is_online = await pingIP(region.ip);
  region.is_online = is_online;
  await region.save();

  const history = await RegionHistory.findAll({
    where: { regionId: region.id },
    order: [['createdAt', 'DESC']],
    limit: 30
  });
  
  res.render('region_detail', { region, history});
});

module.exports = router;
