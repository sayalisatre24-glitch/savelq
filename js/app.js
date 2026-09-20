/**
 * SaveIQ - Main Application Controller
 * Handles SPA navigation, data state, interactive recalculations, What-If simulator,
 * chart refreshes, modal interactions, and AI advisor dialogues.
 */

const SaveIQApp = {
  state: {
    currentView: 'dashboard',
    user: null,
    goals: [],
    expenses: [],
    savings: [],
    alerts: [],
    selectedGoalId: null,
    currentGoalFilter: 'all',
    whatIfSelectedGoal: null,
    whatIfBaseGoal: null
  },

  /**
   * Initialize App
   */
  async init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.setDefaultDates();
    await this.loadAllData();
    this.setupLivePreviewListeners();
    this.setupWhatIfListeners();
    this.updateBackendStatusIndicator();
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

    // Header user badge click -> profile
    const userBadge = document.getElementById('headerUserBadge');
    if (userBadge) {
      userBadge.addEventListener('click', () => this.navigateTo('profile'));
    }

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
        this.navigateTo(target.dataset.view);
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
    } else if (viewName === 'create-goal') {
      this.triggerCreateGoalPreview();
    }
  },

  /**
   * Load all core data from API
   */
  async loadAllData() {
    try {
      const userRes = await SaveIQAPI.request('getUser');
      this.state.user = userRes.data || { Name: 'User', MonthlyIncome: 60000, MonthlySavingCapacity: 15000 };

      const goalsRes = await SaveIQAPI.request('getGoals');
      this.state.goals = goalsRes.data || [];

      const expRes = await SaveIQAPI.request('getExpenses');
      this.state.expenses = expRes.data || [];

      const savRes = await SaveIQAPI.request('getSavingsHistory');
      this.state.savings = savRes.data || [];

      const altRes = await SaveIQAPI.request('getAlerts');
      this.state.alerts = altRes.data || [];

      this.updateUserUI();
      this.renderDashboard();
    } catch (err) {
      console.error('Data load error:', err);
      this.showToast('Error loading data', 'error');
    }
  },

  /**
   * Update User Badge UI
   */
  updateUserUI() {
    if (!this.state.user) return;
    const name = this.state.user.Name || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    document.getElementById('headerUserName').textContent = name;
    document.getElementById('headerUserAvatar').textContent = initials;
    
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
   * Render Dashboard Alerts & Upcoming Deadlines List
   */
  renderDashboardAlerts() {
    const list = document.getElementById('dashboardAlertsList');
    if (!list) return;

    const activeGoals = this.state.goals.filter(g => Number(g.CurrentSavings) < Number(g.TargetAmount));
    const sorted = [...activeGoals].sort((a, b) => new Date(a.Deadline) - new Date(b.Deadline)).slice(0, 3);

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
              <div style="font-size: 0.88rem; font-weight: 600; color: #fff;">${g.GoalName}</div>
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
    const progress = evalRes.progressPercent;
    
    return `
      <div class="goal-card" onclick="SaveIQApp.navigateTo('goal-details', { goalId: '${goal.GoalID}' })">
        <div class="goal-card-top">
          <div>
            <div class="goal-category-tag">${goal.Purpose || 'Savings Target'}</div>
            <h3 class="goal-card-title">${goal.GoalName}</h3>
          </div>
          <span class="badge ${evalRes.statusClass}">${evalRes.status}</span>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
            <span style="color: var(--text-secondary);">Progress (${progress}%)</span>
            <span style="font-weight: 600;">₹${Number(goal.CurrentSavings).toLocaleString()} / ₹${Number(goal.TargetAmount).toLocaleString()}</span>
          </div>
          <div class="progress-container">
            <div class="progress-bar ${evalRes.status === 'Completed' ? 'success' : ''}" style="width: ${progress}%;"></div>
          </div>
        </div>

        <div class="goal-card-stats">
          <div class="stat-item">
            <span class="stat-label">Required / Mo</span>
            <span class="stat-val">₹${evalRes.requiredMonthlySaving.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Capacity / Mo</span>
            <span class="stat-val">₹${Number(goal.MonthlySavingCapacity).toLocaleString()}</span>
          </div>
        </div>

        <div class="goal-card-footer">
          <span><i class="fa-regular fa-clock"></i> ${evalRes.daysRemaining} days left</span>
          <span class="reality-score-badge ${evalRes.scoreClass}">
            <i class="fa-solid fa-gauge-simple-high"></i> ${evalRes.score}/100
          </span>
        </div>
      </div>
    `;
  },

  /**
   * RENDER MY GOALS VIEW
   */
  renderMyGoalsList() {
    const filter = this.state.currentGoalFilter;
    const goals = this.state.goals;
    const user = this.state.user || {};

    // Count badges
    let countAll = goals.length;
    let countOnTrack = 0;
    let countAdjust = 0;
    let countAtRisk = 0;
    let countCompleted = 0;

    const evaluated = goals.map(g => {
      const evalRes = SaveIQCalc.evaluateGoalReality(g, user.MonthlyIncome || 0);
      if (evalRes.status === 'On Track') countOnTrack++;
      if (evalRes.status === 'Needs Adjustment') countAdjust++;
      if (evalRes.status === 'At Risk') countAtRisk++;
      if (evalRes.status === 'Completed') countCompleted++;
      return { ...g, _eval: evalRes };
    });

    document.getElementById('countFilterAll').textContent = countAll;
    document.getElementById('countFilterOnTrack').textContent = countOnTrack;
    document.getElementById('countFilterAdjust').textContent = countAdjust;
    document.getElementById('countFilterAtRisk').textContent = countAtRisk;
    document.getElementById('countFilterCompleted').textContent = countCompleted;

    const filtered = filter === 'all' 
      ? evaluated 
      : evaluated.filter(g => g._eval.status === filter);

    const grid = document.getElementById('myGoalsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: var(--gradient-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h3 style="font-size: 1.1rem; color: #fff;">No goals found for "${filter}"</h3>
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
    if (!goalId && this.state.goals.length > 0) {
      goalId = this.state.goals[0].GoalID;
    }

    const goal = this.state.goals.find(g => g.GoalID === goalId);
    if (!goal) {
      this.navigateTo('my-goals');
      return;
    }

    this.state.selectedGoalId = goalId;
    const user = this.state.user || {};
    const evalRes = SaveIQCalc.evaluateGoalReality(goal, user.MonthlyIncome || 0);

    // Populate Headers & Badges
    document.getElementById('detailGoalName').textContent = goal.GoalName;
    document.getElementById('detailGoalPurpose').textContent = goal.Purpose || 'Savings Goal';
    document.getElementById('detailCreatedDate').textContent = goal.CreatedDate || 'N/A';
    document.getElementById('detailDeadline').textContent = goal.Deadline;
    document.getElementById('detailDaysRemaining').textContent = evalRes.daysRemaining;

    const statusBadge = document.getElementById('detailStatusBadge');
    statusBadge.className = `badge ${evalRes.statusClass}`;
    statusBadge.textContent = evalRes.status;

    // Score Circle
    const scoreCircle = document.getElementById('detailScoreCircle');
    document.getElementById('detailScoreNum').textContent = evalRes.score;
    if (evalRes.score >= 85) scoreCircle.style.borderColor = '#10b981';
    else if (evalRes.score >= 70) scoreCircle.style.borderColor = '#06b6d4';
    else if (evalRes.score >= 50) scoreCircle.style.borderColor = '#f59e0b';
    else scoreCircle.style.borderColor = '#ef4444';

    // Progress Bar
    document.getElementById('detailProgressPercentText').textContent = `${evalRes.progressPercent}% Saved`;
    document.getElementById('detailAmountsRatio').textContent = `₹${evalRes.currentSavings.toLocaleString()} / ₹${evalRes.targetAmount.toLocaleString()}`;
    const progBar = document.getElementById('detailProgressBar');
    progBar.style.width = `${evalRes.progressPercent}%`;
    progBar.className = evalRes.status === 'Completed' ? 'progress-bar success' : 'progress-bar';

    // Metrics Cards
    document.getElementById('detailTargetVal').textContent = `₹${evalRes.targetAmount.toLocaleString()}`;
    document.getElementById('detailCurrentVal').textContent = `₹${evalRes.currentSavings.toLocaleString()}`;
    document.getElementById('detailRemainingVal').textContent = `₹${evalRes.remainingAmount.toLocaleString()}`;
    document.getElementById('detailRequiredVal').textContent = `₹${evalRes.requiredMonthlySaving.toLocaleString()}/mo`;

    // 4 Score Pillars
    const b = evalRes.scoreBreakdown;
    document.getElementById('pillarProgressScore').textContent = `${b.progressScore} / 30 pts`;
    document.getElementById('pillarProgressBar').style.width = `${(b.progressScore / 30) * 100}%`;

    document.getElementById('pillarCapacityScore').textContent = `${b.capacityScore} / 45 pts`;
    document.getElementById('pillarCapacityBar').style.width = `${(b.capacityScore / 45) * 100}%`;

    document.getElementById('pillarTimeScore').textContent = `${b.timeScore} / 15 pts`;
    document.getElementById('pillarTimeBar').style.width = `${(b.timeScore / 15) * 100}%`;

    document.getElementById('pillarBudgetScore').textContent = `${b.budgetScore} / 10 pts`;
    document.getElementById('pillarBudgetBar').style.width = `${(b.budgetScore / 10) * 100}%`;

    // Adaptive Recalibration Callout text
    document.getElementById('detailAdaptiveText').textContent = evalRes.statusMessage;

    // Render Deposit History
    const historyRes = await SaveIQAPI.request('getSavingsHistory', { goalId });
    const history = historyRes.data || [];
    this.renderSavingsHistoryTable(history);

    // Render Progress Line Chart
    SaveIQCharts.renderGoalProgressTimeline('detailTimelineChart', goal, history);

    // Render Smart Alternative Plans
    this.renderAlternativePlans(goal);

    // Groq AI Strategic Guidance
    this.fetchAndRenderGoalAIAdvice(goal, evalRes);

    // Button event listeners
    document.getElementById('detailDepositBtn').onclick = () => this.openDepositModal(goal.GoalID);
    document.getElementById('detailHistoryDepositBtn').onclick = () => this.openDepositModal(goal.GoalID);
    document.getElementById('refreshGoalAIBtn').onclick = () => this.fetchAndRenderGoalAIAdvice(goal, evalRes);
  },

  /**
   * Render Deposit History Table
   */
  renderSavingsHistoryTable(history) {
    const tbody = document.getElementById('detailSavingsTableBody');
    if (!tbody) return;

    if (history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No deposits logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = history.map(item => `
      <tr>
        <td style="color: var(--text-secondary);">${item.Date}</td>
        <td style="font-weight: 600; color: #10b981;">+₹${Number(item.Amount).toLocaleString()}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${item.Notes || 'Savings contribution'}</td>
      </tr>
    `).join('');
  },

  /**
   * Render Smart Alternative Plans (Plan A, Plan B, Plan C)
   */
  renderAlternativePlans(goal) {
    const plans = SaveIQCalc.generateAlternativePlans(goal);
    const container = document.getElementById('detailAlternativesGrid');
    if (!container) return;

    container.innerHTML = `
      <!-- PLAN A -->
      <div class="alt-plan-card">
        <span class="alt-plan-badge">Option 1</span>
        <div class="alt-plan-title"><i class="fa-regular fa-clock" style="color: #6366f1;"></i> ${plans.planA.name}</div>
        <div class="alt-plan-tagline">${plans.planA.tagline}</div>
        <div class="alt-plan-metrics">
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Target: <strong>₹${plans.planA.targetAmount.toLocaleString()}</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Monthly Saving: <strong>₹${plans.planA.monthlySaving.toLocaleString()}</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">New Deadline: <strong style="color: #6366f1;">${plans.planA.newDeadline}</strong></div>
        </div>
        <div style="font-size: 0.78rem; color: #a5b4fc; background: rgba(99,102,241,0.1); padding: 0.6rem; border-radius: var(--radius-sm);">
          ${plans.planA.summary}
        </div>
      </div>

      <!-- PLAN B -->
      <div class="alt-plan-card">
        <span class="alt-plan-badge" style="background: rgba(6, 182, 212, 0.2); color: #67e8f9;">Option 2</span>
        <div class="alt-plan-title"><i class="fa-solid fa-arrows-split-up-and-left" style="color: #06b6d4;"></i> ${plans.planB.name}</div>
        <div class="alt-plan-tagline">${plans.planB.tagline}</div>
        <div class="alt-plan-metrics">
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Achievable Target: <strong style="color: #06b6d4;">₹${plans.planB.targetAmount.toLocaleString()}</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Monthly Saving: <strong>₹${plans.planB.monthlySaving.toLocaleString()}</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Deadline: <strong>${plans.planB.newDeadline}</strong></div>
        </div>
        <div style="font-size: 0.78rem; color: #67e8f9; background: rgba(6, 182, 212, 0.1); padding: 0.6rem; border-radius: var(--radius-sm);">
          ${plans.planB.summary}
        </div>
      </div>

      <!-- PLAN C -->
      <div class="alt-plan-card">
        <span class="alt-plan-badge" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7;">Option 3</span>
        <div class="alt-plan-title"><i class="fa-solid fa-gauge-max" style="color: #10b981;"></i> ${plans.planC.name}</div>
        <div class="alt-plan-tagline">${plans.planC.tagline}</div>
        <div class="alt-plan-metrics">
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Target: <strong>₹${plans.planC.targetAmount.toLocaleString()}</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Boost Needed: <strong style="color: #10b981;">+₹${plans.planC.monthlyIncrease.toLocaleString()}/mo</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">Deadline: <strong>${plans.planC.newDeadline}</strong></div>
        </div>
        <div style="font-size: 0.78rem; color: #6ee7b7; background: rgba(16, 185, 129, 0.1); padding: 0.6rem; border-radius: var(--radius-sm);">
          ${plans.planC.summary}
        </div>
      </div>
    `;
  },

  /**
   * Fetch and render Groq AI advice for a goal
   */
  async fetchAndRenderGoalAIAdvice(goal, evalRes) {
    const box = document.getElementById('detailAIAdviceContent');
    if (!box) return;

    box.innerHTML = `<div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Synthesizing AI financial insights with Groq...</div>`;

    try {
      const advice = await SaveIQAI.getGoalAdvice(goal, evalRes, this.state.user);
      box.innerHTML = this.formatMarkdown(advice);
    } catch (err) {
      box.innerHTML = `<div style="color:#ef4444;">Unable to generate AI recommendations: ${err.message}</div>`;
    }
  },

  /**
   * WHAT-IF SIMULATOR VIEW INITIALIZATION & LOGIC
   */
  initWhatIfView(targetGoalId) {
    const select = document.getElementById('whatIfGoalSelect');
    if (!select) return;

    select.innerHTML = this.state.goals.map(g => `
      <option value="${g.GoalID}">${g.GoalName} (₹${Number(g.TargetAmount).toLocaleString()})</option>
    `).join('');

    if (targetGoalId) {
      select.value = targetGoalId;
    } else if (this.state.goals.length > 0) {
      select.value = this.state.goals[0].GoalID;
    }

    this.onWhatIfGoalSelected(select.value);
  },

  onWhatIfGoalSelected(goalId) {
    const goal = this.state.goals.find(g => g.GoalID === goalId);
    if (!goal) return;

    this.state.whatIfBaseGoal = goal;
    const now = new Date();
    const deadline = new Date(goal.Deadline);
    const months = Math.max(1, Math.round(SaveIQCalc.calculateMonthsRemaining(now, deadline)));

    // Setup slider ranges & initial values
    const targetSlider = document.getElementById('whatIfTargetSlider');
    const savingsSlider = document.getElementById('whatIfSavingsSlider');
    const capacitySlider = document.getElementById('whatIfCapacitySlider');
    const monthsSlider = document.getElementById('whatIfMonthsSlider');

    targetSlider.max = Math.max(500000, Number(goal.TargetAmount) * 2);
    targetSlider.value = goal.TargetAmount;

    savingsSlider.max = Number(goal.TargetAmount);
    savingsSlider.value = goal.CurrentSavings;

    capacitySlider.value = goal.MonthlySavingCapacity;
    monthsSlider.value = months;

    this.recalculateWhatIf();
  },

  setupWhatIfListeners() {
    const select = document.getElementById('whatIfGoalSelect');
    if (select) {
      select.addEventListener('change', () => this.onWhatIfGoalSelected(select.value));
    }

    const sliders = ['whatIfTargetSlider', 'whatIfSavingsSlider', 'whatIfCapacitySlider', 'whatIfMonthsSlider'];
    sliders.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.recalculateWhatIf());
    });

    const resetBtn = document.getElementById('resetWhatIfBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.state.whatIfBaseGoal) {
          this.onWhatIfGoalSelected(this.state.whatIfBaseGoal.GoalID);
        }
      });
    }

    const applyBtn = document.getElementById('applyWhatIfAsGoalBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.saveWhatIfAsLiveGoal());
    }
  },

  recalculateWhatIf() {
    if (!this.state.whatIfBaseGoal) return;

    const baseGoal = this.state.whatIfBaseGoal;
    const target = Number(document.getElementById('whatIfTargetSlider').value);
    const savings = Number(document.getElementById('whatIfSavingsSlider').value);
    const capacity = Number(document.getElementById('whatIfCapacitySlider').value);
    const months = Number(document.getElementById('whatIfMonthsSlider').value);

    // Update Slider Displays
    document.getElementById('whatIfTargetDisplay').textContent = `₹${target.toLocaleString()}`;
    document.getElementById('whatIfSavingsDisplay').textContent = `₹${savings.toLocaleString()}`;
    document.getElementById('whatIfCapacityDisplay').textContent = `₹${capacity.toLocaleString()}/mo`;
    document.getElementById('whatIfMonthsDisplay').textContent = `${months} month${months === 1 ? '' : 's'}`;

    // Compute simulated deadline date
    const simDeadline = new Date();
    simDeadline.setMonth(simDeadline.getMonth() + months);
    const simDeadlineStr = simDeadline.toISOString().split('T')[0];

    const deltas = {
      targetAmount: target,
      currentSavings: savings,
      monthlyCapacity: capacity,
      deadline: simDeadlineStr
    };

    const userIncome = this.state.user ? this.state.user.MonthlyIncome : 0;
    const result = SaveIQCalc.runWhatIfAnalysis(baseGoal, deltas, userIncome);

    // Update Comparison Boxes
    document.getElementById('whatIfOriginalScore').textContent = `${result.base.score} / 100`;
    document.getElementById('whatIfOriginalReq').textContent = `Req: ₹${result.base.requiredMonthlySaving.toLocaleString()}/mo`;

    document.getElementById('whatIfSimulatedScore').textContent = `${result.simulated.score} / 100`;
    document.getElementById('whatIfSimulatedReq').textContent = `Req: ₹${result.simulated.requiredMonthlySaving.toLocaleString()}/mo`;

    // Score Delta Badge
    const deltaBadge = document.getElementById('whatIfScoreDeltaBadge');
    const diff = result.scoreDiff;
    if (diff > 0) {
      deltaBadge.className = 'reality-score-badge score-excellent';
      deltaBadge.textContent = `+${diff} pts Improvement`;
    } else if (diff < 0) {
      deltaBadge.className = 'reality-score-badge score-critical';
      deltaBadge.textContent = `${diff} pts Decline`;
    } else {
      deltaBadge.className = 'reality-score-badge score-good';
      deltaBadge.textContent = `0 pts Change`;
    }

    // Render What-If Chart
    SaveIQCharts.renderWhatIfComparisonChart('whatIfChartCanvas', result.base, result.simulated);

    // AI Verdict
    const advice = SaveIQAI.generateSmartLocalWhatIfAdvice(result, baseGoal.GoalName);
    document.getElementById('whatIfAIVerdict').innerHTML = this.formatMarkdown(advice);
  },

  async saveWhatIfAsLiveGoal() {
    if (!this.state.whatIfBaseGoal) return;

    const baseGoal = this.state.whatIfBaseGoal;
    const target = Number(document.getElementById('whatIfTargetSlider').value);
    const savings = Number(document.getElementById('whatIfSavingsSlider').value);
    const capacity = Number(document.getElementById('whatIfCapacitySlider').value);
    const months = Number(document.getElementById('whatIfMonthsSlider').value);

    const simDeadline = new Date();
    simDeadline.setMonth(simDeadline.getMonth() + months);

    try {
      await SaveIQAPI.request('updateGoal', {
        goalId: baseGoal.GoalID,
        TargetAmount: target,
        CurrentSavings: savings,
        MonthlySavingCapacity: capacity,
        Deadline: simDeadline.toISOString().split('T')[0]
      });

      this.showToast(`Updated "${baseGoal.GoalName}" with simulated parameters!`, 'success');
      await this.loadAllData();
      this.navigateTo('goal-details', { goalId: baseGoal.GoalID });
    } catch (err) {
      this.showToast('Failed to apply simulation', 'error');
    }
  },

  /**
   * RENDER EXPENSES VIEW
   */
  renderExpensesView() {
    const user = this.state.user || { MonthlyIncome: 60000 };
    const expenses = this.state.expenses;

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

    if (this.state.expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No expenses recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.expenses.map(exp => `
      <tr>
        <td style="color: var(--text-secondary);">${exp.Date}</td>
        <td><span class="badge badge-on-track" style="background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3);">${exp.Category}</span></td>
        <td style="color: #cbd5e1;">${exp.Notes || 'Expense'}</td>
        <td style="font-weight: 600; color: #ef4444;">-₹${Number(exp.Amount).toLocaleString()}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="SaveIQApp.deleteExpense('${exp.ExpenseID}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
            <i class="fa-solid fa-trash" style="color: #ef4444;"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  async deleteExpense(expenseId) {
    if (!confirm('Delete this expense record?')) return;
    try {
      await SaveIQAPI.request('deleteExpense', { expenseId });
      this.showToast('Expense removed', 'success');
      await this.loadAllData();
      this.renderExpensesView();
    } catch (err) {
      this.showToast('Failed to delete expense', 'error');
    }
  },

  /**
   * LIVE CREATE GOAL PREVIEW ENGINE
   */
  setupLivePreviewListeners() {
    const inputs = ['goalTargetInput', 'goalCurrentInput', 'goalCapacityInput', 'goalDeadlineInput'];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.triggerCreateGoalPreview());
    });
  },

  triggerCreateGoalPreview() {
    const target = Number(document.getElementById('goalTargetInput')?.value) || 100000;
    const current = Number(document.getElementById('goalCurrentInput')?.value) || 0;
    const capacity = Number(document.getElementById('goalCapacityInput')?.value) || 10000;
    const deadline = document.getElementById('goalDeadlineInput')?.value || new Date().toISOString().split('T')[0];

    const tempGoal = {
      TargetAmount: target,
      CurrentSavings: current,
      MonthlySavingCapacity: capacity,
      Deadline: deadline
    };

    const userIncome = this.state.user ? this.state.user.MonthlyIncome : 0;
    const evalRes = SaveIQCalc.evaluateGoalReality(tempGoal, userIncome);

    // Update Live Preview UI
    const badge = document.getElementById('previewStatusBadge');
    if (badge) {
      badge.className = `badge ${evalRes.statusClass}`;
      badge.textContent = evalRes.status;
    }

    const circle = document.getElementById('previewScoreCircle');
    const scoreNum = document.getElementById('previewScoreNum');
    if (circle && scoreNum) {
      scoreNum.textContent = evalRes.score;
      if (evalRes.score >= 85) circle.style.borderColor = '#10b981';
      else if (evalRes.score >= 70) circle.style.borderColor = '#06b6d4';
      else if (evalRes.score >= 50) circle.style.borderColor = '#f59e0b';
      else circle.style.borderColor = '#ef4444';
    }

    const gradeText = document.getElementById('previewGradeText');
    if (gradeText) gradeText.textContent = evalRes.scoreGrade;

    const timelineText = document.getElementById('previewTimelineText');
    if (timelineText) timelineText.textContent = `${evalRes.monthsRemaining} months runway (${evalRes.daysRemaining} days)`;

    const remVal = document.getElementById('previewRemainingVal');
    if (remVal) remVal.textContent = `₹${evalRes.remainingAmount.toLocaleString()}`;

    const reqVal = document.getElementById('previewRequiredVal');
    if (reqVal) reqVal.textContent = `₹${evalRes.requiredMonthlySaving.toLocaleString()}`;

    const capVal = document.getElementById('previewCapacityVal');
    if (capVal) capVal.textContent = `₹${evalRes.monthlyCapacity.toLocaleString()}`;

    const surplusVal = document.getElementById('previewSurplusVal');
    if (surplusVal) {
      const diff = evalRes.monthlyCapacity - evalRes.requiredMonthlySaving;
      if (diff >= 0) {
        surplusVal.textContent = `+₹${Math.round(diff).toLocaleString()}`;
        surplusVal.style.color = '#10b981';
      } else {
        surplusVal.textContent = `-₹${Math.round(Math.abs(diff)).toLocaleString()}`;
        surplusVal.style.color = '#ef4444';
      }
    }

    const aiText = document.getElementById('previewAIAdviceText');
    if (aiText) {
      aiText.textContent = evalRes.statusMessage;
    }
  },

  /**
   * EVENT LISTENERS FOR FORMS & MODALS
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
          const res = await SaveIQAPI.request('createGoal', {
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
          const res = await SaveIQAPI.request('addSavings', { goalId, amount, date, notes });
          this.closeDepositModal();
          this.showToast(`Logged ₹${amount.toLocaleString()} deposit!`, 'success');
          await this.loadAllData();
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

    // AI Chat Form
    const aiForm = document.getElementById('aiChatForm');
    if (aiForm) {
      aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('aiChatInput');
        const query = input.value.trim();
        if (!query) return;

        input.value = '';
        this.appendChatMessage('user', query);

        // Loading bubble
        const loadingId = this.appendLoadingMessage();

        try {
          const response = await SaveIQAI.askAdvisorQuestion(query, {
            goals: this.state.goals,
            user: this.state.user
          });
          this.removeLoadingMessage(loadingId);
          this.appendChatMessage('ai', response);
        } catch (err) {
          this.removeLoadingMessage(loadingId);
          this.appendChatMessage('ai', 'Error generating response: ' + err.message);
        }
      });
    }

    // Quick AI Chips
    document.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        const input = document.getElementById('aiChatInput');
        if (input) {
          input.value = prompt;
          document.getElementById('aiChatSendBtn').click();
        }
      });
    });

    // Google Apps Script Hub URL Save
    const saveGasBtn = document.getElementById('saveGasUrlBtn');
    if (saveGasBtn) {
      saveGasBtn.addEventListener('click', () => {
        const url = document.getElementById('gasEndpointInput').value.trim();
        SaveIQAPI.setGasUrl(url);
        this.updateBackendStatusIndicator();
        this.showToast(url ? 'Apps Script URL Saved' : 'Switched to Local Mode', 'info');
      });
    }

    const disconnectBtn = document.getElementById('disconnectGasBtn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        SaveIQAPI.setGasUrl('');
        document.getElementById('gasEndpointInput').value = '';
        this.updateBackendStatusIndicator();
        this.showToast('Using Local Storage Database', 'info');
      });
    }
  },

  /**
   * Deposit Modal Controls
   */
  openDepositModal(preselectedGoalId = null) {
    const select = document.getElementById('depositGoalSelect');
    if (select) {
      select.innerHTML = this.state.goals.map(g => `
        <option value="${g.GoalID}">${g.GoalName} (Current: ₹${Number(g.CurrentSavings).toLocaleString()})</option>
      `).join('');

      if (preselectedGoalId) {
        select.value = preselectedGoalId;
      }
    }

    const modal = document.getElementById('depositModal');
    if (modal) modal.classList.add('active');
  },

  closeDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.classList.remove('active');
  },

  /**
   * AI Chat Helpers
   */
  appendChatMessage(sender, text) {
    const feed = document.getElementById('aiChatFeed');
    if (!feed) return;

    const isUser = sender === 'user';
    const bubble = document.createElement('div');
    bubble.style.display = 'flex';
    bubble.style.gap = '0.75rem';
    bubble.style.justifyContent = isUser ? 'flex-end' : 'flex-start';

    bubble.innerHTML = isUser ? `
      <div style="background: var(--gradient-brand); color: #ffffff; padding: 0.75rem 1.1rem; border-radius: var(--radius-md); font-size: 0.88rem; max-width: 80%; box-shadow: var(--shadow-sm);">
        ${this.escapeHTML(text)}
      </div>
    ` : `
      <div class="ai-sparkle" style="width: 28px; height: 28px; font-size: 0.8rem; flex-shrink: 0;"><i class="fa-solid fa-robot"></i></div>
      <div style="background: #ffffff; padding: 0.85rem 1.1rem; border-radius: var(--radius-md); font-size: 0.88rem; color: #1e293b; line-height: 1.5; border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm); max-width: 85%;">
        ${this.formatMarkdown(text)}
      </div>
    `;

    feed.appendChild(bubble);
    feed.scrollTop = feed.scrollHeight;
  },

  appendLoadingMessage() {
    const feed = document.getElementById('aiChatFeed');
    const id = 'loading_' + Date.now();
    const bubble = document.createElement('div');
    bubble.id = id;
    bubble.style.display = 'flex';
    bubble.style.gap = '0.75rem';
    bubble.innerHTML = `
      <div class="ai-sparkle" style="width: 28px; height: 28px; font-size: 0.8rem; flex-shrink: 0;"><i class="fa-solid fa-robot"></i></div>
      <div style="background: #ffffff; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.85rem; color: var(--text-secondary); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-sm);">
        <i class="fa-solid fa-spinner fa-spin"></i> Groq AI is analyzing...
      </div>
    `;
    feed.appendChild(bubble);
    feed.scrollTop = feed.scrollHeight;
    return id;
  },

  removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  /**
   * Update Backend Status Indicator
   */
  updateBackendStatusIndicator() {
    const isLive = SaveIQAPI.isLiveBackend();
    const textEl = document.getElementById('backendStatusText');
    const dotEl = document.getElementById('backendStatusDot');
    const reportEl = document.getElementById('gasStatusReport');
    const urlInput = document.getElementById('gasEndpointInput');

    if (urlInput) urlInput.value = SaveIQAPI.getGasUrl();

    if (isLive) {
      if (textEl) textEl.innerHTML = `<i class="fa-solid fa-cloud-arrow-up" style="color: #10b981;"></i> Apps Script Live`;
      if (dotEl) { dotEl.className = 'status-dot'; }
      if (reportEl) reportEl.innerHTML = `<strong style="color: #10b981;">Connected to Live Google Apps Script</strong>. Responses are read from and written to your Google Sheets database.`;
    } else {
      if (textEl) textEl.innerHTML = `<i class="fa-solid fa-database"></i> Local Storage Mode`;
      if (dotEl) { dotEl.className = 'status-dot offline'; }
      if (reportEl) reportEl.innerHTML = `Running on fast, zero-config Local Storage. Connect your Apps Script Web App URL above for live Sheets sync.`;
    }
  },

  /**
   * Toast notification helper
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
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
      .replace(/### (.*?)\n/g, '<h3 style="font-size:1.05rem; font-weight:700; color:#fff; margin-top:0.6rem; margin-bottom:0.3rem;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#cbd5e1;">$1</em>')
      .replace(/> (.*?)\n/g, '<blockquote style="border-left: 3px solid var(--accent-primary); padding-left: 0.75rem; margin: 0.5rem 0; color: #94a3b8; font-size: 0.82rem;">$1</blockquote>')
      .replace(/- (.*?)\n/g, '<li style="margin-left: 1rem; margin-bottom: 0.25rem;">$1</li>');
    return html.replace(/\n/g, '<br>');
  },

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  SaveIQApp.init();
});
