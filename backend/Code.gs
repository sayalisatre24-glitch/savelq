/**
 * ==========================================================================
 * SaveIQ – AI Goal Reality & Smart Savings Planner
 * Google Apps Script Backend & Automation Engine
 * ==========================================================================
 * Database: Google Sheets (Users, Goals, Savings, Expenses, Alerts)
 * AI: Groq AI API (via PropertiesService)
 * Email: Gmail / GmailApp Trigger Services
 */

// Global Sheet Table Names
const SHEETS = {
  USERS: 'Users',
  GOALS: 'Goals',
  SAVINGS: 'Savings',
  EXPENSES: 'Expenses',
  ALERTS: 'Alerts'
};

/**
 * HTTP GET Endpoint
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getDashboardData';
    const params = e && e.parameter ? e.parameter : {};
    const result = handleAction(action, params);
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * HTTP POST Endpoint
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    const action = payload.action || 'getDashboardData';
    const result = handleAction(action, payload);
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Helper to build CORS-enabled JSON output
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main Action Router
 */
function handleAction(action, payload) {
  switch (action) {
    case 'getUser':
      return getUser(payload.userId);
    case 'updateUser':
      return updateUser(payload);
    case 'getGoals':
      return getGoals(payload.userId);
    case 'getGoalById':
      return getGoalById(payload.goalId);
    case 'createGoal':
      return createGoal(payload);
    case 'updateGoal':
      return updateGoal(payload);
    case 'deleteGoal':
      return deleteGoal(payload.goalId);
    case 'addSavings':
      return addSavings(payload);
    case 'getSavingsHistory':
      return getSavingsHistory(payload.goalId);
    case 'addExpense':
      return addExpense(payload);
    case 'getExpenses':
      return getExpenses(payload.userId);
    case 'deleteExpense':
      return deleteExpense(payload.expenseId);
    case 'getAlerts':
      return getAlerts(payload.userId);
    case 'getDashboardData':
      return getDashboardData(payload.userId);
    case 'getAIRecommendation':
      return getAIRecommendation(payload);
    case 'checkGoalDeadlines':
      return checkGoalDeadlines();
    case 'setupDatabase':
      return setupDatabase();
    default:
      return { status: 'error', message: 'Unknown action: ' + action };
  }
}

/**
 * ==========================================================================
 * DATABASE / GOOGLE SHEETS CRUD OPERATIONS
 * ==========================================================================
 */

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    setupDatabase();
    sheet = ss.getSheetByName(sheetName);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * User Operations
 */
function getUser(userId) {
  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet);
  const user = userId ? users.find(u => u.UserID === userId) : users[0];
  return { status: 'success', data: user || null };
}

function updateUser(payload) {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const userId = payload.UserID || (data.length > 1 ? data[1][0] : 'USR_001');

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      if (payload.Name !== undefined) sheet.getRange(i + 1, 2).setValue(payload.Name);
      if (payload.Email !== undefined) sheet.getRange(i + 1, 3).setValue(payload.Email);
      if (payload.MonthlyIncome !== undefined) sheet.getRange(i + 1, 4).setValue(Number(payload.MonthlyIncome));
      if (payload.MonthlySavingCapacity !== undefined) sheet.getRange(i + 1, 5).setValue(Number(payload.MonthlySavingCapacity));
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([
      userId,
      payload.Name || 'User',
      payload.Email || '',
      Number(payload.MonthlyIncome) || 0,
      Number(payload.MonthlySavingCapacity) || 0,
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')
    ]);
  }

  return { status: 'success', message: 'User profile updated' };
}

/**
 * Goal Operations
 */
function getGoals(userId) {
  const sheet = getSheet(SHEETS.GOALS);
  const goals = sheetToObjects(sheet);
  const userRes = getUser(userId);
  const userIncome = userRes.data ? userRes.data.MonthlyIncome : 0;

  const evaluated = goals.map(g => {
    const evalRes = calculateGoalReality(g, userIncome);
    return {
      ...g,
      Status: evalRes.status,
      RealityScore: evalRes.score,
      _eval: evalRes
    };
  });

  return { status: 'success', data: evaluated };
}

function getGoalById(goalId) {
  const sheet = getSheet(SHEETS.GOALS);
  const goals = sheetToObjects(sheet);
  const goal = goals.find(g => g.GoalID === goalId);
  if (!goal) return { status: 'error', message: 'Goal not found' };

  const userRes = getUser(goal.UserID);
  const userIncome = userRes.data ? userRes.data.MonthlyIncome : 0;
  const evalRes = calculateGoalReality(goal, userIncome);

  return { status: 'success', data: { ...goal, Status: evalRes.status, RealityScore: evalRes.score, _eval: evalRes } };
}

