/**
 * Goals Controller
 * Handles CRUD and mathematical reality scoring for user savings goals.
 */
const { db } = require('../config/firebase');
const CalculationService = require('../services/calculationService');

const goalsController = {
  /**
   * Create New Goal
   * POST /api/goals
   */
  async createGoal(req, res) {
    try {
      const { uid, email } = req.user;
      const {
        goalName,
        purpose,
        targetAmount,
        currentSavings,
        monthlySavingCapacity,
        deadline,
        emailAlert
      } = req.body;

      if (!goalName || !targetAmount || !deadline) {
        return res.status(400).json({
          status: 'error',
          message: 'Goal name, target amount, and deadline are required.'
        });
      }

      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : { monthlyCapacity: 20000, monthlyIncome: 75000 };

      const goalId = 'GOAL_' + Date.now();
      const target = Number(targetAmount) || 0;
      const current = Number(currentSavings) || 0;
      const capacity = Number(monthlySavingCapacity) || userData.monthlyCapacity || 20000;

      const evalResult = CalculationService.calculateGoalReality(
        { targetAmount: target, currentSavings: current, deadline, monthlyCapacity: capacity },
        userData.monthlyCapacity || 20000,
        userData.monthlyIncome || 75000
      );

      const newGoal = {
        goalId,
        userId: uid,
        goalName: goalName.trim(),
        purpose: purpose || 'Other',
        targetAmount: target,
        currentSavings: current,
        monthlySavingCapacity: capacity,
        deadline,
        status: evalResult.status,
        realityScore: evalResult.score,
        emailAlert: emailAlert !== false,
        createdAt: new Date().toISOString().split('T')[0]
      };

      await db.collection('goals').doc(goalId).set(newGoal);

      // Record initial transaction if currentSavings > 0
      if (current > 0) {
        const txId = 'TX_' + Date.now();
        await db.collection('transactions').doc(txId).set({
          transactionId: txId,
          userId: uid,
          goalId,
          amount: current,
          type: 'Initial Deposit',
          notes: 'Initial savings balance recorded during goal creation',
          createdAt: newGoal.createdAt
        });
      }

      return res.status(201).json({
        status: 'success',
        data: {
          ...newGoal,
          evaluation: evalResult
        },
        message: 'Goal created successfully'
      });
    } catch (err) {
      console.error('Error creating goal:', err);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Get All Goals for Authenticated User
   * GET /api/goals
   */
  async getGoals(req, res) {
    try {
      const { uid } = req.user;
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : { monthlyCapacity: 20000, monthlyIncome: 75000 };

      let snapshot = await db.collection('goals').where('userId', '==', uid).get();
      
      // If user has no goals yet, seed 2 realistic demo goals
      if (snapshot.docs.length === 0) {
        const demoGoals = [
          {
            id: 'GOAL_' + Date.now() + '_1',
            goalId: 'GOAL_' + Date.now() + '_1',
            userId: uid,
            goalName: 'MacBook Pro M3',
            purpose: 'Laptop Purchase',
            targetAmount: 150000,
            currentSavings: 50000,
            monthlySavingCapacity: 20000,
            deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'On Track',
            realityScore: 82,
            emailAlert: true,
            createdAt: new Date().toISOString().split('T')[0]
          },
          {
            id: 'GOAL_' + Date.now() + '_2',
            goalId: 'GOAL_' + Date.now() + '_2',
            userId: uid,
            goalName: 'Emergency Fund 2027',
            purpose: 'Emergency Fund',
            targetAmount: 200000,
            currentSavings: 60000,
            monthlySavingCapacity: 15000,
            deadline: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'On Track',
            realityScore: 78,
            emailAlert: true,
            createdAt: new Date().toISOString().split('T')[0]
          }
        ];

        for (const dg of demoGoals) {
          await db.collection('goals').doc(dg.goalId).set(dg);
        }
        snapshot = await db.collection('goals').where('userId', '==', uid).get();
      }

      const goals = [];

      snapshot.docs.forEach(doc => {
        const g = doc.data();
        const evalResult = CalculationService.calculateGoalReality(
          g,
          userData.monthlyCapacity || 20000,
          userData.monthlyIncome || 75000
        );
        goals.push({
          ...g,
          GoalID: g.goalId || g.id || g.GoalID,
          GoalName: g.goalName || g.GoalName,
          Purpose: g.purpose || g.Purpose || 'Other',
          TargetAmount: Number(g.targetAmount !== undefined ? g.targetAmount : g.TargetAmount) || 0,
          CurrentSavings: Number(g.currentSavings !== undefined ? g.currentSavings : g.CurrentSavings) || 0,
          MonthlySavingCapacity: Number(g.monthlySavingCapacity !== undefined ? g.monthlySavingCapacity : g.MonthlySavingCapacity) || (userData.monthlyCapacity || 20000),
          Deadline: g.deadline || g.Deadline,
          Status: evalResult.status,
          RealityScore: evalResult.score,
          evaluation: evalResult,
          status: evalResult.status,
          realityScore: evalResult.score
        });
      });

      return res.status(200).json({
        status: 'success',
        data: goals
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Get Single Goal Details
   * GET /api/goals/:goalId
   */
  async getGoalById(req, res) {
    try {
      const { uid } = req.user;
      const { goalId } = req.params;

      const goalDoc = await db.collection('goals').doc(goalId).get();
      if (!goalDoc.exists || goalDoc.data().userId !== uid) {
        return res.status(404).json({ status: 'error', message: 'Goal not found' });
      }

      const goal = goalDoc.data();
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      const evalResult = CalculationService.calculateGoalReality(
        goal,
        userData.monthlyCapacity || 20000,
        userData.monthlyIncome || 75000
      );

      const alternatives = CalculationService.generateAlternatives(goal, evalResult);

      // Get transaction history
      const txSnapshot = await db.collection('transactions').where('goalId', '==', goalId).get();
      const transactions = txSnapshot.docs.map(d => d.data());

      return res.status(200).json({
        status: 'success',
        data: {
          ...goal,
          evaluation: evalResult,
          alternatives,
          transactions
        }
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Update Goal
   * PUT /api/goals/:goalId
   */
  async updateGoal(req, res) {
    try {
      const { uid } = req.user;
      const { goalId } = req.params;
      const updates = req.body;

      const goalDoc = await db.collection('goals').doc(goalId).get();
      if (!goalDoc.exists || goalDoc.data().userId !== uid) {
        return res.status(404).json({ status: 'error', message: 'Goal not found' });
      }

      const currentGoal = goalDoc.data();
      const merged = { ...currentGoal, ...updates };

      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const evalResult = CalculationService.calculateGoalReality(merged, userData.monthlyCapacity, userData.monthlyIncome);

      merged.status = evalResult.status;
      merged.realityScore = evalResult.score;

      await db.collection('goals').doc(goalId).set(merged, { merge: true });

      return res.status(200).json({
        status: 'success',
        data: { ...merged, evaluation: evalResult },
        message: 'Goal updated successfully'
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  },

  /**
   * Delete Goal
   * DELETE /api/goals/:goalId
   */
  async deleteGoal(req, res) {
    try {
      const { uid } = req.user;
      const { goalId } = req.params;

      const goalDoc = await db.collection('goals').doc(goalId).get();
      if (!goalDoc.exists || goalDoc.data().userId !== uid) {
        return res.status(404).json({ status: 'error', message: 'Goal not found' });
      }

      await db.collection('goals').doc(goalId).delete();

      return res.status(200).json({
        status: 'success',
        message: 'Goal deleted successfully'
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }
};

module.exports = goalsController;
