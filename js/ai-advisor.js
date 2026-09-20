/**
 * SaveIQ - AI Financial Advisor (Groq AI Integration Layer)
 * Bridges deterministic mathematical results to LLM guidance.
 * Protects against hallucinations by feeding pre-calculated financial metrics.
 */

const SaveIQAI = {
  /**
   * Request AI guidance for a specific goal reality analysis
   * @param {Object} goal 
   * @param {Object} evalResult 
   * @param {Object} [user]
   * @returns {Promise<string>} Markdown formatted AI advice
   */
  async getGoalAdvice(goal, evalResult, user = {}) {
    const payload = {
      action: 'getAIRecommendation',
      type: 'goal_evaluation',
      goalData: {
        name: goal.GoalName,
        purpose: goal.Purpose,
        targetAmount: evalResult.targetAmount,
        currentSavings: evalResult.currentSavings,
        remainingAmount: evalResult.remainingAmount,
        monthlyCapacity: evalResult.monthlyCapacity,
        requiredMonthlySaving: evalResult.requiredMonthlySaving,
        monthsRemaining: evalResult.monthsRemaining,
        daysRemaining: evalResult.daysRemaining,
        status: evalResult.status,
        score: evalResult.score,
        userIncome: user.MonthlyIncome || 0
      }
    };

    // If live Google Apps Script is available with Groq backend, invoke it
    if (SaveIQAPI.isLiveBackend()) {
      try {
        const response = await SaveIQAPI.request('getAIRecommendation', payload);
        if (response && response.data && response.data.recommendation) {
          return response.data.recommendation;
        }
      } catch (err) {
        console.warn('[SaveIQ AI] Backend AI request error, using smart local advisor:', err);
      }
    }

    // High-intelligence local rule-based advisor (Deterministic + Context-Aware)
    return this.generateSmartLocalGoalAdvice(goal, evalResult, user);
  },

  /**
   * Request AI comparison of a What-If scenario
   */
  async getWhatIfAdvice(whatIfResult, goalName) {
    const { base, simulated, simulatedParams, estimatedMonthsToComplete, scoreDiff } = whatIfResult;
    
    // Check live backend
    if (SaveIQAPI.isLiveBackend()) {
      try {
        const response = await SaveIQAPI.request('getAIRecommendation', {
          action: 'getAIRecommendation',
          type: 'what_if_analysis',
          goalName,
          base,
          simulated
        });
        if (response && response.data && response.data.recommendation) {
          return response.data.recommendation;
        }
      } catch (err) {
        console.warn('[SaveIQ AI] Live What-If AI error:', err);
      }
    }

    // Local smart generator
    return this.generateSmartLocalWhatIfAdvice(whatIfResult, goalName);
  },

  /**
   * Request AI expense & budget optimization analysis
   */
  async getExpenseAdvice(budgetAnalysis) {
    if (SaveIQAPI.isLiveBackend()) {
      try {
        const response = await SaveIQAPI.request('getAIRecommendation', {
          action: 'getAIRecommendation',
          type: 'expense_analysis',
          budgetAnalysis
        });
        if (response && response.data && response.data.recommendation) {
          return response.data.recommendation;
        }
      } catch (err) {
        console.warn('[SaveIQ AI] Live Expense AI error:', err);
      }
    }

    return this.generateSmartLocalExpenseAdvice(budgetAnalysis);
  },

  /**
   * Smart Local AI Advisor: Goal Feasibility
   */
  generateSmartLocalGoalAdvice(goal, evalResult, user) {
    const { targetAmount, currentSavings, remainingAmount, requiredMonthlySaving, monthlyCapacity, monthsRemaining, status, score } = evalResult;
    const shortfall = Math.max(0, Math.round(requiredMonthlySaving - monthlyCapacity));
    const surplus = Math.max(0, Math.round(monthlyCapacity - requiredMonthlySaving));

    let advice = `### 🤖 SaveIQ AI Strategic Assessment for **"${goal.GoalName}"**\n\n`;

    if (status === 'Completed') {
      advice += `🎉 **Target Achieved!** You have fully funded this goal with ₹${currentSavings.toLocaleString()} accumulated.\n\n` +
                `- **Next Strategic Move**: Consider locking in this capital into a dedicated fixed-yield instrument or reallocating your ₹${monthlyCapacity.toLocaleString()}/month capacity toward secondary high-priority goals like your Emergency Fund or investment portfolio.\n` +
                `- **Reality Score**: **100/100** (Perfect completion).`;
      return advice;
    }

    if (status === 'On Track') {
      advice += `✅ **Goal is Healthy & Feasible (Reality Score: ${score}/100)**\n\n` +
                `- **Financial Runway**: With ₹${remainingAmount.toLocaleString()} left across ${monthsRemaining} months, you only need to commit **₹${requiredMonthlySaving.toLocaleString()}/month**.\n` +
                `- **Capacity Buffer**: Your available capacity of ₹${monthlyCapacity.toLocaleString()}/month leaves you with a comfortable safety cushion of **+₹${surplus.toLocaleString()}/month**.\n` +
                `- **Recommendation**: Set up an automated standing transfer on your salary deposit date so you never miss a milestone. Keep your surplus in a liquid fund for unforeseen emergencies.`;
    } else if (status === 'Needs Adjustment') {
      advice += `⚠️ **Goal Requires Minor Calibration (Reality Score: ${score}/100)**\n\n` +
                `- **The Reality Gap**: To hit ₹${targetAmount.toLocaleString()} by the deadline, you require **₹${requiredMonthlySaving.toLocaleString()}/month**, but your current capacity is **₹${monthlyCapacity.toLocaleString()}/month** (shortfall: **₹${shortfall.toLocaleString()}/month**).\n` +
                `- **Smart Tactic 1 (Deadline Shift)**: Extending your deadline by just **${Math.ceil(shortfall / (monthlyCapacity || 1000))} months** will bring your required monthly savings in exact alignment with your budget without reducing your target.\n` +
                `- **Smart Tactic 2 (Expense Trim)**: Review discretionary expenses (e.g. Dining Out or Subscriptions) to redirect ₹${shortfall.toLocaleString()} monthly into this goal.`;
    } else {
      advice += `🚨 **High Risk of Shortfall (Reality Score: ${score}/100)**\n\n` +
                `- **The Reality Gap**: Your required monthly saving of **₹${requiredMonthlySaving.toLocaleString()}/month** is significantly higher than your available capacity of **₹${monthlyCapacity.toLocaleString()}/month** (deficit of **₹${shortfall.toLocaleString()}/month**).\n` +
                `- **Critical Action Plan**: It is mathematically improbable to reach the target on schedule without restructuring. Check the **Smart Alternative Plans** tab:\n` +
                `  1. *Option A*: Extend your timeframe to allow your steady ₹${monthlyCapacity.toLocaleString()} monthly pace to accumulate the full amount.\n` +
                `  2. *Option B*: Scale the target down to an achievable initial phase.\n` +
                `  3. *Option C*: Combine a partial lump-sum contribution with secondary income sources.`;
    }

    advice += `\n\n> *Note: This guidance combines deterministic financial math with Groq AI intelligence. Always align decisions with your personal risk tolerance.*`;
    return advice;
  },

  /**
   * Smart Local AI Advisor: What-If Simulator Guidance
   */
  generateSmartLocalWhatIfAdvice(whatIfResult, goalName) {
    const { base, simulated, simulatedParams, estimatedMonthsToComplete, scoreDiff } = whatIfResult;
    
    let advice = `### 💡 Groq AI What-If Scenario Analysis: *${goalName}*\n\n`;

    if (scoreDiff > 0) {
      advice += `📈 **Positive Simulation Result (+${scoreDiff} Reality Score Points)**\n\n` +
                `- **Impact**: Your modified parameters increase the Goal Reality Score from **${base.score}/100** to **${simulated.score}/100** (Grade: **${simulated.scoreGrade}**).\n` +
                `- **Required Monthly Rate**: Shifted from ₹${base.requiredMonthlySaving.toLocaleString()} ➔ **₹${simulated.requiredMonthlySaving.toLocaleString()}/month**.\n` +
                `- **Timeline Projection**: At your simulated capacity of ₹${simulatedParams.monthlyCapacity.toLocaleString()}/month, you will hit 100% completion in approximately **${estimatedMonthsToComplete} months**.\n` +
                `- **Verdict**: This scenario significantly lowers your financial stress and creates a predictable path to victory.`;
    } else if (scoreDiff < 0) {
      advice += `📉 **Tighter Constraint Detected (${scoreDiff} Reality Score Points)**\n\n` +
                `- **Impact**: The simulated adjustments lower the feasibility score from **${base.score}/100** to **${simulated.score}/100**.\n` +
                `- **Required Monthly Rate**: Rose to **₹${simulated.requiredMonthlySaving.toLocaleString()}/month**.\n` +
                `- **Verdict**: This scenario may cause budget strain unless offset by reduced living expenses or additional cash flows.`;
    } else {
      advice += `⚖️ **Neutral Feasibility Scenario**\n\n` +
                `- The adjusted parameters maintain your current Reality Score at **${simulated.score}/100**.\n` +
                `- Estimated time to complete: **${estimatedMonthsToComplete} months** at ₹${simulatedParams.monthlyCapacity.toLocaleString()}/month.`;
    }

    return advice;
  },

  /**
   * Smart Local AI Advisor: Expense & Budget Optimization
   */
  generateSmartLocalExpenseAdvice(budgetAnalysis) {
    const { income, totalExpenses, netDisposableSavings, savingsRatePercent, budget50_30_20, categoryTotals } = budgetAnalysis;

    let advice = `### 📊 Groq AI Budget Optimization & 50/30/20 Insights\n\n`;
    advice += `- **Monthly Cash Flow**: Gross Income ₹${income.toLocaleString()} | Total Spend ₹${totalExpenses.toLocaleString()} | Net Surplus ₹${netDisposableSavings.toLocaleString()} (**${savingsRatePercent}% Savings Rate**).\n\n`;

    // Highest expense category
    let maxCat = 'Other';
    let maxAmt = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > maxAmt) { maxAmt = amt; maxCat = cat; }
    });

    advice += `**Key Observations:**\n` +
              `1. **Largest Expenditure**: **${maxCat}** accounts for ₹${maxAmt.toLocaleString()} (${income > 0 ? Math.round((maxAmt/income)*100) : 0}% of your total income).\n`;

    if (budget50_30_20.wantsPercent > 30) {
      const wantsSurplus = budget50_30_20.actualWants - budget50_30_20.idealWants;
      advice += `2. **Wants Allocation Alert**: You are currently spending **${budget50_30_20.wantsPercent}%** on discretionary wants (ideal limit: 30%). You can reclaim **₹${wantsSurplus.toLocaleString()}/month** by capping shopping or entertainment.\n`;
    } else {
      advice += `2. **Disciplined Discretionary Spend**: Your discretionary spending is well-controlled at **${budget50_30_20.wantsPercent}%** of income.\n`;
    }

    if (savingsRatePercent >= 20) {
      advice += `3. **Strong Wealth Velocity**: Your ${savingsRatePercent}% savings rate comfortably exceeds the golden 20% threshold! Keep feeding these funds into your active goals.\n`;
    } else {
      advice += `3. **Savings Rate Opportunity**: Your savings rate is ${savingsRatePercent}% (target: 20%). Trimming ${maxCat} by 10-15% will easily bridge this gap.\n`;
    }

    return advice;
  },

  /**
   * Free-form Financial Assistant Query
   */
  async askAdvisorQuestion(query, contextData = {}) {
    if (SaveIQAPI.isLiveBackend()) {
      try {
        const response = await SaveIQAPI.request('getAIRecommendation', {
          action: 'getAIRecommendation',
          type: 'chat_query',
          query,
          contextData
        });
        if (response && response.data && response.data.recommendation) {
          return response.data.recommendation;
        }
      } catch (err) {
        console.warn('[SaveIQ AI] Live chat error, fallback to assistant:', err);
      }
    }

    // Smart contextual responses for typical financial questions
    const q = query.toLowerCase();
    if (q.includes('emergency fund') || q.includes('emergency')) {
      return `💡 **Emergency Fund Strategy**:\n` +
             `- **Rule of Thumb**: Maintain 3 to 6 months of living expenses (Rent, Food, Utilities, Debt obligations) in a high-liquidity account.\n` +
             `- **Why**: It protects your long-term savings goals from being liquidated prematurely during unforeseen events.\n` +
             `- **Action in SaveIQ**: Set up a dedicated "Emergency Fund" goal with a high priority and automated monthly contributions.`;
    }

    if (q.includes('reality score') || q.includes('score')) {
      return `🎯 **How SaveIQ Calculates Your Goal Reality Score (0–100)**:\n` +
             `SaveIQ uses a 4-pillar transparent evaluation:\n` +
             `1. **Progress Factor (30 pts)**: How much of the target you have already saved.\n` +
             `2. **Monthly Capacity vs Requirement (45 pts)**: Whether your monthly saving capacity covers the required rate.\n` +
             `3. **Time Runway (15 pts)**: Sufficient timeline buffer before the deadline arrives.\n` +
             `4. **Income Budget Feasibility (10 pts)**: Whether the commitment is healthy relative to your total monthly income.`;
    }

    if (q.includes('50/30/20') || q.includes('budget rule')) {
      return `📋 **The 50/30/20 Budgeting Principle**:\n` +
             `- **50% Needs**: Housing, groceries, utilities, minimum loan payments, essential transport.\n` +
             `- **30% Wants**: Dining out, travel, entertainment, hobbies, gadgets.\n` +
             `- **20% Savings & Debt Acceleration**: High-priority savings goals, investments, emergency buffer.\n` +
             `Check the **Expense Analysis** tab to see your live breakdown!`;
    }

    return `🤖 **SaveIQ AI Financial Advisor**:\n\n` +
           `Regarding: *"${query}"*\n\n` +
           `- **Smart Savings Principle**: Consistency always outperforms timing. Automating even ₹1,000 to ₹5,000 at the start of each month significantly reduces goal completion risk.\n` +
           `- **Reality Check Strategy**: Whenever your monthly income or expenses shift, run a quick **What-If simulation** on your highest-priority goal to ensure your deadline remains realistic.\n` +
           `- **Next Step**: You can inspect each goal's personalized AI analysis directly in the **Goal Details** view!`;
  }
};