function createGoal(payload) {
  const sheet = getSheet(SHEETS.GOALS);
  const goalId = 'GOAL_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const userId = payload.UserID || 'USR_001';
  const createdDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const tempGoal = {
    TargetAmount: Number(payload.targetAmount),
    CurrentSavings: Number(payload.currentSavings) || 0,
    MonthlySavingCapacity: Number(payload.monthlyCapacity),
    Deadline: payload.deadline
  };

  const userRes = getUser(userId);
  const userIncome = userRes.data ? userRes.data.MonthlyIncome : 0;
  const evalRes = calculateGoalReality(tempGoal, userIncome);

  sheet.appendRow([
    goalId,
    userId,
    payload.goalName,
    payload.purpose || 'Other',
    Number(payload.targetAmount),
    Number(payload.currentSavings) || 0,
    Number(payload.monthlyCapacity),
    payload.deadline,
    evalRes.status,
    evalRes.score,
    payload.emailAlert !== false,
    createdDate
  ]);

  // If initial savings > 0, log to Savings table
  if (tempGoal.CurrentSavings > 0) {
    const savSheet = getSheet(SHEETS.SAVINGS);
    savSheet.appendRow([
      'SAV_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'),
      goalId,
      createdDate,
      tempGoal.CurrentSavings,
      'Initial savings balance'
    ]);
  }

  return { status: 'success', data: { GoalID: goalId, ...payload, Status: evalRes.status, RealityScore: evalRes.score }, message: 'Goal created' };
}

function updateGoal(payload) {
  const sheet = getSheet(SHEETS.GOALS);
  const data = sheet.getDataRange().getValues();
  const goalId = payload.goalId || payload.GoalID;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === goalId) {
      if (payload.GoalName !== undefined) sheet.getRange(i + 1, 3).setValue(payload.GoalName);
      if (payload.Purpose !== undefined) sheet.getRange(i + 1, 4).setValue(payload.Purpose);
      if (payload.TargetAmount !== undefined) sheet.getRange(i + 1, 5).setValue(Number(payload.TargetAmount));
      if (payload.CurrentSavings !== undefined) sheet.getRange(i + 1, 6).setValue(Number(payload.CurrentSavings));
      if (payload.MonthlySavingCapacity !== undefined) sheet.getRange(i + 1, 7).setValue(Number(payload.MonthlySavingCapacity));
      if (payload.Deadline !== undefined) sheet.getRange(i + 1, 8).setValue(payload.Deadline);
      if (payload.Status !== undefined) sheet.getRange(i + 1, 9).setValue(payload.Status);
      if (payload.RealityScore !== undefined) sheet.getRange(i + 1, 10).setValue(payload.RealityScore);
      if (payload.EmailAlert !== undefined) sheet.getRange(i + 1, 11).setValue(payload.EmailAlert);
      return { status: 'success', message: 'Goal updated' };
    }
  }

  return { status: 'error', message: 'Goal not found' };
}

function deleteGoal(goalId) {
  const sheet = getSheet(SHEETS.GOALS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === goalId) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Goal deleted' };
    }
  }

  return { status: 'error', message: 'Goal not found' };
}

/**
 * Savings Deposit Operations
 */
function addSavings(payload) {
  const savSheet = getSheet(SHEETS.SAVINGS);
  const savingId = 'SAV_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const dateStr = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const depositAmt = Number(payload.amount);

  savSheet.appendRow([
    savingId,
    payload.goalId,
    dateStr,
    depositAmt,
    payload.notes || 'Savings deposit'
  ]);

  // Update goal current savings
  const goalsSheet = getSheet(SHEETS.GOALS);
  const data = goalsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.goalId) {
      const current = Number(data[i][5]) || 0;
      const newTotal = current + depositAmt;
      goalsSheet.getRange(i + 1, 6).setValue(newTotal);
      break;
    }
  }

  return { status: 'success', message: 'Deposit logged successfully' };
}

function getSavingsHistory(goalId) {
  const sheet = getSheet(SHEETS.SAVINGS);
  const records = sheetToObjects(sheet);
  const filtered = goalId ? records.filter(r => r.GoalID === goalId) : records;
  return { status: 'success', data: filtered };
}

/**
 * Expense Operations
 */
