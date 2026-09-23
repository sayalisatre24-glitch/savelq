/**
 * Authentication & User Profile Controller
 */
const { db } = require('../config/firebase');

const authController = {
  /**
   * Sync / Create User Profile in Firestore
   * POST /api/auth/profile
   */
  async syncProfile(req, res) {
    try {
      const { uid, email, name: tokenName } = req.user;
      const { name, monthlyIncome, monthlyCapacity } = req.body;

      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();

      const userName = name || tokenName || email.split('@')[0];
      const income = Number(monthlyIncome) || 75000;
      const capacity = Number(monthlyCapacity) || 20000;
      const now = new Date().toISOString().split('T')[0];

      let userData;
      if (!doc.exists) {
        userData = {
          userId: uid,
          name: userName,
          email,
          monthlyIncome: income,
          monthlyCapacity: capacity,
          createdAt: now
        };
        await userRef.set(userData);
      } else {
        const existing = doc.data();
        userData = {
          ...existing,
          name: name || existing.name || userName,
          monthlyIncome: monthlyIncome !== undefined ? income : (existing.monthlyIncome || 75000),
          monthlyCapacity: monthlyCapacity !== undefined ? capacity : (existing.monthlyCapacity || 20000)
        };
        await userRef.set(userData, { merge: true });
      }

      return res.status(200).json({
        status: 'success',
        data: userData,
        message: 'Profile synchronized successfully'
      });
    } catch (err) {
      console.error('Error syncing profile:', err);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Get User Profile
   * GET /api/auth/profile
   */
  async getProfile(req, res) {
    try {
      const { uid, email } = req.user;
      const userRef = db.collection('users').doc(uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        const defaultProfile = {
          userId: uid,
          name: req.user.name || email.split('@')[0],
          email,
          monthlyIncome: 75000,
          monthlyCapacity: 20000,
          createdAt: new Date().toISOString().split('T')[0]
        };
        await userRef.set(defaultProfile);
        return res.status(200).json({ status: 'success', data: defaultProfile });
      }

      return res.status(200).json({ status: 'success', data: doc.data() });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }
};

module.exports = authController;
