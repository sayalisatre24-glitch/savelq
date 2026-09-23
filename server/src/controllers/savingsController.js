/**
 * Savings / Transactions Controller
 * Handles deposits, savings history, progress recalculation, and milestone event triggers.
 */
const { db } = require('../config/firebase');
const { sendAlertEmail } = require('../config/mailer');
const CalculationService = require('../services/calculationService');

const savingsController = {
  /**
   * Log Deposit for Goal
   * POST /api/goals/:goalId/savings
   */
  async logDeposit(req, res) {
    try {
      const { uid, email } = req.user;
      const { goalId } = req.params;
      const { amount, date, notes } = req.body;

      const depositAmount = Number(amount);
      if (!depositAmount || depositAmount <= 0) {
        return res.status(400).json({ status: 'error', message: 'Please enter a valid deposit amount.' });
      }

      const goalDoc = await db.collection('goals').doc(goalId).get();
      if (!goalDoc.exists || goalDoc.data().userId !== uid) {
        return res.status(404).json({ status: 'error', message: 'Goal not found' });
      }

      const goal = goalDoc.data();
      const userDoc = await db.collection('users').doc(uid).get();
      const user = userDoc.exists ? userDoc.data() : { name: 'User', email };

      const oldSavings = Number(goal.currentSavings) || 0;
      const newSavings = oldSavings + depositAmount;
      const targetAmount = Number(goal.targetAmount) || 0;
      const depositDate = date || new Date().toISOString().split('T')[0];

      // 1. Create Transaction
      const txId = 'TX_' + Date.now();
      const tx = {
        transactionId: txId,
        userId: uid,
        goalId,
        amount: depositAmount,
        type: 'Deposit',
        notes: notes || 'Manual savings deposit',
        createdAt: depositDate
      };
      await db.collection('transactions').doc(txId).set(tx);

      // 2. Evaluate updated goal metrics
      const evalResult = CalculationService.calculateGoalReality(
        { ...goal, currentSavings: newSavings },
        user.monthlyCapacity || 20000,
        user.monthlyIncome || 75000
      );

      const isCompleted = newSavings >= targetAmount && targetAmount > 0;
      const updatedStatus = isCompleted ? 'Completed' : evalResult.status;

      await db.collection('goals').doc(goalId).set({
        currentSavings: newSavings,
        status: updatedStatus,
        realityScore: evalResult.score
      }, { merge: true });

      // 3. Check for Target Completed Milestone Event
      if (isCompleted && oldSavings < targetAmount) {
        const notifId = 'NOTIF_' + Date.now();
        const msg = `🎉 Incredible achievement, ${user.name || ''}! You reached 100% of your "${goal.goalName}" target by saving ₹${newSavings.toLocaleString()}!`;

        await db.collection('notifications').doc(notifId).set({
          notificationId: notifId,
          userId: uid,
          goalId,
          type: 'Target Completed',
          message: msg,
          createdAt: new Date().toISOString(),
          isRead: false,
          emailSent: true
        });

        await sendAlertEmail({
          to: user.email || email,
          subject: `🎉 Congratulations! You achieved your ${goal.goalName} goal!`,
          type: 'Target Completed',
          title: 'Goal Target Reached!',
          message: msg,
          goalName: goal.goalName,
          stats: { targetAmount, currentSavings: newSavings, remainingAmount: 0 }
        });
      }

      // 4. Check for Higher Monthly Savings Trigger (if single deposit >= 15000)
      if (depositAmount >= 15000) {
        const notifId = 'NOTIF_' + Date.now() + '_boost';
        const msg = `👏 Outstanding! You saved ₹${depositAmount.toLocaleString()} in a single deposit for "${goal.goalName}", accelerating your progress!`;

        await db.collection('notifications').doc(notifId).set({
          notificationId: notifId,
          userId: uid,
          goalId,
          type: 'Higher Monthly Savings',
          message: msg,
          createdAt: new Date().toISOString(),
          isRead: false,
          emailSent: true
        });

        await sendAlertEmail({
          to: user.email || email,
          subject: `👏 High Monthly Savings Milestone Achieved!`,
          type: 'Higher Monthly Savings',
          title: 'Great Job on Your Savings!',
          message: msg,
          goalName: goal.goalName,
          stats: { targetAmount, currentSavings: newSavings, remainingAmount: Math.max(0, targetAmount - newSavings) }
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          transaction: tx,
          goal: {
            ...goal,
            currentSavings: newSavings,
            status: updatedStatus,
            evaluation: evalResult
          }
        },
        message: `Successfully added deposit of ₹${depositAmount.toLocaleString()}`
      });
    } catch (err) {
      console.error('Error logging deposit:', err);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Get Savings History for Goal or User
   * GET /api/savings or GET /api/goals/:goalId/savings
   */
  async getSavingsHistory(req, res) {
    try {
      const { uid } = req.user;
      const goalId = req.params.goalId || req.query.goalId;

      const snapshot = await db.collection('transactions')
        .where('userId', '==', uid)
        .get();

      let transactions = snapshot.docs.map(d => d.data());
      if (goalId) {
        transactions = transactions.filter(t => t.goalId === goalId);
      }

      transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.status(200).json({
        status: 'success',
        data: transactions
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }
};

module.exports = savingsController;
