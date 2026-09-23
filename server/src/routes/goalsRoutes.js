const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const savingsController = require('../controllers/savingsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', goalsController.createGoal);
router.get('/', goalsController.getGoals);
router.get('/:goalId', goalsController.getGoalById);
router.put('/:goalId', goalsController.updateGoal);
router.delete('/:goalId', goalsController.deleteGoal);

// Nested savings route
router.post('/:goalId/savings', savingsController.logDeposit);
router.get('/:goalId/savings', savingsController.getSavingsHistory);

module.exports = router;
