const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get household information
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let household;
        if (user.householdId) {
            household = await database.findHouseholdById(user.householdId);
        } else {
            // Create a default household for the user
            household = await database.createHousehold({
                name: `${user.firstName || user.username}'s Household`,
                description: 'Default household',
                createdBy: user._id
            });
            
            // Update user with household reference
            await database.updateUser(user._id, { householdId: household._id });
        }

        res.json({ household });
    } catch (error) {
        console.error('Get household error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update household information
router.put('/', authenticateToken, [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 })
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

        const { name, description } = req.body;
        const updateData = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const household = await database.updateHousehold(user.householdId, updateData);
        res.json({ household });
    } catch (error) {
        console.error('Update household error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all members of the household
router.get('/members', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const members = await database.findMembersByHouseholdSafe(user.householdId);
        res.json({ members });
    } catch (error) {
        console.error('Get household members error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a new member to the household
router.post('/members', authenticateToken, [
    body('name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'member'])
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

        const { name, email, role = 'member' } = req.body;

        // Check if member already exists
        const existingMember = await database.findMemberByEmail(email);
        if (existingMember) {
            return res.status(400).json({ error: 'Member with this email already exists' });
        }

        const member = await database.createMember({
            householdId: user.householdId,
            name,
            email,
            role
        });

        // Add member to household
        const household = await database.findHouseholdById(user.householdId);
        household.members.push(member._id);
        await household.save();

        res.status(201).json({
            message: 'Member added successfully',
            member
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update member information
router.put('/members/:memberId', authenticateToken, [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'member'])
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

        const { memberId } = req.params;
        const member = await database.findMemberById(memberId);
        
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const updateData = {};
        const { name, email, role } = req.body;
        
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;

        const updatedMember = await database.updateMember(memberId, updateData);
        res.json({
            message: 'Member updated successfully',
            member: updatedMember
        });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete member
router.delete('/members/:memberId', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { memberId } = req.params;
        const member = await database.findMemberById(memberId);
        
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Soft delete - mark as inactive
        await database.updateMember(memberId, { isActive: false });

        res.json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
