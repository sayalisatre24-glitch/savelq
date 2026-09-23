/**
 * ==========================================================================
 * SaveIQ – AI Goal Reality & Smart Savings Planner
 * Google Apps Script Backend & Automation Engine
 * ==========================================================================
 * Database: Google Sheets (Users, Goals, Savings, Expenses, Notifications, Alerts)
 * AI: Groq AI API (via PropertiesService)
 * Email: Gmail / GmailApp Trigger Services
 * Auth: SHA-256 with Salt Security Engine
 */

// Global Sheet Table Names
const SHEETS = {
  USERS: 'Users',
  GOALS: 'Goals',
  SAVINGS: 'Savings',
  EXPENSES: 'Expenses',
  NOTIFICATIONS: 'Notifications',
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
    // Auth Operations
    case 'registerUser':
      return registerUser(payload);
    case 'loginUser':
      return loginUser(payload);
    case 'resetPassword':
      return resetPassword(payload);
    case 'getUser':
      return getUser(payload.userId);
    case 'updateUser':
      return updateUser(payload);

    // Goal Operations
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

    // Savings Operations
    case 'addSavings':
      return addSavings(payload);
    case 'getSavingsHistory':
      return getSavingsHistory(payload.goalId, payload.userId);

    // Expense Operations
    case 'addExpense':
      return addExpense(payload);
    case 'getExpenses':
      return getExpenses(payload.userId);
    case 'deleteExpense':
      return deleteExpense(payload.expenseId);

    // Notification Operations
    case 'getNotifications':
      return getNotifications(payload.userId);
    case 'markNotificationRead':
      return markNotificationRead(payload.notificationId);
    case 'markAllNotificationsRead':
      return markAllNotificationsRead(payload.userId);
    case 'deleteNotification':
      return deleteNotification(payload.notificationId);
    case 'scanNotifications':
    case 'scanAndSendNotifications':
      return scanAndSendNotifications(payload.userId);

    // Dashboard & AI
    case 'getAlerts':
      return getAlerts(payload.userId);
    case 'getDashboardData':
      return getDashboardData(payload.userId);
    case 'getAIRecommendation':
      return getAIRecommendation(payload);

    // Triggers & Maintenance
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
 * DATABASE / GOOGLE SHEETS HELPERS
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
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * ==========================================================================
 * AUTHENTICATION & SECURITY (SHA-256 HASH + SALT)
 * ==========================================================================
 */

function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function hashPassword(password, salt) {
  const raw = password + ':' + salt;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  let hash = '';
  for (let i = 0; i < digest.length; i++) {
    let byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    let hex = byteVal.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return hash;
}

/**
 * Register a new user
 */
function registerUser(payload) {
  const name = (payload.name || payload.Name || '').trim();
  const email = (payload.email || payload.Email || '').trim().toLowerCase();
  const password = payload.password || payload.Password || '';
  const income = Number(payload.monthlyIncome || payload.MonthlyIncome) || 0;
  const capacity = Number(payload.monthlyCapacity || payload.MonthlySavingCapacity) || 0;

  if (!name || !email || !password) {
    return { status: 'error', message: 'Name, email, and password are required.' };
  }

  if (password.length < 6) {
    return { status: 'error', message: 'Password must be at least 6 characters long.' };
  }

  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet);

  // Check if email already registered
  const existing = users.find(u => (u.Email || '').toLowerCase() === email);
  if (existing) {
    return { status: 'error', message: 'An account with this email address already exists. Please sign in.' };
  }

  const userId = 'USR_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const createdDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.appendRow([
    userId,
    name,
    email,
    passwordHash,
    salt,
    income,
    capacity,
    createdDate
  ]);

  const userSafe = {
    UserID: userId,
    Name: name,
    Email: email,
    MonthlyIncome: income,
    MonthlySavingCapacity: capacity,
    CreatedDate: createdDate
  };

  return {
    status: 'success',
    data: userSafe,
    message: 'Account registered successfully! Welcome to SaveIQ.'
  };
}

/**
 * Login user
 */
