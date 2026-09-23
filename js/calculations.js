/**
 * SaveIQ - Financial Calculation Engine
 * Pure deterministic financial mathematics for Goal Reality Check, 
 * 0-100 Reality Score, What-If Simulation, Alternative Plans, and Adaptive Recalculation.
 */

const SaveIQCalc = {
  /**
   * Calculates difference in months between two dates (handles fractions)
   * @param {Date|string} fromDate 
   * @param {Date|string} toDate 
   * @returns {number} Floating-point months remaining (min 0)
   */
  calculateMonthsRemaining(fromDate, toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    // Total difference in milliseconds
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;

    // Convert to days, then to approximate months (30.4375 days per month)
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const months = diffDays / 30.4375;
    
    // Return with 2 decimal precision, at least 0.1 if in the future
    return Math.max(0.1, Math.round(months * 100) / 100);
  },

  /**
   * Calculates difference in days between two dates
   * @param {Date|string} fromDate 
   * @param {Date|string} toDate 
   * @returns {number}
   */
  calculateDaysRemaining(fromDate, toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  },

  /**
   * Deterministic Goal Reality Check
   * @param {Object} goal
   * @param {number} goal.targetAmount
   * @param {number} goal.currentSavings
   * @param {number} goal.monthlyCapacity
   * @param {string|Date} goal.deadline
   * @param {string|Date} [goal.createdDate]
   * @param {number} [userMonthlyIncome]
   * @returns {Object} Complete reality check evaluation
   */
  evaluateGoalReality(goal = {}, userMonthlyIncome = 0) {
    const target = Math.max(0, Number(goal.targetAmount !== undefined ? goal.targetAmount : (goal.TargetAmount !== undefined ? goal.TargetAmount : 0)) || 0);
    const current = Math.max(0, Number(goal.currentSavings !== undefined ? goal.currentSavings : (goal.CurrentSavings !== undefined ? goal.CurrentSavings : 0)) || 0);
    const capacity = Math.max(0, Number(goal.monthlyCapacity !== undefined ? goal.monthlyCapacity : (goal.monthlySavingCapacity !== undefined ? goal.monthlySavingCapacity : (goal.MonthlySavingCapacity !== undefined ? goal.MonthlySavingCapacity : 0))) || 0);
    const now = new Date();
    const rawDeadline = goal.deadline || goal.Deadline || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deadline = new Date(rawDeadline);
    
    const remainingAmount = Math.max(0, target - current);
    const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 100;
    
    const monthsRemaining = this.calculateMonthsRemaining(now, deadline);
    const daysRemaining = this.calculateDaysRemaining(now, deadline);
    
    // Required Monthly Saving
    let requiredMonthlySaving = 0;
    if (remainingAmount > 0) {
      if (monthsRemaining > 0) {
        requiredMonthlySaving = Math.round((remainingAmount / monthsRemaining) * 100) / 100;
      } else {
        requiredMonthlySaving = remainingAmount; // Deadline reached/passed
      }
    }

    // Capacity Ratio: available capacity / required saving
    const capacityRatio = requiredMonthlySaving > 0 ? (capacity / requiredMonthlySaving) : 1.0;
    
    // Status Evaluation
    let status = 'On Track';
    let statusClass = 'status-on-track';
    let statusMessage = '';

    if (current >= target && target > 0) {
      status = 'Completed';
      statusClass = 'status-completed';
      statusMessage = 'Congratulations! You have reached your target savings goal.';
    } else if (daysRemaining === 0 && remainingAmount > 0) {
      status = 'At Risk';
      statusClass = 'status-at-risk';
      statusMessage = 'Goal deadline has arrived or passed with an outstanding balance.';
    } else if (capacityRatio >= 1.0) {
      status = 'On Track';
      statusClass = 'status-on-track';
      const surplus = Math.round(capacity - requiredMonthlySaving);
      statusMessage = `Your monthly capacity (₹${capacity.toLocaleString()}) comfortably covers the required monthly saving (₹${requiredMonthlySaving.toLocaleString()}) with a ₹${surplus.toLocaleString()} buffer.`;
    } else if (capacityRatio >= 0.7) {
      status = 'Needs Adjustment';
      statusClass = 'status-needs-adjustment';
      const shortfall = Math.round(requiredMonthlySaving - capacity);
      statusMessage = `You are slightly below the required rate. You need an extra ₹${shortfall.toLocaleString()}/month or a slight deadline extension.`;
    } else {
      status = 'At Risk';
      statusClass = 'status-at-risk';
      const shortfall = Math.round(requiredMonthlySaving - capacity);
      statusMessage = `Significant shortfall of ₹${shortfall.toLocaleString()}/month. Immediate adjustment recommended to make this goal realistic.`;
    }

    // Calculate Reality Score (0 - 100)
    const scoreResult = this.calculateRealityScore({
      target,
      current,
      capacity,
      requiredMonthlySaving,
      capacityRatio,
      monthsRemaining,
      daysRemaining,
      progressPercent,
      userMonthlyIncome
    });

    return {
      targetAmount: target,
      currentSavings: current,
      remainingAmount,
      progressPercent,
      monthsRemaining,
      daysRemaining,
      requiredMonthlySaving,
      monthlyCapacity: capacity,
      capacityRatio: Math.round(capacityRatio * 100) / 100,
      status,
      statusClass,
      statusMessage,
      score: scoreResult.score,
      scoreGrade: scoreResult.grade,
      scoreClass: scoreResult.gradeClass,
      scoreBreakdown: scoreResult.breakdown
    };
  },

  /**
   * Transparent 0–100 Goal Reality Score Algorithm
   * Four transparent pillars:
   * 1. Savings Progress (30 points)
   * 2. Capacity Coverage (45 points)
   * 3. Time Buffer Feasibility (15 points)
   * 4. Income Budget Proportion (10 points)
   */
  calculateRealityScore(params) {
    const {
      target,
      current,
      capacity,
      requiredMonthlySaving,
      capacityRatio,
      monthsRemaining,
      progressPercent,
      userMonthlyIncome
    } = params;

    if (current >= target && target > 0) {
      return {
        score: 100,
        grade: 'Goal Achieved',
        gradeClass: 'score-excellent',
        breakdown: {
          progressScore: 30,
          capacityScore: 45,
          timeScore: 15,
          budgetScore: 10
        }
      };
    }

    // 1. Progress Score (Max 30 points)
    const progressScore = Math.min(30, Math.round((progressPercent / 100) * 30));

    // 2. Capacity Coverage Score (Max 45 points)
    let capacityScore = 0;
    if (requiredMonthlySaving <= 0) {
      capacityScore = 45;
    } else {
      // Linear scaling up to ratio 1.0, capped at 45
      capacityScore = Math.min(45, Math.round(Math.min(1.0, capacityRatio) * 45));
      // Bonus if capacity exceeds requirement significantly (up to 5% bonus within the 45 pts)
      if (capacityRatio > 1.2) {
        capacityScore = 45;
      }
    }

    // 3. Time Buffer Score (Max 15 points)
    let timeScore = 0;
    if (monthsRemaining >= 6) {
      timeScore = 15; // Plentiful runway
    } else if (monthsRemaining >= 3) {
      timeScore = 12;
    } else if (monthsRemaining >= 1) {
      timeScore = 8;
    } else if (monthsRemaining > 0) {
      timeScore = 4;
    } else {
      timeScore = 0; // Expired
    }

    // 4. Budget Feasibility Score (Max 10 points)
    let budgetScore = 8; // default baseline if income not provided
    if (userMonthlyIncome > 0 && capacity > 0) {
      const commitmentRatio = capacity / userMonthlyIncome;
      if (commitmentRatio <= 0.35) {
        budgetScore = 10; // Healthy <= 35% of income
      } else if (commitmentRatio <= 0.50) {
        budgetScore = 7;  // Moderate 35-50% of income
      } else if (commitmentRatio <= 0.70) {
        budgetScore = 4;  // Aggressive 50-70% of income
      } else {
        budgetScore = 1;  // Extreme > 70% of income, high risk of burnout
      }
    }

    const totalScore = Math.min(100, Math.max(0, progressScore + capacityScore + timeScore + budgetScore));

    let grade = 'Low Feasibility';
    let gradeClass = 'score-critical';

    if (totalScore >= 85) {
      grade = 'Highly Achievable';
      gradeClass = 'score-excellent';
    } else if (totalScore >= 70) {
      grade = 'Realistic & Feasible';
      gradeClass = 'score-good';
    } else if (totalScore >= 50) {
      grade = 'Moderate (Needs Focus)';
      gradeClass = 'score-moderate';
    } else {
      grade = 'High Risk of Shortfall';
      gradeClass = 'score-critical';
    }

    return {
      score: totalScore,
      grade,
      gradeClass,
      breakdown: {
        progressScore,
        capacityScore,
        timeScore,
        budgetScore
      }
    };
  },

  /**
   * Helper to get CSS tier class for any reality score
   */
  getScoreTierClass(score) {
    const num = Number(score) || 0;
    if (num >= 80) return 'score-excellent';
    if (num >= 65) return 'score-good';
    if (num >= 45) return 'score-moderate';
    return 'score-critical';
  },

  /**
   * Interactive What-If Simulator Calculation
   * Simulates changes to Target, Savings, Capacity, and Deadline
   * @param {Object} baseGoal 
   * @param {Object} simulatedDeltas 
   * @param {number} [userMonthlyIncome]
   * @returns {Object} Comparative analysis (Base vs Simulated)
   */
  runWhatIfAnalysis(baseGoal, simulatedDeltas, userMonthlyIncome = 0) {
    const simulatedGoal = {
      targetAmount: simulatedDeltas.targetAmount !== undefined ? Number(simulatedDeltas.targetAmount) : Number(baseGoal.targetAmount),
      currentSavings: simulatedDeltas.currentSavings !== undefined ? Number(simulatedDeltas.currentSavings) : Number(baseGoal.currentSavings),
      monthlyCapacity: simulatedDeltas.monthlyCapacity !== undefined ? Number(simulatedDeltas.monthlyCapacity) : Number(baseGoal.monthlyCapacity),
      deadline: simulatedDeltas.deadline || baseGoal.deadline
    };

    const baseResult = this.evaluateGoalReality(baseGoal, userMonthlyIncome);
    const simResult = this.evaluateGoalReality(simulatedGoal, userMonthlyIncome);

    // Calculate completion estimated time at simulated capacity
    let estimatedMonthsToComplete = 0;
    if (simulatedGoal.monthlyCapacity > 0) {
      const remaining = Math.max(0, simulatedGoal.targetAmount - simulatedGoal.currentSavings);
      estimatedMonthsToComplete = Math.ceil(remaining / simulatedGoal.monthlyCapacity);
    }

    // Difference comparisons
    const scoreDiff = simResult.score - baseResult.score;
    const requiredSavingDiff = simResult.requiredMonthlySaving - baseResult.requiredMonthlySaving;

    return {
      base: baseResult,
      simulated: simResult,
      simulatedParams: simulatedGoal,
      estimatedMonthsToComplete,
      scoreDiff,
      requiredSavingDiff,
      isBetter: scoreDiff > 0 || (scoreDiff === 0 && requiredSavingDiff < 0)
    };
  },

  /**
   * Smart Alternative Plans Generator
   * Computes Plan A (Extend Deadline), Plan B (Reduce Target), Plan C (Boost Monthly Savings)
   * @param {Object} goal
   * @returns {Object} 3 distinct realistic alternatives
   */
  generateAlternativePlans(goal) {
    const target = Number(goal.targetAmount) || 0;
    const current = Number(goal.currentSavings) || 0;
    const capacity = Number(goal.monthlyCapacity) || 0;
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const remainingAmount = Math.max(0, target - current);
    const monthsRemaining = Math.max(0.5, this.calculateMonthsRemaining(now, deadline));

    // Safe fallback if capacity is 0
    const safeCapacity = capacity > 0 ? capacity : Math.max(1000, Math.round(target / 12));

    // PLAN A: Keep Target → Extend Deadline to match current saving capacity
    const planAMonthsNeeded = Math.max(1, Math.ceil(remainingAmount / safeCapacity));
    const planADeadline = new Date(now);
    planADeadline.setMonth(planADeadline.getMonth() + planAMonthsNeeded);
    const planADeadlineStr = planADeadline.toISOString().split('T')[0];
    
    const planA = {
      name: 'Plan A: Extend Deadline',
      title: 'Plan A: Extend Deadline',
      tagline: 'Keep your target, give yourself more time',
      description: `Save ₹${safeCapacity.toLocaleString()}/month for ${planAMonthsNeeded} months to reach your full ₹${target.toLocaleString()} goal.`,
      targetAmount: target,
      monthlySaving: safeCapacity,
      newMonthlyRate: safeCapacity,
      monthsNeeded: planAMonthsNeeded,
      newDeadline: planADeadlineStr,
      deadlineExtensionMonths: Math.max(0, Math.round(planAMonthsNeeded - monthsRemaining)),
      realityScore: 88,
      score: 88,
      status: 'On Track',
      summary: `Save ₹${safeCapacity.toLocaleString()}/month for ${planAMonthsNeeded} months to reach your full ₹${target.toLocaleString()} goal.`
    };

    // PLAN B: Keep Deadline → Realistically Adjust Target
    const planBAchievableTarget = Math.round(current + (safeCapacity * monthsRemaining));
    const planBReduction = Math.max(0, target - planBAchievableTarget);
    const planB = {
      name: 'Plan B: Adjusted Target',
      title: 'Plan B: Adjusted Target',
      tagline: 'Hit your original deadline with a scaled target',
      description: `Reach ₹${planBAchievableTarget.toLocaleString()} on time (${goal.Deadline || goal.deadline}) by continuing to save ₹${safeCapacity.toLocaleString()}/month.`,
      targetAmount: planBAchievableTarget,
      feasibleTarget: planBAchievableTarget,
      monthlySaving: safeCapacity,
      newMonthlyRate: safeCapacity,
      monthsNeeded: Math.round(monthsRemaining * 10) / 10,
      newDeadline: goal.Deadline || goal.deadline,
      reductionAmount: planBReduction,
      reduction: planBReduction,
      realityScore: 85,
      score: 85,
      status: 'On Track',
      summary: `Reach ₹${planBAchievableTarget.toLocaleString()} on time (${goal.Deadline || goal.deadline}) by continuing to save ₹${safeCapacity.toLocaleString()}/month.`
    };

    // PLAN C: Keep Target & Deadline → Increase Monthly Savings
    const planCRequiredMonthly = Math.ceil(remainingAmount / monthsRemaining);
    const planCIncreaseNeeded = Math.max(0, planCRequiredMonthly - capacity);
    const planC = {
      name: 'Plan C: Fast-Track Savings',
      title: 'Plan C: Fast-Track Savings',
      tagline: 'Achieve 100% on schedule by optimizing monthly budget',
      description: `Increase your monthly savings by ₹${planCIncreaseNeeded.toLocaleString()} (to ₹${planCRequiredMonthly.toLocaleString()}/month) to hit ₹${target.toLocaleString()} on deadline.`,
      targetAmount: target,
      monthlySaving: planCRequiredMonthly,
      requiredMonthlyCapacity: planCRequiredMonthly,
      monthlyIncrease: planCIncreaseNeeded,
      extraNeeded: planCIncreaseNeeded,
      monthsNeeded: Math.round(monthsRemaining * 10) / 10,
      newDeadline: goal.Deadline || goal.deadline,
      realityScore: 92,
      score: 92,
      status: 'On Track',
      summary: `Increase your monthly savings by ₹${planCIncreaseNeeded.toLocaleString()} (to ₹${planCRequiredMonthly.toLocaleString()}/month) to hit ₹${target.toLocaleString()} on deadline.`
    };

    return {
      planA,
      planB,
      planC
    };
  },

  /**
   * Adaptive Savings Recalculator
   * Called when an actual deposit occurs (e.g., user saved ₹5,000 instead of ₹8,000)
   * @param {Object} goal
   * @param {number} actualDepositedAmount
   * @param {number} expectedMonthlySaving
   * @returns {Object} Recalibrated milestone and explanation
   */
  calculateAdaptivePlan(goal, actualDepositedAmount, expectedMonthlySaving) {
    const target = Number(goal.targetAmount || goal.TargetAmount || 0);
    const previousSavings = Number(goal.currentSavings || goal.CurrentSavings || 0);
    const newCurrentSavings = previousSavings + Number(actualDepositedAmount);
    const remainingAmount = Math.max(0, target - newCurrentSavings);
    
    const now = new Date();
    const deadline = new Date(goal.deadline || goal.Deadline || new Date());
    const remainingMonths = Math.max(0.5, this.calculateMonthsRemaining(now, deadline));
    
    const newRequiredMonthly = remainingAmount > 0 
      ? Math.round((remainingAmount / remainingMonths) * 100) / 100 
      : 0;

    const deltaFromExpected = Number(actualDepositedAmount) - Number(expectedMonthlySaving);
    
    let advice = '';
    if (deltaFromExpected < 0) {
      advice = `You saved ₹${Number(actualDepositedAmount).toLocaleString()} instead of the planned ₹${Number(expectedMonthlySaving).toLocaleString()} this month (shortfall of ₹${Math.abs(deltaFromExpected).toLocaleString()}). Your remaining monthly requirement has been automatically adjusted to ₹${newRequiredMonthly.toLocaleString()}/month across the remaining ${Math.round(remainingMonths * 10) / 10} months.`;
    } else if (deltaFromExpected > 0) {
      advice = `Great job! You saved ₹${Number(actualDepositedAmount).toLocaleString()}, exceeding your target by ₹${deltaFromExpected.toLocaleString()}! This reduces your required monthly savings to ₹${newRequiredMonthly.toLocaleString()}/month.`;
    } else {
      advice = `Right on schedule! You contributed your planned ₹${Number(actualDepositedAmount).toLocaleString()}. Your required monthly saving remains steady at ₹${newRequiredMonthly.toLocaleString()}/month.`;
    }

    return {
      newCurrentSavings,
      remainingAmount,
      remainingMonths,
      newRequiredMonthly,
      deltaFromExpected,
      advice
    };
  },

  /**
   * Expense & 50/30/20 Budget Analysis
   * @param {number} monthlyIncome 
   * @param {Array<Object>} expenses 
   * @returns {Object}
   */
  analyzeExpensesAndBudget(monthlyIncome, expenses = []) {
    const income = Math.max(0, Number(monthlyIncome) || 0);
    const categoryTotals = {};
    let totalExpenses = 0;
    let needsTotal = 0;
    let wantsTotal = 0;

    const needsCategories = ['Rent', 'Housing', 'Bills', 'Utilities', 'Food', 'Groceries', 'Transport', 'Fuel', 'Education', 'Health', 'Insurance', 'Medicine'];

    expenses.forEach(exp => {
      const amt = Math.max(0, Number(exp.Amount !== undefined ? exp.Amount : (exp.amount !== undefined ? exp.amount : 0)));
      const rawCat = (exp.Category || exp.category || 'Other').trim();
      const cat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
      
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      totalExpenses += amt;

      const expType = exp.Type || exp.type;
      const isNeed = expType === 'Need' || (!expType && needsCategories.some(nc => nc.toLowerCase() === cat.toLowerCase()));
      if (isNeed) {
        needsTotal += amt;
      } else {
        wantsTotal += amt;
      }
    });

    const netDisposableSavings = Math.max(0, income - totalExpenses);
    const savingsRatePercent = income > 0 ? Math.round((netDisposableSavings / income) * 1000) / 10 : 0;
    const expenseRatePercent = income > 0 ? Math.round((totalExpenses / income) * 1000) / 10 : 0;

    const idealNeeds = Math.round(income * 0.50);
    const idealWants = Math.round(income * 0.30);
    const idealSavings = Math.round(income * 0.20);

    return {
      income,
      totalExpenses,
      netDisposableSavings,
      savingsRatePercent,
      expenseRatePercent,
      categoryTotals,
      budget50_30_20: {
        actualNeeds: needsTotal,
        actualWants: wantsTotal,
        actualSavings: netDisposableSavings,
        idealNeeds,
        idealWants,
        idealSavings,
        needsPercent: income > 0 ? Math.round((needsTotal / income) * 100) : 0,
        wantsPercent: income > 0 ? Math.round((wantsTotal / income) * 100) : 0,
        savingsPercent: savingsRatePercent
      }
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SaveIQCalc;
}
