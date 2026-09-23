const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expensesController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.post('/', expensesController.createExpense);
router.get('/', expensesController.getExpenses);
router.delete('/:expenseId', expensesController.deleteExpense);
router.get('/budget-summary', expensesController.getBudgetSummary);

module.exports = router;
