/**
 * SaveIQ - Chart.js Visualization Layer (Light Theme Palette)
 * Handles all dynamic, interactive financial charts with light-mode fintech color schemes.
 */

const SaveIQCharts = {
  instances: {},

  // Theme color palette for Light Mode
  colors: {
    primary: '#4f46e5',    // Indigo
    primaryLight: 'rgba(79, 70, 229, 0.15)',
    success: '#059669',    // Emerald
    successLight: 'rgba(5, 150, 105, 0.15)',
    warning: '#d97706',    // Amber
    warningLight: 'rgba(217, 119, 6, 0.15)',
    danger: '#e11d48',     // Rose
    dangerLight: 'rgba(225, 29, 72, 0.15)',
    cyan: '#0891b2',
    purple: '#7c3aed',
    gray: '#64748b',
    border: '#e2e8f0',
    textMain: '#1e293b',
    textMuted: '#64748b'
  },

  /**
   * Helper to safely destroy an existing chart instance before re-creating
   */
  destroy(chartKey) {
    if (this.instances[chartKey]) {
      try {
        this.instances[chartKey].destroy();
      } catch (e) {
        console.warn('Error destroying chart:', e);
      }
      delete this.instances[chartKey];
    }
  },

  /**
   * Render Dashboard Portfolio Distribution Donut Chart
   */
  renderGoalsDistributionChart(canvasId, goals = []) {
    this.destroy('goalsDist');
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const validGoals = (goals || []).filter(g => Number(g.TargetAmount || 0) > 0);
    const labels = validGoals.map(g => g.GoalName || 'Goal');
    const dataValues = validGoals.map(g => Number(g.CurrentSavings) || 0);
    
    const palette = [
      '#4f46e5', '#059669', '#0891b2', '#d97706', '#7c3aed', '#db2777', '#2563eb'
    ];

    const hasData = validGoals.length > 0 && dataValues.some(v => v > 0);

    this.instances['goalsDist'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: hasData ? labels : ['No Active Savings Yet'],
        datasets: [{
          data: hasData ? dataValues : [1],
          backgroundColor: hasData ? palette.slice(0, labels.length) : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        layout: {
          padding: 4
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#334155',
              boxWidth: 10,
              padding: 8,
              font: { family: 'Outfit, sans-serif', size: 11, weight: '500' }
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                if (!hasData) return ' Create goals and record deposits';
                const val = context.parsed;
                return ` Saved: ₹${val.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * Render Expense Categories Breakdown Pie Chart
   */
  renderExpensePieChart(canvasId, categoryTotals = {}) {
    this.destroy('expensePie');
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Filter only categories with actual spend > 0
    const rawEntries = Object.entries(categoryTotals || {});
    const activeEntries = rawEntries.filter(([_, v]) => Number(v) > 0);
    const hasExpenses = activeEntries.length > 0;

    const labels = hasExpenses ? activeEntries.map(([k]) => k) : ['No Expenses Recorded'];
    const dataValues = hasExpenses ? activeEntries.map(([_, v]) => Number(v)) : [1];

    const categoryColors = {
      Rent: '#ef4444',
      Housing: '#ef4444',
      Groceries: '#10b981',
      Food: '#10b981',
      'Dining Out': '#f59e0b',
      Dining: '#f59e0b',
      Transport: '#3b82f6',
      Fuel: '#3b82f6',
      Utilities: '#06b6d4',
      Bills: '#8b5cf6',
      Shopping: '#ec4899',
      Entertainment: '#6366f1',
      Education: '#14b8a6',
      Health: '#f43f5e',
      Insurance: '#0ea5e9',
      Other: '#64748b'
    };

    const palette = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#64748b'
    ];

    const bgColors = hasExpenses 
      ? labels.map((l, i) => categoryColors[l] || palette[i % palette.length]) 
      : ['#e2e8f0'];

    this.instances['expensePie'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        layout: { padding: 4 },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#334155',
              boxWidth: 10,
              padding: 8,
              font: { family: 'Outfit, sans-serif', size: 11, weight: '500' }
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                if (!hasExpenses) return ' No expenses logged yet';
                const val = context.parsed;
                return ` ₹${val.toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  },

  /**
   * Render 50/30/20 Budget Bar Chart
   */
  renderBudgetRatioChart(canvasId, budget50_30_20) {
    this.destroy('budget50_30_20');
    const ctx = document.getElementById(canvasId);
    if (!ctx || !budget50_30_20) return;

    this.instances['budget50_30_20'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Needs (50%)', 'Wants (30%)', 'Savings (20%)'],
        datasets: [
          {
            label: 'Actual Spend / Savings (₹)',
            data: [
              budget50_30_20.actualNeeds || 0,
              budget50_30_20.actualWants || 0,
              budget50_30_20.actualSavings || 0
            ],
            backgroundColor: '#4f46e5',
            borderRadius: 6,
            maxBarThickness: 24
          },
          {
            label: 'Target Limit (₹)',
            data: [
              budget50_30_20.idealNeeds || 0,
              budget50_30_20.idealWants || 0,
              budget50_30_20.idealSavings || 0
            ],
            backgroundColor: 'rgba(148, 163, 184, 0.4)',
            borderRadius: 6,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#475569', font: { family: 'Outfit, sans-serif', size: 10, weight: '600' } },
            grid: { display: false }
          },
          y: {
            ticks: { 
              color: '#475569',
              font: { size: 10 },
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#1e293b', boxWidth: 10, font: { family: 'Outfit, sans-serif', size: 11, weight: '500' } }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ₹${Number(context.parsed.y).toLocaleString()}`
            }
          }
        }
      }
    });
  },

  /**
   * Render Goal Details Progress Timeline Chart
   */
  renderGoalProgressTimeline(canvasId, goal, savingsHistory = []) {
    this.destroy('goalTimeline');
    const ctx = document.getElementById(canvasId);
    if (!ctx || !goal) return;

    const sortedHistory = [...(savingsHistory || [])].sort((a, b) => new Date(a.Date) - new Date(b.Date));
    let runningTotal = 0;
    const labels = [];
    const dataPoints = [];

    labels.push(goal.CreatedDate || 'Start');
    dataPoints.push(0);

    sortedHistory.forEach(item => {
      runningTotal += Number(item.Amount || 0);
      labels.push(item.Date);
      dataPoints.push(runningTotal);
    });

    const currentSavings = Number(goal.CurrentSavings) || 0;
    if (dataPoints[dataPoints.length - 1] < currentSavings || dataPoints.length === 1) {
      labels.push('Current');
      dataPoints.push(currentSavings);
    }

    const targetAmount = Number(goal.TargetAmount) || 10000;

    this.instances['goalTimeline'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Accumulated Savings (₹)',
            data: dataPoints,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#059669'
          },
          {
            label: 'Target Goal (₹)',
            data: Array(labels.length).fill(targetAmount),
            borderColor: '#e11d48',
            borderDash: [6, 6],
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#64748b', font: { size: 10 } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          },
          y: {
            ticks: { 
              color: '#64748b',
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#334155', font: { family: 'Outfit, sans-serif', size: 11, weight: '600' } }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString()}`
            }
          }
        }
      }
    });
  },

  /**
   * Alias for Goal Progress Timeline
   */
  renderGoalProjectionChart(canvasId, goal, history = []) {
    return this.renderGoalProgressTimeline(canvasId, goal, history);
  },

  /**
   * Render Gauge / Feasibility Score Donut Chart
   */
  renderGaugeChart(canvasId, score = 0) {
    const key = `gauge_${canvasId}`;
    this.destroy(key);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const numScore = Math.min(100, Math.max(0, Number(score) || 0));
    const scoreColor = numScore >= 80 ? '#059669' : numScore >= 60 ? '#4f46e5' : numScore >= 40 ? '#d97706' : '#e11d48';

    this.instances[key] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [numScore, 100 - numScore],
          backgroundColor: [scoreColor, '#e2e8f0'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  },

  /**
   * Render What-If Comparison Bar Chart
   */
  renderWhatIfComparisonChart(canvasId, baseEval, simEval) {
    this.destroy('whatIfChart');
    const ctx = document.getElementById(canvasId);
    if (!ctx || !baseEval || !simEval) return;

    const baseTarget = Number(baseEval.TargetAmount || baseEval.targetAmount || 0);
    const baseCurrent = Number(baseEval.CurrentSavings || baseEval.currentSavings || 0);
    const baseReq = Number(baseEval.requiredMonthlySaving || baseEval._eval?.requiredMonthlySaving || 0);
    const baseCap = Number(baseEval.MonthlySavingCapacity || baseEval.monthlyCapacity || 0);

    const simTarget = Number(simEval.TargetAmount || simEval.targetAmount || 0);
    const simCurrent = Number(simEval.CurrentSavings || simEval.currentSavings || 0);
    const simReq = Number(simEval.requiredMonthlySaving || simEval._eval?.requiredMonthlySaving || 0);
    const simCap = Number(simEval.MonthlySavingCapacity || simEval.monthlyCapacity || 0);

    this.instances['whatIfChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Target', 'Current Savings', 'Req Monthly', 'Capacity'],
        datasets: [
          {
            label: 'Current Plan',
            data: [baseTarget, baseCurrent, baseReq, baseCap],
            backgroundColor: 'rgba(79, 70, 229, 0.75)',
            borderRadius: 6
          },
          {
            label: 'Simulated Path',
            data: [simTarget, simCurrent, simReq, simCap],
            backgroundColor: 'rgba(5, 150, 105, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#334155', font: { family: 'Outfit, sans-serif', size: 11, weight: '600' } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          },
          y: {
            ticks: { 
              color: '#64748b',
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#0f172a', font: { family: 'Outfit, sans-serif', size: 12, weight: '600' } }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ₹${Number(ctx.parsed.y).toLocaleString()}`
            }
          }
        }
      }
    });
  }
};