function addExpense(payload) {
  const sheet = getSheet(SHEETS.EXPENSES);
  const expId = 'EXP_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const dateStr = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.appendRow([
    expId,
    payload.userId || 'USR_001',
    dateStr,
    payload.category || 'Other',
    Number(payload.amount),
    payload.notes || ''
  ]);

  return { status: 'success', message: 'Expense added' };
}

function getExpenses(userId) {
  const sheet = getSheet(SHEETS.EXPENSES);
  const expenses = sheetToObjects(sheet);
  return { status: 'success', data: expenses };
}

function deleteExpense(expenseId) {
  const sheet = getSheet(SHEETS.EXPENSES);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === expenseId) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Expense deleted' };
    }
  }
  return { status: 'error', message: 'Expense not found' };
}

function getAlerts(userId) {
  const sheet = getSheet(SHEETS.ALERTS);
  const alerts = sheetToObjects(sheet);
  return { status: 'success', data: alerts };
}

/**
 * Dashboard Summary
 */
function getDashboardData(userId) {
  const user = getUser(userId).data || {};
  const goals = getGoals(userId).data || [];
  const expenses = getExpenses(userId).data || [];
  const savings = getSavingsHistory().data || [];
  const alerts = getAlerts(userId).data || [];

  return {
    status: 'success',
    data: {
      user,
      goals,
      recentSavings: savings.slice(-5),
      recentExpenses: expenses.slice(-5),
      recentAlerts: alerts.slice(-5)
    }
  };
}

/**
 * ==========================================================================
 * DETERMINISTIC FINANCIAL CALCULATION ENGINE
 * ==========================================================================
 */

function calculateGoalReality(goal, userIncome) {
  const target = Math.max(0, Number(goal.TargetAmount || goal.targetAmount) || 0);
  const current = Math.max(0, Number(goal.CurrentSavings || goal.currentSavings) || 0);
  const capacity = Math.max(0, Number(goal.MonthlySavingCapacity || goal.monthlyCapacity) || 0);
  const deadline = new Date(goal.Deadline || goal.deadline);
  const now = new Date();

  const remainingAmount = Math.max(0, target - current);
  const progressPercent = target > 0 ? Math.min(100, Math.round((current / target) * 1000) / 10) : 100;

  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const monthsRemaining = Math.max(0.1, Math.round((daysRemaining / 30.4375) * 100) / 100);

  let requiredMonthlySaving = 0;
  if (remainingAmount > 0) {
    requiredMonthlySaving = monthsRemaining > 0 ? Math.round((remainingAmount / monthsRemaining) * 100) / 100 : remainingAmount;
  }

  const capacityRatio = requiredMonthlySaving > 0 ? (capacity / requiredMonthlySaving) : 1.0;

  let status = 'On Track';
  let statusClass = 'badge-on-track';

  if (current >= target && target > 0) {
    status = 'Completed';
    statusClass = 'badge-completed';
  } else if (daysRemaining === 0 && remainingAmount > 0) {
    status = 'At Risk';
    statusClass = 'badge-at-risk';
  } else if (capacityRatio >= 1.0) {
    status = 'On Track';
    statusClass = 'badge-on-track';
  } else if (capacityRatio >= 0.7) {
    status = 'Needs Adjustment';
    statusClass = 'badge-needs-adjustment';
  } else {
    status = 'At Risk';
    statusClass = 'badge-at-risk';
  }

  // 0-100 Reality Score Calculation
  const progressScore = Math.min(30, Math.round((progressPercent / 100) * 30));
  let capacityScore = requiredMonthlySaving <= 0 ? 45 : Math.min(45, Math.round(Math.min(1.0, capacityRatio) * 45));
  let timeScore = monthsRemaining >= 6 ? 15 : monthsRemaining >= 3 ? 12 : monthsRemaining >= 1 ? 8 : 4;
  let budgetScore = 8;
  if (userIncome > 0 && capacity > 0) {
    const ratio = capacity / userIncome;
    budgetScore = ratio <= 0.35 ? 10 : ratio <= 0.5 ? 7 : ratio <= 0.7 ? 4 : 1;
  }

  const score = current >= target && target > 0 ? 100 : Math.min(100, Math.max(0, progressScore + capacityScore + timeScore + budgetScore));

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
    score
  };
}

/**
 * ==========================================================================
 * GROQ AI API INTEGRATION (Server-Side)
 * ==========================================================================
 */

