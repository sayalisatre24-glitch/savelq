/**
 * Expenses Controller
 * Handles expense records, category totals, and 50-30-20 budget analysis.
 */
const { db } = require('../config/firebase');

const expensesController = {
  /**
   * Log Expense
   * POST /api/expenses
   */
  async createExpense(req, res) {
    try {
      const { uid } = req.user;
      const { category, amount, date, description, type } = req.body;

      const numAmount = Number(amount);
      if (!category || !numAmount || numAmount <= 0) {
        return res.status(400).json({ status: 'error', message: 'Category and valid amount are required.' });
      }

      const expenseId = 'EXP_' + Date.now();
      const expense = {
        expenseId,
        userId: uid,
        category,
        amount: numAmount,
        type: type || (['Rent', 'Utilities', 'Groceries', 'Bills', 'Transport'].includes(category) ? 'Need' : 'Want'),
        description: description || '',
        date: date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      await db.collection('expenses').doc(expenseId).set(expense);

      return res.status(201).json({
        status: 'success',
        data: expense,
        message: 'Expense recorded successfully'
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Get User Expenses
   * GET /api/expenses
   */
  async getExpenses(req, res) {
    try {
      const { uid } = req.user;
      const snapshot = await db.collection('expenses').where('userId', '==', uid).get();

      const expenses = snapshot.docs
        .map(d => d.data())
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.status(200).json({
        status: 'success',
        data: expenses
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Delete Expense
   * DELETE /api/expenses/:expenseId
   */
  async deleteExpense(req, res) {
    try {
      const { uid } = req.user;
      const { expenseId } = req.params;

      const doc = await db.collection('expenses').doc(expenseId).get();
      if (!doc.exists || doc.data().userId !== uid) {
        return res.status(404).json({ status: 'error', message: 'Expense not found' });
      }

      await db.collection('expenses').doc(expenseId).delete();
      return res.status(200).json({ status: 'success', message: 'Expense deleted successfully' });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Get 50-30-20 Budget Summary
   * GET /api/expenses/budget-summary
   */
  async getBudgetSummary(req, res) {
    try {
      const { uid } = req.user;
      const userDoc = await db.collection('users').doc(uid).get();
      const income = userDoc.exists ? (userDoc.data().monthlyIncome || 75000) : 75000;

      const expSnapshot = await db.collection('expenses').where('userId', '==', uid).get();
      const expenses = expSnapshot.docs.map(d => d.data());

      let totalNeeds = 0;
      let totalWants = 0;
      const categoryTotals = {};

      expenses.forEach(exp => {
        const amt = Number(exp.amount) || 0;
        const cat = exp.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

        if (exp.type === 'Need') {
          totalNeeds += amt;
        } else {
          totalWants += amt;
        }
      });

      const totalExpenses = totalNeeds + totalWants;
      const actualSavings = Math.max(0, income - totalExpenses);

      const idealNeeds = Math.round(income * 0.5);
      const idealWants = Math.round(income * 0.3);
      const idealSavings = Math.round(income * 0.2);

      return res.status(200).json({
        status: 'success',
        data: {
          monthlyIncome: income,
          totalExpenses,
          categoryTotals,
          actualNeeds: totalNeeds,
          actualWants: totalWants,
          actualSavings,
          idealNeeds,
          idealWants,
          idealSavings,
          pctNeeds: Number(((totalNeeds / income) * 100).toFixed(1)),
          pctWants: Number(((totalWants / income) * 100).toFixed(1)),
          pctSavings: Number(((actualSavings / income) * 100).toFixed(1))
        }
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }
};

module.exports = expensesController;
