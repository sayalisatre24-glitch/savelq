/**
 * SaveIQ - Background Scheduled Automation Engine
 * Runs cron jobs to process deadline alerts, missed targets, and milestone emails.
 */
const cron = require('node-cron');
const { db } = require('../config/firebase');
const { sendAlertEmail } = require('../config/mailer');
const CalculationService = require('./calculationService');

/**
 * Scan all goals and trigger automated alerts
 */
const runAutomatedScan = async () => {
  console.log('🔄 [SaveIQ Cron] Starting scheduled financial intelligence scan...');

  try {
    const goalsSnapshot = await db.collection('goals').get();
    if (goalsSnapshot.empty) {
      console.log('ℹ️ [SaveIQ Cron] No goals found in database.');
      return { scanned: 0, alertsCreated: 0 };
    }

    const usersSnapshot = await db.collection('users').get();
    const usersMap = {};
    usersSnapshot.docs.forEach(doc => {
      const u = doc.data();
      usersMap[u.userId || doc.id] = u;
    });

    let alertsCreated = 0;
    const now = new Date();

    for (const goalDoc of goalsSnapshot.docs) {
      const goal = goalDoc.data();
      const goalId = goal.goalId || goalDoc.id;
      const userId = goal.userId;
      const user = usersMap[userId] || { email: 'user@example.com', name: 'User' };

      const evalResult = CalculationService.calculateGoalReality(
        goal,
        user.monthlyCapacity || user.MonthlySavingCapacity || 20000,
        user.monthlyIncome || user.MonthlyIncome || 75000
      );

      // Check Existing Notifications for Deduplication
      const notifsSnapshot = await db.collection('notifications')
        .where('goalId', '==', goalId)
        .get();

      const existingTypes = new Set(notifsSnapshot.docs.map(d => d.data().type));

      // 1. Target Completed Event
      if (evalResult.remainingAmount <= 0 && evalResult.targetAmount > 0 && !existingTypes.has('Target Completed')) {
        const notifId = 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const msg = `🎉 Congratulations ${user.name || ''}! You have successfully completed your "${goal.goalName}" savings goal of ₹${evalResult.targetAmount.toLocaleString()}!`;

        await db.collection('notifications').doc(notifId).set({
          notificationId: notifId,
          userId,
          goalId,
          type: 'Target Completed',
          message: msg,
          createdAt: now.toISOString(),
          isRead: false,
          emailSent: true
        });

        await sendAlertEmail({
          to: user.email,
          subject: `🎉 Goal Completed: ${goal.goalName}!`,
          type: 'Target Completed',
          title: 'You Reached Your Goal!',
          message: msg,
          goalName: goal.goalName,
          stats: evalResult
        });

        alertsCreated++;
      }

      // 2. Deadline Approaching Reminder (<= 30 days left and remaining > 0)
      if (evalResult.daysRemaining <= 30 && evalResult.daysRemaining > 0 && evalResult.remainingAmount > 0 && !existingTypes.has('Deadline Reminder')) {
        const notifId = 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const msg = `⏰ Reminder: Your "${goal.goalName}" deadline is in ${evalResult.daysRemaining} days (${goal.deadline}). Remaining to save: ₹${evalResult.remainingAmount.toLocaleString()}.`;

        await db.collection('notifications').doc(notifId).set({
          notificationId: notifId,
          userId,
          goalId,
          type: 'Deadline Reminder',
          message: msg,
          createdAt: now.toISOString(),
          isRead: false,
          emailSent: true
        });

        await sendAlertEmail({
          to: user.email,
          subject: `⏰ Deadline Approaching: ${goal.goalName}`,
          type: 'Deadline Reminder',
          title: 'Target Deadline Approaching',
          message: msg,
          goalName: goal.goalName,
          stats: evalResult
        });

        alertsCreated++;
      }

      // 3. Missed Target / At Risk Alert (Score < 50)
      if (evalResult.score < 50 && evalResult.remainingAmount > 0 && !existingTypes.has('Missed Target')) {
        const notifId = 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const gap = evalResult.requiredMonthlySaving - evalResult.monthlyCapacity;
        const msg = `⚠️ Attention: "${goal.goalName}" requires ₹${evalResult.requiredMonthlySaving.toLocaleString()}/mo, which is ₹${Math.max(0, gap).toLocaleString()} above your current capacity. Check your AI Goal Rescue Plan!`;

        await db.collection('notifications').doc(notifId).set({
          notificationId: notifId,
          userId,
          goalId,
          type: 'Missed Target',
          message: msg,
          createdAt: now.toISOString(),
          isRead: false,
          emailSent: true
        });

        await sendAlertEmail({
          to: user.email,
          subject: `⚠️ Action Required: ${goal.goalName} is At Risk`,
          type: 'Missed Target',
          title: 'Goal Reality Check Alert',
          message: msg,
          goalName: goal.goalName,
          stats: evalResult
        });

        alertsCreated++;
      }
    }

    console.log(`✅ [SaveIQ Cron] Scan completed. ${alertsCreated} alerts created.`);
    return { scanned: goalsSnapshot.docs.length, alertsCreated };
  } catch (err) {
    console.error('❌ [SaveIQ Cron] Scan execution error:', err);
    return { error: err.message };
  }
};

/**
 * Initialize background cron schedule (runs every hour, and runs on server startup)
 */
const initCron = () => {
  // Run once on server boot after 10 seconds
  setTimeout(() => {
    runAutomatedScan();
  }, 10000);

  // Schedule to run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    runAutomatedScan();
  });

  console.log('🕒 [SaveIQ Cron] Scheduled background task initialized (runs hourly).');
};

module.exports = {
  initCron,
  runAutomatedScan
};
