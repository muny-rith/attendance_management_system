const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const attendanceRoutes = require('./routes/attendanceRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const hardwareRoutes = require('./routes/hardwareRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const statusRoutes = require('./routes/statusRoutes');

const app = express();
const server = http.createServer(app);

// Restrict to the configured frontend origin only
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Pass io to routes by attaching it to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/attendance', attendanceRoutes);
app.use('/employees', employeeRoutes);
app.use('/hardware', hardwareRoutes);
app.use('/shifts', shiftRoutes);
app.use('/status', statusRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected for real-time updates');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
