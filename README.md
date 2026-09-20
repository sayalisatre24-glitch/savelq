# SaveIQ – AI Goal Reality & Smart Savings Planner

> **An AI-powered personal finance intelligence system that evaluates goal feasibility, computes deterministic Goal Reality Scores (0–100), simulates What-If scenarios, generates smart alternative plans, and automates Gmail deadline alerts via Google Apps Script & Google Sheets.**

---

## 🌟 Key Differentiating Features

1. **Deterministic Goal Reality Check**:
   - Calculates remaining balance, exact required monthly savings, and compares against actual user capacity.
   - Evaluates real-time status: `On Track`, `Needs Adjustment`, `At Risk`, `Completed`.
2. **0–100 Goal Reality Score Algorithm**:
   - Academic 4-pillar rubric evaluating Savings Progress (30 pts), Capacity Coverage (45 pts), Time Runway (15 pts), and Budget Proportion (10 pts).
3. **Interactive What-If Simulation Sandbox**:
   - Live multi-variable sandbox simulating adjustments to Target, Savings, Capacity, and Timeline with instant delta score updates.
4. **Smart Alternative Plans (Plan A, B, C)**:
   - When a goal needs adjustment, SaveIQ automatically generates 3 actionable options: *Extend Deadline*, *Adjust Target*, or *Fast-Track Monthly Savings*.
5. **Adaptive Savings Recalibration**:
   - Recalculates future monthly savings requirements dynamically whenever an actual deposit differs from the target milestone.
6. **Expense & 50/30/20 Budget Analytics**:
   - Category breakdowns (Food, Bills, Transport, Shopping, Entertainment, Education, Other) and 50/30/20 budget adherence checks.
7. **Groq AI Strategic Guidance**:
   - Deterministic calculations are passed to Groq AI (`llama-3.3-70b-versatile`) to generate natural-language strategy recommendations without arithmetic hallucination.
8. **Automated Gmail Alerts**:
   - Google Apps Script daily trigger scans active deadlines and dispatches rich HTML emails.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (Glassmorphism, Dark UI, Responsive Grid), JavaScript (ES6+), Chart.js |
| **Backend & Automation** | Google Apps Script (JavaScript V8 Engine) |
| **Database** | Google Sheets (5 Relational Tables: Users, Goals, Savings, Expenses, Alerts) |
| **AI Intelligence** | Groq AI API (`llama-3.3-70b-versatile` / `mixtral-8x7b-32768`) |
| **Email Services** | GmailApp / Google Apps Script Daily Time-Driven Triggers |
| **Version Control** | Git, GitHub |

---

## 🚀 Quickstart & Live Preview

### 1. Instant Local Testing (Zero-Config)
Open [`index.html`](file:///c:/Users/Sayali/Downloads/SavelQ/index.html) in any modern web browser. The app runs out of the box with pre-populated sample goals, expenses, deposits, and offline AI advisor simulations.

### 2. Live Google Apps Script & Sheets Deployment
Follow the comprehensive [Setup Guide](file:///c:/Users/Sayali/Downloads/SavelQ/docs/SETUP_GUIDE.md) to deploy `backend/Code.gs` as a Google Web App and connect your live Google Sheets database!

---

## 📁 Repository Structure

```
SavelQ/
├── index.html                   # Main single-page application
├── css/
│   ├── style.css                # Design system tokens, typography, layouts
│   └── components.css           # Gauges, score badges, modal dialogs, cards
├── js/
│   ├── app.js                   # State manager, router, UI event dispatchers
│   ├── calculations.js          # Deterministic financial math & scoring engine
│   ├── charts.js                # Chart.js visualization wrappers
│   ├── api.js                   # Google Apps Script API client & LocalStorage bridge
│   └── ai-advisor.js            # Groq AI prompt generator & strategic advisor
├── backend/
│   ├── Code.gs                  # Google Apps Script Web App backend & Gmail alerts
│   └── appsscript.json          # Apps Script manifest with OAuth scopes
├── docs/
│   ├── SETUP_GUIDE.md           # Step-by-step Google Sheets & Apps Script guide
│   ├── CALCULATION_FORMULAS.md  # Detailed mathematical formulations
│   └── SHEET_SCHEMA.md          # 5-table Google Sheet schema reference
└── README.md                    # Project documentation
```

---

## 🔒 Security & Best Practices
- **API Key Protection**: Groq API Keys are stored exclusively in Google Apps Script `PropertiesService` server-side, never exposed to client-side code.
- **Deterministic Math**: Pure JavaScript calculations ensure zero arithmetic errors before feeding numbers to LLMs.
- **Input Validation**: Prevents negative values, empty parameters, and past deadlines.
