# SaveIQ – Complete Setup & Deployment Guide

This guide walks you step-by-step through setting up Google Sheets, Google Apps Script, Groq AI API, automated Gmail deadline alerts, and deploying the frontend.

---

## Part 1: Google Sheet & Database Setup

1. Open your browser and go to [Google Sheets](https://sheets.new).
2. Name your spreadsheet: **`SaveIQ Database`**.
3. In the top menu, click **Extensions** &rarr; **Apps Script**.
4. Rename the Apps Script project to **`SaveIQ Backend Engine`**.

---

## Part 2: Deploying Apps Script Backend Code

1. In the Apps Script editor, open the default `Code.gs` file.
2. Replace all contents with the code from [`backend/Code.gs`](file:///c:/Users/Sayali/Downloads/SavelQ/backend/Code.gs).
3. To configure OAuth scopes:
   - Click the gear icon ⚙️ (**Project Settings**) on the left sidebar.
   - Check the box for **"Show 'appsscript.json' manifest file in editor"**.
   - Go back to the **Editor** (<>) tab, click on `appsscript.json`, and replace its content with [`backend/appsscript.json`](file:///c:/Users/Sayali/Downloads/SavelQ/backend/appsscript.json).
4. Click **Save** (💾 icon or `Ctrl+S`).

---

## Part 3: One-Click Database Initialization

1. In the Apps Script toolbar dropdown (next to "Debug"), select the function **`setupDatabase`**.
2. Click **Run**.
3. When prompted with **"Authorization Required"**:
   - Click **Review Permissions**.
   - Select your Google Account.
   - Click **Advanced** &rarr; **Go to SaveIQ Backend Engine (unsafe)**.
   - Click **Allow**.
4. Once completed, go back to your Google Sheet. You will see **5 newly created sheets** with styled headers:
   - `Users`
   - `Goals`
   - `Savings`
   - `Expenses`
   - `Alerts`

---

## Part 4: Configuring Groq AI API Key

1. Go to [Groq Console](https://console.groq.com) and create a free API key.
2. In your Google Apps Script editor, click ⚙️ (**Project Settings**).
3. Scroll down to **Script Properties** and click **Add script property**.
4. Enter:
   - **Property**: `GROQ_API_KEY`
   - **Value**: `gsk_your_actual_groq_api_key_here`
5. Click **Save script properties**.

> [!NOTE]
> Storing the API key in Script Properties ensures it remains securely on Google's servers and is never exposed in browser network requests.

---

## Part 5: Setting Up Automated Gmail Alerts (Daily Trigger)

1. In the Apps Script left sidebar, click the alarm clock icon ⏰ (**Triggers**).
2. Click **+ Add Trigger** (bottom right).
3. Configure the trigger:
   - **Choose which function to run**: `checkGoalDeadlines`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Day timer`
   - **Select time of day**: `8am to 9am` (or your preferred morning window)
4. Click **Save**.

The script will now automatically scan all active goals every morning and dispatch styled HTML email reminders via Gmail when deadlines approach or goals are at risk!

---

## Part 6: Deploying as a Web App

1. In Apps Script, click the blue **Deploy** button (top right) &rarr; **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" &rarr; choose **Web app**.
3. Fill in the deployment parameters:
   - **Description**: `SaveIQ Production Web App v1.0`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial for frontend fetch requests)*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

---

## Part 7: Connecting Frontend to Apps Script

1. Open [`index.html`](file:///c:/Users/Sayali/Downloads/SavelQ/index.html) in your browser.
2. In the sidebar, click on **Apps Script Hub**.
3. Paste your Web App URL into the **Google Apps Script Web App URL** input field.
4. Click **Connect Endpoint**.
5. The status badge will turn green (`Apps Script Live`). All goal creations, savings deposits, expenses, and AI requests are now synchronized live with your Google Sheet!

---

## Part 8: Git & GitHub Version Control

To initialize and push this project to GitHub:

```bash
# Initialize Git repository
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit: SaveIQ AI Goal Reality & Savings Planner"

# Create a main branch and push to GitHub
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SaveIQ.git
git push -u origin main
```
