# SaveIQ – AI Goal Reality & Smart Savings Planner

> **An AI-powered personal finance intelligence system that evaluates goal feasibility, computes deterministic Goal Reality Scores (0–100), simulates What-If scenarios, generates smart alternative plans, provides secure user authentication with Firebase Auth & Cloud Firestore, and automates in-app & email alerts via Node.js and Nodemailer.**

---

## 🌟 Key Differentiating Features

1. **Firebase Authentication & User Isolation**:
   - Complete multi-user data isolation via Firebase Auth (UID) and Firestore user documents.
   - Registration, Login, and Password Recovery with session persistence and secure Logout.
2. **Deterministic Goal Reality Check**:
   - Calculates remaining balance, exact required monthly savings, and compares against actual user capacity.
   - Evaluates real-time status: `On Track`, `Needs Adjustment`, `At Risk`, `Completed`.
3. **0–100 Goal Reality Score Algorithm**:
   - Academic 4-pillar rubric evaluating Savings Progress (30 pts), Capacity Coverage (45 pts), Time Runway (15 pts), and Budget Proportion (10 pts).
4. **In-App Notification Center & Navbar Bell**:
   - Real-time unread badge counter and interactive notification center for milestone alerts.
5. **4 Core Automated Notification Triggers & Email Integration**:
   - **Target Completed**: *"🎉 Congratulations! You have completed your [Goal Name] savings goal."*
   - **Higher Monthly Savings**: *"👏 Great job! You saved ₹X this month, which is higher than your usual monthly savings."*
   - **Deadline Reminder**: *"⏰ Your [Goal Name] deadline is approaching. ₹X is still remaining."*
   - **Missed Monthly Target**: *"⚠️ You are ₹X below your planned monthly savings target."*
   - Automated branded HTML emails dispatched via Node.js Nodemailer with duplicate prevention (`emailSent` tracking).
6. **Automated Scheduled Processing**:
   - Hourly background cron scheduler in Node.js scanning upcoming deadlines, milestones, and target completions.
7. **Interactive What-If Simulation Sandbox**:
   - Live multi-variable sandbox simulating adjustments to Target, Savings, Capacity, and Timeline with instant delta score updates.
8. **Smart Alternative Plans (Plan A, B, C)**:
   - When a goal needs adjustment, SaveIQ automatically generates 3 actionable options: *Extend Deadline*, *Adjust Target*, or *Fast-Track Monthly Savings*.
9. **Adaptive Savings Recalibration**:
   - Recalculates future monthly savings requirements dynamically whenever an actual deposit differs from the target milestone.
10. **Expense & 50/30/20 Budget Analytics**:
    - Category breakdowns (Food, Bills, Transport, Shopping, Entertainment, Education, Other) and 50/30/20 budget adherence checks.
11. **Groq AI Strategic Guidance**:
    - Deterministic calculations are passed to Groq AI (`llama-3.3-70b-versatile`) on the Node.js backend to generate natural-language strategy recommendations without arithmetic hallucination.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, Modern CSS3 (Glassmorphism, Light UI, Responsive Grid), JavaScript (ES6+), Chart.js |
| **Backend & REST API** | Node.js, Express.js (Port 5000), Helmet, Rate Limiting, Node-Cron |
| **Database & Auth** | Firebase Authentication & Cloud Firestore (Users, Goals, Transactions, Expenses, Notifications) |
| **AI Intelligence** | Groq AI API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) |
| **Email Services** | Nodemailer (Gmail SMTP or custom SMTP) with branded HTML templates |
| **Deployment** | Node.js PaaS (Render, Railway, Heroku, AWS EC2) |

---

## 🚀 Quickstart & Setup

### 1. Install & Start Backend
```bash
cd server
npm install
npm start
```
*The Express REST API will start at `http://localhost:5000`.*

### 2. Configure Environment Variables
Copy `server/.env.example` to `server/.env` and add your keys:
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (from Firebase Console)
- `GROQ_API_KEY` (from [console.groq.com](https://console.groq.com))
- `SMTP_USER`, `SMTP_PASS` (for automated emails)

### 3. Start Frontend Client
```bash
npm run client
```
*Open `http://localhost:3000` in your browser.*

---

## 📁 Repository Structure

```
SavelQ/
├── index.html                   # Main single-page application & Auth dialog
├── css/
│   ├── style.css                # Design system tokens, typography, layouts
│   └── components.css           # Gauges, score badges, modal dialogs, notifications, cards
├── js/
│   ├── app.js                   # State manager, router, auth lifecycle, notification dispatcher
│   ├── calculations.js          # Deterministic financial math & scoring engine
│   ├── charts.js                # Chart.js visualization wrappers
│   ├── api.js                   # Node.js REST API client & resilient storage bridge
│   └── ai-advisor.js            # Groq AI prompt generator & strategic advisor
├── server/                      # Node.js & Express REST Backend
│   ├── src/
│   │   ├── config/              # Firebase Admin, Groq SDK, Nodemailer transporter
│   │   ├── controllers/         # Auth, Goals, Savings, Expenses, Dashboard, Notifications, AI
│   │   ├── middleware/          # Firebase Auth ID Token verification
│   │   ├── routes/              # Express REST endpoints (/api/...)
│   │   ├── services/            # Deterministic math engine & node-cron background scanner
│   │   └── server.js            # Express server entry point
│   ├── .env.example             # Environment variables template
│   └── package.json             # Server dependencies
├── docs/
│   ├── SETUP_GUIDE.md           # Node.js & Firebase configuration walkthrough
│   └── CALCULATION_FORMULAS.md  # Detailed mathematical formulations
└── README.md                    # Project overview
```

---

## 🔒 Security & Best Practices
- **Token Verification**: Every protected REST API endpoint verifies the Firebase ID Token using Firebase Admin SDK.
- **User Isolation**: All goals, savings, expenses, and notifications are strictly filtered by verified Firebase UID.
- **Secret Protection**: Groq API keys, Firebase service account credentials, and SMTP passwords reside exclusively in `server/.env`.
- **Deterministic Math**: Calculations are computed deterministically on the server before feeding numbers to LLMs.
- **Email Deduplication**: The `emailSent` flag ensures users never receive duplicate emails for the same milestone.

