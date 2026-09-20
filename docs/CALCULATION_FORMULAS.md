# SaveIQ – Deterministic Calculation Engine & Scoring Formulas

SaveIQ avoids non-deterministic AI hallucinations for financial mathematics by using exact, transparent arithmetic formulas across all modules.

---

## 1. Goal Reality Check Engine

### Variables:
- $T$: Target Amount (₹)
- $S$: Current Accumulated Savings (₹)
- $C$: Monthly Saving Capacity (₹)
- $D$: Goal Deadline Date
- $N$: Current Evaluation Date (Today)

### Formulas:

#### 1. Remaining Amount ($R$)
$$R = \max(0, T - S)$$

#### 2. Remaining Time ($M$ in months)
$$D_{days} = \lceil (D - N) / 86400000 \rceil$$
$$M = \max(0.1, D_{days} / 30.4375)$$

#### 3. Required Monthly Saving ($S_{req}$)
$$S_{req} = \begin{cases} \frac{R}{M}, & \text{if } R > 0 \text{ and } M > 0 \\ 0, & \text{if } R = 0 \\ R, & \text{if } M \le 0 \end{cases}$$

#### 4. Capacity Ratio ($C_r$)
$$C_r = \begin{cases} \frac{C}{S_{req}}, & \text{if } S_{req} > 0 \\ 1.0, & \text{if } S_{req} = 0 \end{cases}$$

#### 5. Deterministic Status Categories:
- **Completed**: If $S \ge T$ and $T > 0$.
- **On Track**: If $C_r \ge 1.0$ (User has sufficient capacity to cover or exceed monthly requirement).
- **Needs Adjustment**: If $0.70 \le C_r < 1.0$ (User falls 1% to 30% short of required pace).
- **At Risk**: If $C_r < 0.70$ or $D_{days} = 0$ with $R > 0$.

---

## 2. Transparent 0–100 Goal Reality Score Algorithm

The **Goal Reality Score** is an academic 4-pillar multi-factor evaluation scoring feasibility between 0 and 100 points:

$$\text{Score} = P + C_{pts} + T_{pts} + B_{pts}$$

| Pillar | Max Points | Formula / Logic | Description |
| :--- | :--- | :--- | :--- |
| **1. Progress Pillar ($P$)** | **30 pts** | $\min(30, \lfloor (S / T) \times 30 \rfloor)$ | Rewards percentage of goal already saved. |
| **2. Capacity Ratio ($C_{pts}$)** | **45 pts** | $\min(45, \lfloor \min(1.0, C_r) \times 45 \rfloor)$ | Tests whether monthly saving capacity covers requirement. |
| **3. Time Buffer ($T_{pts}$)** | **15 pts** | $\begin{cases} 15, & M \ge 6 \\ 12, & 3 \le M < 6 \\ 8, & 1 \le M < 3 \\ 4, & 0 < M < 1 \\ 0, & M \le 0 \end{cases}$ | Rewards proactive runway and long-term planning. |
| **4. Budget Health ($B_{pts}$)** | **10 pts** | $\begin{cases} 10, & (C / I) \le 0.35 \\ 7, & 0.35 < (C / I) \le 0.50 \\ 4, & 0.50 < (C / I) \le 0.70 \\ 1, & (C / I) > 0.70 \end{cases}$ | Ensures monthly commitment does not exceed safe proportion of gross income ($I$). |

### Score Rating Tiers:
- **85 – 100**: Highly Achievable (Green)
- **70 – 84**: Realistic & Feasible (Cyan)
- **50 – 69**: Moderate / Needs Focus (Amber)
- **0 – 49**: High Risk of Shortfall (Red)

---

## 3. Smart Alternative Plans Generation

When a goal is not on track, SaveIQ synthesizes 3 mathematically sound alternatives:

### Plan A (Deadline Extension):
- **Target**: Keeps original $T$.
- **Monthly Saving**: Sets to user's available capacity $C$.
- **New Timeline**: $M_A = \lceil R / C \rceil$ months.
- **New Deadline**: $N + M_A$ months.

### Plan B (Target Realignment):
- **Target**: $T_B = S + (C \times M)$.
- **Monthly Saving**: Keeps $C$.
- **Deadline**: Keeps original $D$.

### Plan C (Fast-Track Savings):
- **Target**: Keeps original $T$.
- **Monthly Saving**: Sets to $S_{req}$.
- **Monthly Increase Needed**: $\Delta C = \max(0, S_{req} - C)$.
- **Deadline**: Keeps original $D$.

---

## 4. Adaptive Savings Recalculation

When an actual deposit $A$ occurs instead of the planned milestone $E$:
$$\Delta = A - E$$
$$S_{new} = S_{old} + A$$
$$R_{new} = \max(0, T - S_{new})$$
$$S_{req, new} = \frac{R_{new}}{M}$$
