/**
 * AI Strategic Advisory Controller (Groq AI Integration)
 * Bridges deterministic mathematical calculations with LLM advisory.
 */
const { getGroqClient, isGroqConfigured } = require('../config/groq');

const aiController = {
  /**
   * Get AI Recommendation
   * POST /api/ai/recommendation
   */
  async getRecommendation(req, res) {
    try {
      const { type, goalData, whatIfData, budgetData } = req.body;
      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

      if (!isGroqConfigured()) {
        const localAdvice = aiController.generateFallbackAdvice(type, goalData, whatIfData, budgetData);
        return res.status(200).json({
          status: 'success',
          data: {
            recommendation: localAdvice,
            source: 'deterministic_smart_rules',
            note: 'To enable live Groq LLM advisory, add your GROQ_API_KEY in server/.env'
          }
        });
      }

      const groq = getGroqClient();
      let prompt = '';

      if (type === 'goal_evaluation' && goalData) {
        prompt = `
You are the SaveIQ Financial AI Intelligence Advisor.
Analyze the following savings goal reality evaluation and provide a sharp, actionable 3-paragraph strategy (Verdict, Key Risk/Opportunity, Recommended Next Action).

Goal Data:
- Goal Name: "${goalData.name}"
- Purpose: ${goalData.purpose}
- Target Amount: ₹${Number(goalData.targetAmount).toLocaleString()}
- Current Savings: ₹${Number(goalData.currentSavings).toLocaleString()} (Progress: ${goalData.progressPercent || 0}%)
- Remaining Balance: ₹${Number(goalData.remainingAmount).toLocaleString()}
- Target Deadline: ${goalData.deadline || 'N/A'} (${goalData.daysRemaining || 0} days remaining / ${goalData.monthsRemaining || 0} months)
- User Monthly Capacity: ₹${Number(goalData.monthlyCapacity).toLocaleString()}/mo
- Required Monthly Saving: ₹${Number(goalData.requiredMonthlySaving).toLocaleString()}/mo
- Reality Score: ${goalData.score}/100 (${goalData.status})
- Monthly Surplus / Gap: ₹${Number(goalData.surplusOrGap || 0).toLocaleString()}/mo

Format with Markdown bold headings and clear bullet points. Keep it professional, encouraging, and financially sound.
        `;
      } else if (type === 'what_if_analysis' && whatIfData) {
        prompt = `
You are the SaveIQ What-If Simulation Advisor.
Compare the base goal vs simulated parameter adjustments and provide a 2-paragraph comparative analysis.

Simulation Data:
- Goal Name: "${whatIfData.goalName}"
- Base Required Monthly: ₹${Number(whatIfData.base?.requiredMonthlySaving || 0).toLocaleString()} (Score: ${whatIfData.base?.score}/100)
- Simulated Required Monthly: ₹${Number(whatIfData.simulated?.requiredMonthlySaving || 0).toLocaleString()} (Score: ${whatIfData.simulated?.score}/100)
- Score Delta: ${whatIfData.scoreDiff > 0 ? '+' : ''}${whatIfData.scoreDiff || 0} pts
- Estimated Completion: ${whatIfData.estimatedMonthsToComplete || 0} months
        `;
      } else if (type === 'expense_analysis' && budgetData) {
        prompt = `
You are the SaveIQ 50/30/20 Budget Optimization Advisor.
Analyze this user's monthly income, expenses, and savings distribution:

Budget Data:
- Monthly Income: ₹${Number(budgetData.monthlyIncome).toLocaleString()}
- Total Expenses: ₹${Number(budgetData.totalExpenses).toLocaleString()}
- Actual Needs: ₹${Number(budgetData.actualNeeds).toLocaleString()} (${budgetData.pctNeeds}% vs 50% target)
- Actual Wants: ₹${Number(budgetData.actualWants).toLocaleString()} (${budgetData.pctWants}% vs 30% target)
- Actual Savings: ₹${Number(budgetData.actualSavings).toLocaleString()} (${budgetData.pctSavings}% vs 20% target)
- Top Expense Categories: ${JSON.stringify(budgetData.categoryTotals || {})}

Provide 3 specific suggestions to reduce discretionary spending and boost monthly savings for goals.
        `;
      } else if (type === 'chat_query' && (req.body.query || req.body.prompt)) {
        const queryText = req.body.query || req.body.prompt;
        const context = req.body.contextData || {};
        const u = context.user || {};
        const gList = (context.goals || []).map(g => `"${g.GoalName || g.goalName}" (Target: ₹${Number(g.TargetAmount || g.targetAmount).toLocaleString()}, Saved: ₹${Number(g.CurrentSavings || g.currentSavings).toLocaleString()})`).join('; ');

        prompt = `
You are the SaveIQ Financial AI Strategist.
User Monthly Income: ₹${Number(u.MonthlyIncome || 75000).toLocaleString()}
User Monthly Saving Capacity: ₹${Number(u.MonthlySavingCapacity || 20000).toLocaleString()}
Active Goals: ${gList || 'None yet'}

User Question: "${queryText}"

Provide concise, practical, numbers-backed personal finance advice formatted with markdown headings and bullet points. Quote currency in INR (₹).
        `;
      } else {
        prompt = req.body.query || `You are the SaveIQ AI Advisor. Provide smart personal savings guidance.`;
      }

      const response = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are the SaveIQ Financial AI Intelligence Advisor. You provide crisp, numbers-backed, highly realistic personal finance guidance. Always quote exact figures in Indian Rupees (₹).'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 600
      });

      const recommendation = response.choices[0]?.message?.content || 'Unable to generate advice at this moment.';

      return res.status(200).json({
        status: 'success',
        data: {
          recommendation,
          source: 'groq_ai',
          model
        }
      });
    } catch (err) {
      console.warn('Groq AI API error:', err.message);
      const fallback = aiController.generateFallbackAdvice(req.body.type, req.body.goalData, req.body.whatIfData, req.body.budgetData, req.body.query, req.body.contextData);
      return res.status(200).json({
        status: 'success',
        data: {
          recommendation: fallback,
          source: 'deterministic_fallback'
        }
      });
    }
  },

  /**
   * Deterministic Fallback Rule Generator
   */
  generateFallbackAdvice(type, goalData, whatIfData, budgetData, query = '', contextData = {}) {
    if (type === 'goal_evaluation' && goalData) {
      const score = goalData.score || 70;
      const status = goalData.status || 'On Track';
      const name = goalData.name || 'Savings Goal';
      const req = Number(goalData.requiredMonthlySaving || 0).toLocaleString();
      const cap = Number(goalData.monthlyCapacity || 0).toLocaleString();
      const rem = Number(goalData.remainingAmount || 0).toLocaleString();

      if (score >= 75) {
        return `### 🌟 High Feasibility Verdict (${score}/100)\nYour goal **"${name}"** is in a prime position for timely completion! With a required monthly contribution of **₹${req}** against your allocated capacity of **₹${cap}**, you maintain a comfortable buffer.\n\n* **Recommendation**: Set up an automated recurring transfer of ₹${req} on salary day to lock in this milestone effortlessly.`;
      } else if (score >= 50) {
        return `### ⚖️ Calibration Required (${score}/100)\nYour goal **"${name}"** has a slight gap. You need **₹${req}/mo** to meet your deadline, while your capacity is **₹${cap}/mo** (Remaining: **₹${rem}**).\n\n* **Strategy**: Consider extending the deadline by 2–3 months or reviewing discretionary expenses to redirect ₹${Math.max(1000, goalData.requiredMonthlySaving - goalData.monthlyCapacity).toLocaleString()} into this goal.`;
      } else {
        return `### ⚠️ At Risk (${score}/100)\nYour goal **"${name}"** requires **₹${req}/mo**, which significantly outpaces your capacity (**₹${cap}/mo**).\n\n* **Rescue Plan**: Implement Plan A (extend deadline runway) or Plan C (calibrate target) from the Smart Alternative Scenarios below to guarantee achievable progress.`;
      }
    }

    if (type === 'chat_query' || query) {
      const q = (query || '').toLowerCase();
      if (q.includes('emergency fund') || q.includes('emergency')) {
        return `### 🛡️ Emergency Fund Strategy\n- **Target Size**: 3 to 6 months of essential living expenses in high-liquidity accounts.\n- **Purpose**: Protect long-term goals from early liquidation during unexpected contingencies.\n- **Action**: Set up a dedicated high-priority Emergency Fund goal in SaveIQ.`;
      }
      if (q.includes('reality score') || q.includes('score')) {
        return `### 🎯 SaveIQ 0–100 Reality Score\nCalculated dynamically across:\n1. **Progress Factor (30 pts)**\n2. **Monthly Capacity vs Requirement (45 pts)**\n3. **Time Runway (15 pts)**\n4. **Income Feasibility (10 pts)**`;
      }
      if (q.includes('50/30/20') || q.includes('budget')) {
        return `### 📊 50/30/20 Budgeting Rule\n- **50% Needs**: Housing, utilities, groceries, EMIs.\n- **30% Wants**: Dining out, travel, entertainment.\n- **20% Savings**: Dedicated SaveIQ goals & investments.`;
      }
      return `### 🤖 SaveIQ AI Advisor\nRegarding: *"${query}"*\n- Consistency in monthly contributions is the #1 factor in reaching your financial milestones.\n- Track your Reality Scores regularly and run **What-If simulations** when budgets adjust.`;
    }

    return `### 💡 Smart Financial Insight\nConsistent monthly deposits and tracking against the 50/30/20 budget framework will ensure all your goals are achieved on schedule.`;
  }
};

module.exports = aiController;
