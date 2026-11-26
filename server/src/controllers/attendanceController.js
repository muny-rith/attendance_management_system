const attendanceService = require('../services/attendanceService');
const attendanceAnalyticsService = require('../services/attendanceAnalyticsService');

exports.logAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.logAttendance(req.io, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getLogs = async (req, res, next) => {
  try {
    const result = await attendanceService.getLogs(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getDailySummary = async (req, res, next) => {
  try {
    const result = await attendanceAnalyticsService.getDailyTimesheet(req.query.date);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getLivePresence = async (req, res, next) => {
  try {
    const result = await attendanceAnalyticsService.getLivePresence();
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getMonthlyGrid = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const result = await attendanceAnalyticsService.getMonthlyGrid(year, month);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