function getAIRecommendation(payload) {
  const scriptProps = PropertiesService.getScriptProperties();
  const groqApiKey = scriptProps.getProperty('GROQ_API_KEY');

  if (!groqApiKey) {
    return {
      status: 'success',
      data: {
        recommendation: "Groq API Key is not configured in Script Properties. Please add `GROQ_API_KEY` under Project Settings > Script Properties in Google Apps Script.",
        source: 'system'
      }
    };
  }

  let prompt = '';
  if (payload.type === 'goal_evaluation') {
    const g = payload.goalData;
    prompt = `You are SaveIQ Financial Advisor. Based on this deterministic calculation:
Goal: ${g.name} (${g.purpose})
Target: ₹${g.targetAmount}
Current Savings: ₹${g.currentSavings} (Remaining: ₹${g.remainingAmount})
Required Monthly Saving: ₹${g.requiredMonthlySaving}
User Monthly Saving Capacity: ₹${g.monthlyCapacity}
Months Remaining: ${g.monthsRemaining} (${g.daysRemaining} days)
Calculated Status: ${g.status}
Calculated Goal Reality Score: ${g.score}/100

Explain this situation in clear, motivating language and provide 2-3 practical ways to optimize this goal. Keep response concise with markdown bullet points. Do not recalculate math.`;
  } else if (payload.type === 'what_if_analysis') {
    prompt = `You are SaveIQ Financial Advisor. Compare these two plans for "${payload.goalName}":
Original: Target ₹${payload.base.targetAmount}, Req ₹${payload.base.requiredMonthlySaving}/mo, Score ${payload.base.score}/100.
Simulated: Target ₹${payload.simulated.targetAmount}, Req ₹${payload.simulated.requiredMonthlySaving}/mo, Score ${payload.simulated.score}/100.
Provide a concise comparison and actionable recommendation.`;
  } else {
    prompt = `You are SaveIQ Financial Advisor. Answer this user query: "${payload.query || 'How do I optimize savings?'}" concisely with actionable tips.`;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + groqApiKey
      },
      payload: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are SaveIQ AI, an empathetic, precise personal finance advisor. Respond with crisp markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 600
      }),
      muteHttpExceptions: true
    });

    const json = JSON.parse(response.getContentText());
    if (json.choices && json.choices.length > 0) {
      return {
        status: 'success',
        data: { recommendation: json.choices[0].message.content, source: 'groq' }
      };
    } else {
      return { status: 'error', message: json.error ? json.error.message : 'Groq API error' };
    }
  } catch (err) {
    return { status: 'error', message: 'Failed to connect to Groq AI: ' + err.toString() };
  }
}

/**
 * ==========================================================================
 * AUTOMATED GMAIL ALERT SERVICE & DAILY TRIGGER
 * ==========================================================================
 */

function checkGoalDeadlines() {
  const goalsSheet = getSheet(SHEETS.GOALS);
  const goals = sheetToObjects(goalsSheet);
  const user = getUser().data || { Email: Session.getActiveUser().getEmail() };
  const userEmail = user.Email || Session.getActiveUser().getEmail();

  if (!userEmail) return { status: 'skipped', message: 'No user email configured' };

  let alertsSent = 0;
  const now = new Date();

  goals.forEach(goal => {
    if (goal.EmailAlert === false || goal.EmailAlert === 'false') return;

    const evalRes = calculateGoalReality(goal, user.MonthlyIncome || 0);
    const daysLeft = evalRes.daysRemaining;

    // Condition 1: Goal Completed Alert
    if (evalRes.status === 'Completed' && evalRes.currentSavings >= evalRes.targetAmount) {
      sendGoalReminder(
        userEmail,
        goal.GoalName,
        `Congratulations! You have reached 100% of your target savings for "${goal.GoalName}" (₹${evalRes.currentSavings.toLocaleString()} saved).`,
        daysLeft,
        100,
        'Goal Completed'
      );
      alertsSent++;
    }
    // Condition 2: Approaching Deadline (30 days or 7 days)
    else if (daysLeft === 30 || daysLeft === 7 || daysLeft === 1) {
      sendGoalReminder(
        userEmail,
        goal.GoalName,
        `Your savings goal "${goal.GoalName}" has only ${daysLeft} days remaining. Current progress: ₹${evalRes.currentSavings.toLocaleString()} / ₹${evalRes.targetAmount.toLocaleString()}. Required monthly rate is ₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo.`,
        daysLeft,
        evalRes.progressPercent,
        'Deadline Approaching'
      );
      alertsSent++;
    }
    // Condition 3: At-Risk Status Shift
    else if (evalRes.status === 'At Risk' && daysLeft > 0) {
      sendGoalReminder(
        userEmail,
        goal.GoalName,
        `Your savings goal "${goal.GoalName}" is currently marked AT RISK (Reality Score: ${evalRes.score}/100). Your monthly required saving is ₹${evalRes.requiredMonthlySaving.toLocaleString()}, exceeding your capacity of ₹${evalRes.monthlyCapacity.toLocaleString()}. Please review your alternative plans.`,
        daysLeft,
        evalRes.progressPercent,
        'Goal At Risk'
      );
      alertsSent++;
    }
  });

  return { status: 'success', alertsSent };
}

