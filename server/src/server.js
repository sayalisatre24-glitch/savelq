/**
 * SaveIQ - Main Express Application Server
 * REST API with Firebase Auth, Cloud Firestore, Groq AI & Nodemailer integration.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/authRoutes');
const goalsRoutes = require('./routes/goalsRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const expensesRoutes = require('./routes/expensesRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Background Cron Service
const { initCron } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    backend: 'Node.js + Express.js',
    database: 'Cloud Firestore',
    auth: 'Firebase Authentication',
    ai: 'Groq AI (Llama 3.3)',
    email: 'Nodemailer SMTP'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 SaveIQ Express Backend running at: http://localhost:${PORT}`);
  console.log(`📡 REST API Base: http://localhost:${PORT}/api`);
  console.log('🔥 Database & Auth: Cloud Firestore & Firebase Auth');
  console.log('🧠 AI Strategic Engine: Groq AI');
  console.log('✉️ Email Alerts: Nodemailer Service');
  console.log('====================================================');

  // Start background automated jobs
  initCron();
});

module.exports = app;
