const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', employeeController.getEmployees);
router.post('/', authMiddleware, employeeController.addEmployee);
router.put('/:id', authMiddleware, employeeController.updateEmployee);
router.get('/sync', authMiddleware, employeeController.getSyncIds);
router.delete('/:id', authMiddleware, employeeController.deleteEmployee);

// Identifier sub-routes
router.post('/:id/identifiers', authMiddleware, employeeController.addIdentifier);
router.delete('/identifiers/:identifierId', authMiddleware, employeeController.removeIdentifier);

module.exports = router;
