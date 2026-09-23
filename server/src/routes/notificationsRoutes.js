const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', notificationsController.getNotifications);
router.put('/:notificationId/read', notificationsController.markAsRead);
router.put('/read-all', notificationsController.markAllAsRead);
router.post('/scan', notificationsController.triggerScan);

module.exports = router;
