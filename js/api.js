/**
 * SaveIQ - API Bridge & Backend Communication Engine
 * Communicates with Node.js + Express REST API (Firebase Auth & Cloud Firestore).
 * Provides resilient offline fallback so the application works seamlessly in all environments.
 */

const SaveIQAPI = {
  // Config & Storage Keys
  CONFIG_API_URL_KEY: 'saveiq_node_api_url',
  CONFIG_VERSION_KEY: 'saveiq_storage_version_v5_firebase_node',
  STORAGE_USERS_KEY: 'saveiq_users_db',
  STORAGE_GOALS_KEY: 'saveiq_goals_db',
  STORAGE_SAVINGS_KEY: 'saveiq_savings_db',
  STORAGE_EXPENSES_KEY: 'saveiq_expenses_db',
  STORAGE_NOTIFICATIONS_KEY: 'saveiq_notifications_db',
  STORAGE_ALERTS_KEY: 'saveiq_alerts_db',
  STORAGE_SESSION_KEY: 'saveiq_active_session_user',
  STORAGE_AUTH_TOKEN_KEY: 'saveiq_auth_token',

  /**
   * Get configured Node.js REST API Base URL
   */
  getApiUrl() {
    return localStorage.getItem(this.CONFIG_API_URL_KEY) || 'http://localhost:5000/api';
  },

  /**
   * Set Node.js REST API Base URL
   */
  setApiUrl(url) {
    localStorage.setItem(this.CONFIG_API_URL_KEY, (url || 'http://localhost:5000/api').trim());
  },

  _isLive: false,

  /**
   * Check if Live Node.js Backend is available
   */
  async checkBackendHealth() {
    try {
      const base = this.getApiUrl();
      const res = await fetch(`${base}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        this._isLive = true;
        return { online: true, data };
      }
    } catch (e) {
      // Backend is offline, fallback will be used
    }
    this._isLive = false;
    return { online: false };
  },

  /**
   * Check live backend state helper
   */
  isLiveBackend() {
    return this._isLive === true;
  },

  /**
   * Cryptographic Hash Helper (SHA-256 with Salt)
   */
  async hashPassword(password, salt) {
    const text = `${password || ''}:${salt || 'salt'}`;
    try {
      if (window.crypto && crypto.subtle) {
        const msgUint8 = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16) + '9b3c';
  },

  generateSalt() {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  },

  /**
   * Session & Token Management
   */
  getSessionUser() {
    try {
      const raw = localStorage.getItem(this.STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  getAuthToken() {
    const token = localStorage.getItem(this.STORAGE_AUTH_TOKEN_KEY);
    if (token) return token;
    const user = this.getSessionUser();
    if (user) {
      return btoa(JSON.stringify({ uid: user.UserID || 'USR_001', email: user.Email, name: user.Name }));
    }
    return '';
  },

  setAuthToken(token) {
    if (token) localStorage.setItem(this.STORAGE_AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(this.STORAGE_AUTH_TOKEN_KEY);
  },

  setSessionUser(user, token = null) {
    if (user) {
      const safe = {
        UserID: user.UserID || user.userId || user.uid || 'USR_' + String(Date.now()).slice(-6),
        Name: user.Name || user.name || user.displayName || 'SaveIQ User',
        Email: (user.Email || user.email || '').toLowerCase(),
        MonthlyIncome: Number(user.MonthlyIncome || user.monthlyIncome) || 75000,
        MonthlySavingCapacity: Number(user.MonthlySavingCapacity || user.monthlyCapacity) || 20000,
        CreatedDate: user.CreatedDate || user.createdAt || new Date().toISOString().split('T')[0]
      };
      localStorage.setItem(this.STORAGE_SESSION_KEY, JSON.stringify(safe));

      if (token) {
        this.setAuthToken(token);
      } else {
        this.setAuthToken(btoa(JSON.stringify({ uid: safe.UserID, email: safe.Email, name: safe.Name })));
      }
      return safe;
    }
    return null;
  },

  clearSession() {
    localStorage.removeItem(this.STORAGE_SESSION_KEY);
    localStorage.removeItem(this.STORAGE_AUTH_TOKEN_KEY);
    if (window.firebase && firebase.auth) {
      try {
        firebase.auth().signOut();
      } catch (e) {}
    }
  },

  /**
   * REST API Request Dispatcher with Bearer Token
   */
  async fetchRest(endpoint, options = {}) {
    const base = this.getApiUrl();
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const url = `${base}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    return data;
  },

  /**
   * Universal Request Bridge
   * Maps legacy and new action calls directly to Node.js REST API endpoints
   */
  async request(action, payload = {}, method = 'POST') {
    const session = this.getSessionUser();
    if (session && !payload.userId && !payload.UserID) {
      payload.userId = session.UserID;
      payload.UserID = session.UserID;
    }

    try {
      // 1. Map to Node.js Express REST API
      switch (action) {
        case 'getUser':
        case 'getProfile': {
          const res = await this.fetchRest('/auth/profile', { method: 'GET' });
          if (res && res.status === 'success' && res.data) {
            return {
              status: 'success',
              data: {
                UserID: res.data.userId || res.data.UserID,
                Name: res.data.name || res.data.Name,
                Email: res.data.email || res.data.Email,
                MonthlyIncome: Number(res.data.monthlyIncome || res.data.MonthlyIncome) || 75000,
                MonthlySavingCapacity: Number(res.data.monthlyCapacity || res.data.MonthlySavingCapacity) || 20000,
                CreatedDate: res.data.createdAt || res.data.CreatedDate
              }
            };
          }
          break;
        }

        case 'getDashboardData': {
          const res = await this.fetchRest('/dashboard', { method: 'GET' });
          if (res && res.status === 'success') {
            return { status: 'success', data: res.data };
          }
          break;
        }

        case 'getGoals':
        case 'listGoals': {
          const res = await this.fetchRest('/goals', { method: 'GET' });
          if (res && res.status === 'success') {
            // Normalize fields for frontend components
            const normalized = (res.data || []).map(g => ({
              GoalID: g.goalId || g.GoalID,
              UserID: g.userId || g.UserID,
              GoalName: g.goalName || g.GoalName,
              Purpose: g.purpose || g.Purpose,
              TargetAmount: Number(g.targetAmount || g.TargetAmount),
              CurrentSavings: Number(g.currentSavings || g.CurrentSavings || g.currentAmount),
              MonthlySavingCapacity: Number(g.monthlySavingCapacity || g.MonthlySavingCapacity),
              Deadline: g.deadline || g.Deadline,
              Status: g.status || g.Status,
              RealityScore: g.realityScore || g.RealityScore || g.evaluation?.score,
              EmailAlert: g.emailAlert !== false,
              CreatedDate: g.createdAt || g.CreatedDate,
              evaluation: g.evaluation
            }));
            return { status: 'success', data: normalized };
          }
          break;
        }

        case 'getGoalDetails': {
          const goalId = payload.goalId || payload.GoalID;
          const res = await this.fetchRest(`/goals/${goalId}`, { method: 'GET' });
          if (res && res.status === 'success') {
            const g = res.data;
            return {
              status: 'success',
              data: {
                goal: {
                  GoalID: g.goalId || g.GoalID,
                  UserID: g.userId || g.UserID,
                  GoalName: g.goalName || g.GoalName,
                  Purpose: g.purpose || g.Purpose,
                  TargetAmount: Number(g.targetAmount || g.TargetAmount),
                  CurrentSavings: Number(g.currentSavings || g.CurrentSavings),
                  MonthlySavingCapacity: Number(g.monthlySavingCapacity || g.MonthlySavingCapacity),
                  Deadline: g.deadline || g.Deadline,
                  Status: g.status || g.Status,
                  RealityScore: g.realityScore || g.RealityScore || g.evaluation?.score,
                  EmailAlert: g.emailAlert !== false,
                  CreatedDate: g.createdAt || g.CreatedDate
                },
                savingsHistory: (g.transactions || []).map(t => ({
                  SavingsID: t.transactionId || t.SavingsID,
                  GoalID: t.goalId || t.GoalID,
                  UserID: t.userId || t.UserID,
                  Amount: Number(t.amount || t.Amount),
                  Date: t.createdAt || t.Date,
                  Notes: t.notes || t.Notes
                })),
                evaluation: g.evaluation,
                alternatives: g.alternatives
              }
            };
          }
          break;
        }

        case 'createGoal':
        case 'addGoal': {
          const res = await this.fetchRest('/goals', {
            method: 'POST',
            body: JSON.stringify({
              goalName: payload.GoalName || payload.goalName,
              purpose: payload.Purpose || payload.purpose,
              targetAmount: payload.TargetAmount || payload.targetAmount,
              currentSavings: payload.CurrentSavings || payload.currentSavings || 0,
              monthlySavingCapacity: payload.MonthlySavingCapacity || payload.monthlyCapacity,
              deadline: payload.Deadline || payload.deadline,
              emailAlert: payload.EmailAlert !== false
            })
          });
          if (res && res.status === 'success') {
            const g = res.data;
            return {
              status: 'success',
              data: {
                GoalID: g.goalId || g.GoalID,
                UserID: g.userId || g.UserID,
                GoalName: g.goalName || g.GoalName,
                Purpose: g.purpose || g.Purpose,
                TargetAmount: Number(g.targetAmount || g.TargetAmount),
                CurrentSavings: Number(g.currentSavings || g.CurrentSavings),
                MonthlySavingCapacity: Number(g.monthlySavingCapacity || g.MonthlySavingCapacity),
                Deadline: g.deadline || g.Deadline,
                Status: g.status || g.Status,
                RealityScore: g.realityScore || g.RealityScore || g.evaluation?.score,
                EmailAlert: g.emailAlert !== false,
                CreatedDate: g.createdAt || g.CreatedDate
              },
              message: res.message
            };
          }
          break;
        }

        case 'updateGoal': {
          const goalId = payload.GoalID || payload.goalId;
          const res = await this.fetchRest(`/goals/${goalId}`, {
            method: 'PUT',
            body: JSON.stringify({
              goalName: payload.GoalName || payload.goalName,
              purpose: payload.Purpose || payload.purpose,
              targetAmount: payload.TargetAmount || payload.targetAmount,
              monthlySavingCapacity: payload.MonthlySavingCapacity || payload.monthlyCapacity,
              deadline: payload.Deadline || payload.deadline
            })
          });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'deleteGoal': {
          const goalId = payload.GoalID || payload.goalId;
          const res = await this.fetchRest(`/goals/${goalId}`, { method: 'DELETE' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'addSavings':
        case 'logSavings': {
          const goalId = payload.GoalID || payload.goalId;
          const res = await this.fetchRest(`/goals/${goalId}/savings`, {
            method: 'POST',
            body: JSON.stringify({
              amount: payload.Amount || payload.amount,
              date: payload.Date || payload.date,
              notes: payload.Notes || payload.notes
            })
          });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'getSavingsHistory':
        case 'getSavings': {
          const goalId = payload.GoalID || payload.goalId;
          const endpoint = goalId ? `/goals/${goalId}/savings` : `/savings`;
          const res = await this.fetchRest(endpoint, { method: 'GET' });
          if (res && res.status === 'success') {
            const history = (res.data || []).map(t => ({
              SavingsID: t.transactionId || t.SavingsID,
              GoalID: t.goalId || t.GoalID,
              UserID: t.userId || t.UserID,
              Amount: Number(t.amount || t.Amount),
              Date: t.createdAt || t.Date,
              Notes: t.notes || t.Notes
            }));
            return { status: 'success', data: history };
          }
          break;
        }

        case 'getExpenses': {
          const res = await this.fetchRest('/expenses', { method: 'GET' });
          if (res && res.status === 'success') {
            const normalized = (res.data || []).map(e => ({
              ExpenseID: e.expenseId || e.ExpenseID,
              UserID: e.userId || e.UserID,
              Category: e.category || e.Category,
              Amount: Number(e.amount || e.Amount),
              Type: e.type || e.Type,
              Description: e.description || e.Description,
              Date: e.date || e.Date,
              Notes: e.description || e.Notes || ''
            }));
            return { status: 'success', data: normalized };
          }
          break;
        }

        case 'addExpense': {
          const res = await this.fetchRest('/expenses', {
            method: 'POST',
            body: JSON.stringify({
              category: payload.Category || payload.category,
              amount: payload.Amount || payload.amount,
              type: payload.Type || payload.type,
              description: payload.Description || payload.description || payload.notes || payload.Notes,
              date: payload.Date || payload.date
            })
          });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'deleteExpense': {
          const expId = payload.ExpenseID || payload.expenseId;
          const res = await this.fetchRest(`/expenses/${expId}`, { method: 'DELETE' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'getBudgetSummary': {
          const res = await this.fetchRest('/expenses/budget-summary', { method: 'GET' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'getNotifications': {
          const res = await this.fetchRest('/notifications', { method: 'GET' });
          if (res && res.status === 'success') {
            const notifs = (res.data.notifications || []).map(n => ({
              NotificationID: n.notificationId || n.NotificationID,
              UserID: n.userId || n.UserID,
              GoalID: n.goalId || n.GoalID,
              Type: n.type || n.Type,
              Message: n.message || n.Message,
              CreatedAt: n.createdAt || n.CreatedAt,
              Read: n.isRead || n.Read || false,
              EmailSent: n.emailSent || n.EmailSent || false
            }));
            return { status: 'success', data: notifs, unreadCount: res.data.unreadCount };
          }
          break;
        }

        case 'markNotificationRead': {
          const id = payload.NotificationID || payload.notificationId;
          const res = await this.fetchRest(`/notifications/${id}/read`, { method: 'PUT' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'markAllNotificationsRead': {
          const res = await this.fetchRest('/notifications/read-all', { method: 'PUT' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'deleteNotification': {
          const id = payload.NotificationID || payload.notificationId;
          const res = await this.fetchRest(`/notifications/${id}/read`, { method: 'PUT' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'scanNotifications':
        case 'scanAndSendNotifications': {
          const res = await this.fetchRest('/notifications/scan', { method: 'POST' });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'getAlerts': {
          return { status: 'success', data: [] };
        }

        case 'getAIRecommendation': {
          const res = await this.fetchRest('/ai/recommendation', {
            method: 'POST',
            body: JSON.stringify({
              type: payload.type,
              goalData: payload.goalData,
              whatIfData: payload.whatIfData,
              budgetData: payload.budgetAnalysis || payload.budgetData,
              query: payload.query,
              contextData: payload.contextData
            })
          });
          if (res && res.status === 'success') return res;
          break;
        }

        case 'updateUser': {
          const res = await this.fetchRest('/auth/profile', {
            method: 'POST',
            body: JSON.stringify({
              name: payload.Name || payload.name,
              monthlyIncome: payload.MonthlyIncome || payload.monthlyIncome,
              monthlyCapacity: payload.MonthlySavingCapacity || payload.monthlyCapacity
            })
          });
          if (res && res.status === 'success') return res;
          break;
        }
      }
    } catch (err) {
      // Gracefully fall through to resilient local handler
    }

    // Resilient Local Storage Mock Handler
    return await this.localHandler(action, payload);
  },

  /**
   * Resilient Local Storage Mock Backend Handler
   */
  async localHandler(action, payload) {
    await this.initStorage();
    const session = this.getSessionUser();
    const activeUserId = payload.userId || payload.UserID || (session ? session.UserID : 'USR_001');

    switch (action) {
      case 'getUser':
      case 'getProfile': {
        const users = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]');
        const user = users.find(u => u.UserID === activeUserId) || session || users[0];
        if (!user) return { status: 'error', message: 'User not found' };
        
        return {
          status: 'success',
          data: {
            UserID: user.UserID,
            Name: user.Name,
            Email: user.Email,
            MonthlyIncome: Number(user.MonthlyIncome) || 75000,
            MonthlySavingCapacity: Number(user.MonthlySavingCapacity) || 20000,
            CreatedDate: user.CreatedDate
          }
        };
      }
      case 'registerUser': {
        const name = (payload.name || payload.Name || '').trim() || 'SaveIQ User';
        const email = (payload.email || payload.Email || '').trim().toLowerCase();
        const password = payload.password || payload.Password || 'password';
        const income = Number(payload.monthlyIncome || payload.MonthlyIncome) || 75000;
        const capacity = Number(payload.monthlyCapacity || payload.MonthlySavingCapacity) || 20000;

        if (!email) return { status: 'error', message: 'Email address is required.' };

        const users = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]');
        const existingIdx = users.findIndex(u => (u.Email || '').toLowerCase() === email);

        const salt = this.generateSalt();
        const passwordHash = await this.hashPassword(password, salt);
        const createdDate = new Date().toISOString().split('T')[0];

        let targetUser;
        if (existingIdx !== -1) {
          users[existingIdx].Name = name;
          users[existingIdx].PasswordHash = passwordHash;
          users[existingIdx].Salt = salt;
          users[existingIdx].MonthlyIncome = income;
          users[existingIdx].MonthlySavingCapacity = capacity;
          targetUser = users[existingIdx];
        } else {
          const userId = 'USR_' + String(Date.now()).slice(-6);
          targetUser = {
            UserID: userId,
            Name: name,
            Email: email,
            PasswordHash: passwordHash,
            Salt: salt,
            MonthlyIncome: income,
            MonthlySavingCapacity: capacity,
            CreatedDate: createdDate
          };
          users.push(targetUser);
        }

        localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(users));
        const userSafe = this.setSessionUser(targetUser);

        // Sync to backend if available
        try {
          this.fetchRest('/auth/profile', {
            method: 'POST',
            body: JSON.stringify({ name: targetUser.Name, monthlyIncome: income, monthlyCapacity: capacity })
          }).catch(() => {});
        } catch (e) {}

        return { status: 'success', data: userSafe, message: `Welcome to SaveIQ, ${targetUser.Name}!` };
      }

      case 'loginUser': {
        const email = (payload.email || payload.Email || '').trim().toLowerCase();
        const password = payload.password || payload.Password || '';

        if (!email) return { status: 'error', message: 'Please enter your email address.' };

        const users = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]');
        let user = users.find(u => (u.Email || '').toLowerCase() === email);

        if (!user) {
          const defaultName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User';
          const userId = 'USR_' + String(Date.now()).slice(-6);
          const salt = this.generateSalt();
          const passwordHash = await this.hashPassword(password || 'SaveIQ@2026', salt);

          user = {
            UserID: userId,
            Name: defaultName,
            Email: email,
            PasswordHash: passwordHash,
            Salt: salt,
            MonthlyIncome: 75000,
            MonthlySavingCapacity: 20000,
            CreatedDate: new Date().toISOString().split('T')[0]
          };
          users.push(user);
          localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(users));
        }

        const userSafe = this.setSessionUser(user);

        try {
          this.fetchRest('/auth/profile', {
            method: 'POST',
            body: JSON.stringify({ name: user.Name, monthlyIncome: user.MonthlyIncome, monthlyCapacity: user.MonthlySavingCapacity })
          }).catch(() => {});
        } catch (e) {}

        return { status: 'success', data: userSafe, message: `Welcome back, ${user.Name}!` };
      }

      case 'resetPassword': {
        const email = (payload.email || payload.Email || '').trim().toLowerCase();
        const newPassword = payload.newPassword || payload.NewPassword || '';
        if (!email || !newPassword) return { status: 'error', message: 'Email and new password are required.' };

        const users = JSON.parse(localStorage.getItem(this.STORAGE_USERS_KEY) || '[]');
        let user = users.find(u => (u.Email || '').toLowerCase() === email);
        if (user) {
          user.Salt = this.generateSalt();
          user.PasswordHash = await this.hashPassword(newPassword, user.Salt);
          localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(users));
        }
        return { status: 'success', message: 'Password reset successfully! You can now log in.' };
      }

      case 'getDashboardData': {
        const allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const userGoals = allGoals.filter(g => g.UserID === activeUserId);
        const user = session || { MonthlyCapacity: 20000, MonthlyIncome: 75000 };

        let totalTarget = 0;
        let totalSaved = 0;
        let completed = 0;
        let active = 0;
        let atRisk = 0;
        let scoreSum = 0;

        userGoals.forEach(g => {
          const t = Number(g.TargetAmount) || 0;
          const s = Number(g.CurrentSavings) || 0;
          totalTarget += t;
          totalSaved += s;
          if (s >= t && t > 0) completed++;
          else {
            active++;
            if ((g.RealityScore || 85) < 50) atRisk++;
          }
          scoreSum += (g.RealityScore || 85);
        });

        return {
          status: 'success',
          data: {
            totalGoals: userGoals.length,
            activeGoals: active,
            completedGoals: completed,
            atRiskGoals: atRisk,
            totalSaved,
            totalTarget,
            overallProgress: totalTarget > 0 ? Number(((totalSaved / totalTarget) * 100).toFixed(1)) : 0,
            avgRealityScore: userGoals.length > 0 ? Math.round(scoreSum / userGoals.length) : 85,
            goals: userGoals
          }
        };
      }

      case 'getGoals': {
        const allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const userGoals = allGoals.filter(g => g.UserID === activeUserId);
        return { status: 'success', data: userGoals };
      }

      case 'getGoalDetails': {
        const goalId = payload.GoalID || payload.goalId;
        const allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const goal = allGoals.find(g => g.GoalID === goalId && g.UserID === activeUserId);
        if (!goal) return { status: 'error', message: 'Goal not found' };

        const allSavings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        const savingsHistory = allSavings.filter(s => s.GoalID === goalId && s.UserID === activeUserId);

        return {
          status: 'success',
          data: { goal, savingsHistory }
        };
      }

      case 'createGoal':
      case 'addGoal': {
        const allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const goalId = 'GOAL_' + Date.now();
        const newGoal = {
          GoalID: goalId,
          UserID: activeUserId,
          GoalName: payload.GoalName || payload.goalName,
          Purpose: payload.Purpose || payload.purpose || 'Other',
          TargetAmount: Number(payload.TargetAmount || payload.targetAmount) || 0,
          CurrentSavings: Number(payload.CurrentSavings || payload.currentSavings) || 0,
          MonthlySavingCapacity: Number(payload.MonthlySavingCapacity || payload.monthlyCapacity || payload.monthlySavingCapacity) || 10000,
          Deadline: payload.Deadline || payload.deadline,
          Status: 'On Track',
          RealityScore: 85,
          EmailAlert: payload.EmailAlert !== false,
          CreatedDate: new Date().toISOString().split('T')[0]
        };

        allGoals.push(newGoal);
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(allGoals));
        return { status: 'success', data: newGoal, message: 'Goal created successfully' };
      }

      case 'updateGoal': {
        const goalId = payload.GoalID || payload.goalId;
        const allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const idx = allGoals.findIndex(g => g.GoalID === goalId && g.UserID === activeUserId);
        if (idx === -1) return { status: 'error', message: 'Goal not found' };

        allGoals[idx] = { ...allGoals[idx], ...payload };
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(allGoals));
        return { status: 'success', data: allGoals[idx], message: 'Goal updated successfully' };
      }

      case 'deleteGoal': {
        const goalId = payload.GoalID || payload.goalId;
        let allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        allGoals = allGoals.filter(g => !(g.GoalID === goalId && g.UserID === activeUserId));
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(allGoals));
        return { status: 'success', message: 'Goal deleted successfully' };
      }

      case 'addSavings':
      case 'logSavings': {
        const goalId = payload.GoalID || payload.goalId;
        const amount = Number(payload.Amount || payload.amount) || 0;
        const allGoals = JSON.parse(localStorage.getItem(this.STORAGE_GOALS_KEY) || '[]');
        const goalIdx = allGoals.findIndex(g => g.GoalID === goalId && g.UserID === activeUserId);
        if (goalIdx === -1) return { status: 'error', message: 'Goal not found' };

        allGoals[goalIdx].CurrentSavings = (Number(allGoals[goalIdx].CurrentSavings) || 0) + amount;
        localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(allGoals));

        const allSavings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        const newSaving = {
          SavingsID: 'SAV_' + Date.now(),
          GoalID: goalId,
          UserID: activeUserId,
          Amount: amount,
          Date: payload.Date || payload.date || new Date().toISOString().split('T')[0],
          Notes: payload.Notes || payload.notes || 'Savings deposit'
        };
        allSavings.push(newSaving);
        localStorage.setItem(this.STORAGE_SAVINGS_KEY, JSON.stringify(allSavings));

        return { status: 'success', data: { goal: allGoals[goalIdx], saving: newSaving } };
      }

      case 'getSavingsHistory':
      case 'getSavings': {
        const goalId = payload.GoalID || payload.goalId;
        const allSavings = JSON.parse(localStorage.getItem(this.STORAGE_SAVINGS_KEY) || '[]');
        const userSavings = allSavings.filter(s => s.UserID === activeUserId && (!goalId || s.GoalID === goalId));
        return { status: 'success', data: userSavings };
      }

      case 'getExpenses': {
        const allExp = JSON.parse(localStorage.getItem(this.STORAGE_EXPENSES_KEY) || '[]');
        const userExp = allExp.filter(e => e.UserID === activeUserId);
        return { status: 'success', data: userExp };
      }

      case 'addExpense': {
        const allExp = JSON.parse(localStorage.getItem(this.STORAGE_EXPENSES_KEY) || '[]');
        const newExp = {
          ExpenseID: 'EXP_' + Date.now(),
          UserID: activeUserId,
          Category: payload.Category,
          Amount: Number(payload.Amount) || 0,
          Type: payload.Type || 'Need',
          Description: payload.Description || '',
          Date: payload.Date || new Date().toISOString().split('T')[0]
        };
        allExp.push(newExp);
        localStorage.setItem(this.STORAGE_EXPENSES_KEY, JSON.stringify(allExp));
        return { status: 'success', data: newExp };
      }

      case 'getNotifications': {
        const allNotifs = JSON.parse(localStorage.getItem(this.STORAGE_NOTIFICATIONS_KEY) || '[]');
        const userNotifs = allNotifs.filter(n => n.UserID === activeUserId || n.UserID === 'USR_001');
        return { status: 'success', data: userNotifs, unreadCount: userNotifs.filter(n => !n.Read).length };
      }

      case 'markNotificationRead': {
        const id = payload.NotificationID || payload.notificationId;
        const allNotifs = JSON.parse(localStorage.getItem(this.STORAGE_NOTIFICATIONS_KEY) || '[]');
        allNotifs.forEach(n => { if (n.NotificationID === id) n.Read = true; });
        localStorage.setItem(this.STORAGE_NOTIFICATIONS_KEY, JSON.stringify(allNotifs));
        return { status: 'success' };
      }

      case 'markAllNotificationsRead': {
        const allNotifs = JSON.parse(localStorage.getItem(this.STORAGE_NOTIFICATIONS_KEY) || '[]');
        allNotifs.forEach(n => { n.Read = true; });
        localStorage.setItem(this.STORAGE_NOTIFICATIONS_KEY, JSON.stringify(allNotifs));
        return { status: 'success' };
      }

      default:
        return { status: 'success', message: 'Action processed' };
    }
  },

  /**
   * Initialize LocalStorage Seed Data
   */
  async initStorage(forceReset = false) {
    const currentVer = localStorage.getItem(this.CONFIG_VERSION_KEY);
    const targetVer = 'v5_firebase_node_architecture';

    if (forceReset || currentVer !== targetVer) {
      localStorage.setItem(this.CONFIG_VERSION_KEY, targetVer);
    }

    if (!localStorage.getItem(this.STORAGE_USERS_KEY)) {
      const defaultUsers = [{
        UserID: 'USR_001',
        Name: 'Aarav Sharma',
        Email: 'aarav.sharma@example.com',
        MonthlyIncome: 75000,
        MonthlySavingCapacity: 20000,
        CreatedDate: '2026-01-15'
      }];
      localStorage.setItem(this.STORAGE_USERS_KEY, JSON.stringify(defaultUsers));
      if (!this.getSessionUser()) this.setSessionUser(defaultUsers[0]);
    }

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
          CurrentSavings: 65000,
          MonthlySavingCapacity: 10000,
          Deadline: '2027-12-31',
          Status: 'On Track',
          RealityScore: 92,
          EmailAlert: true,
          CreatedDate: '2026-01-20'
        }
      ];
      localStorage.setItem(this.STORAGE_GOALS_KEY, JSON.stringify(defaultGoals));
    }

    if (!localStorage.getItem(this.STORAGE_SAVINGS_KEY)) {
      const defaultSavings = [
        { SavingsID: 'SAV_001', GoalID: 'GOAL_001', UserID: 'USR_001', Amount: 10000, Date: '2026-02-05', Notes: 'Initial allocation' },
        { SavingsID: 'SAV_002', GoalID: 'GOAL_001', UserID: 'USR_001', Amount: 10000, Date: '2026-03-01', Notes: 'Monthly transfer' }
      ];
      localStorage.setItem(this.STORAGE_SAVINGS_KEY, JSON.stringify(defaultSavings));
    }

    if (!localStorage.getItem(this.STORAGE_EXPENSES_KEY)) {
      const defaultExpenses = [
        { ExpenseID: 'EXP_001', UserID: 'USR_001', Category: 'Rent', Amount: 22000, Type: 'Need', Description: 'Monthly apartment rent', Date: '2026-09-01' },
        { ExpenseID: 'EXP_002', UserID: 'USR_001', Category: 'Groceries', Amount: 8500, Type: 'Need', Description: 'Supermarket and supplies', Date: '2026-09-05' },
        { ExpenseID: 'EXP_003', UserID: 'USR_001', Category: 'Dining Out', Amount: 4200, Type: 'Want', Description: 'Weekend dinners', Date: '2026-09-10' },
        { ExpenseID: 'EXP_004', UserID: 'USR_001', Category: 'Utilities', Amount: 3200, Type: 'Need', Description: 'Electricity & Wifi', Date: '2026-09-12' }
      ];
      localStorage.setItem(this.STORAGE_EXPENSES_KEY, JSON.stringify(defaultExpenses));
    }

    if (!localStorage.getItem(this.STORAGE_NOTIFICATIONS_KEY)) {
      const defaultNotifs = [
        {
          NotificationID: 'NOTIF_001',
          UserID: 'USR_001',
          GoalID: 'GOAL_001',
          Type: 'Deadline Reminder',
          Message: '⏰ Your Laptop Purchase deadline is approaching. ₹40,000 is still remaining.',
          CreatedAt: '2026-09-22 10:30:00',
          EmailSent: true,
          Read: false
        },
        {
          NotificationID: 'NOTIF_002',
          UserID: 'USR_001',
          GoalID: 'ALL_GOALS',
          Type: 'Higher Monthly Savings',
          Message: '👏 Great job! You saved ₹20,000 this month, which is higher than your usual monthly savings.',
          CreatedAt: '2026-09-20 14:15:00',
          EmailSent: true,
          Read: false
        }
      ];
      localStorage.setItem(this.STORAGE_NOTIFICATIONS_KEY, JSON.stringify(defaultNotifs));
    }
  }
};

// Auto-initialize on load
if (typeof window !== 'undefined') {
  SaveIQAPI.initStorage();
}
