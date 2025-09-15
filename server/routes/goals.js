const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all goals for a household (with optional member filter)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { memberId } = req.query;
        const goals = await database.findGoalsByHousehold(user.householdId, memberId);

        res.json({ goals });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new goal
router.post('/', authenticateToken, [
    body('title').notEmpty().withMessage('Goal title is required'),
    body('targetAmount').isFloat({ min: 0 }).withMessage('Target amount must be a positive number'),
    body('targetDate').optional().isISO8601().withMessage('Target date must be a valid date'),
    body('category').optional().isIn(['total_value', 'specific_investment']).withMessage('Invalid goal category'),
    body('memberId').notEmpty().withMessage('Member ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { title, targetAmount, targetDate, category = 'total_value', memberId } = req.body;

        // Verify member belongs to household
        const member = await database.findMemberById(memberId);
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const goal = await database.createGoal({
            householdId: user.householdId,
            memberId: memberId,
            title,
            targetAmount,
            targetDate: targetDate ? new Date(targetDate) : null,
            category,
            status: 'active',
            currency: 'GBP'
        });

        res.status(201).json({
            message: 'Goal created successfully',
            goal
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update goal
router.put('/:id', authenticateToken, [
    body('title').optional().notEmpty().withMessage('Goal title cannot be empty'),
    body('targetAmount').optional().isFloat({ min: 0 }).withMessage('Target amount must be a positive number'),
    body('targetDate').optional().isISO8601().withMessage('Target date must be a valid date'),
    body('currentAmount').optional().isFloat({ min: 0 }).withMessage('Current amount must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { id } = req.params;
        const { title, targetAmount, targetDate, currentAmount } = req.body;

        // Verify goal belongs to household
        const goal = await database.findGoalById(id);
        if (!goal || goal.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (targetAmount !== undefined) updateData.targetAmount = targetAmount;
        if (targetDate !== undefined) updateData.targetDate = new Date(targetDate);
        if (currentAmount !== undefined) updateData.currentAmount = currentAmount;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Check if goal is achieved
        const newTargetAmount = targetAmount !== undefined ? targetAmount : goal.targetAmount;
        const newCurrentAmount = currentAmount !== undefined ? currentAmount : goal.currentAmount;
        
        if (newCurrentAmount >= newTargetAmount) {
            updateData.status = 'achieved';
        }

        const updatedGoal = await database.updateGoal(id, updateData);

        res.json({
            message: 'Goal updated successfully',
            goal: updatedGoal
        });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete goal
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { id } = req.params;

        // Verify goal belongs to household
        const goal = await database.findGoalById(id);
        if (!goal || goal.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await database.deleteGoal(id);

        res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update goal progress based on current portfolio value
router.post('/:id/update-progress', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { id } = req.params;

        const goal = await database.findGoalById(id);
        if (!goal || goal.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        let currentAmount = 0;

        if (goal.category === 'total_value') {
            // Get total portfolio value for the member or household
            const investments = goal.memberId ? 
                await database.findInvestmentsByMember(goal.memberId) :
                await database.findInvestmentsByHousehold(user.householdId);

            investments.forEach(investment => {
                const currentValue = investment.totalValueGBP || (investment.totalValue * 0.79);
                currentAmount += currentValue;
            });
        }

        const isAchieved = currentAmount >= goal.targetAmount;

        const updatedGoal = await database.updateGoal(id, {
            currentAmount,
            status: isAchieved ? 'achieved' : 'active'
        });

        res.json({
            message: 'Goal progress updated successfully',
            goal: updatedGoal
        });
    } catch (error) {
        console.error('Update goal progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get goal progress statistics
router.get('/progress', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { memberId } = req.query;
        const goals = await database.findGoalsByHousehold(user.householdId, memberId);

        const totalGoals = goals.length;
        const achievedGoals = goals.filter(goal => goal.status === 'achieved').length;
        const inProgressGoals = totalGoals - achievedGoals;

        const goalsWithProgress = goals.map(goal => {
            const progressPercentage = goal.targetAmount > 0 ? 
                (goal.currentAmount / goal.targetAmount) * 100 : 0;
            return {
                ...goal.toObject(),
                progressPercentage: Math.min(progressPercentage, 100)
            };
        });

        res.json({
            totalGoals,
            achievedGoals,
            inProgressGoals,
            goals: goalsWithProgress
        });
    } catch (error) {
        console.error('Get goal progress error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
