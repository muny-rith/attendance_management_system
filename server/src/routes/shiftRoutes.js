const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', shiftController.getShifts);
router.post('/', authMiddleware, shiftController.addShift);
router.put('/:id', authMiddleware, shiftController.updateShift);
router.delete('/:id', authMiddleware, shiftController.deleteShift);
router.post('/assign', authMiddleware, shiftController.assignShift);
router.post('/unassign', authMiddleware, shiftController.unassignShift);

module.exports = router;
