# SaveIQ – Node.js & Firebase Setup & Deployment Guide

This guide walks you step-by-step through setting up Firebase Authentication, Cloud Firestore, Groq AI API, automated email alerts via Nodemailer, and running the Node.js Express backend.

---

## Part 1: Firebase Authentication & Cloud Firestore Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project** (e.g. `saveiq-ai`).
2. **Enable Firebase Authentication**:
   - In the left sidebar, navigate to **Build** &rarr; **Authentication**.
   - Click **Get Started** and enable **Email/Password** as a sign-in provider.
3. **Enable Cloud Firestore**:
   - In the left sidebar, navigate to **Build** &rarr; **Firestore Database**.
   - Click **Create Database**, select your closest server region (e.g., `asia-south1` or `us-central1`), and start in **Production Mode**.
4. **Generate Service Account Private Key**:
   - Click the gear icon ⚙️ (**Project Settings**) &rarr; **Service accounts**.
   - Select **Node.js** and click **Generate new private key**.
   - Save the downloaded JSON file securely.

---

## Part 2: Backend Environment Variables (`server/.env`)

1. Open `server/.env` (or copy from `server/.env.example`).
2. Populate the following variables from your downloaded Firebase service account JSON:
   ```ini
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000

   # Firebase Admin Configuration
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"
   ```

---

## Part 3: Groq AI Strategic Advisor Setup

1. Go to [Groq Console](https://console.groq.com) and create a free API key.
2. Add your key to `server/.env`:
   ```ini
   GROQ_API_KEY="gsk_your_groq_api_key_here"
   GROQ_MODEL="llama-3.3-70b-versatile"
   ```

---

## Part 4: Automated Email Notifications Setup (Nodemailer)

To enable automatic emails for **Target Completed**, **Higher Monthly Savings**, **Deadline Reminders**, and **Missed Monthly Targets**:

1. Generate a **Google App Password** (for Gmail) or use any standard SMTP provider:
   - Go to [Google Account Security](https://myaccount.google.com/security).
   - Ensure 2-Step Verification is ON &rarr; Create an **App Password** under "App Passwords".
2. Add the credentials to `server/.env`:
   ```ini
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-16-character-app-password"
   EMAIL_FROM="SaveIQ AI Goal Tracker <notifications@saveiq.app>"
   ```

---

## Part 5: Starting the Application

### 1. Start the Node.js Backend Server:
```bash
cd server
npm install
npm start
```
*Backend will listen on `http://localhost:5000` with automated background cron scanning.*

### 2. Start the Frontend Client:
```bash
npm run client
```
*Frontend will run on `http://localhost:3000`.*

---

## Part 6: Production Deployment (Render, Railway, Heroku, or AWS)

1. Deploy the `server/` directory as a Node.js web service on [Render](https://render.com) or [Railway](https://railway.app).
2. Set the environment variables in your hosting dashboard (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GROQ_API_KEY`, `SMTP_USER`, `SMTP_PASS`).
3. Deploy the frontend static files (`index.html`, `css/`, `js/`) to Vercel, Netlify, or Firebase Hosting.
4. Set `saveiq_node_api_url` in the frontend to your live production API URL (e.g. `https://saveiq-api.onrender.com/api`).
