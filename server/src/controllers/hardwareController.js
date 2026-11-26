const hardwareService = require('../services/hardwareService');

exports.triggerSync = () => {
  hardwareService.triggerSync();
};

exports.getStatus = (req, res) => {
  res.json(hardwareService.getStatus());
};

exports.setMode = (req, res, next) => {
  try {
    const result = hardwareService.setMode(req.body.mode);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.checkOnline = (req, res) => {
  res.json(hardwareService.checkOnline());
};

exports.enrollResult = (req, res, next) => {
  try {
    const result = hardwareService.enrollResult(req.io, req.body.identifier);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
