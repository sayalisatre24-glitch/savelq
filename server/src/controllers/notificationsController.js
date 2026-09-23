/**
 * Notifications Controller
 * Handles user in-app notifications and trigger scans.
 */
const { db } = require('../config/firebase');
const { runAutomatedScan } = require('../services/cronService');

const notificationsController = {
  /**
   * Get User Notifications
   * GET /api/notifications
   */
  async getNotifications(req, res) {
    try {
      const { uid } = req.user;
      const snapshot = await db.collection('notifications').where('userId', '==', uid).get();

      const notifs = snapshot.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const unreadCount = notifs.filter(n => !n.isRead).length;

      return res.status(200).json({
        status: 'success',
        data: {
          notifications: notifs,
          unreadCount
        }
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Mark Notification as Read
   * PUT /api/notifications/:notificationId/read
   */
  async markAsRead(req, res) {
    try {
      const { uid } = req.user;
      const { notificationId } = req.params;

      const notifDoc = await db.collection('notifications').doc(notificationId).get();
      if (!notifDoc.exists || notifDoc.data().userId !== uid) {
        return res.status(404).json({ status: 'error', message: 'Notification not found' });
      }

      await db.collection('notifications').doc(notificationId).set({ isRead: true }, { merge: true });

      return res.status(200).json({
        status: 'success',
        message: 'Notification marked as read'
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Mark All Notifications as Read
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const { uid } = req.user;
      const snapshot = await db.collection('notifications').where('userId', '==', uid).get();

      for (const doc of snapshot.docs) {
        await db.collection('notifications').doc(doc.id).set({ isRead: true }, { merge: true });
      }

      return res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read'
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Trigger Manual Scan
   * POST /api/notifications/scan
   */
  async triggerScan(req, res) {
    try {
      const result = await runAutomatedScan();
      return res.status(200).json({
        status: 'success',
        data: result,
        message: 'Notification scan triggered successfully'
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }
};

module.exports = notificationsController;
