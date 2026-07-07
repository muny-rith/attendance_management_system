const express = require('express');
const router = express.Router();
const hardwareController = require('../controllers/hardwareController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/status', authMiddleware, hardwareController.getStatus);
router.post('/set_mode', authMiddleware, hardwareController.setMode);
router.get('/check_online', hardwareController.checkOnline);
router.post('/enroll_result', authMiddleware, hardwareController.enrollResult);

module.exports = router;
