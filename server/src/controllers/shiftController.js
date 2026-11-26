const shiftService = require('../services/shiftService');

exports.getShifts = async (req, res, next) => {
  try {
    const shifts = await shiftService.getShifts();
    res.json(shifts);
  } catch (err) {
    next(err);
  }
};

exports.addShift = async (req, res, next) => {
  try {
    const result = await shiftService.addShift(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.updateShift = async (req, res, next) => {
  try {
    const result = await shiftService.updateShift(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.deleteShift = async (req, res, next) => {
  try {
    const result = await shiftService.deleteShift(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.assignShift = async (req, res, next) => {
  try {
    const result = await shiftService.assignShift(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.unassignShift = async (req, res, next) => {
  try {
    const result = await shiftService.unassignShift(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
