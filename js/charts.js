/**
 * SaveIQ - Chart.js Visualization Layer
 * Handles all dynamic, interactive financial charts with modern fintech color schemes.
 */

const SaveIQCharts = {
  instances: {},

  // Theme color palette
  colors: {
    primary: '#6366f1',    // Indigo
    primaryLight: 'rgba(99, 102, 241, 0.2)',
    success: '#10b981',    // Emerald
    successLight: 'rgba(16, 185, 129, 0.2)',
    warning: '#f59e0b',    // Amber
    warningLight: 'rgba(245, 158, 11, 0.2)',
    danger: '#ef4444',     // Rose
    dangerLight: 'rgba(239, 68, 68, 0.2)',
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    gray: '#64748b',
    borderDark: '#334155',
    textMuted: '#94a3b8'
  },

  /**
   * Helper to safely destroy an existing chart instance before re-creating
   */
  destroy(chartKey) {
    if (this.instances[chartKey]) {
      this.instances[chartKey].destroy();
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

    const labels = goals.map(g => g.GoalName || 'Unnamed');
    const dataValues = goals.map(g => Number(g.CurrentSavings) || 0);
    
    // Palette generator for multiple goals
    const palette = [
      '#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6'
    ];

    this.instances['goalsDist'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No Goals Yet'],
        datasets: [{
          data: dataValues.length ? dataValues : [1],
          backgroundColor: palette.slice(0, Math.max(1, labels.length)),
          borderWidth: 2,
          borderColor: '#1e293b',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#cbd5e1',
              boxWidth: 12,
              padding: 14,
              font: { family: 'Outfit, sans-serif', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
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

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    const categoryColors = {
      Food: '#f59e0b',
      Transport: '#3b82f6',
      Bills: '#ef4444',
      Shopping: '#ec4899',
      Entertainment: '#8b5cf6',
      Education: '#10b981',
      Other: '#64748b'
    };

    const bgColors = labels.map(l => categoryColors[l] || '#6366f1');

    this.instances['expensePie'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: '#1e293b',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#cbd5e1',
              boxWidth: 12,
              padding: 12,
              font: { family: 'Outfit, sans-serif', size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            callbacks: {
              label: (context) => {
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
        labels: ['Needs (50% rule)', 'Wants (30% rule)', 'Savings (20% rule)'],
        datasets: [
          {
            label: 'Actual Spend / Savings (₹)',
            data: [
              budget50_30_20.actualNeeds,
              budget50_30_20.actualWants,
              budget50_30_20.actualSavings
            ],
            backgroundColor: '#6366f1',
            borderRadius: 6
          },
          {
            label: 'Target Ideal Limit (₹)',
            data: [
              budget50_30_20.idealNeeds,
              budget50_30_20.idealWants,
              budget50_30_20.idealSavings
            ],
            backgroundColor: 'rgba(148, 163, 184, 0.3)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { family: 'Outfit, sans-serif', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: { 
              color: '#94a3b8',
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#cbd5e1', font: { family: 'Outfit, sans-serif', size: 12 } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
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
    if (!ctx) return;

    // Build timeline points from savings history
    const sortedHistory = [...savingsHistory].sort((a, b) => new Date(a.Date) - new Date(b.Date));
    let runningTotal = 0;
    const labels = [];
    const dataPoints = [];

    labels.push(goal.CreatedDate || 'Start');
    dataPoints.push(0);

    sortedHistory.forEach(item => {
      runningTotal += Number(item.Amount);
      labels.push(item.Date);
      dataPoints.push(runningTotal);
    });

    // If current savings > running total or no history, ensure present is plotted
    if (dataPoints[dataPoints.length - 1] < goal.CurrentSavings) {
      labels.push('Today');
      dataPoints.push(goal.CurrentSavings);
    }

    this.instances['goalTimeline'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Accumulated Savings (₹)',
            data: dataPoints,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Target Goal (₹)',
            data: Array(labels.length).fill(goal.TargetAmount),
            borderColor: '#ef4444',
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
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: { 
              color: '#94a3b8',
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#cbd5e1', font: { family: 'Outfit, sans-serif', size: 11 } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
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
   * Render What-If Comparison Bar Chart
   */
  renderWhatIfComparisonChart(canvasId, baseEval, simEval) {
    this.destroy('whatIfChart');
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances['whatIfChart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Target Amount', 'Current Savings', 'Required Monthly', 'Capacity'],
        datasets: [
          {
            label: 'Current Plan',
            data: [
              baseEval.targetAmount,
              baseEval.currentSavings,
              baseEval.requiredMonthlySaving,
              baseEval.monthlyCapacity
            ],
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderRadius: 6
          },
          {
            label: 'What-If Simulation',
            data: [
              simEval.targetAmount,
              simEval.currentSavings,
              simEval.requiredMonthlySaving,
              simEval.monthlyCapacity
            ],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#cbd5e1', font: { family: 'Outfit, sans-serif', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: { 
              color: '#94a3b8',
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#f8fafc', font: { family: 'Outfit, sans-serif', size: 12 } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#334155',
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
