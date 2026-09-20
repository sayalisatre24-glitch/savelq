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
      '#4f46e5', '#059669', '#0891b2', '#d97706', '#7c3aed', '#db2777', '#2563eb'
    ];

    this.instances['goalsDist'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['No Goals Yet'],
        datasets: [{
          data: dataValues.length ? dataValues : [1],
          backgroundColor: palette.slice(0, Math.max(1, labels.length)),
          borderWidth: 2,
          borderColor: '#ffffff',
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
              color: '#334155',
              boxWidth: 12,
              padding: 14,
              font: { family: 'Outfit, sans-serif', size: 12, weight: '500' }
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
      Bills: '#e11d48',
      Shopping: '#db2777',
      Entertainment: '#7c3aed',
      Education: '#059669',
      Other: '#64748b'
    };

    const bgColors = labels.map(l => categoryColors[l] || '#4f46e5');

    this.instances['expensePie'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
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
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#334155',
              boxWidth: 12,
              padding: 12,
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
            backgroundColor: '#4f46e5',
            borderRadius: 6
          },
          {
            label: 'Target Ideal Limit (₹)',
            data: [
              budget50_30_20.idealNeeds,
              budget50_30_20.idealWants,
              budget50_30_20.idealSavings
            ],
            backgroundColor: 'rgba(148, 163, 184, 0.4)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#475569', font: { family: 'Outfit, sans-serif', size: 11, weight: '600' } },
            grid: { color: 'rgba(0,0,0,0.04)' }
          },
          y: {
            ticks: { 
              color: '#475569',
              callback: (val) => '₹' + (val >= 1000 ? (val/1000) + 'k' : val)
            },
            grid: { color: 'rgba(0,0,0,0.04)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#1e293b', font: { family: 'Outfit, sans-serif', size: 12, weight: '600' } }
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
            data: Array(labels.length).fill(goal.TargetAmount),
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
            backgroundColor: 'rgba(79, 70, 229, 0.75)',
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
