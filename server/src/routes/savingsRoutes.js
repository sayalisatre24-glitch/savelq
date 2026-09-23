const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', savingsController.getSavingsHistory);
router.post('/', savingsController.logDeposit);
router.post('/:goalId', savingsController.logDeposit);
router.get('/:goalId', savingsController.getSavingsHistory);
router.post('/:goalId/savings', savingsController.logDeposit);
router.get('/:goalId/savings', savingsController.getSavingsHistory);

module.exports = router;
