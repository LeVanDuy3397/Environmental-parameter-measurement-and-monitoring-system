require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
require('./passport-setup');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Global variables for flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const regionRoutes = require('./routes/region');
const historyRoutes = require('./routes/history');

// Redirect root to /login (always)
app.get('/', (req, res) => {
  return res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/regions', regionRoutes);
app.use('/history', historyRoutes);

// TEST: Xem tất cả regions trong database
app.get('/api/test/regions', async (req, res) => {
  const Region = require('./models/Region');
  const regions = await Region.findAll();
  res.json({ count: regions.length, regions });
});

//Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('A user connected');
  // ... handle real-time events ...
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Background job: Poll sensor data từ ESP32 mỗi 5 giây
const { getData } = require('./utils/deviceControl');
const Region = require('./models/Region');
const RegionHistory = require('./models/RegionHistory');

setInterval(async () => {
  try {
    const regions = await Region.findAll({ where: { is_online: true } });
    if (regions.length === 0) {
      console.log("Không có thiết bị tại region online");
    } else {
      console.log(`Có ${regions.length} regions online`);
    }

    for (const region of regions) {
      const data_from_esp32 = await getData(region.ip); // đây là chỗ server mỗi 5s sẽ lên
      // đường dẫn http://<region.ip>/sensor để lấy dữ liệu cảm biến rồi hiển thị và lưu vào database
      console.log(`[Polling] Fetched data from ${region.name} (${region.ip}):`, data_from_esp32);
      // Lưu vào database
      if (data_from_esp32==null) {
        await region.update({ is_online: false });
        await region.save();

        io.emit('data_from_esp32_update', {
          regionId: region.id,
          regionName: region.name,
          temperature: null,
          humidity: null,
          dust: null,
          is_online: false,
          timestamp: new Date()
        });

        console.log(`[Polling] Region ${region.name} is offline.`);
        continue;
        }
        
        try {
          await RegionHistory.create({
            regionId: region.id,
            temperature: parseFloat(data_from_esp32.temperature),
            humidity: parseFloat(data_from_esp32.humidity),
            dust: parseFloat(data_from_esp32.dust),
            createdAt: new Date()
            });
          } catch (saveError) {
          console.error(`[Polling] Error saving data for ${region.name}:`, saveError);
          }
          // Broadcast realtime
          io.emit('data_from_esp32_update', {
            regionId: region.id,
            regionName: region.name,
            temperature: data_from_esp32.temperature,
            humidity: data_from_esp32.humidity, // giá trị dạng string
            dust: data_from_esp32.dust,
            is_online: data_from_esp32.is_online,
            timestamp: new Date()
          });
        }
    } catch (error) {
    console.error('[Polling] Error:', error);
  }
}, 5000); // Poll mỗi 5 giây

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
