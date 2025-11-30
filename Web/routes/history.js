const express = require('express');
const router = express.Router();
const RegionHistory = require('../models/RegionHistory');
const Region = require('../models/Region');
const { checkAllDevicesStatus } = require('../utils/deviceControl');

// History page - show all regions
router.get('/', async (req, res) => {
  const regions = await Region.findAll();
  // Check online status for all regions
  await checkAllDevicesStatus(regions);
  res.render('history_all', { regions });
});

// History page for a specific region
router.get('/:regionId', async (req, res) => {
  const region = await Region.findByPk(req.params.regionId);
  const history = await RegionHistory.findAll({
    where: { regionId: region.id },
    order: [['createdAt', 'DESC']],
    limit: 100
  });
  res.render('history', { region, history });
});

module.exports = router;
