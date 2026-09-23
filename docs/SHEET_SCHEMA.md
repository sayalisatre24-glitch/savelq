# SaveIQ – Google Sheets Database Schema

SaveIQ utilizes a structured 6-table relational design directly inside Google Sheets, complete with cryptographic password security and an automated in-app and Gmail notification engine.

---

## 1. Table: `Users`
Stores user profile information, income baseline, saving capacity, and cryptographic security hashes.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `UserID` | String | Unique user identifier | `USR_001` |
| **B** | `Name` | String | Full user name | `Aarav Sharma` |
| **C** | `Email` | String | Email address (unique key) | `aarav.sharma@example.com` |
| **D** | `PasswordHash` | String | SHA-256 password hash | `a591a6d40bf42040...` |
| **E** | `Salt` | String | Cryptographic unique salt | `s9f82kd01a` |
| **F** | `MonthlyIncome` | Number | Net monthly earnings (₹) | `75000` |
| **G** | `MonthlySavingCapacity` | Number | Total available savings/mo | `20000` |
| **H** | `CreatedDate` | Date/String | Registration date | `2026-01-15` |

---

## 2. Table: `Goals`
Stores savings goals, financial targets, calculated statuses, and reality scores.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `GoalID` | String | Unique Goal ID | `GOAL_20260201_101500` |
| **B** | `UserID` | String | Foreign key to Users | `USR_001` |
| **C** | `GoalName` | String | Descriptive name | `MacBook Pro M3` |
| **D** | `Purpose` | String | Category tag | `Laptop Purchase` |
| **E** | `TargetAmount` | Number | Total target cost (₹) | `140000` |
| **F** | `CurrentSavings` | Number | Accumulated amount (₹) | `65000` |
| **G** | `MonthlySavingCapacity` | Number | Monthly allocation (₹) | `15000` |
| **H** | `Deadline` | Date/String | Target completion date | `2026-11-30` |
| **I** | `Status` | String | Reality status | `On Track` |
| **J** | `RealityScore` | Number | Feasibility Score (0-100) | `88` |
| **K** | `EmailAlert` | Boolean | Automated email toggle | `TRUE` |
| **L** | `CreatedDate` | Date/String | Date goal was logged | `2026-02-01` |

---

## 3. Table: `Savings`
Audit trail of individual deposits and contributions toward specific goals.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `SavingID` | String | Unique transaction ID | `SAV_20260205_110000` |
| **B** | `GoalID` | String | Foreign key to Goals | `GOAL_20260201_101500` |
| **C** | `UserID` | String | Foreign key to Users | `USR_001` |
| **D** | `Date` | Date/String | Deposit date | `2026-02-05` |
| **E** | `Amount` | Number | Deposit amount (₹) | `15000` |
| **F** | `Notes` | String | Source or note | `February monthly savings` |

---

## 4. Table: `Expenses`
Tracks monthly expenses for cash flow analysis and 50/30/20 budget calculations.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `ExpenseID` | String | Unique expense ID | `EXP_20260902_143000` |
| **B** | `UserID` | String | Foreign key to Users | `USR_001` |
| **C** | `Date` | Date/String | Expense date | `2026-09-02` |
| **D** | `Category` | String | Category tag | `Bills` |
| **E** | `Amount` | Number | Expense amount (₹) | `18000` |
| **F** | `Notes` | String | Description | `Rent & Maintenance` |

---

## 5. Table: `Notifications`
Stores in-app notifications, delivery statuses, and read flags for milestone triggers.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `NotificationID` | String | Unique notification ID | `NOTIF_20260923_140000_12` |
| **B** | `UserID` | String | Foreign key to Users | `USR_001` |
| **C** | `Email` | String | Recipient email address | `aarav.sharma@example.com` |
| **D** | `GoalID` | String | Associated Goal ID | `GOAL_001` |
| **E** | `Type` | String | Notification classification | `Target Completed` / `Higher Monthly Savings` / `Deadline Reminder` / `Missed Monthly Target` |
| **F** | `Message` | String | User-facing message | `🎉 Congratulations! You have completed your Laptop savings goal.` |
| **G** | `CreatedAt` | Date/String | Trigger timestamp | `2026-09-23 14:00:00` |
| **H** | `EmailSent` | Boolean | Gmail dispatch flag (prevents duplicates) | `TRUE` |
| **I** | `Read` | Boolean | In-app view state | `FALSE` |

---

## 6. Table: `Alerts`
Audit log of all automated Gmail notifications sent by the background triggers.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `AlertID` | String | Unique alert ID | `ALT_20260915_080000` |
| **B** | `GoalID` | String | Foreign key / Goal name | `MacBook Pro M3` |
| **C** | `RecipientEmail` | String | Recipient email | `aarav.sharma@example.com` |
| **D** | `AlertType` | String | Category of reminder | `Target Completed` / `Deadline Reminder` |
| **E** | `SentDate` | Date/String | Timestamp dispatched | `2026-09-15 08:00:00` |
| **F** | `Status` | String | Delivery status | `Sent` |
