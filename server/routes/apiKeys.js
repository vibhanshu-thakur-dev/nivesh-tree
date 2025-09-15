const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const encryptionService = require('../utils/encryption');

const router = express.Router();

// Get user's API keys (without decryption for security)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const apiKeys = await database.getUserApiKeys(req.user.userId);
        
        // Return only the status of API keys, not the actual keys
        const response = {
            trading212: {
                configured: !!(apiKeys && apiKeys.trading212),
                lastUpdated: apiKeys?.trading212 ? 'Recently' : null
            },
            tickertape: {
                configured: !!(apiKeys && apiKeys.tickertape),
                lastUpdated: apiKeys?.tickertape ? 'Recently' : null
            }
        };
        
        res.json(response);
    } catch (error) {
        console.error('Get API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update API keys
router.put('/', authenticateToken, [
    body('trading212').optional().isString().withMessage('Trading212 API key must be a string'),
    body('tickertape').optional().isString().withMessage('Tickertape API key must be a string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { trading212, tickertape } = req.body;
        
        // Get current API keys
        const currentApiKeys = await database.getUserApiKeys(req.user.userId) || {};
        
        // Prepare updated API keys object
        const updatedApiKeys = { ...currentApiKeys };
        
        // Encrypt and store new API keys if provided
        if (trading212 !== undefined) {
            updatedApiKeys.trading212 = trading212 ? encryptionService.encryptApiKey(trading212) : null;
        }
        
        if (tickertape !== undefined) {
            updatedApiKeys.tickertape = tickertape ? encryptionService.encryptApiKey(tickertape) : null;
        }
        
        // Update user's API keys
        await database.updateUserApiKeys(req.user.userId, updatedApiKeys);
        
        res.json({
            message: 'API keys updated successfully',
            trading212: { configured: !!updatedApiKeys.trading212 },
            tickertape: { configured: !!updatedApiKeys.tickertape }
        });
    } catch (error) {
        console.error('Update API keys error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete specific API key
router.delete('/:platform', authenticateToken, async (req, res) => {
    try {
        const { platform } = req.params;
        
        if (!['trading212', 'tickertape'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform specified' });
        }
        
        // Get current API keys
        const currentApiKeys = await database.getUserApiKeys(req.user.userId) || {};
        
        // Remove the specified API key
        const updatedApiKeys = { ...currentApiKeys };
        updatedApiKeys[platform] = null;
        
        // Update user's API keys
        await database.updateUserApiKeys(req.user.userId, updatedApiKeys);
        
        res.json({
            message: `${platform} API key deleted successfully`,
            [platform]: { configured: false }
        });
    } catch (error) {
        console.error('Delete API key error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Test API key (for Trading212)
router.post('/test/trading212', authenticateToken, async (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }
        
        // Test the API key by making a simple request
        const axios = require('axios');
        const response = await axios.get('https://live.trading212.com/api/v0/equity/portfolio', {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({
            message: 'API key is valid',
            valid: true
        });
    } catch (error) {
        console.error('Test Trading212 API key error:', error);
        if (error.response && error.response.status === 401) {
            res.status(401).json({ 
                message: 'Invalid API key',
                valid: false 
            });
        } else {
            res.status(500).json({ 
                message: 'Failed to test API key',
                valid: false,
                error: error.message 
            });
        }
    }
});

module.exports = router;
