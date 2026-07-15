const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// Define routes
router.get('/', statusController.getStatus);

module.exports = router;
