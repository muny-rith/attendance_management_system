const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', employeeController.getEmployees);
router.post('/', employeeController.addEmployee);
router.put('/:id', employeeController.updateEmployee);
router.get('/sync', authMiddleware, employeeController.getSyncIds);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
