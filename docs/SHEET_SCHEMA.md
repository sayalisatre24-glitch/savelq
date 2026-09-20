# SaveIQ – Google Sheets Database Schema

SaveIQ utilizes a structured 5-table relational design directly inside Google Sheets.

---

## 1. Table: `Users`
Stores user profile information, income baseline, and saving capacity.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `UserID` | String | Unique user identifier | `USR_001` |
| **B** | `Name` | String | Full user name | `Aarav Sharma` |
| **C** | `Email` | String | Email address for alerts | `aarav.sharma@example.com` |
| **D** | `MonthlyIncome` | Number | Net monthly earnings (₹) | `75000` |
| **E** | `MonthlySavingCapacity` | Number | Total available savings/mo | `20000` |
| **F** | `CreatedDate` | Date/String | Registration date | `2026-01-15` |

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
| **C** | `Date` | Date/String | Deposit date | `2026-02-05` |
| **D** | `Amount` | Number | Deposit amount (₹) | `15000` |
| **E** | `Notes` | String | Source or note | `February monthly savings` |

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

## 5. Table: `Alerts`
Logs automated Gmail notifications sent by the daily time-driven trigger.

| Column Index | Field Name | Data Type | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `AlertID` | String | Unique alert ID | `ALT_20260915_080000` |
| **B** | `GoalID` | String | Foreign key / Goal name | `MacBook Pro M3` |
| **C** | `UserID` | String | Recipient email | `user@example.com` |
| **D** | `AlertType` | String | Category of reminder | `Deadline Approaching` |
| **E** | `SentDate` | Date/String | Timestamp dispatched | `2026-09-15` |
| **F** | `Status` | String | Delivery status | `Sent` |
