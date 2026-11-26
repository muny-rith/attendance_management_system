const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middlewares/authMiddleware');

// Define routes
router.post('/', authMiddleware, attendanceController.logAttendance);
router.get('/daily', attendanceController.getDailySummary);
router.get('/presence', attendanceController.getLivePresence);
router.get('/monthly', attendanceController.getMonthlyGrid);
router.get('/', attendanceController.getLogs);

module.exports = router;
