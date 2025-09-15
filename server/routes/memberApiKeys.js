const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const encryptionService = require('../utils/encryption');
const Trading212Service = require('../services/trading212Service');

const router = express.Router();

// Get member API keys
router.get('/:memberId', authenticateToken, async (req, res) => {
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

        const apiKeys = await database.getMemberApiKeys(memberId);
        
        res.json({
            trading212: { configured: !!apiKeys?.trading212 },
            tickertape: { configured: !!apiKeys?.tickertape }
        });
    } catch (error) {
        console.error('Get member API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update member API keys
router.put('/:memberId', authenticateToken, [
    body('trading212').optional().isString(),
    body('tickertape').optional().isString()
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

        const { trading212, tickertape } = req.body;
        const updatedApiKeys = {};

        if (trading212 !== undefined) {
            updatedApiKeys.trading212 = trading212 ? encryptionService.encryptApiKey(trading212) : null;
        }
        if (tickertape !== undefined) {
            updatedApiKeys.tickertape = tickertape ? encryptionService.encryptApiKey(tickertape) : null;
        }

        const updatedMember = await database.updateMemberApiKeys(memberId, updatedApiKeys);
        
        res.json({ 
            message: 'API keys updated successfully',
            trading212: { configured: !!updatedMember.apiKeys.trading212 },
            tickertape: { configured: !!updatedMember.apiKeys.tickertape }
        });
    } catch (error) {
        console.error('Update member API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete member API key
router.delete('/:memberId/:platform', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { memberId, platform } = req.params;
        const member = await database.findMemberById(memberId);
        
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (!['trading212', 'tickertape'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const updateData = {};
        updateData[`apiKeys.${platform}`] = null;

        await database.updateMember(memberId, updateData);
        
        res.json({ message: `${platform} API key deleted successfully` });
    } catch (error) {
        console.error('Delete member API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test Trading212 API key for a member
router.post('/:memberId/test/trading212', authenticateToken, [
    body('apiKey').notEmpty().withMessage('API key is required')
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

        const { apiKey } = req.body;

        try {
            const trading212Service = new Trading212Service(apiKey);
            const accountInfo = await trading212Service.getAccountInfo();
            
            res.json({ 
                message: 'Trading212 API key is valid',
                accountInfo 
            });
        } catch (error) {
            console.error('Trading212 API test error:', error);
            res.status(400).json({ 
                error: 'Invalid Trading212 API key',
                details: error.message 
            });
        }
    } catch (error) {
        console.error('Test Trading212 API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
