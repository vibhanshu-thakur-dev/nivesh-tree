const express = require('express');
const { body, validationResult, query } = require('express-validator');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all stock symbols with optional filtering
router.get('/', [
    query('type').optional().isString().trim(),
    query('currency').optional().isString().trim(),
    query('search').optional().isString().trim(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('page').optional().isInt({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { type, currency, search, limit = 50, page = 1 } = req.query;
        const filters = {};

        if (type) {
            filters.type = type.toUpperCase();
        }

        if (currency) {
            filters.currencyCode = currency.toUpperCase();
        }

        let stockSymbols;
        if (search) {
            stockSymbols = await database.searchStockSymbols(search);
        } else {
            stockSymbols = await database.findStockSymbols(filters);
        }

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedSymbols = stockSymbols.slice(startIndex, endIndex);

        res.json({
            stockSymbols: paginatedSymbols,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(stockSymbols.length / limit),
                totalItems: stockSymbols.length,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get stock symbols error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get stock symbol by ticker
router.get('/ticker/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const stockSymbol = await database.findStockSymbolByTicker(ticker);

        if (!stockSymbol) {
            return res.status(404).json({ error: 'Stock symbol not found' });
        }

        res.json({ stockSymbol });
    } catch (error) {
        console.error('Get stock symbol by ticker error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get stock symbol by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stockSymbol = await database.findStockSymbolById(id);

        if (!stockSymbol) {
            return res.status(404).json({ error: 'Stock symbol not found' });
        }

        res.json({ stockSymbol });
    } catch (error) {
        console.error('Get stock symbol by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new stock symbol (admin only)
router.post('/', authenticateToken, [
    body('ticker').notEmpty().withMessage('Ticker is required'),
    body('type').notEmpty().withMessage('Type is required'),
    body('workingScheduleId').isInt().withMessage('Working schedule ID must be a number'),
    body('isin').notEmpty().withMessage('ISIN is required'),
    body('currencyCode').notEmpty().withMessage('Currency code is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('shortName').notEmpty().withMessage('Short name is required'),
    body('maxOpenQuantity').isInt({ min: 0 }).withMessage('Max open quantity must be a non-negative number'),
    body('addedOn').isISO8601().withMessage('Added on must be a valid date')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const stockSymbolData = {
            ticker: req.body.ticker.toUpperCase(),
            type: req.body.type.toUpperCase(),
            workingScheduleId: req.body.workingScheduleId,
            isin: req.body.isin.toUpperCase(),
            currencyCode: req.body.currencyCode.toUpperCase(),
            name: req.body.name,
            shortName: req.body.shortName.toUpperCase(),
            maxOpenQuantity: req.body.maxOpenQuantity,
            addedOn: new Date(req.body.addedOn)
        };

        // Check if ticker already exists
        const existingSymbol = await database.findStockSymbolByTicker(stockSymbolData.ticker);
        if (existingSymbol) {
            return res.status(400).json({ error: 'Stock symbol with this ticker already exists' });
        }

        const stockSymbol = await database.createStockSymbol(stockSymbolData);

        res.status(201).json({
            message: 'Stock symbol created successfully',
            stockSymbol
        });
    } catch (error) {
        console.error('Create stock symbol error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update stock symbol (admin only)
router.put('/:id', authenticateToken, [
    body('ticker').optional().notEmpty().withMessage('Ticker cannot be empty'),
    body('type').optional().notEmpty().withMessage('Type cannot be empty'),
    body('workingScheduleId').optional().isInt().withMessage('Working schedule ID must be a number'),
    body('isin').optional().notEmpty().withMessage('ISIN cannot be empty'),
    body('currencyCode').optional().notEmpty().withMessage('Currency code cannot be empty'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('shortName').optional().notEmpty().withMessage('Short name cannot be empty'),
    body('maxOpenQuantity').optional().isInt({ min: 0 }).withMessage('Max open quantity must be a non-negative number'),
    body('addedOn').optional().isISO8601().withMessage('Added on must be a valid date')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const updateData = {};

        // Only include fields that are provided
        if (req.body.ticker) updateData.ticker = req.body.ticker.toUpperCase();
        if (req.body.type) updateData.type = req.body.type.toUpperCase();
        if (req.body.workingScheduleId !== undefined) updateData.workingScheduleId = req.body.workingScheduleId;
        if (req.body.isin) updateData.isin = req.body.isin.toUpperCase();
        if (req.body.currencyCode) updateData.currencyCode = req.body.currencyCode.toUpperCase();
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.shortName) updateData.shortName = req.body.shortName.toUpperCase();
        if (req.body.maxOpenQuantity !== undefined) updateData.maxOpenQuantity = req.body.maxOpenQuantity;
        if (req.body.addedOn) updateData.addedOn = new Date(req.body.addedOn);

        // Check if ticker already exists (if being updated)
        if (updateData.ticker) {
            const existingSymbol = await database.findStockSymbolByTicker(updateData.ticker);
            if (existingSymbol && existingSymbol._id.toString() !== id) {
                return res.status(400).json({ error: 'Stock symbol with this ticker already exists' });
            }
        }

        const stockSymbol = await database.updateStockSymbol(id, updateData);

        if (!stockSymbol) {
            return res.status(404).json({ error: 'Stock symbol not found' });
        }

        res.json({
            message: 'Stock symbol updated successfully',
            stockSymbol
        });
    } catch (error) {
        console.error('Update stock symbol error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete stock symbol (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const stockSymbol = await database.deleteStockSymbol(id);

        if (!stockSymbol) {
            return res.status(404).json({ error: 'Stock symbol not found' });
        }

        res.json({
            message: 'Stock symbol deleted successfully',
            stockSymbol
        });
    } catch (error) {
        console.error('Delete stock symbol error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get stock symbol statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await database.getStockSymbolStats();
        res.json({ stats: stats[0] || {} });
    } catch (error) {
        console.error('Get stock symbol stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
