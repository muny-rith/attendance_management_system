const employeeService = require('../services/employeeService');

exports.getEmployees = async (req, res, next) => {
  try {
    const employees = await employeeService.getEmployees();
    res.json(employees);
  } catch (err) {
    next(err);
  }
};

exports.addEmployee = async (req, res, next) => {
  try {
    const result = await employeeService.addEmployee(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const result = await employeeService.updateEmployee(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    const result = await employeeService.deleteEmployee(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getSyncIds = async (req, res, next) => {
  try {
    const syncIds = await employeeService.getSyncFingerprintIds();
    res.json(syncIds);
  } catch (err) {
    next(err);
  }
};

exports.addIdentifier = async (req, res, next) => {
  try {
    const result = await employeeService.addIdentifier(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.removeIdentifier = async (req, res, next) => {
  try {
    const result = await employeeService.removeIdentifier(req.params.identifierId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