/**
 * HTML Email Sender
 */
function sendGoalReminder(toEmail, goalName, message, daysRemaining, progressPercent, alertType) {
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
      <div style="background: linear-gradient(135deg, #6366f1, #06b6d4); padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px;">SaveIQ Alert</h1>
        <p style="margin: 4px 0 0 0; color: #e0e7ff; font-size: 14px;">${alertType}</p>
      </div>
      <div style="padding: 24px;">
        <h2 style="margin-top: 0; color: #38bdf8; font-size: 18px;">${goalName}</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">${message}</p>
        
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #94a3b8; margin-bottom: 6px;">
            <span>Progress: ${progressPercent}%</span>
            <span>${daysRemaining} Days Left</span>
          </div>
          <div style="width: 100%; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
            <div style="width: ${progressPercent}%; height: 100%; background: #10b981;"></div>
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center;">
          Sent automatically by SaveIQ AI Goal Reality Planner.
        </p>
      </div>
    </div>
  `;

  GmailApp.sendEmail(toEmail, `SaveIQ Alert: ${alertType} for "${goalName}"`, message, {
    htmlBody: htmlBody
  });

  // Log alert to Alerts Sheet
  const alertSheet = getSheet(SHEETS.ALERTS);
  alertSheet.appendRow([
    'ALT_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'),
    goalName,
    toEmail,
    alertType,
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    'Sent'
  ]);
}

/**
 * ==========================================================================
 * ONE-CLICK DATABASE INITIALIZATION
 * ==========================================================================
 */

function setupDatabase() {
  const ss = getSpreadsheet();

  // 1. Users Sheet
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    usersSheet.appendRow(['UserID', 'Name', 'Email', 'MonthlyIncome', 'MonthlySavingCapacity', 'CreatedDate']);
    usersSheet.getRange('A1:F1').setBackground('#1e1b4b').setFontColor('#ffffff').setFontWeight('bold');
    usersSheet.appendRow(['USR_001', 'Aarav Sharma', Session.getActiveUser().getEmail(), 75000, 20000, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')]);
  }

  // 2. Goals Sheet
  let goalsSheet = ss.getSheetByName(SHEETS.GOALS);
  if (!goalsSheet) {
    goalsSheet = ss.insertSheet(SHEETS.GOALS);
    goalsSheet.appendRow(['GoalID', 'UserID', 'GoalName', 'Purpose', 'TargetAmount', 'CurrentSavings', 'MonthlySavingCapacity', 'Deadline', 'Status', 'RealityScore', 'EmailAlert', 'CreatedDate']);
    goalsSheet.getRange('A1:L1').setBackground('#064e3b').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 3. Savings Sheet
  let savSheet = ss.getSheetByName(SHEETS.SAVINGS);
  if (!savSheet) {
    savSheet = ss.insertSheet(SHEETS.SAVINGS);
    savSheet.appendRow(['SavingID', 'GoalID', 'Date', 'Amount', 'Notes']);
    savSheet.getRange('A1:E1').setBackground('#164e63').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 4. Expenses Sheet
  let expSheet = ss.getSheetByName(SHEETS.EXPENSES);
  if (!expSheet) {
    expSheet = ss.insertSheet(SHEETS.EXPENSES);
    expSheet.appendRow(['ExpenseID', 'UserID', 'Date', 'Category', 'Amount', 'Notes']);
    expSheet.getRange('A1:F1').setBackground('#713f12').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 5. Alerts Sheet
  let alertSheet = ss.getSheetByName(SHEETS.ALERTS);
  if (!alertSheet) {
    alertSheet = ss.insertSheet(SHEETS.ALERTS);
    alertSheet.appendRow(['AlertID', 'GoalID', 'UserID', 'AlertType', 'SentDate', 'Status']);
    alertSheet.getRange('A1:F1').setBackground('#4c0519').setFontColor('#ffffff').setFontWeight('bold');
  }

  return { status: 'success', message: 'All 5 database sheets configured successfully!' };
}
