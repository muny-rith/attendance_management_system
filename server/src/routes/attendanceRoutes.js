const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middlewares/authMiddleware');

// Define routes
router.post('/', authMiddleware, attendanceController.logAttendance);
router.get('/', attendanceController.getLogs);

module.exports = router;