function loginUser(payload) {
  const email = (payload.email || payload.Email || '').trim().toLowerCase();
  const password = payload.password || payload.Password || '';

  if (!email || !password) {
    return { status: 'error', message: 'Please provide both email and password.' };
  }

  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet);

  const user = users.find(u => (u.Email || '').toLowerCase() === email);
  if (!user) {
    return { status: 'error', message: 'No account found with this email address.' };
  }

  const computedHash = hashPassword(password, user.Salt);
  if (computedHash !== user.PasswordHash) {
    return { status: 'error', message: 'Invalid password. Please check your credentials.' };
  }

  const userSafe = {
    UserID: user.UserID,
    Name: user.Name,
    Email: user.Email,
    MonthlyIncome: Number(user.MonthlyIncome) || 0,
    MonthlySavingCapacity: Number(user.MonthlySavingCapacity) || 0,
    CreatedDate: user.CreatedDate
  };

  return {
    status: 'success',
    data: userSafe,
    message: `Welcome back, ${user.Name}!`
  };
}

/**
 * Reset / Recover Password
 */
function resetPassword(payload) {
  const email = (payload.email || payload.Email || '').trim().toLowerCase();
  const newPassword = payload.newPassword || payload.NewPassword || '';

  if (!email || !newPassword) {
    return { status: 'error', message: 'Email and new password are required.' };
  }

  if (newPassword.length < 6) {
    return { status: 'error', message: 'New password must be at least 6 characters long.' };
  }

  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  let userFoundIndex = -1;
  let userName = '';

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase() === email) {
      userFoundIndex = i + 1;
      userName = data[i][1];
      break;
    }
  }

  if (userFoundIndex === -1) {
    return { status: 'error', message: 'No account found with this email address.' };
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);

  sheet.getRange(userFoundIndex, 4).setValue(newHash);
  sheet.getRange(userFoundIndex, 5).setValue(newSalt);

  // Send password reset confirmation email via Gmail
  try {
    GmailApp.sendEmail(
      email,
      'SaveIQ — Your Password Has Been Reset',
      `Hello ${userName},\n\nYour SaveIQ password was successfully reset. You can now log in with your new password.\n\n— SaveIQ Team`,
      {
        htmlBody: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; text-align: center; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px;">SaveIQ Security Alert</h2>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>Your SaveIQ account password was successfully updated. You can now sign in with your new password.</p>
              <p style="font-size: 13px; color: #64748b; margin-top: 20px;">If you did not make this change, please contact support immediately.</p>
            </div>
          </div>
        `
      }
    );
  } catch (err) {
    console.warn('Password reset email error:', err);
  }

  return {
    status: 'success',
    message: 'Password reset successfully! You can now log in.'
  };
}

/**
 * User Profile Operations
 */
function getUser(userId) {
  const sheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(sheet);
  const user = userId ? users.find(u => u.UserID === userId) : users[0];
  if (!user) return { status: 'error', message: 'User not found' };

  return {
    status: 'success',
    data: {
      UserID: user.UserID,
      Name: user.Name,
      Email: user.Email,
      MonthlyIncome: Number(user.MonthlyIncome) || 0,
      MonthlySavingCapacity: Number(user.MonthlySavingCapacity) || 0,
      CreatedDate: user.CreatedDate
    }
  };
}

function updateUser(payload) {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const userId = payload.UserID || payload.userId;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      if (payload.Name !== undefined) sheet.getRange(i + 1, 2).setValue(payload.Name);
      if (payload.Email !== undefined) sheet.getRange(i + 1, 3).setValue(payload.Email);
      if (payload.MonthlyIncome !== undefined) sheet.getRange(i + 1, 6).setValue(Number(payload.MonthlyIncome));
      if (payload.MonthlySavingCapacity !== undefined) sheet.getRange(i + 1, 7).setValue(Number(payload.MonthlySavingCapacity));
      return { status: 'success', message: 'User profile updated successfully' };
    }
  }

  return { status: 'error', message: 'User not found' };
}

/**
 * ==========================================================================
 * GOALS CRUD OPERATIONS (USER ISOLATED)
 * ==========================================================================
 */

function getGoals(userId) {
  const sheet = getSheet(SHEETS.GOALS);
  const goals = sheetToObjects(sheet);
  const filtered = userId ? goals.filter(g => g.UserID === userId) : goals;

  const userRes = getUser(userId);
  const userIncome = userRes.data ? userRes.data.MonthlyIncome : 0;

  const evaluated = filtered.map(g => {
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
  const userId = payload.UserID || payload.userId || 'USR_001';
  const createdDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const tempGoal = {
    TargetAmount: Number(payload.targetAmount || payload.TargetAmount),
    CurrentSavings: Number(payload.currentSavings || payload.CurrentSavings) || 0,
    MonthlySavingCapacity: Number(payload.monthlyCapacity || payload.MonthlySavingCapacity),
    Deadline: payload.deadline || payload.Deadline
  };

  const userRes = getUser(userId);
  const userIncome = userRes.data ? userRes.data.MonthlyIncome : 0;
  const evalRes = calculateGoalReality(tempGoal, userIncome);

  sheet.appendRow([
    goalId,
    userId,
    payload.goalName || payload.GoalName,
    payload.purpose || payload.Purpose || 'Other',
    tempGoal.TargetAmount,
    tempGoal.CurrentSavings,
    tempGoal.MonthlySavingCapacity,
    tempGoal.Deadline,
    evalRes.status,
    evalRes.score,
    payload.emailAlert !== false,
    createdDate
  ]);

  if (tempGoal.CurrentSavings > 0) {
    const savSheet = getSheet(SHEETS.SAVINGS);
    savSheet.appendRow([
      'SAV_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'),
      goalId,
      userId,
      createdDate,
      tempGoal.CurrentSavings,
      'Initial savings balance'
    ]);
  }

  // Check if initial goal qualifies for completion
  scanAndSendNotifications(userId);

  return {
    status: 'success',
    data: { GoalID: goalId, UserID: userId, ...payload, Status: evalRes.status, RealityScore: evalRes.score },
    message: 'Goal created successfully'
  };
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
      return { status: 'success', message: 'Goal updated successfully' };
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
      return { status: 'success', message: 'Goal deleted successfully' };
    }
  }

  return { status: 'error', message: 'Goal not found' };
}

/**
 * ==========================================================================
 * SAVINGS DEPOSIT OPERATIONS
 * ==========================================================================
 */

function addSavings(payload) {
  const savSheet = getSheet(SHEETS.SAVINGS);
  const savingId = 'SAV_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const dateStr = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const depositAmt = Number(payload.amount);
  const userId = payload.userId || payload.UserID || 'USR_001';

  savSheet.appendRow([
    savingId,
    payload.goalId,
    userId,
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

  // Trigger automated notification checks for this user
  scanAndSendNotifications(userId);

  return { status: 'success', message: `₹${depositAmt.toLocaleString()} deposited successfully!` };
}

function getSavingsHistory(goalId, userId) {
  const sheet = getSheet(SHEETS.SAVINGS);
  const records = sheetToObjects(sheet);
  let filtered = records;
  if (goalId) filtered = filtered.filter(r => r.GoalID === goalId);
  if (userId) filtered = filtered.filter(r => r.UserID === userId);
  return { status: 'success', data: filtered };
}

/**
 * ==========================================================================
 * EXPENSE OPERATIONS (USER ISOLATED)
 * ==========================================================================
 */

function addExpense(payload) {
  const sheet = getSheet(SHEETS.EXPENSES);
  const expId = 'EXP_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const dateStr = payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.appendRow([
    expId,
    payload.userId || payload.UserID || 'USR_001',
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
  const filtered = userId ? expenses.filter(e => e.UserID === userId) : expenses;
  return { status: 'success', data: filtered };
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

/**
 * ==========================================================================
 * NOTIFICATIONS DATABASE & MANAGEMENT
 * ==========================================================================
 * Schema: Notification ID | User ID | Email | Goal ID | Type | Message | Created At | Email Sent | Read
 */

function getNotifications(userId) {
  const sheet = getSheet(SHEETS.NOTIFICATIONS);
  const notifs = sheetToObjects(sheet);
  const filtered = userId ? notifs.filter(n => n.UserID === userId) : notifs;
  // Sort latest first
  filtered.sort((a, b) => new Date(b.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime());
  return { status: 'success', data: filtered };
}

function markNotificationRead(notificationId) {
  const sheet = getSheet(SHEETS.NOTIFICATIONS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === notificationId) {
      sheet.getRange(i + 1, 9).setValue(true);
      return { status: 'success', message: 'Notification marked as read' };
    }
  }
  return { status: 'error', message: 'Notification not found' };
}

function markAllNotificationsRead(userId) {
  const sheet = getSheet(SHEETS.NOTIFICATIONS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (!userId || data[i][1] === userId) {
      sheet.getRange(i + 1, 9).setValue(true);
    }
  }
  return { status: 'success', message: 'All notifications marked as read' };
}

function deleteNotification(notificationId) {
  const sheet = getSheet(SHEETS.NOTIFICATIONS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === notificationId) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Notification removed' };
    }
  }
  return { status: 'error', message: 'Notification not found' };
}

/**
 * ==========================================================================
 * AUTOMATED NOTIFICATION SCANNER & GMAIL INTEGRATION ENGINE
 * ==========================================================================
 * Scans goals and savings to trigger 4 notification events:
 * 1. Target Completed (Current Savings >= Target Amount)
 * 2. Higher Monthly Savings (Current month savings > average previous months)
 * 3. Deadline Reminder (Approaching deadline <= 30, 7, 1 days)
 * 4. Missed Monthly Target (Below planned monthly savings rate)
 */

function scanAndSendNotifications(targetUserId) {
  const usersSheet = getSheet(SHEETS.USERS);
  const users = sheetToObjects(usersSheet);
  const notifSheet = getSheet(SHEETS.NOTIFICATIONS);
  const existingNotifs = sheetToObjects(notifSheet);
  const goalsSheet = getSheet(SHEETS.GOALS);
  const allGoals = sheetToObjects(goalsSheet);
  const savingsSheet = getSheet(SHEETS.SAVINGS);
  const allSavings = sheetToObjects(savingsSheet);

  const targetUsers = targetUserId ? users.filter(u => u.UserID === targetUserId) : users;
  let notificationsCreated = 0;
  let emailsSent = 0;
  const now = new Date();
  const currentYearMonth = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');

  targetUsers.forEach(user => {
    const userId = user.UserID;
    const userEmail = user.Email;
    if (!userEmail) return;

    const userGoals = allGoals.filter(g => g.UserID === userId);
    const userSavings = allSavings.filter(s => s.UserID === userId || userGoals.some(g => g.GoalID === s.GoalID));

    // -------------------------------------------------------------
    // EVENT 1 & EVENT 3 & EVENT 4: Check per Goal
    // -------------------------------------------------------------
    userGoals.forEach(goal => {
      const evalRes = calculateGoalReality(goal, Number(user.MonthlyIncome) || 0);
      const target = Number(goal.TargetAmount) || 0;
      const current = Number(goal.CurrentSavings) || 0;
      const remaining = Math.max(0, target - current);
      const daysLeft = evalRes.daysRemaining;

      // Event 1 — Target Completed
      if (current >= target && target > 0) {
        const notifKey = `COMPLETED_${goal.GoalID}`;
        const alreadyExists = existingNotifs.some(n => n.GoalID === goal.GoalID && n.Type === 'Target Completed');
        if (!alreadyExists) {
          const notifId = 'NOTIF_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + Math.floor(Math.random()*1000);
          const message = `🎉 Congratulations! You have completed your ${goal.GoalName} savings goal.`;
          
          notifSheet.appendRow([
            notifId,
            userId,
            userEmail,
            goal.GoalID,
            'Target Completed',
            message,
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
            false,
            false
          ]);
          notificationsCreated++;

          // Send Gmail
          const sent = sendSaveIQGmail(userEmail, '🎉 SaveIQ — Savings Goal Completed', goal.GoalName, message, {
            targetAmount: target,
            savedAmount: current,
            type: 'Target Completed'
          });
          if (sent) {
            updateNotificationEmailSent(notifId);
            emailsSent++;
          }
        }
      }

      // Event 3 — Deadline Reminder (Approaching within 30, 7, or 1 days and not completed)
      if (remaining > 0 && (daysLeft <= 30 && daysLeft > 0)) {
        // Send deadline alert milestone at 30, 14, 7, 3, 1 days
        const reminderTag = daysLeft <= 1 ? '1d' : daysLeft <= 7 ? '7d' : daysLeft <= 14 ? '14d' : '30d';
        const alreadySent = existingNotifs.some(n => n.GoalID === goal.GoalID && n.Type === 'Deadline Reminder' && (n.Message || '').includes(reminderTag));
        
        if (!alreadySent) {
          const notifId = 'NOTIF_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + Math.floor(Math.random()*1000);
          const message = `⏰ Your ${goal.GoalName} deadline is approaching (${daysLeft} days left [${reminderTag}]). ₹${remaining.toLocaleString()} is still remaining.`;
          
          notifSheet.appendRow([
            notifId,
            userId,
            userEmail,
            goal.GoalID,
            'Deadline Reminder',
            message,
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
            false,
            false
          ]);
          notificationsCreated++;

          const sent = sendSaveIQGmail(userEmail, `⏰ SaveIQ — ${goal.GoalName} Deadline Approaching`, goal.GoalName, message, {
            targetAmount: target,
            savedAmount: current,
            remainingAmount: remaining,
            daysRemaining: daysLeft,
            type: 'Deadline Reminder'
          });
          if (sent) {
            updateNotificationEmailSent(notifId);
            emailsSent++;
          }
        }
      }

      // Event 4 — Missed Monthly Target
      if (remaining > 0 && evalRes.status === 'At Risk' && daysLeft > 0) {
        const requiredSaving = evalRes.requiredMonthlySaving;
        const capacity = evalRes.monthlyCapacity;
        const deficit = Math.max(0, requiredSaving - capacity);
        
        const missedMonthKey = `MISSED_${goal.GoalID}_${currentYearMonth}`;
        const alreadySentThisMonth = existingNotifs.some(n => n.GoalID === goal.GoalID && n.Type === 'Missed Monthly Target' && (n.CreatedAt || '').startsWith(currentYearMonth));

        if (!alreadySentThisMonth && deficit > 0) {
          const notifId = 'NOTIF_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + Math.floor(Math.random()*1000);
          const message = `⚠️ You are ₹${deficit.toLocaleString()} below your planned monthly savings target for "${goal.GoalName}".`;
          
          notifSheet.appendRow([
            notifId,
            userId,
            userEmail,
            goal.GoalID,
            'Missed Monthly Target',
            message,
            Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
            false,
            false
          ]);
          notificationsCreated++;

          const sent = sendSaveIQGmail(userEmail, `⚠️ SaveIQ — Monthly Savings Target Alert for ${goal.GoalName}`, goal.GoalName, message, {
            targetAmount: target,
            savedAmount: current,
            requiredMonthly: requiredSaving,
            deficit: deficit,
            type: 'Missed Monthly Target'
          });
          if (sent) {
            updateNotificationEmailSent(notifId);
            emailsSent++;
          }
        }
      }
    });

    // -------------------------------------------------------------
    // EVENT 2: Higher Monthly Savings Check
    // -------------------------------------------------------------
    const currentMonthDeposits = userSavings.filter(s => (s.Date || '').startsWith(currentYearMonth));
    const currentMonthTotal = currentMonthDeposits.reduce((sum, s) => sum + (Number(s.Amount) || 0), 0);

    // Calculate previous months average
    const previousDeposits = userSavings.filter(s => !(s.Date || '').startsWith(currentYearMonth));
    const previousMonthMap = {};
    previousDeposits.forEach(s => {
      const ym = (s.Date || '').substring(0, 7);
      if (ym) previousMonthMap[ym] = (previousMonthMap[ym] || 0) + (Number(s.Amount) || 0);
    });
    const prevMonthCounts = Object.keys(previousMonthMap).length;
    const prevAvg = prevMonthCounts > 0 
      ? Object.values(previousMonthMap).reduce((a, b) => a + b, 0) / prevMonthCounts 
      : Number(user.MonthlySavingCapacity) || 10000;

    if (currentMonthTotal > 0 && currentMonthTotal >= prevAvg * 1.25) {
      const milestoneKey = `HIGHER_SAVINGS_${currentYearMonth}`;
      const alreadyNotified = existingNotifs.some(n => n.UserID === userId && n.Type === 'Higher Monthly Savings' && (n.CreatedAt || '').startsWith(currentYearMonth));

      if (!alreadyNotified) {
        const notifId = 'NOTIF_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '_' + Math.floor(Math.random()*1000);
        const message = `👏 Great job! You saved ₹${currentMonthTotal.toLocaleString()} this month, which is higher than your usual monthly savings.`;

        notifSheet.appendRow([
          notifId,
          userId,
          userEmail,
          'ALL_GOALS',
          'Higher Monthly Savings',
          message,
          Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
          false,
          false
        ]);
        notificationsCreated++;

        const sent = sendSaveIQGmail(userEmail, '👏 SaveIQ — Monthly Savings Milestone Reached!', 'Monthly Savings Velocity', message, {
          savedThisMonth: currentMonthTotal,
          previousAverage: Math.round(prevAvg),
          type: 'Higher Monthly Savings'
        });
        if (sent) {
          updateNotificationEmailSent(notifId);
          emailsSent++;
        }
      }
    }
  });

  return {
    status: 'success',
    notificationsCreated,
    emailsSent,
    message: `Scan complete: ${notificationsCreated} new notifications generated, ${emailsSent} Gmail alerts sent.`
  };
}

function updateNotificationEmailSent(notificationId) {
  const sheet = getSheet(SHEETS.NOTIFICATIONS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === notificationId) {
      sheet.getRange(i + 1, 8).setValue(true);
      break;
    }
  }
}

/**
 * ==========================================================================
 * GMAIL SENDER & BRANDED HTML EMAIL TEMPLATES
 * ==========================================================================
 */

function sendSaveIQGmail(toEmail, subject, goalName, mainMessage, meta) {
  try {
    const htmlBody = `
      <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0891b2 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
          <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">SaveIQ</div>
          <div style="font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">AI Goal & Savings Intelligence</div>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px 24px; color: #1e293b;">
          <div style="display: inline-block; background: #ede9fe; color: #6d28d9; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 12px;">
            ${meta.type || 'Goal Notification'}
          </div>

          <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
            ${goalName}
          </h2>

          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
            ${mainMessage}
          </p>

          <!-- Relevant Financial Metrics Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            ${meta.targetAmount ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                <span style="color: #64748b;">Target Amount:</span>
                <strong style="color: #0f172a;">₹${Number(meta.targetAmount).toLocaleString()}</strong>
              </div>
            ` : ''}
            ${meta.savedAmount !== undefined ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                <span style="color: #64748b;">Saved Amount:</span>
                <strong style="color: #10b981;">₹${Number(meta.savedAmount).toLocaleString()}</strong>
              </div>
            ` : ''}
            ${meta.remainingAmount !== undefined ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                <span style="color: #64748b;">Remaining to Target:</span>
                <strong style="color: #0891b2;">₹${Number(meta.remainingAmount).toLocaleString()}</strong>
              </div>
            ` : ''}
            ${meta.savedThisMonth !== undefined ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px;">
                <span style="color: #64748b;">This Month's Savings:</span>
                <strong style="color: #4f46e5;">₹${Number(meta.savedThisMonth).toLocaleString()}</strong>
              </div>
            ` : ''}
            ${meta.deficit !== undefined ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #ef4444;">Monthly Target Deficit:</span>
                <strong style="color: #ef4444;">₹${Number(meta.deficit).toLocaleString()}</strong>
              </div>
            ` : ''}
          </div>

          <p style="font-size: 14px; color: #475569; font-weight: 500;">
            Keep up the great saving habit!
          </p>

          <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: #94a3b8;">
              Date: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMM dd, yyyy HH:mm')}
            </span>
            <span style="font-size: 12px; font-weight: 600; color: #4f46e5;">
              — SaveIQ
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          This automated alert was dispatched by SaveIQ AI Financial Planner.
        </div>
      </div>
    `;

    GmailApp.sendEmail(toEmail, subject, mainMessage, {
      htmlBody: htmlBody
    });

    // Record in Alerts table for audit
    const alertSheet = getSheet(SHEETS.ALERTS);
    alertSheet.appendRow([
      'ALT_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'),
      goalName,
      toEmail,
      meta.type || 'Alert',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      'Sent'
    ]);

    return true;
  } catch (err) {
    console.warn('[SaveIQ Gmail] Error sending email to ' + toEmail + ':', err);
    return false;
  }
}

/**
 * Legacy check for cron daily trigger
 */
function checkGoalDeadlines() {
  return scanAndSendNotifications();
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
 * DASHBOARD SUMMARY
 * ==========================================================================
 */

function getDashboardData(userId) {
  const user = getUser(userId).data || {};
  const goals = getGoals(userId).data || [];
  const expenses = getExpenses(userId).data || [];
  const savings = getSavingsHistory(null, userId).data || [];
  const notifs = getNotifications(userId).data || [];

  return {
    status: 'success',
    data: {
      user,
      goals,
      recentSavings: savings.slice(0, 5),
      recentExpenses: expenses.slice(0, 5),
      recentNotifications: notifs.slice(0, 5)
    }
  };
}

/**
 * ==========================================================================
 * GROQ AI API INTEGRATION
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
 * ONE-CLICK DATABASE INITIALIZATION (6 TABLES)
 * ==========================================================================
 */

function setupDatabase() {
  const ss = getSpreadsheet();

  // 1. Users Sheet
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEETS.USERS);
    usersSheet.appendRow(['UserID', 'Name', 'Email', 'PasswordHash', 'Salt', 'MonthlyIncome', 'MonthlySavingCapacity', 'CreatedDate']);
    usersSheet.getRange('A1:H1').setBackground('#1e1b4b').setFontColor('#ffffff').setFontWeight('bold');
    
    // Seed default user (Password: SaveIQ@2026)
    const salt = generateSalt();
    const hash = hashPassword('SaveIQ@2026', salt);
    usersSheet.appendRow(['USR_001', 'Aarav Sharma', Session.getActiveUser().getEmail() || 'aarav.sharma@example.com', hash, salt, 75000, 20000, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')]);
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
    savSheet.appendRow(['SavingID', 'GoalID', 'UserID', 'Date', 'Amount', 'Notes']);
    savSheet.getRange('A1:F1').setBackground('#164e63').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 4. Expenses Sheet
  let expSheet = ss.getSheetByName(SHEETS.EXPENSES);
  if (!expSheet) {
    expSheet = ss.insertSheet(SHEETS.EXPENSES);
    expSheet.appendRow(['ExpenseID', 'UserID', 'Date', 'Category', 'Amount', 'Notes']);
    expSheet.getRange('A1:F1').setBackground('#713f12').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 5. Notifications Sheet
  let notifSheet = ss.getSheetByName(SHEETS.NOTIFICATIONS);
  if (!notifSheet) {
    notifSheet = ss.insertSheet(SHEETS.NOTIFICATIONS);
    notifSheet.appendRow(['NotificationID', 'UserID', 'Email', 'GoalID', 'Type', 'Message', 'CreatedAt', 'EmailSent', 'Read']);
    notifSheet.getRange('A1:I1').setBackground('#312e81').setFontColor('#ffffff').setFontWeight('bold');
  }

  // 6. Alerts Sheet (Audit Log)
  let alertSheet = ss.getSheetByName(SHEETS.ALERTS);
  if (!alertSheet) {
    alertSheet = ss.insertSheet(SHEETS.ALERTS);
    alertSheet.appendRow(['AlertID', 'GoalID', 'RecipientEmail', 'AlertType', 'SentDate', 'Status']);
    alertSheet.getRange('A1:F1').setBackground('#4c0519').setFontColor('#ffffff').setFontWeight('bold');
  }

  return { status: 'success', message: 'All 6 database sheets configured successfully with Authentication and Notifications!' };
}
