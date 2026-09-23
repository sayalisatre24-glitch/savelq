/**
 * SaveIQ - Deterministic Financial Mathematical Intelligence Engine
 * Performs precise non-hallucinatory financial calculations.
 */

const CalculationService = {
  /**
   * Calculate Remaining Amount
   */
  calculateRemainingAmount(target, current) {
    const t = Math.max(0, Number(target) || 0);
    const c = Math.max(0, Number(current) || 0);
    return Math.max(0, t - c);
  },

  /**
   * Calculate Remaining Time in months and days
   */
  calculateTimeRemaining(deadlineStr, fromDate = new Date()) {
    if (!deadlineStr) return { days: 0, months: 0 };
    const deadline = new Date(deadlineStr);
    const diffTime = deadline.getTime() - fromDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.max(0.1, Number((days / 30.4375).toFixed(1)));
    return { days: Math.max(0, days), months };
  },

  /**
   * Calculate Required Monthly Savings
   */
  calculateRequiredMonthlySaving(remainingAmount, remainingMonths) {
    if (remainingAmount <= 0) return 0;
    if (remainingMonths <= 0) return remainingAmount;
    return Math.round(remainingAmount / remainingMonths);
  },

  /**
   * Calculate Progress Percentage (capped at 100)
   */
  calculateProgress(current, target) {
    const t = Number(target) || 0;
    const c = Number(current) || 0;
    if (t <= 0) return 100;
    const pct = (c / t) * 100;
    return Math.min(100, Math.max(0, Number(pct.toFixed(1))));
  },

  /**
   * Comprehensive Goal Reality Score (0 to 100)
   */
  calculateGoalReality(goal, userMonthlyCapacity = 20000, userIncome = 75000) {
    const target = Number(goal.TargetAmount || goal.targetAmount) || 0;
    const current = Number(goal.CurrentSavings || goal.currentAmount || goal.currentSavings) || 0;
    const deadlineStr = goal.Deadline || goal.deadline;
    const goalCapacity = Number(goal.MonthlySavingCapacity || goal.monthlyCapacity) || userMonthlyCapacity;

    const remainingAmount = this.calculateRemainingAmount(target, current);
    const { days: daysRemaining, months: monthsRemaining } = this.calculateTimeRemaining(deadlineStr);
    const requiredMonthlySaving = this.calculateRequiredMonthlySaving(remainingAmount, monthsRemaining);
    const progressPercent = this.calculateProgress(current, target);

    if (current >= target && target > 0) {
      return {
        score: 100,
        status: 'Completed',
        progressPercent: 100,
        targetAmount: target,
        currentSavings: current,
        remainingAmount: 0,
        requiredMonthlySaving: 0,
        monthsRemaining,
        daysRemaining,
        monthlyCapacity: goalCapacity,
        surplusOrGap: goalCapacity,
        pillars: { progressScore: 30, capacityScore: 45, timeScore: 15, budgetScore: 10 }
      };
    }

    // 1. Progress Pillar (Max 30 pts)
    const progressRatio = target > 0 ? (current / target) : 0;
    const progressScore = Math.min(30, Math.round(progressRatio * 30));

    // 2. Capacity vs Required Pillar (Max 45 pts)
    let capacityScore = 0;
    if (requiredMonthlySaving <= 0) {
      capacityScore = 45;
    } else {
      const ratio = goalCapacity / requiredMonthlySaving;
      if (ratio >= 1.0) {
        capacityScore = 45;
      } else if (ratio >= 0.75) {
        capacityScore = 32;
      } else if (ratio >= 0.5) {
        capacityScore = 20;
      } else {
        capacityScore = Math.max(5, Math.round(ratio * 25));
      }
    }

    // 3. Time Runway Buffer Pillar (Max 15 pts)
    let timeScore = 0;
    const runwayMonths = goalCapacity > 0 ? (remainingAmount / goalCapacity) : 999;
    if (runwayMonths <= monthsRemaining) {
      timeScore = 15;
    } else if (runwayMonths <= monthsRemaining * 1.3) {
      timeScore = 10;
    } else if (runwayMonths <= monthsRemaining * 2.0) {
      timeScore = 5;
    } else {
      timeScore = 2;
    }

    // 4. Income Feasibility Pillar (Max 10 pts)
    let budgetScore = 10;
    if (userIncome > 0 && requiredMonthlySaving > (userIncome * 0.5)) {
      budgetScore = 2;
    } else if (userIncome > 0 && requiredMonthlySaving > (userIncome * 0.35)) {
      budgetScore = 6;
    }

    const totalScore = Math.min(100, Math.max(5, progressScore + capacityScore + timeScore + budgetScore));

    let status = 'On Track';
    if (totalScore < 50) {
      status = 'At Risk';
    } else if (totalScore < 75) {
      status = 'Needs Adjustment';
    }

    const surplusOrGap = goalCapacity - requiredMonthlySaving;

    return {
      score: totalScore,
      status,
      progressPercent,
      targetAmount: target,
      currentSavings: current,
      remainingAmount,
      requiredMonthlySaving,
      monthsRemaining,
      daysRemaining,
      monthlyCapacity: goalCapacity,
      surplusOrGap,
      pillars: {
        progressScore,
        capacityScore,
        timeScore,
        budgetScore
      }
    };
  },

  /**
   * Generate Smart Alternatives (Plan A, Plan B, Plan C)
   */
  generateAlternatives(goal, evalResult) {
    const { remainingAmount, monthlyCapacity, targetAmount, currentSavings } = evalResult;
    const capacity = Math.max(1000, monthlyCapacity || 5000);

    // Plan A: Realistic Extended Deadline
    const neededMonthsA = Math.ceil(remainingAmount / capacity);
    const recDateA = new Date();
    recDateA.setMonth(recDateA.getMonth() + neededMonthsA);
    const planA = {
      id: 'plan-a',
      title: 'Plan A: Relaxed Deadline Buffer',
      badge: 'Zero Stress',
      description: `Keep saving ₹${capacity.toLocaleString()}/mo and achieve this goal in ${neededMonthsA} months by ${recDateA.toISOString().split('T')[0]}.`,
      action: 'Extend Deadline'
    };

    // Plan B: Boost Monthly Savings
    const boostedCapacity = Math.round(capacity * 1.35);
    const neededMonthsB = Math.ceil(remainingAmount / boostedCapacity);
    const planB = {
      id: 'plan-b',
      title: 'Plan B: Turbo Boost Savings',
      badge: 'Fast Track',
      description: `Increase monthly savings to ₹${boostedCapacity.toLocaleString()}/mo to reach your target ${neededMonthsA - neededMonthsB} months faster.`,
      action: 'Boost Savings'
    };

    // Plan C: Calibrated Scope
    const calibratedTarget = Math.round(currentSavings + (capacity * evalResult.monthsRemaining));
    const planC = {
      id: 'plan-c',
      title: 'Plan C: Smart Target Calibration',
      badge: '100% Guaranteed',
      description: `Adjust target to ₹${calibratedTarget.toLocaleString()} to reach completion on your exact deadline without changing your budget.`,
      action: 'Calibrate Target'
    };

    return [planA, planB, planC];
  }
};

module.exports = CalculationService;
