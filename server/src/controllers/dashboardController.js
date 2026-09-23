/**
 * Dashboard Controller
 * Aggregates portfolio metrics, upcoming deadlines, and health scores for the user.
 */
const { db } = require('../config/firebase');
const CalculationService = require('../services/calculationService');

const dashboardController = {
  /**
   * Get Dashboard Summary
   * GET /api/dashboard
   */
  async getDashboardSummary(req, res) {
    try {
      const { uid } = req.user;
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : { monthlyCapacity: 20000, monthlyIncome: 75000 };

      const goalsSnapshot = await db.collection('goals').where('userId', '==', uid).get();
      const goals = goalsSnapshot.docs.map(d => d.data());

      let totalTarget = 0;
      let totalSaved = 0;
      let completedGoals = 0;
      let activeGoals = 0;
      let atRiskGoals = 0;
      let totalScore = 0;

      const upcomingDeadlines = [];

      goals.forEach(goal => {
        const target = Number(goal.targetAmount) || 0;
        const saved = Number(goal.currentSavings) || 0;

        totalTarget += target;
        totalSaved += saved;

        const evalResult = CalculationService.calculateGoalReality(
          goal,
          userData.monthlyCapacity || 20000,
          userData.monthlyIncome || 75000
        );

        if (saved >= target && target > 0) {
          completedGoals++;
        } else {
          activeGoals++;
          if (evalResult.score < 50) {
            atRiskGoals++;
          }
        }

        totalScore += evalResult.score;

        if (goal.deadline && saved < target) {
          upcomingDeadlines.push({
            goalId: goal.goalId,
            goalName: goal.goalName,
            deadline: goal.deadline,
            daysRemaining: evalResult.daysRemaining,
            targetAmount: target,
            currentSavings: saved,
            remainingAmount: evalResult.remainingAmount,
            status: evalResult.status,
            realityScore: evalResult.score
          });
        }
      });

      upcomingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

      const overallProgress = totalTarget > 0 ? Number(((totalSaved / totalTarget) * 100).toFixed(1)) : 0;
      const avgRealityScore = goals.length > 0 ? Math.round(totalScore / goals.length) : 85;

      return res.status(200).json({
        status: 'success',
        data: {
          totalGoals: goals.length,
          activeGoals,
          completedGoals,
          atRiskGoals,
          totalSaved,
          totalTarget,
          overallProgress,
          avgRealityScore,
          upcomingDeadlines: upcomingDeadlines.slice(0, 5),
          goals
        }
      });
    } catch (err) {
      console.error('Error in dashboard summary:', err);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }
};

module.exports = dashboardController;
