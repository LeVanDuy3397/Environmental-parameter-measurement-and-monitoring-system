const express = require('express');
const router = express.Router();
const Region = require('../models/Region');
const { pingIP, checkAllDevicesStatus, getData} = require('../utils/deviceControl');

// Region management page
router.get('/', async (req, res) => {
  const regions = await Region.findAll();
  // Check online status for all regions
  await checkAllDevicesStatus(regions);
  res.render('regions', { regions, errors: [] });
});

// Add new region
router.post('/add', async (req, res) => {
  const { name, ip } = req.body;
  let errors = [];
  if (!name || !ip) {
    errors.push({ msg: 'Please fill in all fields' });
    return res.render('regions', { errors, regions: await Region.findAll() });
  }
  try {
    await Region.create({ name, ip });
    req.flash('success_msg', 'Region added successfully');
    res.redirect('/regions');
  } catch (err) {
    errors.push({ msg: `${err}`});
    res.render('regions', { errors, regions: await Region.findAll() });
  }
});

// Edit region
router.post('/edit/:id', async (req, res) => {
  const { name, ip } = req.body;
  const region = await Region.findByPk(req.params.id);
  if (region) {
    region.name = name;
    region.ip = ip;
    await region.save();
    req.flash('success_msg', 'Region updated successfully');
  }
  res.redirect('/regions');
});

// Delete region
router.post('/delete/:id', async (req, res) => {
  const region = await Region.findByPk(req.params.id);
  if (region) {
    await region.destroy();
    req.flash('success_msg', 'Region deleted successfully');
  }
  res.redirect('/regions');
});

// API: Get data from a region
router.get('/data_from_region/:id', async (req, res) => {
  try {
    const region = await Region.findByPk(req.params.id);
    if (!region) {
      return res.status(404).json({ success: false, message: 'Region not found' });
    }
    
    // Lấy dữ liệu cảm biến từ ESP32
    const Data = await getData(region.ip);
    
    if (Data) {
      res.json({
        success: true,
        regionId: region.id,
        regionName: region.name,
        ...Data
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Cannot get sensor data from device'
      });
    }
  } catch (error) {
    console.error('Error getting sensor data:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
