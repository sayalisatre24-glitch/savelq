/**
 * SaveIQ - API Bridge & Storage Layer
 * Supports seamless switching between Live Google Apps Script Backend (Web App URL)
 * and LocalStorage Mock Mode for zero-config offline demonstration.
 */

const SaveIQAPI = {
  // Config keys
  CONFIG_GAS_URL_KEY: 'saveiq_gas_endpoint_url',
  CONFIG_GROQ_KEY: 'saveiq_client_groq_key',
  CONFIG_VERSION_KEY: 'saveiq_storage_version',
  STORAGE_USERS_KEY: 'saveiq_users_db',
  STORAGE_GOALS_KEY: 'saveiq_goals_db',
  STORAGE_SAVINGS_KEY: 'saveiq_savings_db',
  STORAGE_EXPENSES_KEY: 'saveiq_expenses_db',
  STORAGE_ALERTS_KEY: 'saveiq_alerts_db',

  /**
   * Get configured Google Apps Script Web App URL
   */
  getGasUrl() {
    return localStorage.getItem(this.CONFIG_GAS_URL_KEY) || '';
  },

  /**
   * Set Google Apps Script Web App URL
   */
  setGasUrl(url) {
    localStorage.setItem(this.CONFIG_GAS_URL_KEY, (url || '').trim());
  },

  /**
   * Checks if app is currently using live Google Apps Script or Local Storage
   */
  isLiveBackend() {
    const url = this.getGasUrl();
    return url && url.startsWith('http') && url.includes('script.google.com');
  },

  /**
   * Initialize LocalStorage with exactly 2 example goals
   */
  initStorage(forceReset = false) {
    const currentVer = localStorage.getItem(this.CONFIG_VERSION_KEY);
    const targetVer = 'v2_two_goals';

    if (forceReset || currentVer !== targetVer) {
      localStorage.removeItem(this.STORAGE_GOALS_KEY);
      localStorage.removeItem(this.STORAGE_SAVINGS_KEY);
      localStorage.removeItem(this.STORAGE_ALERTS_KEY);
      localStorage.setItem(this.CONFIG_VERSION_KEY, targetVer);
    }

    if (!localStorage.getItem(this.STORAGE_USERS_KEY)) {
      const defaultUser = {
        UserID: 'USR_001',
        Name: 'Aarav Sharma',
        Email: 'aarav.sharma@example.com',
        MonthlyIncome: 75000,
        MonthlySavingCapacity: 20000,
        CreatedDate: '2026-01-15'
      };
      localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify([defaultUser]));
    }

    // Exactly 2 Example Goals
    if (!localStorage.getItem(this.STORAGE_GOALS_KEY)) {
      const defaultGoals = [
        {
          GoalID: 'GOAL_001',
          UserID: 'USR_001',
          GoalName: 'Laptop Purchase (MacBook Pro)',
          Purpose: 'Laptop Purchase',
          TargetAmount: 60000,
          CurrentSavings: 20000,
          MonthlySavingCapacity: 6000,
          Deadline: '2027-05-30',
          Status: 'On Track',
          RealityScore: 88,
          EmailAlert: true,
          CreatedDate: '2026-02-01'
        },
        {
          GoalID: 'GOAL_002',
          UserID: 'USR_001',
          GoalName: 'Emergency Safety Fund',
          Purpose: 'Emergency Fund',
          TargetAmount: 200000,
          CurrentSavings: 60000,
          MonthlySavingCapacity: 12000,
          Deadline: '2027-10-31',
          Status: 'On Track',
          RealityScore: 84,
          EmailAlert: true,
          CreatedDate: '2026-01-20'
        }
      ];
      localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(defaultGoals));
    }

    if (!localStorage.getItem(this.STORAGE_SAVINGS_KEY)) {
      const defaultSavings = [
        { SavingID: 'SAV_001', GoalID: 'GOAL_001', Date: '2026-02-05', Amount: 10000, Notes: 'Initial deposit for Laptop' },
        { SavingID: 'SAV_002', GoalID: 'GOAL_001', Date: '2026-03-05', Amount: 10000, Notes: 'Monthly savings contribution' },
        { SavingID: 'SAV_003', GoalID: 'GOAL_002', Date: '2026-02-15', Amount: 30000, Notes: 'Initial emergency buffer deposit' },
        { SavingID: 'SAV_004', GoalID: 'GOAL_002', Date: '2026-03-15', Amount: 30000, Notes: 'Monthly emergency fund deposit' }
      ];
      localStorage.setItem(this.STORAGE_SAVINGS_KEY, JSON.stringify(defaultSavings));
    }

    if (!localStorage.getItem(this.STORAGE_EXPENSES_KEY)) {
      const defaultExpenses = [
        { ExpenseID: 'EXP_001', UserID: 'USR_001', Date: '2026-09-02', Category: 'Bills', Amount: 18000, Notes: 'Apartment rent & maintenance' },
        { ExpenseID: 'EXP_002', UserID: 'USR_001', Date: '2026-09-04', Category: 'Food', Amount: 9500, Notes: 'Groceries and dining out' },
        { ExpenseID: 'EXP_003', UserID: 'USR_001', Date: '2026-09-07', Category: 'Transport', Amount: 4500, Notes: 'Metro pass & fuel' },
        { ExpenseID: 'EXP_004', UserID: 'USR_001', Date: '2026-09-10', Category: 'Bills', Amount: 3200, Notes: 'High-speed Fiber & Electricity' },
        { ExpenseID: 'EXP_005', UserID: 'USR_001', Date: '2026-09-12', Category: 'Entertainment', Amount: 2800, Notes: 'Movie tickets and subscriptions' },
        { ExpenseID: 'EXP_006', UserID: 'USR_001', Date: '2026-09-15', Category: 'Shopping', Amount: 4000, Notes: 'Clothing and essentials' }
      ];
      localStorage.setItem(this.STORAGE_EXPENSES_KEY, JSON.stringify(defaultExpenses));
    }

    if (!localStorage.getItem(this.STORAGE_ALERTS_KEY)) {
      const defaultAlerts = [
        { AlertID: 'ALT_001', GoalID: 'GOAL_001', UserID: 'USR_001', AlertType: 'Deadline Approaching', SentDate: '2026-09-15', Status: 'Sent', Message: 'Laptop Purchase has 8 months remaining. Required monthly saving is ₹5,000.' }
      ];
      localStorage.setItem(this.STORAGE_ALERTS_KEY, JSON.stringify(defaultAlerts));
    }
  },

  /**
   * Generic request handler that calls Google Apps Script or falls back to LocalStorage
   */
  async request(action, payload = {}, method = 'POST') {
    const gasUrl = this.getGasUrl();

    if (this.isLiveBackend()) {
      try {
        let fetchUrl = gasUrl;
        let options = {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify({ action, ...payload })
        };

        if (method === 'GET') {
          const params = new URLSearchParams({ action, ...payload });
          fetchUrl = `${gasUrl}?${params.toString()}`;
          options = { method: 'GET' };
        }

        const response = await fetch(fetchUrl, options);
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }
        const data = await response.json();
        if (data.status === 'error') {
          throw new Error(data.message || 'Google Apps Script Error');
        }
        return data;
      } catch (err) {
        console.warn(`[SaveIQ API] Live Apps Script request failed (${action}), falling back to LocalStorage:`, err.message);
        return this.localHandler(action, payload);
      }
    } else {
      // Offline LocalStorage mode
      return this.localHandler(action, payload);
    }
  },

  /**
   * Local storage mock backend handler
   */
  localHandler(action, payload) {
    this.initStorage();
    
    switch (action) {
      case 'getUser': {
        const users = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]');
        return { status: 'success', data: users[0] || null };
      }

      case 'updateUser': {
        const users = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]');
        const updated = { ...users[0], ...payload };
        localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify([updated]));
        return { status: 'success', data: updated, message: 'Profile updated successfully' };
      }

      case 'getGoals': {
        const goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        // Re-evaluate current reality check for each goal
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0];
        const evaluatedGoals = goals.map(g => {
          const evalResult = SaveIQCalc.evaluateGoalReality(g, user ? user.MonthlyIncome : 0);
          return {
            ...g,
            Status: evalResult.status,
            RealityScore: evalResult.score,
            _eval: evalResult
          };
        });
        return { status: 'success', data: evaluatedGoals };
      }

      case 'getGoalById': {
        const goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const goal = goals.find(g => g.GoalID === payload.goalId);
        if (!goal) return { status: 'error', message: 'Goal not found' };
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0];
        const evalResult = SaveIQCalc.evaluateGoalReality(goal, user ? user.MonthlyIncome : 0);
        return { status: 'success', data: { ...goal, Status: evalResult.status, RealityScore: evalResult.score, _eval: evalResult } };
      }

      case 'createGoal': {
        const goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0];
        const goalId = 'GOAL_' + String(Date.now()).slice(-6);
        
        const newGoal = {
          GoalID: goalId,
          UserID: user ? user.UserID : 'USR_001',
          GoalName: payload.goalName,
          Purpose: payload.purpose || 'Other',
          TargetAmount: Number(payload.targetAmount),
          CurrentSavings: Number(payload.currentSavings) || 0,
          MonthlySavingCapacity: Number(payload.monthlyCapacity),
          Deadline: payload.deadline,
          EmailAlert: payload.emailAlert !== false,
          CreatedDate: new Date().toISOString().split('T')[0]
        };

        const evalResult = SaveIQCalc.evaluateGoalReality(newGoal, user ? user.MonthlyIncome : 0);
        newGoal.Status = evalResult.status;
        newGoal.RealityScore = evalResult.score;

        goals.unshift(newGoal);
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(goals));

        // If initial savings > 0, log it in savings history
        if (newGoal.CurrentSavings > 0) {
          const savings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
          savings.unshift({
            SavingID: 'SAV_' + String(Date.now()).slice(-6),
            GoalID: goalId,
            Date: newGoal.CreatedDate,
            Amount: newGoal.CurrentSavings,
            Notes: 'Initial starting savings balance'
          });
          localStorage.setItem(this.STORAGE_SAVINGS_KEY, JSON.stringify(savings));
        }

        return { status: 'success', data: newGoal, message: 'Savings goal created successfully' };
      }

      case 'updateGoal': {
        const goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const index = goals.findIndex(g => g.GoalID === payload.goalId);
        if (index === -1) return { status: 'error', message: 'Goal not found' };
        
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0];
        const updated = { ...goals[index], ...payload };
        const evalResult = SaveIQCalc.evaluateGoalReality(updated, user ? user.MonthlyIncome : 0);
        updated.Status = evalResult.status;
        updated.RealityScore = evalResult.score;

        goals[index] = updated;
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(goals));
        return { status: 'success', data: updated, message: 'Goal updated successfully' };
      }

      case 'deleteGoal': {
        let goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        goals = goals.filter(g => g.GoalID !== payload.goalId);
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(goals));

        // Clean up associated savings
        let savings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        savings = savings.filter(s => s.GoalID !== payload.goalId);
        localStorage.setItem(this.STORAGE_SAVINGS_KEY, JSON.stringify(savings));

        return { status: 'success', message: 'Goal deleted successfully' };
      }

      case 'addSavings': {
        const goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const goalIndex = goals.findIndex(g => g.GoalID === payload.goalId);
        if (goalIndex === -1) return { status: 'error', message: 'Goal not found' };

        const goal = goals[goalIndex];
        const depositAmount = Number(payload.amount);
        const previousSavings = Number(goal.CurrentSavings);
        goal.CurrentSavings = previousSavings + depositAmount;

        // Log saving record
        const savings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        const savingRecord = {
          SavingID: 'SAV_' + String(Date.now()).slice(-6),
          GoalID: payload.goalId,
          Date: payload.date || new Date().toISOString().split('T')[0],
          Amount: depositAmount,
          Notes: payload.notes || 'Savings deposit'
        };
        savings.unshift(savingRecord);
        localStorage.setItem(this.STORAGE_SAVINGS_KEY, JSON.stringify(savings));

        // Re-evaluate goal
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0];
        const evalResult = SaveIQCalc.evaluateGoalReality(goal, user ? user.MonthlyIncome : 0);
        goal.Status = evalResult.status;
        goal.RealityScore = evalResult.score;
        goals[goalIndex] = goal;
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(goals));

        // Adaptive plan recalculation
        const adaptivePlan = SaveIQCalc.calculateAdaptivePlan(
          goal, 
          depositAmount, 
          goal.MonthlySavingCapacity
        );

        return { 
          status: 'success', 
          data: { goal, savingRecord, adaptivePlan },
          message: `₹${depositAmount.toLocaleString()} deposited to "${goal.GoalName}" successfully!` 
        };
      }

      case 'getSavingsHistory': {
        const savings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        const filtered = payload.goalId 
          ? savings.filter(s => s.GoalID === payload.goalId)
          : savings;
        return { status: 'success', data: filtered };
      }

      case 'getExpenses': {
        const expenses = JSON.parse(localStorage.getItem(this.STORAGE_EXPENSES_KEY) || '[]');
        return { status: 'success', data: expenses };
      }

      case 'addExpense': {
        const expenses = JSON.parse(localStorage.getItem(this.STORAGE_EXPENSES_KEY) || '[]');
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0];
        const newExpense = {
          ExpenseID: 'EXP_' + String(Date.now()).slice(-6),
          UserID: user ? user.UserID : 'USR_001',
          Date: payload.date || new Date().toISOString().split('T')[0],
          Category: payload.category || 'Other',
          Amount: Number(payload.amount),
          Notes: payload.notes || ''
        };
        expenses.unshift(newExpense);
        localStorage.setItem(this.STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
        return { status: 'success', data: newExpense, message: 'Expense recorded' };
      }

      case 'deleteExpense': {
        let expenses = JSON.parse(localStorage.getItem(this.STORAGE_EXPENSES_KEY) || '[]');
        expenses = expenses.filter(e => e.ExpenseID !== payload.expenseId);
        localStorage.setItem(this.STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
        return { status: 'success', message: 'Expense deleted' };
      }

      case 'getAlerts': {
        const alerts = JSON.parse(localStorage.getItem(this.STORAGE_ALERTS_KEY) || '[]');
        return { status: 'success', data: alerts };
      }

      case 'getDashboardData': {
        const user = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]')[0] || {};
        const goals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const expenses = JSON.parse(localStorage.getItem(this.STORAGE_EXPENSES_KEY) || '[]');
        const savings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        const alerts = JSON.parse(localStorage.getItem(this.STORAGE_ALERTS_KEY) || '[]');

        let totalTarget = 0;
        let totalSavings = 0;
        let activeGoalsCount = 0;
        let completedGoalsCount = 0;
        let atRiskGoalsCount = 0;
        let needsAdjustmentCount = 0;

        const evaluatedGoals = goals.map(g => {
          const evalRes = SaveIQCalc.evaluateGoalReality(g, user.MonthlyIncome || 0);
          totalTarget += Number(g.TargetAmount || 0);
          totalSavings += Number(g.CurrentSavings || 0);

          if (evalRes.status === 'Completed') completedGoalsCount++;
          else if (evalRes.status === 'At Risk') {
            activeGoalsCount++;
            atRiskGoalsCount++;
          } else if (evalRes.status === 'Needs Adjustment') {
            activeGoalsCount++;
            needsAdjustmentCount++;
          } else {
            activeGoalsCount++;
          }

          return { ...g, _eval: evalRes };
        });

        const overallProgress = totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 1000) / 10 : 0;
        const budgetAnalysis = SaveIQCalc.analyzeExpensesAndBudget(user.MonthlyIncome || 0, expenses);

        return {
          status: 'success',
          data: {
            user,
            kpis: {
              totalGoals: goals.length,
              activeGoals: activeGoalsCount,
              completedGoals: completedGoalsCount,
              atRiskGoals: atRiskGoalsCount,
              needsAdjustmentGoals: needsAdjustmentCount,
              totalTargetAmount: totalTarget,
              totalCurrentSavings: totalSavings,
              overallProgressPercent: overallProgress
            },
            goals: evaluatedGoals,
            recentSavings: savings.slice(0, 5),
            recentExpenses: expenses.slice(0, 5),
            recentAlerts: alerts.slice(0, 5),
            budgetAnalysis
          }
        };
      }

      default:
        return { status: 'error', message: `Unknown action: ${action}` };
    }
  }
};

// Initialize default storage immediately
SaveIQAPI.initStorage();
