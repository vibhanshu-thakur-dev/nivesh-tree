const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');
const { authenticateToken } = require('../middleware/auth');

// Get supported currencies
router.get('/currencies', authenticateToken, async (req, res) => {
    try {
        const currencies = currencyService.getSupportedCurrencies();
        res.json({
            success: true,
            currencies
        });
    } catch (error) {
        console.error('Error getting currencies:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get supported currencies' 
        });
    }
});

// Get current exchange rates
router.get('/rates', authenticateToken, async (req, res) => {
    try {
        const rates = await currencyService.getExchangeRates();
        res.json({
            success: true,
            rates,
            lastUpdated: currencyService.lastUpdated
        });
    } catch (error) {
        console.error('Error getting exchange rates:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get exchange rates' 
        });
    }
});

// Convert amount between currencies
router.post('/convert', authenticateToken, async (req, res) => {
    try {
        const { amount, fromCurrency, toCurrency } = req.body;
        
        if (!amount || !fromCurrency || !toCurrency) {
            return res.status(400).json({
                success: false,
                error: 'Amount, fromCurrency, and toCurrency are required'
            });
        }

        const convertedAmount = await currencyService.convertCurrency(
            parseFloat(amount), 
            fromCurrency, 
            toCurrency
        );

        res.json({
            success: true,
            originalAmount: parseFloat(amount),
            fromCurrency,
            toCurrency,
            convertedAmount,
            formatted: currencyService.formatCurrency(convertedAmount, toCurrency)
        });
    } catch (error) {
        console.error('Error converting currency:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to convert currency' 
        });
    }
});

// Convert portfolio data to target currency
router.post('/convert-portfolio', authenticateToken, async (req, res) => {
    try {
        const { portfolioData, targetCurrency } = req.body;
        
        if (!portfolioData || !targetCurrency) {
            return res.status(400).json({
                success: false,
                error: 'Portfolio data and target currency are required'
            });
        }

        const convertedData = await currencyService.convertPortfolioData(
            portfolioData, 
            targetCurrency
        );

        res.json({
            success: true,
            originalCurrency: 'GBP', // Assuming original is GBP
            targetCurrency,
            convertedData
        });
    } catch (error) {
        console.error('Error converting portfolio data:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to convert portfolio data' 
        });
    }
});

module.exports = router;
