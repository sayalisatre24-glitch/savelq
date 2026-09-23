/**
 * SaveIQ - Main Application Controller
 * Handles SPA navigation, authentication lifecycle, deterministic calculations,
 * in-app notification center, What-If simulator, Chart.js visualizations,
 * and Groq AI advisor dialogues.
 */

const SaveIQApp = {
  state: {
    currentView: 'dashboard',
    user: null,
    goals: [],
    expenses: [],
    savings: [],
    notifications: [],
    alerts: [],
    selectedGoalId: null,
    currentGoalFilter: 'all',
    currentNotifFilter: 'all',
    currentNotifViewFilter: 'all',
    whatIfSelectedGoal: null,
    whatIfBaseGoal: null
  },

  /**
   * Initialize App Lifecycle
   */
  async init() {
    this.setupNavigation();
    this.setupAuthListeners();
    this.setupNotificationListeners();
    this.setupEventListeners();
    this.setDefaultDates();
    this.setupLivePreviewListeners();
    this.setupWhatIfListeners();
    this.updateBackendStatusIndicator();

    // Pre-load data and render demo goals immediately
    await this.loadAllData();

    // Check login state
    const sessionUser = SaveIQAPI.getSessionUser();
    if (!sessionUser) {
      this.openAuthModal('login');
    } else {
      this.closeAuthModal();
      await this.refreshNotifications();
    }
  },

  /**
   * Set default today's date on all date pickers
   */
  setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const defaultDeadline = new Date();
    defaultDeadline.setMonth(defaultDeadline.getMonth() + 6);
    const deadlineStr = defaultDeadline.toISOString().split('T')[0];

    const goalDeadline = document.getElementById('goalDeadlineInput');
    if (goalDeadline) goalDeadline.value = deadlineStr;

    const expDate = document.getElementById('expenseDateInput');
    if (expDate) expDate.value = today;

    const depDate = document.getElementById('depositDateInput');
    if (depDate) depDate.value = today;
  },

  /**
   * Navigation router
   */
  setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const view = link.getAttribute('data-view');
        this.navigateTo(view);
      });
    });

    // Mobile sidebar toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Quick deposit header button
    const quickDep = document.getElementById('quickDepositBtn');
    if (quickDep) {
      quickDep.addEventListener('click', () => this.openDepositModal());
    }

    // Header user badge click -> toggle user menu
    const userBadge = document.getElementById('headerUserBadge');
    const userDropdown = document.getElementById('headerUserDropdown');
    if (userBadge && userDropdown) {
      userBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
        // Close notif dropdown if open
        const notifDropdown = document.getElementById('headerNotifDropdown');
        if (notifDropdown) notifDropdown.classList.remove('active');
      });
    }

    // Close dropdowns on click outside
    document.addEventListener('click', (e) => {
      if (userDropdown && !userDropdown.contains(e.target) && !userBadge.contains(e.target)) {
        userDropdown.classList.remove('active');
      }
      const notifDropdown = document.getElementById('headerNotifDropdown');
      const notifBell = document.getElementById('headerNotifBellBtn');
      if (notifDropdown && notifBell && !notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
        notifDropdown.classList.remove('active');
      }
    });

    // Back button in Goal Details
    const backBtn = document.getElementById('backToGoalsBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.navigateTo('my-goals'));
    }

    // Filter tabs in My Goals
    const filterContainer = document.getElementById('goalsFilterContainer');
    if (filterContainer) {
      filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.filter) {
          filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active-filter'));
          btn.classList.add('active-filter');
          this.state.currentGoalFilter = btn.dataset.filter;
          this.renderMyGoalsList();
        }
      });
    }

    // Any button with data-view
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-view]');
      if (target && !target.classList.contains('nav-link')) {
        const view = target.dataset.view;
        this.navigateTo(view);
        if (userDropdown) userDropdown.classList.remove('active');
      }
    });
  },

  /**
   * Switch View
   */
  navigateTo(viewName, params = {}) {
    this.state.currentView = viewName;

    // Update active nav-link
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-view') === viewName);
    });

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Hide all view sections, show target
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update Header title
    const titles = {
      'dashboard': { title: 'Financial Dashboard', subtitle: 'Overview of your savings goals and AI reality check metrics' },
      'create-goal': { title: 'Create Savings Goal', subtitle: 'Deterministic Reality Check & Feasibility Scoring Engine' },
      'my-goals': { title: 'My Savings Goals', subtitle: 'Track, manage, and inspect all your active and achieved goals' },
      'goal-details': { title: 'Goal Reality & Intelligence', subtitle: 'Detailed breakdown, What-If analysis, and AI guidance' },
      'what-if': { title: 'What-If Simulation Sandbox', subtitle: 'Simulate target, deadline, and capacity shifts in real-time' },
      'expenses': { title: 'Expense & Budget Analysis', subtitle: '50/30/20 budget breakdown and cash flow optimization' },
      'ai-advisor': { title: 'Groq AI Financial Strategist', subtitle: 'Strategic guidance powered by Groq and deterministic math' },
      'notifications': { title: 'Notification & Alert Center', subtitle: 'Automated Gmail alerts and smart milestone tracking' },
      'profile': { title: 'Profile & Saving Capacity', subtitle: 'Manage your monthly income and financial baselines' },
      'gas-hub': { title: 'Google Apps Script Hub', subtitle: 'Live Google Sheets database sync and Gmail alert triggers' }
    };

    const info = titles[viewName] || { title: 'SaveIQ', subtitle: '' };
    document.getElementById('viewTitle').textContent = info.title;
    document.getElementById('viewSubtitle').textContent = info.subtitle;

    // View-specific initialization
    if (viewName === 'dashboard') {
      this.renderDashboard();
    } else if (viewName === 'my-goals') {
      this.renderMyGoalsList();
    } else if (viewName === 'goal-details') {
      if (params.goalId) this.state.selectedGoalId = params.goalId;
      this.renderGoalDetails(this.state.selectedGoalId);
    } else if (viewName === 'what-if') {
      this.initWhatIfView(params.goalId);
    } else if (viewName === 'expenses') {
      this.renderExpensesView();
    } else if (viewName === 'notifications') {
      this.renderNotificationsView();
    } else if (viewName === 'create-goal') {
      this.triggerCreateGoalPreview();
    }
  },

  /**
   * ==========================================================================
   * AUTHENTICATION & SESSION MANAGEMENT
   * ==========================================================================
   */
  setupAuthListeners() {
    const authModal = document.getElementById('authModal');
    const tabLogin = document.getElementById('authTabLoginBtn');
    const tabRegister = document.getElementById('authTabRegisterBtn');
    const tabForgot = document.getElementById('authTabForgotBtn');
    const formLogin = document.getElementById('authLoginForm');
    const formRegister = document.getElementById('authRegisterForm');
    const formForgot = document.getElementById('authForgotForm');
    const forgotLink = document.getElementById('authForgotLink');
    const logoutBtn = document.getElementById('headerLogoutBtn');
    const switchAccountBtn = document.getElementById('menuSwitchAccountBtn');

    // Switch Tabs
    const switchTab = (tabName) => {
      this.hideAuthAlerts();
      [tabLogin, tabRegister, tabForgot].forEach(btn => btn && btn.classList.remove('active'));
      [formLogin, formRegister, formForgot].forEach(f => f && (f.style.display = 'none'));

      if (tabName === 'login') {
        tabLogin.classList.add('active');
        formLogin.style.display = 'block';
      } else if (tabName === 'register') {
        tabRegister.classList.add('active');
        formRegister.style.display = 'block';
      } else if (tabName === 'forgot') {
        tabForgot.classList.add('active');
        formForgot.style.display = 'block';
      }
    };

    if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));
    if (tabForgot) tabForgot.addEventListener('click', () => switchTab('forgot'));
    if (forgotLink) forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('forgot');
    });

    // 1. LOGIN SUBMIT
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmailInput').value.trim();
        const password = document.getElementById('loginPasswordInput').value;

        const btn = document.getElementById('loginSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

        try {
          const res = await SaveIQAPI.request('loginUser', { email, password });
          if (res.status === 'success' && res.data) {
            SaveIQAPI.setSessionUser(res.data);
            this.state.user = res.data;
            this.showToast(`Welcome back, ${res.data.Name}!`, 'success');
            this.closeAuthModal();
            formLogin.reset();
            await this.loadAllData();
            await this.refreshNotifications();
          } else {
            this.showAuthAlert('error', res.message || 'Invalid email or password.');
          }
        } catch (err) {
          this.showAuthAlert('error', err.message || 'Login failed. Please check your credentials.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to SaveIQ';
        }
      });
    }

    // 2. REGISTER SUBMIT
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regNameInput').value.trim();
        const email = document.getElementById('regEmailInput').value.trim();
        const incomeEl = document.getElementById('regIncomeInput');
        const capEl = document.getElementById('regCapacityInput');
        const monthlyIncome = incomeEl ? (Number(incomeEl.value) || 75000) : 75000;
        const monthlyCapacity = capEl ? (Number(capEl.value) || 20000) : 20000;
        const password = document.getElementById('regPasswordInput').value;
        const confirmPassword = document.getElementById('regConfirmPasswordInput').value;

        if (password !== confirmPassword) {
          this.showAuthAlert('error', 'Passwords do not match. Please re-enter.');
          return;
        }

        const btn = document.getElementById('regSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

        try {
          const res = await SaveIQAPI.request('registerUser', {
            name,
            email,
            password,
            monthlyIncome,
            monthlyCapacity
          });

          if (res.status === 'success' && res.data) {
            SaveIQAPI.setSessionUser(res.data);
            this.state.user = res.data;
            this.showToast(`Account created! Welcome, ${res.data.Name}!`, 'success');
            this.closeAuthModal();
            formRegister.reset();
            await this.loadAllData();
            await this.refreshNotifications();
          } else {
            this.showAuthAlert('error', res.message || 'Registration failed.');
          }
        } catch (err) {
          this.showAuthAlert('error', err.message || 'Registration error. Please try again.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
        }
      });
    }

    // 3. FORGOT PASSWORD SUBMIT
    if (formForgot) {
      formForgot.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmailInput').value.trim();
        const newPassword = document.getElementById('forgotNewPasswordInput').value;

        const btn = document.getElementById('forgotSubmitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting Password...';

        try {
          const res = await SaveIQAPI.request('resetPassword', { email, newPassword });
          if (res.status === 'success') {
            this.showAuthAlert('success', res.message || 'Password reset successfully! Please sign in.');
            formForgot.reset();
            setTimeout(() => switchTab('login'), 1500);
          } else {
            this.showAuthAlert('error', res.message || 'Failed to reset password.');
          }
        } catch (err) {
          this.showAuthAlert('error', err.message || 'Password reset error.');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-key"></i> Reset Password';
        }
      });
    }

    // 4. LOGOUT ACTION
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        SaveIQAPI.clearSession();
        this.state.user = null;
        this.state.goals = [];
        this.state.expenses = [];
        this.state.savings = [];
        this.state.notifications = [];
        const userDropdown = document.getElementById('headerUserDropdown');
        if (userDropdown) userDropdown.classList.remove('active');
        this.showToast('You have been logged out safely.', 'info');
        this.openAuthModal('login');
      });
    }

    // 5. SWITCH ACCOUNT
    if (switchAccountBtn) {
      switchAccountBtn.addEventListener('click', () => {
        const userDropdown = document.getElementById('headerUserDropdown');
        if (userDropdown) userDropdown.classList.remove('active');
        this.openAuthModal('login');
      });
    }

    // 6. CLOSE / BACK ACTIONS (Backdrop click & Escape key)
    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
          this.closeAuthModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('authModal');
        if (modal && modal.classList.contains('active')) {
          this.closeAuthModal();
        }
      }
    });
  },

  openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.add('active');
      const tabBtn = document.getElementById(tab === 'register' ? 'authTabRegisterBtn' : tab === 'forgot' ? 'authTabForgotBtn' : 'authTabLoginBtn');
      if (tabBtn) tabBtn.click();
    }
  },

  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
  },

  showAuthAlert(type, text) {
    const errAlert = document.getElementById('authAlertError');
    const succAlert = document.getElementById('authAlertSuccess');
    if (type === 'error' && errAlert) {
      document.getElementById('authAlertErrorText').textContent = text;
      errAlert.style.display = 'flex';
      if (succAlert) succAlert.style.display = 'none';
    } else if (type === 'success' && succAlert) {
      document.getElementById('authAlertSuccessText').textContent = text;
      succAlert.style.display = 'flex';
      if (errAlert) errAlert.style.display = 'none';
    }
  },

  hideAuthAlerts() {
    const errAlert = document.getElementById('authAlertError');
    const succAlert = document.getElementById('authAlertSuccess');
    if (errAlert) errAlert.style.display = 'none';
    if (succAlert) succAlert.style.display = 'none';
  },

  /**
   * ==========================================================================
   * NOTIFICATION CENTER & BELL DROPDOWN
   * ==========================================================================
   */
  setupNotificationListeners() {
    const bellBtn = document.getElementById('headerNotifBellBtn');
    const notifDropdown = document.getElementById('headerNotifDropdown');
    const markAllReadBtn = document.getElementById('dropdownMarkAllReadBtn');
    const viewMarkAllReadBtn = document.getElementById('viewNotifMarkAllReadBtn');
    const viewScanBtn = document.getElementById('viewNotifScanBtn');
    const viewAllLink = document.getElementById('dropdownViewAllLink');

    // Toggle dropdown
    if (bellBtn && notifDropdown) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('active');
        const userDropdown = document.getElementById('headerUserDropdown');
        if (userDropdown) userDropdown.classList.remove('active');
      });
    }

    // Filter in dropdown
    const filterTabs = document.querySelector('.notif-filter-tabs');
    if (filterTabs) {
      filterTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.filter) {
          filterTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.currentNotifFilter = btn.dataset.filter;
          this.renderNotificationDropdown();
        }
      });
    }

    // Filter in full Notifications View
    document.querySelectorAll('.notif-view-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.notif-view-filter-btn').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
        this.state.currentNotifViewFilter = btn.dataset.filter;
        this.renderNotificationsView();
      });
    });

    // Mark All Read in dropdown
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', async () => {
        await this.markAllNotificationsRead();
      });
    }

    // Mark All Read in View
    if (viewMarkAllReadBtn) {
      viewMarkAllReadBtn.addEventListener('click', async () => {
        await this.markAllNotificationsRead();
      });
    }

    // Manual Scan triggers button in View
    if (viewScanBtn) {
      viewScanBtn.addEventListener('click', async () => {
        viewScanBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Scanning...';
        await this.triggerNotificationScan();
        viewScanBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Scan Triggers';
      });
    }

    // "View All Notifications" footer link
    if (viewAllLink) {
      viewAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (notifDropdown) notifDropdown.classList.remove('active');
        this.navigateTo('notifications');
      });
    }
  },

  /**
   * Refresh and scan all notifications
   */
  async refreshNotifications() {
    try {
      // Scan for any new milestone triggers
      await SaveIQAPI.request('scanNotifications');
      const res = await SaveIQAPI.request('getNotifications');
      this.state.notifications = res.data || [];
      this.updateNotificationBellUI();
      this.renderNotificationDropdown();
      if (this.state.currentView === 'notifications') {
        this.renderNotificationsView();
      }
    } catch (err) {
      console.warn('Error refreshing notifications:', err);
    }
  },

  /**
   * Update Notification Bell Counter
   */
  updateNotificationBellUI() {
    const unread = this.state.notifications.filter(n => !n.Read).length;
    const badge = document.getElementById('headerNotifBadge');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');

    if (badge) {
      badge.textContent = unread;
      if (unread > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (sidebarBadge) {
      sidebarBadge.textContent = unread;
      sidebarBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
  },

  /**
   * Helper to format notification icon
   */
  getNotificationIconConfig(type) {
    switch (type) {
      case 'Target Completed':
        return { icon: 'fa-trophy', class: 'type-completed' };
      case 'Higher Monthly Savings':
        return { icon: 'fa-hands-clapping', class: 'type-savings' };
      case 'Deadline Reminder':
        return { icon: 'fa-clock', class: 'type-deadline' };
      case 'Missed Monthly Target':
        return { icon: 'fa-triangle-exclamation', class: 'type-target' };
      default:
        return { icon: 'fa-bell', class: 'type-deadline' };
    }
  },

  /**
   * Render Notification Dropdown Content
   */
  renderNotificationDropdown() {
    const list = document.getElementById('dropdownNotifList');
    if (!list) return;

    let items = this.state.notifications;
    if (this.state.currentNotifFilter === 'unread') {
      items = items.filter(n => !n.Read);
    }

    if (items.length === 0) {
      list.innerHTML = `<div class="notif-empty"><i class="fa-regular fa-bell-slash" style="font-size: 1.8rem; margin-bottom: 0.5rem; opacity: 0.5;"></i><p>No notifications found.</p></div>`;
      return;
    }

    list.innerHTML = items.slice(0, 10).map(n => {
      const cfg = this.getNotificationIconConfig(n.Type);
      return `
        <div class="notif-item ${!n.Read ? 'unread' : ''}" onclick="SaveIQApp.handleNotificationClick('${n.NotificationID}', '${n.GoalID}')">
          <div class="notif-icon ${cfg.class}">
            <i class="fa-solid ${cfg.icon}"></i>
          </div>
          <div class="notif-body">
            <div class="notif-msg">${this.escapeHTML(n.Message)}</div>
            <div class="notif-time">${n.CreatedAt || 'Recent'} ${n.EmailSent ? '&bull; <i class="fa-regular fa-envelope" title="Dispatched via Gmail"></i> Email Dispatched' : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render Full Notifications View
   */
  renderNotificationsView() {
    const container = document.getElementById('fullNotificationsList');
    if (!container) return;

    const notifs = this.state.notifications;
    const unreadCount = notifs.filter(n => !n.Read).length;

    const countAll = document.getElementById('notifViewCountAll');
    const countUnread = document.getElementById('notifViewCountUnread');
    if (countAll) countAll.textContent = notifs.length;
    if (countUnread) countUnread.textContent = unreadCount;

    let filtered = notifs;
    if (this.state.currentNotifViewFilter === 'unread') {
      filtered = notifs.filter(n => !n.Read);
    } else if (this.state.currentNotifViewFilter !== 'all') {
      filtered = notifs.filter(n => n.Type === this.state.currentNotifViewFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; background: var(--bg-main); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle); color: var(--text-muted);">
          <i class="fa-solid fa-bell-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--text-muted);"></i>
          <p style="font-weight: 600;">No notifications found under this filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(n => {
      const cfg = this.getNotificationIconConfig(n.Type);
      return `
        <div class="card" style="padding: 1.1rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; ${!n.Read ? 'border-left: 4px solid var(--accent-primary); background: #faf5ff;' : ''}">
          <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div class="notif-icon ${cfg.class}" style="width: 42px; height: 42px; font-size: 1.15rem; border-radius: 12px;">
              <i class="fa-solid ${cfg.icon}"></i>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span class="badge ${n.Type === 'Target Completed' ? 'badge-completed' : n.Type === 'Higher Monthly Savings' ? 'badge-on-track' : n.Type === 'Deadline Reminder' ? 'badge-needs-adjustment' : 'badge-at-risk'}" style="font-size: 0.72rem;">${n.Type}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${n.CreatedAt}</span>
                ${n.EmailSent ? '<span style="font-size: 0.72rem; color: #10b981; display: flex; align-items: center; gap: 0.25rem;"><i class="fa-solid fa-paper-plane"></i> Sent to Gmail</span>' : ''}
              </div>
              <div style="font-size: 0.92rem; font-weight: 500; color: var(--text-primary); margin-bottom: 0.4rem;">
                ${this.escapeHTML(n.Message)}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
            ${!n.Read ? `
              <button class="btn btn-secondary btn-sm" onclick="SaveIQApp.markNotificationRead('${n.NotificationID}')" title="Mark as read" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">
                <i class="fa-solid fa-check"></i> Read
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="SaveIQApp.deleteNotification('${n.NotificationID}')" title="Delete notification" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">
              <i class="fa-solid fa-trash" style="color: #ef4444;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  async handleNotificationClick(notifId, goalId) {
    await this.markNotificationRead(notifId);
    const dropdown = document.getElementById('headerNotifDropdown');
    if (dropdown) dropdown.classList.remove('active');

    if (goalId && goalId !== 'ALL_GOALS' && goalId !== 'GOAL_DEMO') {
      const goalExists = this.state.goals.some(g => g.GoalID === goalId);
      if (goalExists) {
        this.navigateTo('goal-details', { goalId });
      }
    }
  },

  async markNotificationRead(notifId) {
    try {
      await SaveIQAPI.request('markNotificationRead', { notificationId: notifId });
      const idx = this.state.notifications.findIndex(n => n.NotificationID === notifId);
      if (idx !== -1) {
        this.state.notifications[idx].Read = true;
      }
      this.updateNotificationBellUI();
      this.renderNotificationDropdown();
      if (this.state.currentView === 'notifications') {
        this.renderNotificationsView();
      }
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  },

  async markAllNotificationsRead() {
    try {
      await SaveIQAPI.request('markAllNotificationsRead');
      this.state.notifications.forEach(n => n.Read = true);
      this.updateNotificationBellUI();
      this.renderNotificationDropdown();
      if (this.state.currentView === 'notifications') {
        this.renderNotificationsView();
      }
      this.showToast('All notifications marked as read', 'success');
    } catch (err) {
      this.showToast('Failed to update notifications', 'error');
    }
  },

  async deleteNotification(notifId) {
    try {
      await SaveIQAPI.request('deleteNotification', { notificationId: notifId });
      this.state.notifications = this.state.notifications.filter(n => n.NotificationID !== notifId);
      this.updateNotificationBellUI();
      this.renderNotificationDropdown();
      if (this.state.currentView === 'notifications') {
        this.renderNotificationsView();
      }
      this.showToast('Notification removed', 'info');
    } catch (err) {
      this.showToast('Failed to delete notification', 'error');
    }
  },

  async triggerNotificationScan() {
    try {
      const res = await SaveIQAPI.request('scanNotifications');
      const count = res.data && res.data.newCount !== undefined ? res.data.newCount : 0;
      await this.refreshNotifications();
      this.showToast(`Scan complete: ${count} new milestone alert${count === 1 ? '' : 's'} verified.`, 'success');
    } catch (err) {
      this.showToast('Error scanning notifications', 'error');
    }
  },

  normalizeGoal(g = {}) {
    const goalId = g.GoalID || g.goalId || g.id || ('GOAL_' + Date.now());
    const goalName = g.GoalName || g.goalName || 'Savings Goal';
    const purpose = g.Purpose || g.purpose || 'Other';
    const target = Number(g.TargetAmount !== undefined ? g.TargetAmount : (g.targetAmount !== undefined ? g.targetAmount : 0)) || 0;
    const current = Number(g.CurrentSavings !== undefined ? g.CurrentSavings : (g.currentSavings !== undefined ? g.currentSavings : 0)) || 0;
    const capacity = Number(g.MonthlySavingCapacity !== undefined ? g.MonthlySavingCapacity : (g.monthlySavingCapacity !== undefined ? g.monthlySavingCapacity : (g.monthlyCapacity !== undefined ? g.monthlyCapacity : 20000))) || 20000;
    const deadline = g.Deadline || g.deadline || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const status = g.Status || g.status || 'On Track';
    const realityScore = Number(g.RealityScore !== undefined ? g.RealityScore : (g.realityScore !== undefined ? g.realityScore : 80)) || 80;
    const emailAlert = g.EmailAlert !== undefined ? g.EmailAlert : (g.emailAlert !== undefined ? g.emailAlert : true);

    return {
      ...g,
      GoalID: goalId,
      goalId: goalId,
      GoalName: goalName,
      goalName: goalName,
      Purpose: purpose,
      purpose: purpose,
      TargetAmount: target,
      targetAmount: target,
      CurrentSavings: current,
      currentSavings: current,
      MonthlySavingCapacity: capacity,
      monthlySavingCapacity: capacity,
      Deadline: deadline,
      deadline: deadline,
      Status: status,
      status: status,
      RealityScore: realityScore,
      realityScore: realityScore,
      EmailAlert: emailAlert,
      emailAlert: emailAlert
    };
  },

  /**
   * ==========================================================================
   * DATA LOADING & PORTFOLIO DASHBOARD
   * ==========================================================================
   */
  async loadAllData() {
    try {
      const userRes = await SaveIQAPI.request('getUser');
      const session = SaveIQAPI.getSessionUser();
      this.state.user = (userRes && userRes.data) ? userRes.data : (session || { Name: 'User', MonthlyIncome: 75000, MonthlySavingCapacity: 20000 });

      const goalsRes = await SaveIQAPI.request('getGoals');
      let rawGoals = Array.isArray(goalsRes?.data) ? goalsRes.data : (Array.isArray(goalsRes) ? goalsRes : []);

      if (rawGoals.length === 0) {
        rawGoals = [
          {
            GoalID: 'GOAL_DEMO_1',
            goalId: 'GOAL_DEMO_1',
            GoalName: 'MacBook Pro M3',
            goalName: 'MacBook Pro M3',
            Purpose: 'Laptop Purchase',
            purpose: 'Laptop Purchase',
            TargetAmount: 150000,
            targetAmount: 150000,
            CurrentSavings: 50000,
            currentSavings: 50000,
            MonthlySavingCapacity: 20000,
            monthlySavingCapacity: 20000,
            Deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            Status: 'On Track',
            status: 'On Track',
            RealityScore: 82,
            realityScore: 82,
            EmailAlert: true,
            emailAlert: true
          },
          {
            GoalID: 'GOAL_DEMO_2',
            goalId: 'GOAL_DEMO_2',
            GoalName: 'Emergency Fund 2027',
            goalName: 'Emergency Fund 2027',
            Purpose: 'Emergency Fund',
            purpose: 'Emergency Fund',
            TargetAmount: 200000,
            targetAmount: 200000,
            CurrentSavings: 60000,
            currentSavings: 60000,
            MonthlySavingCapacity: 15000,
            monthlySavingCapacity: 15000,
            Deadline: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            deadline: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            Status: 'On Track',
            status: 'On Track',
            RealityScore: 78,
            realityScore: 78,
            EmailAlert: true,
            emailAlert: true
          }
        ];
      }

      this.state.goals = rawGoals.map(g => this.normalizeGoal(g));

      const expRes = await SaveIQAPI.request('getExpenses');
      this.state.expenses = Array.isArray(expRes?.data) ? expRes.data : (Array.isArray(expRes) ? expRes : []);

      const savRes = await SaveIQAPI.request('getSavingsHistory');
      this.state.savings = Array.isArray(savRes?.data) ? savRes.data : [];

      const altRes = await SaveIQAPI.request('getAlerts');
      this.state.alerts = Array.isArray(altRes?.data) ? altRes.data : [];

      this.updateUserUI();

      // Re-render current active view
      if (this.state.currentView === 'dashboard') {
        this.renderDashboard();
      } else if (this.state.currentView === 'my-goals') {
        this.renderMyGoalsList();
      } else if (this.state.currentView === 'goal-details' && this.state.selectedGoalId) {
        this.renderGoalDetails(this.state.selectedGoalId);
      } else if (this.state.currentView === 'expenses') {
        this.renderExpensesView();
      }
    } catch (err) {
      console.warn('Data load warning:', err);
    }
  },

  /**
   * Update User Badge UI & Profile
   */
  updateUserUI() {
    if (!this.state.user) return;
    const name = this.state.user.Name || 'User';
    const email = this.state.user.Email || '';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    document.getElementById('headerUserName').textContent = name;
    document.getElementById('headerUserAvatar').textContent = initials;
    
    const menuName = document.getElementById('userMenuFullName');
    const menuEmail = document.getElementById('userMenuEmail');
    if (menuName) menuName.textContent = name;
    if (menuEmail) menuEmail.textContent = email;

    const totalCapSpan = document.getElementById('formUserTotalCapacity');
    if (totalCapSpan) {
      totalCapSpan.textContent = `₹${(this.state.user.MonthlySavingCapacity || 0).toLocaleString()}`;
    }

    // Populate profile form fields
    const pName = document.getElementById('profileName');
    const pEmail = document.getElementById('profileEmail');
    const pIncome = document.getElementById('profileIncome');
    const pCapacity = document.getElementById('profileCapacity');

    if (pName) pName.value = this.state.user.Name || '';
    if (pEmail) pEmail.value = this.state.user.Email || '';
    if (pIncome) pIncome.value = this.state.user.MonthlyIncome || '';
    if (pCapacity) pCapacity.value = this.state.user.MonthlySavingCapacity || '';
  },

  /**
   * RENDER DASHBOARD
   */
  renderDashboard() {
    const goals = this.state.goals;
    const user = this.state.user || {};

    let totalTarget = 0;
    let totalSavings = 0;
    let activeGoalsCount = 0;
    let completedGoalsCount = 0;
    let atRiskGoalsCount = 0;
    let scoreSum = 0;

    goals.forEach(g => {
      const evalRes = SaveIQCalc.evaluateGoalReality(g, user.MonthlyIncome || 0);
      totalTarget += Number(g.TargetAmount || 0);
      totalSavings += Number(g.CurrentSavings || 0);
      scoreSum += evalRes.score;

      if (evalRes.status === 'Completed') completedGoalsCount++;
      else if (evalRes.status === 'At Risk' || evalRes.status === 'Needs Adjustment') {
        activeGoalsCount++;
        atRiskGoalsCount++;
      } else {
        activeGoalsCount++;
      }
    });

    const overallProgress = totalTarget > 0 ? Math.round((totalSavings / totalTarget) * 1000) / 10 : 0;
    const avgScore = goals.length > 0 ? Math.round(scoreSum / goals.length) : 100;

    // Update KPI UI
    document.getElementById('kpiActiveGoals').textContent = activeGoalsCount;
    document.getElementById('kpiTotalGoalsText').textContent = `${goals.length} total recorded`;
    document.getElementById('kpiTotalSavings').textContent = `₹${totalSavings.toLocaleString()}`;
    document.getElementById('kpiOverallProgress').textContent = `${overallProgress}% of portfolio targets`;
    document.getElementById('kpiTotalTarget').textContent = `₹${totalTarget.toLocaleString()}`;
    document.getElementById('kpiCompletedGoals').textContent = `${completedGoalsCount} goal${completedGoalsCount === 1 ? '' : 's'} achieved`;
    document.getElementById('kpiAtRiskGoals').textContent = atRiskGoalsCount;

    // Overall Progress Bar
    const progBar = document.getElementById('dashboardOverallProgressBar');
    progBar.style.width = `${Math.min(100, overallProgress)}%`;
    if (overallProgress >= 100) progBar.className = 'progress-bar success';
    else progBar.className = 'progress-bar';

    document.getElementById('dashboardProgressSavedLabel').textContent = `Accumulated: ₹${totalSavings.toLocaleString()}`;
    document.getElementById('dashboardProgressTargetLabel').textContent = `Portfolio Target: ₹${totalTarget.toLocaleString()}`;
    document.getElementById('dashboardAvgScoreBadge').textContent = `Portfolio Reality Score: ${avgScore}/100`;

    // Render Charts
    SaveIQCharts.renderGoalsDistributionChart('dashboardGoalsChart', goals);

    // Render Alerts & Deadlines
    this.renderDashboardAlerts();

    // Render Goals Grid
    this.renderDashboardGoalsGrid();
  },

  /**
   * Render Dashboard Deadlines List
   */
  renderDashboardAlerts() {
    const list = document.getElementById('dashboardAlertsList');
    if (!list) return;

    const activeGoals = this.state.goals.filter(g => {
      const evalRes = SaveIQCalc.evaluateGoalReality(g, this.state.user ? this.state.user.MonthlyIncome : 0);
      return evalRes.status !== 'Completed';
    });

    const sorted = [...activeGoals].sort((a, b) => new Date(a.Deadline).getTime() - new Date(b.Deadline).getTime());

    if (sorted.length === 0) {
      list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem; text-align: center;">No upcoming active deadlines!</div>`;
      return;
    }

    list.innerHTML = sorted.map(g => {
      const days = SaveIQCalc.calculateDaysRemaining(new Date(), g.Deadline);
      const evalRes = SaveIQCalc.evaluateGoalReality(g, this.state.user ? this.state.user.MonthlyIncome : 0);
      const isUrgent = days <= 30;

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fa-solid ${isUrgent ? 'fa-hourglass-end' : 'fa-calendar-day'}" style="color: ${isUrgent ? '#ef4444' : '#06b6d4'};"></i>
            <div>
              <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">${g.GoalName}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">${days} days remaining &bull; Req: ₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo</div>
            </div>
          </div>
          <span class="badge ${evalRes.statusClass}">${evalRes.status}</span>
        </div>
      `;
    }).join('');
  },

  /**
   * Render Dashboard Goals Highlights
   */
  renderDashboardGoalsGrid() {
    const grid = document.getElementById('dashboardGoalsGrid');
    if (!grid) return;

    const displayGoals = this.state.goals.slice(0, 6);
    grid.innerHTML = displayGoals.map(g => this.createGoalCardHTML(g)).join('');
  },

  /**
   * Helper to generate Goal Card HTML
   */
  createGoalCardHTML(goal) {
    const evalRes = SaveIQCalc.evaluateGoalReality(goal, this.state.user ? this.state.user.MonthlyIncome : 0);
    const scoreClass = SaveIQCalc.getScoreTierClass(evalRes.score);
    const progress = Math.min(100, Math.max(0, evalRes.progressPercent || 0));
    const goalId = goal.GoalID || goal.goalId || goal.id;
    const goalName = goal.GoalName || goal.goalName || 'Savings Goal';
    const purpose = goal.Purpose || goal.purpose || 'Savings Goal';
    const saved = Number(goal.CurrentSavings !== undefined ? goal.CurrentSavings : goal.currentSavings) || 0;
    const target = Number(goal.TargetAmount !== undefined ? goal.TargetAmount : goal.targetAmount) || 0;
    const days = evalRes.daysRemaining !== undefined ? evalRes.daysRemaining : 0;
    const reqMonthly = evalRes.requiredMonthlySaving !== undefined ? evalRes.requiredMonthlySaving : 0;

    return `
      <div class="goal-card" onclick="SaveIQApp.navigateTo('goal-details', { goalId: '${goalId}' })">
        <div class="goal-card-top">
          <div style="flex: 1; min-width: 0; padding-right: 0.5rem;">
            <div class="goal-category-tag">${this.escapeHTML(purpose)}</div>
            <div class="goal-card-title">${this.escapeHTML(goalName)}</div>
          </div>
          <span class="badge ${evalRes.statusClass}">${evalRes.status}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted);">Reality Score</span>
          <span class="score-tier ${scoreClass}" style="font-size: 0.82rem; font-weight: 800; padding: 0.15rem 0.55rem; border-radius: 6px;">
            ${evalRes.score} / 100
          </span>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">
            <span>Progress (${progress}%)</span>
            <span>₹${saved.toLocaleString()} / ₹${target.toLocaleString()}</span>
          </div>
          <div class="progress-container">
            <div class="progress-bar ${progress >= 100 ? 'success' : ''}" style="width: ${progress}%;"></div>
          </div>
        </div>

        <div class="goal-card-stats">
          <div class="stat-item">
            <span class="stat-label">Saved</span>
            <span class="stat-val" style="color: #10b981;">₹${saved.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Target</span>
            <span class="stat-val">₹${target.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Monthly Req</span>
            <span class="stat-val">₹${reqMonthly.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Days Left</span>
            <span class="stat-val" style="color: ${days <= 30 ? '#ef4444' : 'var(--text-primary)'};">${days}d</span>
          </div>
        </div>

        <div class="goal-card-footer">
          <span><i class="fa-regular fa-calendar"></i> ${goal.Deadline || goal.deadline || 'Target'}</span>
          <span style="color: var(--accent-primary); font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
            Inspect Reality <i class="fa-solid fa-arrow-right"></i>
          </span>
        </div>
      </div>
    `;
  },

  /**
   * RENDER MY GOALS VIEW
   */
  renderMyGoalsList() {
    const user = this.state.user || {};
    const filter = this.state.currentGoalFilter || 'all';

    const evaluated = this.state.goals.map(g => {
      const evalRes = SaveIQCalc.evaluateGoalReality(g, user.MonthlyIncome || 0);
      return { ...g, _eval: evalRes };
    });

    // Update filter counts across all badges
    const countAll = document.getElementById('countFilterAll');
    const countOnTrack = document.getElementById('countFilterOnTrack');
    const countAdjust = document.getElementById('countFilterAdjust');
    const countAtRisk = document.getElementById('countFilterAtRisk');
    const countCompleted = document.getElementById('countFilterCompleted');

    if (countAll) countAll.textContent = evaluated.length;
    if (countOnTrack) countOnTrack.textContent = evaluated.filter(g => g._eval.status === 'On Track').length;
    if (countAdjust) countAdjust.textContent = evaluated.filter(g => g._eval.status === 'Needs Adjustment').length;
    if (countAtRisk) countAtRisk.textContent = evaluated.filter(g => g._eval.status === 'At Risk').length;
    if (countCompleted) countCompleted.textContent = evaluated.filter(g => g._eval.status === 'Completed').length;

    const filtered = filter === 'all' 
      ? evaluated 
      : evaluated.filter(g => g._eval.status === filter);

    const grid = document.getElementById('myGoalsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--gradient-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.1rem; color: var(--text-primary);">No goals found for "${filter}"</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">Create a new savings goal to start tracking reality score calculations.</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 1.25rem;" data-view="create-goal">
            <i class="fa-solid fa-plus"></i> Create Goal Now
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(g => this.createGoalCardHTML(g)).join('');
  },

  /**
   * RENDER GOAL DETAILS VIEW
   */
  async renderGoalDetails(goalId) {
    if (!goalId) {
      if (this.state.goals.length > 0) {
        goalId = this.state.goals[0].GoalID;
      } else {
        this.navigateTo('my-goals');
        return;
      }
    }

    const goal = this.state.goals.find(g => g.GoalID === goalId);
    if (!goal) {
      this.navigateTo('my-goals');
      return;
    }

    this.state.selectedGoalId = goalId;
    const user = this.state.user || {};
    const evalRes = SaveIQCalc.evaluateGoalReality(goal, user.MonthlyIncome || 0);

    // Title & Header info
    const nameEl = document.getElementById('detailGoalName');
    if (nameEl) nameEl.textContent = goal.GoalName || 'Savings Goal';

    const purposeEl = document.getElementById('detailGoalPurpose');
    if (purposeEl) purposeEl.textContent = goal.Purpose || 'Savings Goal';

    const createdEl = document.getElementById('detailCreatedDate');
    if (createdEl) createdEl.textContent = goal.CreatedDate || 'N/A';

    const deadlineEl = document.getElementById('detailDeadline');
    if (deadlineEl) deadlineEl.textContent = goal.Deadline || 'N/A';

    const daysEl = document.getElementById('detailDaysRemaining');
    if (daysEl) daysEl.textContent = evalRes.daysRemaining;

    const scoreNum = document.getElementById('detailScoreNum');
    if (scoreNum) scoreNum.textContent = evalRes.score;

    const statusBadge = document.getElementById('detailStatusBadge');
    if (statusBadge) {
      statusBadge.className = `badge ${evalRes.statusClass}`;
      statusBadge.textContent = evalRes.status;
    }

    // Progress Bar & Ratio
    const progText = document.getElementById('detailProgressPercentText');
    if (progText) progText.textContent = `${evalRes.progressPercent}% Saved`;

    const amountsRatio = document.getElementById('detailAmountsRatio');
    if (amountsRatio) amountsRatio.textContent = `₹${Number(goal.CurrentSavings).toLocaleString()} / ₹${Number(goal.TargetAmount).toLocaleString()}`;

    const progBar = document.getElementById('detailProgressBar');
    if (progBar) progBar.style.width = `${Math.min(100, evalRes.progressPercent)}%`;

    // KPIs
    const targetVal = document.getElementById('detailTargetVal');
    if (targetVal) targetVal.textContent = `₹${Number(goal.TargetAmount).toLocaleString()}`;

    const currentVal = document.getElementById('detailCurrentVal');
    if (currentVal) currentVal.textContent = `₹${Number(goal.CurrentSavings).toLocaleString()}`;

    const remVal = document.getElementById('detailRemainingVal');
    if (remVal) remVal.textContent = `₹${evalRes.remainingAmount.toLocaleString()}`;

    const reqVal = document.getElementById('detailRequiredVal');
    if (reqVal) reqVal.textContent = `₹${evalRes.requiredMonthlySaving.toLocaleString()}`;

    // Adaptive Status Callout
    const adaptiveCallout = document.getElementById('detailAdaptiveCallout');
    const adaptiveText = document.getElementById('detailAdaptiveText');
    if (adaptiveCallout && adaptiveText) {
      if (evalRes.currentSavings >= evalRes.targetAmount) {
        adaptiveText.textContent = `🎯 Goal achieved! You have accumulated ₹${Number(goal.CurrentSavings).toLocaleString()} (100% of ₹${Number(goal.TargetAmount).toLocaleString()}).`;
        adaptiveCallout.style.borderColor = 'var(--accent-emerald)';
      } else if (evalRes.capacityRatio >= 1.0) {
        adaptiveText.textContent = `✅ Your monthly capacity of ₹${evalRes.monthlyCapacity.toLocaleString()} comfortably covers the required rate of ₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo with a surplus of +₹${(evalRes.monthlyCapacity - evalRes.requiredMonthlySaving).toLocaleString()}/mo.`;
        adaptiveCallout.style.borderColor = 'var(--accent-emerald)';
      } else {
        const deficit = evalRes.requiredMonthlySaving - evalRes.monthlyCapacity;
        adaptiveText.textContent = `⚠️ Required savings is ₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo, which exceeds your current capacity of ₹${evalRes.monthlyCapacity.toLocaleString()}/mo by ₹${deficit.toLocaleString()}/mo. See recommended Plan A, B, or C below.`;
        adaptiveCallout.style.borderColor = 'var(--accent-amber)';
      }
    }

    // 4 Score Pillars Breakdown
    const p1Score = document.getElementById('pillarProgressScore');
    if (p1Score) p1Score.textContent = `${Math.min(30, Math.round((evalRes.progressPercent / 100) * 30))} / 30 pts`;
    const p1Bar = document.getElementById('pillarProgressBar');
    if (p1Bar) p1Bar.style.width = `${Math.min(100, evalRes.progressPercent)}%`;

    const capScoreVal = evalRes.requiredMonthlySaving <= 0 ? 45 : Math.min(45, Math.round(Math.min(1.0, evalRes.capacityRatio) * 45));
    const p2Score = document.getElementById('pillarCapacityScore');
    if (p2Score) p2Score.textContent = `${capScoreVal} / 45 pts`;
    const p2Bar = document.getElementById('pillarCapacityBar');
    if (p2Bar) p2Bar.style.width = `${Math.min(100, Math.round(evalRes.capacityRatio * 100))}%`;

    const timeScoreVal = evalRes.monthsRemaining >= 6 ? 15 : evalRes.monthsRemaining >= 3 ? 12 : evalRes.monthsRemaining >= 1 ? 8 : 4;
    const p3Score = document.getElementById('pillarTimeScore');
    if (p3Score) p3Score.textContent = `${timeScoreVal} / 15 pts`;
    const p3Bar = document.getElementById('pillarTimeBar');
    if (p3Bar) p3Bar.style.width = `${Math.min(100, Math.round((evalRes.monthsRemaining / 12) * 100))}%`;

    const p4Score = document.getElementById('pillarBudgetScore');
    if (p4Score) p4Score.textContent = `10 / 10 pts`;
    const p4Bar = document.getElementById('pillarBudgetBar');
    if (p4Bar) p4Bar.style.width = `100%`;

    // Timeline Chart
    SaveIQCharts.renderGoalProgressTimeline('detailTimelineChart', goal, this.state.savings);

    // Smart Alternative Plans (A, B, C)
    this.renderAlternativePlans(goal);

    // Savings History Table
    this.renderGoalSavingsHistory(goal.GoalID);

    // AI Strategic Advice
    this.loadGoalAIAdvice(goal);
  },

  /**
   * Render Smart Alternative Plans A, B, C
   */
  renderAlternativePlans(goal) {
    const grid = document.getElementById('detailAlternativesGrid');
    if (!grid) return;

    const user = this.state.user || {};
    const alts = SaveIQCalc.generateAlternativePlans(goal, user.MonthlyIncome || 0);

    grid.innerHTML = `
      <!-- Plan A: Extend Deadline -->
      <div class="alt-plan-card">
        <div class="alt-plan-badge" style="background: rgba(99,102,241,0.1); color: var(--accent-primary);"><i class="fa-solid fa-calendar-plus"></i> Plan A (Recommended)</div>
        <div class="alt-plan-title">${alts.planA.title}</div>
        <div class="alt-plan-desc">${alts.planA.description}</div>
        <div class="alt-plan-metrics">
          <div class="stat-item"><span class="stat-label">New Deadline</span><span class="stat-val" style="color: var(--accent-primary);">${alts.planA.newDeadline}</span></div>
          <div class="stat-item"><span class="stat-label">Monthly Rate</span><span class="stat-val">₹${alts.planA.newMonthlyRate.toLocaleString()}/mo</span></div>
          <div class="stat-item"><span class="stat-label">Reality Score</span><span class="stat-val" style="color: #10b981;">${alts.planA.score}/100</span></div>
        </div>
        <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 1rem;" onclick="SaveIQApp.applyAlternativePlan('${goal.GoalID}', 'deadline', '${alts.planA.newDeadline}')">
          <i class="fa-solid fa-check"></i> Adopt Plan A
        </button>
      </div>

      <!-- Plan B: Adjust Target -->
      <div class="alt-plan-card">
        <div class="alt-plan-badge" style="background: rgba(6,182,212,0.1); color: var(--accent-secondary);"><i class="fa-solid fa-tags"></i> Plan B</div>
        <div class="alt-plan-title">${alts.planB.title}</div>
        <div class="alt-plan-desc">${alts.planB.description}</div>
        <div class="alt-plan-metrics">
          <div class="stat-item"><span class="stat-label">Feasible Target</span><span class="stat-val" style="color: var(--accent-secondary);">₹${alts.planB.feasibleTarget.toLocaleString()}</span></div>
          <div class="stat-item"><span class="stat-label">Downscale</span><span class="stat-val">-₹${alts.planB.reduction.toLocaleString()}</span></div>
          <div class="stat-item"><span class="stat-label">Reality Score</span><span class="stat-val" style="color: #10b981;">${alts.planB.score}/100</span></div>
        </div>
        <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 1rem;" onclick="SaveIQApp.applyAlternativePlan('${goal.GoalID}', 'target', ${alts.planB.feasibleTarget})">
          <i class="fa-solid fa-check"></i> Adopt Plan B
        </button>
      </div>

      <!-- Plan C: Fast-Track Savings -->
      <div class="alt-plan-card">
        <div class="alt-plan-badge" style="background: rgba(16,185,129,0.1); color: var(--accent-emerald);"><i class="fa-solid fa-bolt"></i> Plan C</div>
        <div class="alt-plan-title">${alts.planC.title}</div>
        <div class="alt-plan-desc">${alts.planC.description}</div>
        <div class="alt-plan-metrics">
          <div class="stat-item"><span class="stat-label">Boost Capacity</span><span class="stat-val" style="color: var(--accent-emerald);">₹${alts.planC.requiredMonthlyCapacity.toLocaleString()}/mo</span></div>
          <div class="stat-item"><span class="stat-label">Extra Saving</span><span class="stat-val">+₹${alts.planC.extraNeeded.toLocaleString()}/mo</span></div>
          <div class="stat-item"><span class="stat-label">Reality Score</span><span class="stat-val" style="color: #10b981;">${alts.planC.score}/100</span></div>
        </div>
        <button class="btn btn-secondary btn-sm" style="width: 100%; margin-top: 1rem;" onclick="SaveIQApp.applyAlternativePlan('${goal.GoalID}', 'capacity', ${alts.planC.requiredMonthlyCapacity})">
          <i class="fa-solid fa-check"></i> Adopt Plan C
        </button>
      </div>
    `;
  },

  /**
   * Apply Alternative Plan to Goal
   */
  async applyAlternativePlan(goalId, field, value) {
    try {
      const payload = { goalId };
      if (field === 'deadline') payload.Deadline = value;
      if (field === 'target') payload.TargetAmount = value;
      if (field === 'capacity') payload.MonthlySavingCapacity = value;

      const res = await SaveIQAPI.request('updateGoal', payload);
      this.showToast('Alternative plan adopted successfully!', 'success');
      await this.loadAllData();
      await this.refreshNotifications();
      this.renderGoalDetails(goalId);
    } catch (err) {
      this.showToast('Failed to apply plan', 'error');
    }
  },

  /**
   * Render Savings History for specific goal
   */
  async renderGoalSavingsHistory(goalId) {
    const tbody = document.getElementById('detailSavingsTableBody');
    if (!tbody) return;

    try {
      const res = await SaveIQAPI.request('getSavingsHistory', { goalId });
      const records = res.data || [];

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No deposits logged yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = records.map(r => `
        <tr>
          <td style="color: var(--text-secondary);">${r.Date}</td>
          <td style="font-weight: 600; color: var(--accent-emerald);">+₹${Number(r.Amount).toLocaleString()}</td>
          <td style="color: var(--text-secondary);">${this.escapeHTML(r.Notes || 'Savings deposit')}</td>
          <td><span class="badge badge-on-track" style="font-size: 0.72rem;">Verified</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.warn('Savings history load error:', err);
    }
  },

  /**
   * Load Groq AI Goal Strategy Advice
   */
  async loadGoalAIAdvice(goal) {
    const box = document.getElementById('detailAIAdviceContent');
    if (!box) return;

    box.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-primary);"></i> Groq AI is analyzing deterministic parameters...`;

    try {
      const advice = await SaveIQAI.getGoalStrategicAdvice(goal, this.state.user || {});
      box.innerHTML = this.formatMarkdown(advice);
    } catch (err) {
      box.textContent = 'Strategic advisory temporarily unavailable.';
    }
  },

  /**
   * ==========================================================================
   * LIVE PREVIEW & WHAT-IF SIMULATOR
   * ==========================================================================
   */
  setupLivePreviewListeners() {
    ['goalTargetInput', 'goalCurrentInput', 'goalCapacityInput', 'goalDeadlineInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.triggerCreateGoalPreview());
      }
    });
  },

  triggerCreateGoalPreview() {
    const target = Number(document.getElementById('goalTargetInput').value) || 0;
    const current = Number(document.getElementById('goalCurrentInput').value) || 0;
    const capacity = Number(document.getElementById('goalCapacityInput').value) || 0;
    const deadline = document.getElementById('goalDeadlineInput').value;

    if (!target || !deadline) return;

    const tempGoal = {
      TargetAmount: target,
      CurrentSavings: current,
      MonthlySavingCapacity: capacity,
      Deadline: deadline
    };

    const user = this.state.user || {};
    const evalRes = SaveIQCalc.evaluateGoalReality(tempGoal, user.MonthlyIncome || 0);

    // Update Score & Tier
    document.getElementById('previewScoreVal').textContent = evalRes.score;
    const tier = SaveIQCalc.getScoreTier(evalRes.score);
    const tierPill = document.getElementById('previewTierPill');
    tierPill.className = `score-tier ${tier.class}`;
    tierPill.textContent = tier.label;

    SaveIQCharts.renderGaugeChart('createGoalScoreGaugeCanvas', evalRes.score);

    // Update Stats
    document.getElementById('previewRequiredVal').textContent = `₹${evalRes.requiredMonthlySaving.toLocaleString()}`;
    document.getElementById('previewCapacityVal').textContent = `₹${capacity.toLocaleString()}`;

    const surplus = capacity - evalRes.requiredMonthlySaving;
    const surplusEl = document.getElementById('previewSurplusVal');
    if (surplus >= 0) {
      surplusEl.textContent = `+₹${surplus.toLocaleString()}`;
      surplusEl.style.color = '#10b981';
    } else {
      surplusEl.textContent = `-₹${Math.abs(surplus).toLocaleString()}`;
      surplusEl.style.color = '#ef4444';
    }

    // AI Instant Verdict
    const adviceBox = document.getElementById('previewAIAdviceText');
    if (adviceBox) {
      if (evalRes.score >= 80) {
        adviceBox.innerHTML = `🌟 <strong>Feasible Plan:</strong> Your capacity comfortably meets the required pace of <strong>₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo</strong>. Maintain discipline to complete ahead of schedule.`;
      } else if (evalRes.score >= 50) {
        adviceBox.innerHTML = `⚠️ <strong>Adjustment Recommended:</strong> A deficit of <strong>₹${Math.abs(surplus).toLocaleString()}/mo</strong> exists. Consider extending deadline by ~${Math.ceil(Math.abs(surplus)/capacity)} months.`;
      } else {
        adviceBox.innerHTML = `🚨 <strong>High Risk Plan:</strong> Target requires <strong>₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo</strong> versus capacity of <strong>₹${capacity.toLocaleString()}/mo</strong>. We advise adjusting target or extending timeline.`;
      }
    }
  },

  /**
   * WHAT-IF SIMULATOR INITIALIZATION
   */
  initWhatIfView(preferredGoalId) {
    const select = document.getElementById('whatIfGoalSelect');
    if (!select) return;

    const goals = this.state.goals;
    if (goals.length === 0) {
      select.innerHTML = '<option value="">No active goals available to simulate</option>';
      return;
    }

    select.innerHTML = goals.map(g => `
      <option value="${g.GoalID}" ${g.GoalID === preferredGoalId ? 'selected' : ''}>
        ${this.escapeHTML(g.GoalName)} (Target: ₹${Number(g.TargetAmount).toLocaleString()})
      </option>
    `).join('');

    const targetGoalId = preferredGoalId || select.value || goals[0].GoalID;
    this.loadWhatIfGoal(targetGoalId);
  },

  setupWhatIfListeners() {
    const select = document.getElementById('whatIfGoalSelect');
    if (select) {
      select.addEventListener('change', (e) => this.loadWhatIfGoal(e.target.value));
    }

    // Sliders
    const targetSlider = document.getElementById('whatIfTargetSlider');
    const savingsSlider = document.getElementById('whatIfSavingsSlider');
    const capSlider = document.getElementById('whatIfCapacitySlider');
    const monthsSlider = document.getElementById('whatIfMonthsSlider');

    if (targetSlider) targetSlider.addEventListener('input', () => this.runWhatIfSimulation());
    if (savingsSlider) savingsSlider.addEventListener('input', () => this.runWhatIfSimulation());
    if (capSlider) capSlider.addEventListener('input', () => this.runWhatIfSimulation());
    if (monthsSlider) monthsSlider.addEventListener('input', () => this.runWhatIfSimulation());

    // Reset button
    const resetBtn = document.getElementById('resetWhatIfBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.state.whatIfBaseGoal) {
          this.loadWhatIfGoal(this.state.whatIfBaseGoal.GoalID);
          this.showToast('Reset to original goal parameters', 'info');
        }
      });
    }

    // Apply / Save as Live Goal button
    const applyBtn = document.getElementById('applyWhatIfAsGoalBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        const baseGoal = this.state.whatIfBaseGoal;
        if (!baseGoal) return;

        const simTarget = Number(document.getElementById('whatIfTargetSlider')?.value || baseGoal.TargetAmount);
        const simSavings = Number(document.getElementById('whatIfSavingsSlider')?.value || baseGoal.CurrentSavings);
        const simCap = Number(document.getElementById('whatIfCapacitySlider')?.value || baseGoal.MonthlySavingCapacity);
        const simMonths = Number(document.getElementById('whatIfMonthsSlider')?.value || 6);

        const simDeadline = new Date();
        simDeadline.setDate(simDeadline.getDate() + Math.round(simMonths * 30.4375));
        const deadlineStr = simDeadline.toISOString().split('T')[0];

        try {
          await SaveIQAPI.request('updateGoal', {
            GoalID: baseGoal.GoalID,
            goalId: baseGoal.GoalID,
            TargetAmount: simTarget,
            targetAmount: simTarget,
            MonthlySavingCapacity: simCap,
            monthlyCapacity: simCap,
            Deadline: deadlineStr,
            deadline: deadlineStr
          });

          // If savings changed (lump sum simulated), record difference
          const savingsDiff = simSavings - Number(baseGoal.CurrentSavings || 0);
          if (savingsDiff > 0) {
            await SaveIQAPI.request('addSavings', {
              GoalID: baseGoal.GoalID,
              goalId: baseGoal.GoalID,
              Amount: savingsDiff,
              amount: savingsDiff,
              Date: new Date().toISOString().split('T')[0],
              Notes: 'What-If Simulation Lump-sum adjustment'
            });
          }

          this.showToast(`Updated goal "${baseGoal.GoalName}" with simulated parameters!`, 'success');
          await this.loadAllData();
          await this.refreshNotifications();
          this.navigateTo('goal-details', { goalId: baseGoal.GoalID });
        } catch (err) {
          this.showToast('Failed to apply simulated scenario', 'error');
        }
      });
    }
  },

  loadWhatIfGoal(goalId) {
    const goal = this.state.goals.find(g => g.GoalID === goalId);
    if (!goal) return;

    this.state.whatIfBaseGoal = goal;
    const user = this.state.user || {};
    const evalRes = SaveIQCalc.evaluateGoalReality(goal, user.MonthlyIncome || 0);

    // Configure Slider limits
    const targetSlider = document.getElementById('whatIfTargetSlider');
    const savingsSlider = document.getElementById('whatIfSavingsSlider');
    const capSlider = document.getElementById('whatIfCapacitySlider');
    const monthsSlider = document.getElementById('whatIfMonthsSlider');

    const baseTarget = Number(goal.TargetAmount || 100000);
    const baseSavings = Number(goal.CurrentSavings || 0);
    const baseCap = Number(goal.MonthlySavingCapacity || 10000);
    const baseDays = evalRes.daysRemaining || 180;
    const baseMonths = Math.max(1, Math.round(baseDays / 30.4375));

    if (targetSlider) {
      targetSlider.min = Math.max(5000, Math.round(baseTarget * 0.3 / 1000) * 1000);
      targetSlider.max = Math.round(baseTarget * 2.5 / 1000) * 1000;
      targetSlider.value = baseTarget;
      targetSlider.step = 2000;
    }

    if (savingsSlider) {
      savingsSlider.min = 0;
      savingsSlider.max = Math.max(baseTarget * 1.5, baseSavings * 2, 50000);
      savingsSlider.value = baseSavings;
      savingsSlider.step = 1000;
    }

    if (capSlider) {
      capSlider.min = Math.max(500, Math.round(baseCap * 0.25 / 500) * 500);
      capSlider.max = Math.max(50000, Math.round(baseCap * 3 / 1000) * 1000);
      capSlider.value = baseCap;
      capSlider.step = 500;
    }

    if (monthsSlider) {
      monthsSlider.min = Math.max(1, baseMonths - 8);
      monthsSlider.max = Math.max(36, baseMonths + 24);
      monthsSlider.value = baseMonths;
      monthsSlider.step = 1;
    }

    this.runWhatIfSimulation();
  },

  runWhatIfSimulation() {
    const baseGoal = this.state.whatIfBaseGoal;
    if (!baseGoal) return;

    const targetSlider = document.getElementById('whatIfTargetSlider');
    const savingsSlider = document.getElementById('whatIfSavingsSlider');
    const capSlider = document.getElementById('whatIfCapacitySlider');
    const monthsSlider = document.getElementById('whatIfMonthsSlider');

    const simTarget = targetSlider ? Number(targetSlider.value) : Number(baseGoal.TargetAmount);
    const simSavings = savingsSlider ? Number(savingsSlider.value) : Number(baseGoal.CurrentSavings);
    const simCap = capSlider ? Number(capSlider.value) : Number(baseGoal.MonthlySavingCapacity);
    const simMonths = monthsSlider ? Number(monthsSlider.value) : 6;

    // Update displays
    const targetDisp = document.getElementById('whatIfTargetDisplay');
    if (targetDisp) targetDisp.textContent = `₹${simTarget.toLocaleString()}`;

    const savingsDisp = document.getElementById('whatIfSavingsDisplay');
    if (savingsDisp) savingsDisp.textContent = `₹${simSavings.toLocaleString()}`;

    const capDisp = document.getElementById('whatIfCapacityDisplay');
    if (capDisp) capDisp.textContent = `₹${simCap.toLocaleString()}/mo`;

    const monthsDisp = document.getElementById('whatIfMonthsDisplay');
    if (monthsDisp) monthsDisp.textContent = `${simMonths} month${simMonths === 1 ? '' : 's'}`;

    // Construct simulated deadline
    const simDeadline = new Date();
    simDeadline.setDate(simDeadline.getDate() + Math.round(simMonths * 30.4375));
    const deadlineStr = simDeadline.toISOString().split('T')[0];

    const simulatedGoal = {
      TargetAmount: simTarget,
      targetAmount: simTarget,
      CurrentSavings: simSavings,
      currentSavings: simSavings,
      MonthlySavingCapacity: simCap,
      monthlyCapacity: simCap,
      Deadline: deadlineStr,
      deadline: deadlineStr
    };

    const user = this.state.user || {};
    const baseEval = SaveIQCalc.evaluateGoalReality(baseGoal, user.MonthlyIncome || 0);
    const simEval = SaveIQCalc.evaluateGoalReality(simulatedGoal, user.MonthlyIncome || 0);

    // Score comparison & Delta
    const origScoreEl = document.getElementById('whatIfOriginalScore');
    if (origScoreEl) origScoreEl.textContent = `${baseEval.score} / 100`;

    const origReqEl = document.getElementById('whatIfOriginalReq');
    if (origReqEl) origReqEl.textContent = `Req: ₹${Math.round(baseEval.requiredMonthlySaving).toLocaleString()}/mo`;

    const simScoreEl = document.getElementById('whatIfSimulatedScore');
    if (simScoreEl) simScoreEl.textContent = `${simEval.score} / 100`;

    const simReqEl = document.getElementById('whatIfSimulatedReq');
    if (simReqEl) simReqEl.textContent = `Req: ₹${Math.round(simEval.requiredMonthlySaving).toLocaleString()}/mo`;

    const delta = simEval.score - baseEval.score;
    const deltaBadge = document.getElementById('whatIfScoreDeltaBadge');
    if (deltaBadge) {
      if (delta > 0) {
        deltaBadge.textContent = `+${delta} pts`;
        deltaBadge.className = 'reality-score-badge score-excellent';
      } else if (delta < 0) {
        deltaBadge.textContent = `${delta} pts`;
        deltaBadge.className = 'reality-score-badge score-critical';
      } else {
        deltaBadge.textContent = `0 pts`;
        deltaBadge.className = 'reality-score-badge score-moderate';
      }
    }

    // Chart Comparison
    SaveIQCharts.renderWhatIfComparisonChart('whatIfChartCanvas', baseEval, simEval);

    // AI Verdict
    const verdictEl = document.getElementById('whatIfAIVerdict');
    if (verdictEl) {
      const advice = SaveIQAI.generateWhatIfVerdict(baseGoal, simulatedGoal, baseEval, simEval);
      verdictEl.innerHTML = this.formatMarkdown(advice);
    }
  },

  /**
   * ==========================================================================
   * EXPENSES & BUDGET ANALYSIS VIEW
   * ==========================================================================
   */
  renderExpensesView() {
    const user = this.state.user || {};
    const expenses = this.state.expenses || [];
    const analysis = SaveIQCalc.analyzeExpensesAndBudget(user.MonthlyIncome || 0, expenses);

    document.getElementById('expMonthlyIncome').textContent = `₹${analysis.income.toLocaleString()}`;
    document.getElementById('expTotalSpend').textContent = `₹${analysis.totalExpenses.toLocaleString()}`;
    document.getElementById('expSpendRate').textContent = `${analysis.expenseRatePercent}% of monthly income`;
    document.getElementById('expNetSavings').textContent = `₹${analysis.netDisposableSavings.toLocaleString()}`;
    document.getElementById('expSavingsRate').textContent = `${analysis.savingsRatePercent}% savings velocity`;

    // Charts
    SaveIQCharts.renderExpensePieChart('expenseCategoryChartCanvas', analysis.categoryTotals);
    SaveIQCharts.renderBudgetRatioChart('budgetRuleChartCanvas', analysis.budget50_30_20);

    // AI Spending Insights
    const aiAdvice = SaveIQAI.generateSmartLocalExpenseAdvice(analysis);
    document.getElementById('expenseAIInsightsContent').innerHTML = this.formatMarkdown(aiAdvice);

    // Expense Table
    this.renderExpensesTable();
  },

  renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;

    if (!this.state.expenses || this.state.expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No expenses recorded yet. Log your first expense above!</td></tr>`;
      return;
    }

    const categoryStyles = {
      Rent: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', icon: 'fa-house' },
      Housing: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', icon: 'fa-house' },
      Groceries: { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', icon: 'fa-basket-shopping' },
      Food: { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', icon: 'fa-utensils' },
      'Dining Out': { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', icon: 'fa-burger' },
      Dining: { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', icon: 'fa-burger' },
      Transport: { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', icon: 'fa-car' },
      Fuel: { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', icon: 'fa-gas-pump' },
      Utilities: { bg: 'rgba(6, 182, 212, 0.12)', color: '#0891b2', icon: 'fa-bolt' },
      Bills: { bg: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', icon: 'fa-file-invoice-dollar' },
      Shopping: { bg: 'rgba(236, 72, 153, 0.12)', color: '#db2777', icon: 'fa-bag-shopping' },
      Entertainment: { bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', icon: 'fa-film' },
      Education: { bg: 'rgba(20, 184, 166, 0.12)', color: '#0d9488', icon: 'fa-graduation-cap' },
      Health: { bg: 'rgba(244, 63, 94, 0.12)', color: '#e11d48', icon: 'fa-heart-pulse' },
      Insurance: { bg: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', icon: 'fa-shield-halved' },
      Other: { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', icon: 'fa-receipt' }
    };

    tbody.innerHTML = this.state.expenses.map(exp => {
      const cat = (exp.Category || exp.category || 'Other').trim();
      const style = categoryStyles[cat] || categoryStyles['Other'];
      const amt = Number(exp.Amount !== undefined ? exp.Amount : exp.amount) || 0;
      const desc = exp.Description || exp.description || exp.Notes || exp.notes || 'Expense';
      const date = exp.Date || exp.date || '';

      return `
        <tr>
          <td style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fa-regular fa-calendar" style="margin-right: 0.35rem; color: var(--text-muted);"></i> ${date}</td>
          <td>
            <span class="badge" style="background: ${style.bg}; color: ${style.color}; border: 1px solid ${style.color}33; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.65rem; border-radius: 6px;">
              <i class="fa-solid ${style.icon}"></i> ${this.escapeHTML(cat)}
            </span>
          </td>
          <td style="color: var(--text-primary); font-weight: 500;">${this.escapeHTML(desc)}</td>
          <td style="font-weight: 700; color: #ef4444; font-size: 0.92rem;">-₹${amt.toLocaleString()}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="SaveIQApp.deleteExpense('${exp.ExpenseID || exp.expenseId}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Delete Expense">
              <i class="fa-solid fa-trash" style="color: #ef4444;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async deleteExpense(expenseId) {
    try {
      await SaveIQAPI.request('deleteExpense', { expenseId });
      this.showToast('Expense removed', 'info');
      await this.loadAllData();
      this.renderExpensesView();
    } catch (err) {
      this.showToast('Failed to delete expense', 'error');
    }
  },

  /**
   * ==========================================================================
   * QUICK DEPOSIT MODAL
   * ==========================================================================
   */
  openDepositModal() {
    const modal = document.getElementById('depositModal');
    const select = document.getElementById('depositGoalSelect');
    if (!modal || !select) return;

    const goals = this.state.goals;
    if (goals.length === 0) {
      this.showToast('Create a goal before recording savings deposits', 'info');
      this.navigateTo('create-goal');
      return;
    }

    select.innerHTML = goals.map(g => `
      <option value="${g.GoalID}">
        ${this.escapeHTML(g.GoalName)} (Saved: ₹${Number(g.CurrentSavings).toLocaleString()} / ₹${Number(g.TargetAmount).toLocaleString()})
      </option>
    `).join('');

    modal.classList.add('active');
  },

  closeDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.classList.remove('active');
  },

  /**
   * ==========================================================================
   * EVENT LISTENERS FOR FORMS & MODALS
   * ==========================================================================
   */
  setupEventListeners() {
    // Create Goal Form
    const createForm = document.getElementById('createGoalForm');
    if (createForm) {
      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goalName = document.getElementById('goalNameInput').value;
        const purpose = document.getElementById('goalPurposeInput').value;
        const targetAmount = Number(document.getElementById('goalTargetInput').value);
        const currentSavings = Number(document.getElementById('goalCurrentInput').value) || 0;
        const monthlyCapacity = Number(document.getElementById('goalCapacityInput').value);
        const deadline = document.getElementById('goalDeadlineInput').value;
        const emailAlert = document.getElementById('goalEmailAlertInput').checked;

        if (targetAmount <= 0) {
          this.showToast('Target amount must be greater than 0', 'error');
          return;
        }

        try {
          await SaveIQAPI.request('createGoal', {
            goalName,
            purpose,
            targetAmount,
            currentSavings,
            monthlyCapacity,
            deadline,
            emailAlert
          });

          this.showToast(`Goal "${goalName}" created successfully!`, 'success');
          createForm.reset();
          this.setDefaultDates();
          await this.loadAllData();
          await this.refreshNotifications();
          this.navigateTo('my-goals');
        } catch (err) {
          this.showToast('Failed to create goal', 'error');
        }
      });
    }

    // Add Expense Form
    const expForm = document.getElementById('addExpenseForm');
    if (expForm) {
      expForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('expenseCategoryInput').value;
        const amount = Number(document.getElementById('expenseAmountInput').value);
        const date = document.getElementById('expenseDateInput').value;
        const notes = document.getElementById('expenseNotesInput').value;

        try {
          await SaveIQAPI.request('addExpense', { category, amount, date, notes });
          this.showToast('Expense recorded', 'success');
          expForm.reset();
          this.setDefaultDates();
          await this.loadAllData();
          this.renderExpensesView();
        } catch (err) {
          this.showToast('Failed to add expense', 'error');
        }
      });
    }

    // Profile Form
    const profForm = document.getElementById('profileForm');
    if (profForm) {
      profForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const Name = document.getElementById('profileName').value;
        const Email = document.getElementById('profileEmail').value;
        const MonthlyIncome = Number(document.getElementById('profileIncome').value);
        const MonthlySavingCapacity = Number(document.getElementById('profileCapacity').value);

        try {
          await SaveIQAPI.request('updateUser', { Name, Email, MonthlyIncome, MonthlySavingCapacity });
          this.showToast('Profile updated', 'success');
          await this.loadAllData();
        } catch (err) {
          this.showToast('Failed to update profile', 'error');
        }
      });
    }

    // Deposit Modal
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
      depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goalId = document.getElementById('depositGoalSelect').value;
        const amount = Number(document.getElementById('depositAmountInput').value);
        const date = document.getElementById('depositDateInput').value;
        const notes = document.getElementById('depositNotesInput').value;

        try {
          await SaveIQAPI.request('addSavings', { goalId, amount, date, notes });
          this.closeDepositModal();
          this.showToast(`Logged ₹${amount.toLocaleString()} deposit!`, 'success');
          await this.loadAllData();
          await this.refreshNotifications();
          if (this.state.currentView === 'goal-details') {
            this.renderGoalDetails(goalId);
          } else {
            this.renderDashboard();
          }
        } catch (err) {
          this.showToast('Failed to record deposit', 'error');
        }
      });
    }

    const closeDepositBtn = document.getElementById('closeDepositModalBtn');
    if (closeDepositBtn) {
      closeDepositBtn.addEventListener('click', () => this.closeDepositModal());
    }

    // AI Quick Chips
    document.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt') || chip.textContent.trim();
        const input = document.getElementById('aiChatInput');
        if (input) {
          input.value = prompt;
          const form = document.getElementById('aiChatForm');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      });
    });

    // AI Chat Form
    const aiForm = document.getElementById('aiChatForm');
    if (aiForm) {
      aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('aiChatInput');
        const query = input ? input.value.trim() : '';
        if (!query) return;

        if (input) input.value = '';
        this.appendChatMessage('user', query);

        const typingId = this.appendChatTyping();
        try {
          const response = await SaveIQAI.askAdvisorQuestion(query, {
            user: this.state.user || {},
            goals: this.state.goals || [],
            expenses: this.state.expenses || []
          });
          this.removeChatTyping(typingId);
          this.appendChatMessage('ai', response);
        } catch (err) {
          this.removeChatTyping(typingId);
          this.appendChatMessage('ai', 'Financial advisor is currently offline. Please try again.');
        }
      });
    }

    // Refresh AI Goal Advice Button
    const refreshGoalAIBtn = document.getElementById('refreshGoalAIBtn');
    if (refreshGoalAIBtn) {
      refreshGoalAIBtn.addEventListener('click', () => {
        if (this.state.selectedGoalId) {
          const goal = this.state.goals.find(g => g.GoalID === this.state.selectedGoalId);
          if (goal) this.loadGoalAIAdvice(goal);
        }
      });
    }

    // Node.js REST API Endpoint Save Button
    const saveGasBtn = document.getElementById('saveGasUrlBtn');
    if (saveGasBtn) {
      saveGasBtn.addEventListener('click', async () => {
        const input = document.getElementById('gasEndpointInput');
        const url = input ? input.value.trim() : 'http://localhost:5000/api';
        SaveIQAPI.setApiUrl(url);
        await this.updateBackendStatusIndicator();
        this.showToast('Node.js REST API URL saved!', 'success');
        await this.loadAllData();
        await this.refreshNotifications();
      });
    }

    const clearGasBtn = document.getElementById('disconnectGasBtn');
    if (clearGasBtn) {
      clearGasBtn.addEventListener('click', async () => {
        SaveIQAPI.setApiUrl('http://localhost:5000/api');
        const input = document.getElementById('gasEndpointInput');
        if (input) input.value = 'http://localhost:5000/api';
        await this.updateBackendStatusIndicator();
        this.showToast('Reset to default Express REST API mode', 'info');
        await this.loadAllData();
        await this.refreshNotifications();
      });
    }
  },

  /**
   * Update Backend Status Indicator
   */
  async updateBackendStatusIndicator() {
    const health = await SaveIQAPI.checkBackendHealth();
    const text = document.getElementById('backendStatusText');
    const dot = document.getElementById('backendStatusDot');
    const input = document.getElementById('gasEndpointInput');
    const report = document.getElementById('gasStatusReport');

    const url = SaveIQAPI.getApiUrl();
    if (input) input.value = url;

    if (health.online) {
      if (text) text.innerHTML = '<i class="fa-brands fa-node-js" style="color:#10b981;"></i> Node.js + Firebase REST';
      if (dot) {
        dot.className = 'status-dot';
        dot.style.backgroundColor = '#10b981';
        dot.style.boxShadow = '0 0 8px #10b981';
      }
      if (report) report.innerHTML = `<span style="color: #10b981; font-weight: 600;">Connected to Live Express REST API & Cloud Firestore.</span> (Port 5000)`;
    } else {
      if (text) text.innerHTML = '<i class="fa-solid fa-database"></i> Local Resilient Storage';
      if (dot) {
        dot.className = 'status-dot offline';
        dot.style.backgroundColor = '#64748b';
        dot.style.boxShadow = 'none';
      }
      if (report) report.innerHTML = `Running on fast, zero-config Local Storage database (Server offline).`;
    }
  },

  /**
   * Append Chat Message in AI Advisor
   */
  appendChatMessage(sender, text) {
    const history = document.getElementById('aiChatFeed') || document.getElementById('chatMessagesContainer');
    if (!history) return;

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '0.75rem';
    div.style.marginBottom = '1rem';
    div.style.justifyContent = sender === 'user' ? 'flex-end' : 'flex-start';

    if (sender === 'user') {
      div.innerHTML = `
        <div style="background: var(--gradient-brand); color: #ffffff; padding: 0.75rem 1.1rem; border-radius: var(--radius-md); font-size: 0.88rem; max-width: 80%; box-shadow: var(--shadow-sm);">
          ${this.escapeHTML(text)}
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="ai-sparkle" style="width: 32px; height: 32px; font-size: 0.85rem; flex-shrink: 0;"><i class="fa-solid fa-robot"></i></div>
        <div style="background: #ffffff; padding: 0.85rem 1.1rem; border-radius: var(--radius-md); font-size: 0.88rem; color: #1e293b; line-height: 1.5; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm); max-width: 85%;">
          ${this.formatMarkdown(text)}
        </div>
      `;
    }

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  },

  appendChatTyping() {
    const history = document.getElementById('aiChatFeed') || document.getElementById('chatMessagesContainer');
    if (!history) return null;

    const typingId = 'typing_' + Date.now();
    const div = document.createElement('div');
    div.id = typingId;
    div.style.display = 'flex';
    div.style.gap = '0.75rem';
    div.style.marginBottom = '1rem';
    div.innerHTML = `
      <div class="ai-sparkle" style="width: 32px; height: 32px; font-size: 0.85rem; flex-shrink: 0;"><i class="fa-solid fa-robot"></i></div>
      <div style="background: #ffffff; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-secondary); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
        <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--accent-primary);"></i> Groq AI is formulating financial advice...
      </div>
    `;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
    return typingId;
  },

  removeChatTyping(typingId) {
    if (!typingId) return;
    const el = document.getElementById(typingId);
    if (el) el.remove();
  },

  /**
   * Toast notification system
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconMap = {
      'success': 'fa-circle-check',
      'error': 'fa-circle-exclamation',
      'info': 'fa-circle-info'
    };

    toast.innerHTML = `
      <i class="fa-solid ${iconMap[type] || 'fa-bell'}" style="font-size: 1.1rem; color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};"></i>
      <span>${this.escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  /**
   * Markdown Formatter Helper
   */
  formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/### (.*?)\n/g, '<h3 style="font-size:1.05rem; font-weight:700; color:#1e1b4b; margin-top:0.6rem; margin-bottom:0.3rem;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a; font-weight:600;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#475569;">$1</em>')
      .replace(/> (.*?)\n/g, '<blockquote style="border-left: 3px solid var(--accent-primary); padding-left: 0.75rem; margin: 0.5rem 0; color: #475569; font-size: 0.82rem;">$1</blockquote>')
      .replace(/- (.*?)\n/g, '<li style="margin-left: 1rem; margin-bottom: 0.25rem; color:#334155;">$1</li>');
    return html.replace(/\n/g, '<br>');
  },

  escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  SaveIQApp.init();
});
