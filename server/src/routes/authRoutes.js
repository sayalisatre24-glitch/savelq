const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/profile', requireAuth, authController.syncProfile);
router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;
