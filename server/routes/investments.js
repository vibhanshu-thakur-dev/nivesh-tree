const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const database = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const Trading212Service = require('../services/trading212Service');
const currencyService = require('../services/currencyService');
const tickertapeService = require('../services/tickertapeService');
const encryptionService = require('../utils/encryption');

// Configure multer for CSV file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

const router = express.Router();

// Get all investments for a household
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        // Always fetch all household investments
        const investments = await database.findInvestmentsByHousehold(user.householdId);
        
        // Get all members for the household (excluding sensitive data like API keys)
        const members = await database.findMembersByHouseholdSafe(user.householdId);
        
        // Populate account information
        const investmentsWithAccounts = await Promise.all(
            investments.map(async (investment) => {
                if (investment.accountId) {
                    const account = await database.findInvestmentAccountById(investment.accountId);
                    return {
                        ...investment.toObject(),
                        accountName: account?.accountName,
                        accountType: account?.platform
                    };
                }
                return investment.toObject();
            })
        );

        res.json({ 
            investments: investmentsWithAccounts,
            members: members,
            allInvestments: investmentsWithAccounts
        });
    } catch (error) {
        console.error('Get investments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add manual investment
router.post('/', authenticateToken, [
    body('symbol').notEmpty().withMessage('Symbol is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('investmentType').isIn(['stock', 'mutual_fund', 'isa', 'etf']).withMessage('Invalid investment type'),
    body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
    body('averagePrice').isFloat({ min: 0 }).withMessage('Average price must be a positive number'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
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

        const { symbol, name, investmentType, quantity, averagePrice, currency = 'USD', memberId } = req.body;

        // Verify member belongs to household
        const member = await database.findMemberById(memberId);
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if investment already exists for this member
        const existingInvestment = await database.findInvestmentByMemberAndSymbol(memberId, symbol, investmentType);

        if (existingInvestment) {
            return res.status(400).json({ error: 'Investment already exists for this symbol and type' });
        }

        const totalValue = quantity * averagePrice;

        const investment = await database.createInvestment({
            householdId: user.householdId,
            memberId: memberId,
            symbol: symbol.toUpperCase(),
            name,
            investmentType,
            quantity,
            averagePrice,
            currentPrice: averagePrice,
            totalValue,
            currency: currency.toUpperCase(),
            sourceSystem: 'manual',
            sourceCountry: currency.toUpperCase() === 'GBP' ? 'GB' : 'US'
        });

        res.status(201).json({
            message: 'Investment added successfully',
            investment
        });
    } catch (error) {
        console.error('Add investment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update investment
router.put('/:id', authenticateToken, [
    body('quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be a positive number'),
    body('averagePrice').optional().isFloat({ min: 0 }).withMessage('Average price must be a positive number'),
    body('currentPrice').optional().isFloat({ min: 0 }).withMessage('Current price must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { quantity, averagePrice, currentPrice } = req.body;

        // Verify investment belongs to user
        const investment = await database.get(
            'SELECT * FROM investments WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (!investment) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        const updates = [];
        const values = [];

        if (quantity !== undefined) {
            updates.push('quantity = ?');
            values.push(quantity);
        }
        if (averagePrice !== undefined) {
            updates.push('average_price = ?');
            values.push(averagePrice);
        }
        if (currentPrice !== undefined) {
            updates.push('current_price = ?');
            values.push(currentPrice);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Recalculate total value
        const newQuantity = quantity !== undefined ? quantity : investment.quantity;
        const newAveragePrice = averagePrice !== undefined ? averagePrice : investment.average_price;
        const newCurrentPrice = currentPrice !== undefined ? currentPrice : investment.current_price;
        
        updates.push('total_value = ?');
        values.push(newQuantity * (newCurrentPrice || newAveragePrice));
        
        updates.push('last_updated = CURRENT_TIMESTAMP');
        values.push(id);

        await database.run(
            `UPDATE investments SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const updatedInvestment = await database.get(
            'SELECT * FROM investments WHERE id = ?',
            [id]
        );

        res.json({
            message: 'Investment updated successfully',
            investment: updatedInvestment
        });
    } catch (error) {
        console.error('Update investment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete specific platform data for a user
router.delete('/clear/:platform', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const platform = req.params.platform;
        
        let deleted = {};
        
        if (platform === 'trading212') {
            const orderCount = await database.get(
                'SELECT COUNT(*) as count FROM trading212_orders WHERE user_id = ?',
                [userId]
            );
            
            const investmentCount = await database.get(
                'SELECT COUNT(*) as count FROM investments WHERE user_id = ? AND investment_type = ?',
                [userId, 'isa']
            );
            
            const accountCount = await database.get(
                'SELECT COUNT(*) as count FROM investment_accounts WHERE user_id = ? AND account_type = ?',
                [userId, 'trading212']
            );
            
            await database.run('DELETE FROM trading212_orders WHERE user_id = ?', [userId]);
            await database.run('DELETE FROM investments WHERE user_id = ? AND investment_type = ?', [userId, 'isa']);
            await database.run('DELETE FROM investment_accounts WHERE user_id = ? AND account_type = ?', [userId, 'trading212']);
            
            deleted = {
                orders: orderCount.count,
                investments: investmentCount.count,
                accounts: accountCount.count
            };
        } else if (platform === 'tickertape') {
            const investmentCount = await database.get(
                'SELECT COUNT(*) as count FROM investments WHERE user_id = ? AND investment_type IN (?, ?)',
                [userId, 'stock', 'mutual_fund']
            );
            
            const accountCount = await database.get(
                'SELECT COUNT(*) as count FROM investment_accounts WHERE user_id = ? AND account_type = ?',
                [userId, 'tickertape']
            );
            
            await database.run('DELETE FROM investments WHERE user_id = ? AND investment_type IN (?, ?)', [userId, 'stock', 'mutual_fund']);
            await database.run('DELETE FROM investment_accounts WHERE user_id = ? AND account_type = ?', [userId, 'tickertape']);
            
            deleted = {
                investments: investmentCount.count,
                accounts: accountCount.count
            };
        } else {
            return res.status(400).json({ error: 'Invalid platform specified' });
        }
        
        console.log(`Cleared ${platform} data for user ${userId}:`, deleted);
        
        res.json({
            message: `${platform} data cleared successfully`,
            deleted
        });
    } catch (error) {
        console.error(`Clear ${req.params.platform} data error:`, error);
        res.status(500).json({ error: `Failed to clear ${req.params.platform} data` });
    }
});

// Delete all investment data for a user
router.delete('/clear-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get count of all data to be deleted
        const investmentCount = await database.get(
            'SELECT COUNT(*) as count FROM investments WHERE user_id = ?',
            [userId]
        );
        
        const accountCount = await database.get(
            'SELECT COUNT(*) as count FROM investment_accounts WHERE user_id = ?',
            [userId]
        );
        
        const orderCount = await database.get(
            'SELECT COUNT(*) as count FROM trading212_orders WHERE user_id = ?',
            [userId]
        );
        
        // Delete all investment data
        await database.run('DELETE FROM trading212_orders WHERE user_id = ?', [userId]);
        await database.run('DELETE FROM investments WHERE user_id = ?', [userId]);
        await database.run('DELETE FROM investment_accounts WHERE user_id = ?', [userId]);
        
        console.log(`Cleared all investment data for user ${userId}: ${investmentCount.count} investments, ${accountCount.count} accounts, ${orderCount.count} orders`);
        
        res.json({
            message: 'All investment data cleared successfully',
            deleted: {
                investments: investmentCount.count,
                accounts: accountCount.count,
                orders: orderCount.count
            }
        });
    } catch (error) {
        console.error('Clear all investment data error:', error);
        res.status(500).json({ error: 'Failed to clear all investment data' });
    }
});

// Delete investment
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await database.run(
            'DELETE FROM investments WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Investment not found' });
        }

        res.json({ message: 'Investment deleted successfully' });
    } catch (error) {
        console.error('Delete investment error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sync Trading212 investments
router.post('/sync/trading212', authenticateToken, [
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

        const { memberId } = req.body;

        // Verify member belongs to household
        const member = await database.findMemberById(memberId);
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Get member's API keys
        const memberApiKeys = await database.getMemberApiKeys(memberId);
        const trading212ApiKey = memberApiKeys?.trading212 ? 
            encryptionService.decryptApiKey(memberApiKeys.trading212) : null;
        
        // Check if member has configured their API key
        if (!trading212ApiKey) {
            return res.status(400).json({ 
                error: 'Trading212 API key not configured for this member. Please add the API key in the member settings.' 
            });
        }
        
        // Get all current positions from Trading212 portfolio
        console.log('Fetching Trading212 positions from portfolio...');
        let positions = [];
        
        try {
            // Create Trading212 service instance with user's API key
            const trading212Service = new Trading212Service(trading212ApiKey);
            positions = await trading212Service.getPositionsFromPortfolio();
            console.log(`Fetched ${positions.length} positions from portfolio`);
        } catch (error) {
            console.error('Trading212 Portfolio Error:', error.message);
            return res.status(500).json({ 
                error: 'Failed to fetch positions from Trading212 API. Please check your API key and try again.',
                details: error.message
            });
        }

        // Enrich positions with stock symbol data
        console.log('Enriching positions with stock symbol data...');
        const enrichedPositions = [];
        
        for (const position of positions) {
            try {
                // Try to find stock symbol data by ticker
                const stockSymbol = await database.findStockSymbolByTicker(position.symbol);
                
                const enrichedPosition = {
                    ...position,
                    name: stockSymbol ? stockSymbol.name : position.name, // Use stock symbol name if available
                    currency: stockSymbol ? stockSymbol.currencyCode : 'USD', // Use stock symbol currency if available
                    totalValue: (stockSymbol && stockSymbol.currencyCode === 'GBX') ? position.finalValue/100 : position.finalValue,
                    sourceCountry: stockSymbol ? (stockSymbol.currencyCode === 'GBX' ? 'GB' : stockSymbol.currencyCode) : 'US',
                    stockSymbolData: stockSymbol ? {
                        isin: stockSymbol.isin,
                        type: stockSymbol.type,
                        shortName: stockSymbol.shortName
                    } : null
                };
                
                enrichedPositions.push(enrichedPosition);
                console.log(`Enriched position: ${position.symbol} -> ${enrichedPosition.name}`);
            } catch (enrichError) {
                console.error(`Error enriching position ${position.symbol}:`, enrichError.message);
                // Use original position data if enrichment fails
                enrichedPositions.push({
                    ...position,
                    totalValue: position.finalValue || (position.quantity * position.currentPrice),
                    currency: 'USD'
                });
            }
        }

        // Create or update account
        let account = await database.findInvestmentAccountsByMember(memberId);
        account = account.find(acc => acc.platform === 'trading212');

        if (!account) {
            account = await database.createInvestmentAccount({
                householdId: user.householdId,
                memberId: memberId,
                platform: 'trading212',
                accountName: `${member.name}'s Trading212 ISA`
            });
        }

        // Sync enriched positions to database
        console.log('Syncing enriched positions to database...');
        const syncedInvestments = [];
        
        for (const position of enrichedPositions) {
            try {
                // Check if investment already exists
                let investment = await database.findInvestmentByMemberAndSymbol(memberId, position.symbol, position.investmentType);

                

                if (investment) {
                    // Update existing investment
                    investment = await database.updateInvestment(investment._id, {
                        quantity: position.quantity,
                        averagePrice: position.averagePrice,
                        currentPrice: position.currentPrice,
                        totalValue: position.totalValue,
                        name: position.name, // Update with enriched name
                        currency: position.currency,
                        sourceSystem: 'trading212',
                        sourceCountry: position.sourceCountry,
                        lastUpdated: new Date()
                    });
                } else {
                    // Create new investment
                    investment = await database.createInvestment({
                        householdId: user.householdId,
                        memberId: memberId,
                        accountId: account._id,
                        symbol: position.symbol,
                        name: position.name,
                        investmentType: position.investmentType,
                        quantity: position.quantity,
                        averagePrice: position.averagePrice,
                        currentPrice: position.currentPrice,
                        totalValue: position.totalValue,
                        currency: position.currency,
                        sourceSystem: 'trading212',
                        sourceCountry: position.sourceCountry
                    });
                }

                syncedInvestments.push(investment);
            } catch (dbError) {
                console.error(`Error syncing position ${position.symbol}:`, dbError.message);
                // Continue with other positions even if one fails
            }
        }

        console.log(`Successfully synced ${syncedInvestments.length} enriched positions`);

        res.json({
            message: 'Trading212 investments synced successfully with enriched data',
            investments: syncedInvestments,
            enrichedCount: enrichedPositions.length,
            syncedCount: syncedInvestments.length
        });
    } catch (error) {
        console.error('Sync Trading212 error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Import tickertape investments from CSV
router.post('/import/tickertape', authenticateToken, upload.single('csvFile'), [
    body('memberId').notEmpty().withMessage('Member ID is required')
], async (req, res) => {
    let filePath = null;
    
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            return res.status(404).json({ error: 'Household not found' });
        }

        const { memberId } = req.body;

        // Verify member belongs to household
        const member = await database.findMemberById(memberId);
        if (!member || member.householdId.toString() !== user.householdId.toString()) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No CSV file uploaded. Please select a CSV file to import.' 
            });
        }

        // Save uploaded file temporarily
        filePath = await tickertapeService.saveUploadedFile(req.file);
        
        // Parse CSV file
        const investments = await tickertapeService.parseCSVFile(filePath);
        
        if (investments.length === 0) {
            return res.status(400).json({ 
                error: 'No valid investments found in CSV file. Please check the file format.' 
            });
        }

        // Create or update account
        let account = await database.findInvestmentAccountsByMember(memberId);
        account = account.find(acc => acc.platform === 'tickertape');

        if (!account) {
            account = await database.createInvestmentAccount({
                householdId: user.householdId,
                memberId: memberId,
                platform: 'tickertape',
                accountName: `${member.name}'s Tickertape Portfolio`
            });
        }

        // Import investments
        const importedInvestments = [];

        for (const investment of investments) {
            // Check if investment already exists
            let existingInvestment = await database.findInvestmentByMemberAndSymbol(memberId, investment.symbol, investment.investmentType);

            // Prepare metadata for mutual fund specific data
            const metadata = {
                amcName: investment.amcName,
                category: investment.category,
                subCategory: investment.subCategory,
                planType: investment.planType,
                optionType: investment.optionType,
                investedAmount: investment.investedAmount,
                weight: investment.weight,
                pnl: investment.pnl,
                pnlPercent: investment.pnlPercent,
                xirr: investment.xirr,
                investedSince: investment.investedSince
            };

            if (existingInvestment) {
                // Update existing investment
                existingInvestment = await database.updateInvestment(existingInvestment._id, {
                    quantity: investment.quantity,
                    averagePrice: investment.averagePrice,
                    currentPrice: investment.currentPrice,
                    totalValue: investment.totalValue,
                    currency: investment.currency,
                    sourceSystem: 'tickertape',
                    sourceCountry: investment.currency === 'INR' ? 'IN' : 'US',
                    metadata: metadata,
                    lastUpdated: new Date()
                });
            } else {
                // Create new investment
                existingInvestment = await database.createInvestment({
                    householdId: user.householdId,
                    memberId: memberId,
                    accountId: account._id,
                    symbol: investment.symbol,
                    name: investment.name,
                    investmentType: investment.investmentType,
                    quantity: investment.quantity,
                    averagePrice: investment.averagePrice,
                    currentPrice: investment.currentPrice,
                    totalValue: investment.totalValue,
                    currency: investment.currency,
                    sourceSystem: 'tickertape',
                    sourceCountry: investment.currency === 'INR' ? 'IN' : 'US',
                    metadata: metadata
                });
            }

            importedInvestments.push(existingInvestment);
        }

        res.json({
            message: `Successfully imported ${importedInvestments.length} investments from CSV`,
            investments: importedInvestments,
            importedCount: importedInvestments.length
        });
    } catch (error) {
        console.error('Import tickertape CSV error:', error);
        res.status(500).json({ 
            error: 'Failed to import CSV file',
            details: error.message 
        });
    } finally {
        // Clean up uploaded file
        if (filePath) {
            await tickertapeService.cleanupFile(filePath);
        }
    }
});

// Get portfolio summary
router.get('/portfolio/summary', authenticateToken, async (req, res) => {
    try {
        console.log('Portfolio summary endpoint called for user:', req.user.userId);
        const user = await database.findUserById(req.user.userId);
        if (!user || !user.householdId) {
            console.log('User not found or no household:', user ? 'user exists but no household' : 'user not found');
            return res.status(404).json({ error: 'User not found in household, Household absent for user.' });
        }
        
        console.log('User found, household ID:', user.householdId);

        // Always fetch all household investments with member data
        const investments = await database.findInvestmentsByHousehold(user.householdId);
        console.log('Found investments:', investments.length);
        
        // Get all members for the household (excluding sensitive data like API keys)
        const members = await database.findMembersByHouseholdSafe(user.householdId);
        console.log('Found members:', members.length);

        // Calculate totals for all members
        const memberData = {};
        let householdTotalValue = 0;
        let householdTotalInvested = 0;
        let householdTotalGainLoss = 0;

        // Initialize member data
        members.forEach(member => {
            memberData[member._id.toString()] = {
                memberId: member._id,
                memberName: member.name,
                totalValue: 0,
                totalInvested: 0,
                totalGainLoss: 0,
                investmentCount: 0,
                investments: [],
                investmentWise: {
                    totalValueIsa: 0,
                    totalInvestedIsa: 0,
                    currencyIsa: 'GBP',
                    totalValueMutualFund: 0,
                    totalInvestedMutualFund: 0,
                    currencyMutualFund: 'INR',
                    totalValueStock: 0,
                    totalInvestedStock: 0,
                    currencyStock: 'INR'
                }
        };
        });

        // Calculate member-specific totals
        for (const investment of investments) {
            const currentValue = await currencyService.convertCurrency(investment.quantity * investment.currentPrice, investment.currency, 'GBP') || 0;
            const investedValue = await currencyService.convertCurrency(investment.quantity * investment.averagePrice, investment.currency, 'GBP') || 0;
           
            const memberId = investment.memberId._id.toString();
            if (memberData[memberId]) {
                // Convert to GBP for member totals
                
                memberData[memberId].totalValue += currentValue;
                memberData[memberId].totalInvested += investedValue;
                memberData[memberId].totalGainLoss += (currentValue - investedValue);
                memberData[memberId].investmentCount += 1;

                // Calculate investment-wise totals for each member (keep original currencies)
                if (investment.investmentType === 'isa') {
                    memberData[memberId].investmentWise.totalValueIsa += currentValue;
                    memberData[memberId].investmentWise.totalInvestedIsa += investedValue;
                } else if (investment.investmentType === 'mutual_fund') {
                    memberData[memberId].investmentWise.totalValueMutualFund += await currencyService.convertCurrency(investment.quantity * investment.currentPrice, investment.currency, 'INR') || 0;;
                    memberData[memberId].investmentWise.totalInvestedMutualFund += await currencyService.convertCurrency(investment.quantity * investment.averagePrice, investment.currency, 'INR') || 0;;
                } else if (investment.investmentType === 'stock') {
                    memberData[memberId].investmentWise.totalValueStock += await currencyService.convertCurrency(investment.quantity * investment.currentPrice, investment.currency, 'INR') || 0;;
                    memberData[memberId].investmentWise.totalInvestedStock += await currencyService.convertCurrency(investment.quantity * investment.averagePrice, investment.currency, 'INR') || 0;;
                }
            }

            
            householdTotalValue += currentValue;
            householdTotalInvested += investedValue;
            householdTotalGainLoss += (currentValue - investedValue);
        }

        // Calculate percentages for each member
        Object.values(memberData).forEach(member => {
            member.gainLossPercentage = member.totalInvested > 0 ? (member.totalGainLoss / member.totalInvested) * 100 : 0;
        });

        const householdGainLossPercentage = householdTotalInvested > 0 ? (householdTotalGainLoss / householdTotalInvested) * 100 : 0;

        // Calculate household investmentWise totals
        const householdInvestmentWise = {
            totalValueIsa: 0,
            totalInvestedIsa: 0,
            currencyIsa: 'GBP',
            totalValueMutualFund: 0,
            totalInvestedMutualFund: 0,
            currencyMutualFund: 'INR',
            totalValueStock: 0,
            totalInvestedStock: 0,
            currencyStock: 'INR'
        };


        console.log('Portfolio summary calculated successfully');
        console.log('Household totals - Value:', householdTotalValue, 'Invested:', householdTotalInvested, 'Gain/Loss:', householdTotalGainLoss);
        console.log('Household investmentWise:', householdInvestmentWise);
        console.log('Number of investments processed:', investments.length);
        console.log('Investment types found:', [...new Set(investments.map(inv => inv.investmentType))]);
        
        res.json({
            // Household totals
            totalValue: householdTotalValue,
            totalInvested: householdTotalInvested,
            totalGainLoss: householdTotalGainLoss,
            gainLossPercentage: householdGainLossPercentage,
            investmentCount: investments.length,
          
            // Member-specific data
            members: Object.values(memberData),
            // All investments for client-side filtering
            allInvestments: investments
        });
    } catch (error) {
        console.error('Portfolio summary error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get Trading212 account info
router.get('/trading212/account', authenticateToken, async (req, res) => {
    try {
        if (!process.env.TRADING212_API_KEY || process.env.TRADING212_API_KEY === 'your_trading212_api_key') {
            return res.status(400).json({ 
                error: 'Trading212 API key not configured' 
            });
        }

        const accountInfo = await trading212Service.getAccountInfo();
        res.json({ accountInfo });
    } catch (error) {
        console.error('Trading212 Account Info Error:', error);
        res.status(500).json({ error: 'Failed to fetch Trading212 account info' });
    }
});

// Get Trading212 instruments
router.get('/trading212/instruments', authenticateToken, async (req, res) => {
    try {
        if (!process.env.TRADING212_API_KEY || process.env.TRADING212_API_KEY === 'your_trading212_api_key') {
            return res.status(400).json({ 
                error: 'Trading212 API key not configured' 
            });
        }

        const instruments = await trading212Service.getInstruments();
        res.json({ instruments });
    } catch (error) {
        console.error('Trading212 Instruments Error:', error);
        res.status(500).json({ error: 'Failed to fetch Trading212 instruments' });
    }
});

// Get Trading212 order history
router.get('/trading212/orders', authenticateToken, async (req, res) => {
    try {
        if (!process.env.TRADING212_API_KEY || process.env.TRADING212_API_KEY === 'your_trading212_api_key') {
            return res.status(400).json({ 
                error: 'Trading212 API key not configured' 
            });
        }

        const { ticker, limit = 20 } = req.query;
        const orders = await trading212Service.getOrderHistory(ticker, parseInt(limit));
        res.json({ orders });
    } catch (error) {
        console.error('Trading212 Orders Error:', error);
        res.status(500).json({ error: 'Failed to fetch Trading212 order history' });
    }
});

// Get Trading212 dividends
router.get('/trading212/dividends', authenticateToken, async (req, res) => {
    try {
        if (!process.env.TRADING212_API_KEY || process.env.TRADING212_API_KEY === 'your_trading212_api_key') {
            return res.status(400).json({ 
                error: 'Trading212 API key not configured' 
            });
        }

        const { ticker, limit = 20 } = req.query;
        const dividends = await trading212Service.getDividends(ticker, parseInt(limit));
        res.json({ dividends });
    } catch (error) {
        console.error('Trading212 Dividends Error:', error);
        res.status(500).json({ error: 'Failed to fetch Trading212 dividends' });
    }
});

// Get stored Trading212 historical orders from database
router.get('/trading212/orders/stored', authenticateToken, async (req, res) => {
    try {
        const { ticker, limit = 100, offset = 0 } = req.query;
        
        let query = `
            SELECT * FROM trading212_orders 
            WHERE user_id = ? 
        `;
        const params = [req.user.id];
        
        if (ticker) {
            query += ' AND ticker = ?';
            params.push(ticker);
        }
        
        query += ' ORDER BY date_executed DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const orders = await database.query(query, params);
        
        // Parse taxes JSON for each order
        const ordersWithParsedTaxes = orders.map(order => ({
            ...order,
            taxes: order.taxes ? JSON.parse(order.taxes) : []
        }));
        
        res.json({ 
            orders: ordersWithParsedTaxes,
            total: orders.length,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get stored orders error:', error);
        res.status(500).json({ error: 'Failed to fetch stored Trading212 orders' });
    }
});

// Get Trading212 order statistics
router.get('/trading212/orders/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await database.query(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(DISTINCT ticker) as unique_tickers,
                SUM(CASE WHEN type = 'BUY' OR fill_type = 'BUY' THEN filled_value ELSE 0 END) as total_bought,
                SUM(CASE WHEN type = 'SELL' OR fill_type = 'SELL' THEN filled_value ELSE 0 END) as total_sold,
                MIN(date_executed) as first_order_date,
                MAX(date_executed) as last_order_date
            FROM trading212_orders 
            WHERE user_id = ? AND status = 'FILLED'
        `, [req.user.id]);
        
        const tickerStats = await database.query(`
            SELECT 
                ticker,
                COUNT(*) as order_count,
                SUM(CASE WHEN type = 'BUY' OR fill_type = 'BUY' THEN filled_quantity ELSE -filled_quantity END) as net_quantity,
                SUM(CASE WHEN type = 'BUY' OR fill_type = 'BUY' THEN filled_value ELSE -filled_value END) as net_value
            FROM trading212_orders 
            WHERE user_id = ? AND status = 'FILLED'
            GROUP BY ticker
            ORDER BY net_value DESC
        `, [req.user.id]);
        
        res.json({ 
            summary: stats[0] || {},
            tickerBreakdown: tickerStats
        });
    } catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({ error: 'Failed to fetch Trading212 order statistics' });
    }
});

// Delete all Trading212 synced data for a user
router.delete('/trading212/clear', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get count of data to be deleted for confirmation
        const orderCount = await database.get(
            'SELECT COUNT(*) as count FROM trading212_orders WHERE user_id = ?',
            [userId]
        );
        
        const investmentCount = await database.get(
            'SELECT COUNT(*) as count FROM investments WHERE user_id = ? AND investment_type = ?',
            [userId, 'isa']
        );
        
        const accountCount = await database.get(
            'SELECT COUNT(*) as count FROM investment_accounts WHERE user_id = ? AND account_type = ?',
            [userId, 'trading212']
        );
        
        // Delete in the correct order to respect foreign key constraints
        await database.run('DELETE FROM trading212_orders WHERE user_id = ?', [userId]);
        await database.run('DELETE FROM investments WHERE user_id = ? AND investment_type = ?', [userId, 'isa']);
        await database.run('DELETE FROM investment_accounts WHERE user_id = ? AND account_type = ?', [userId, 'trading212']);
        
        console.log(`Cleared Trading212 data for user ${userId}: ${orderCount.count} orders, ${investmentCount.count} investments, ${accountCount.count} accounts`);
        
        res.json({
            message: 'Trading212 data cleared successfully',
            deleted: {
                orders: orderCount.count,
                investments: investmentCount.count,
                accounts: accountCount.count
            }
        });
    } catch (error) {
        console.error('Clear Trading212 data error:', error);
        res.status(500).json({ error: 'Failed to clear Trading212 data' });
    }
});

// Get Trading212 data summary (for confirmation before deletion)
router.get('/trading212/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const orderCount = await database.get(
            'SELECT COUNT(*) as count FROM trading212_orders WHERE user_id = ?',
            [userId]
        );
        
        const investmentCount = await database.get(
            'SELECT COUNT(*) as count FROM investments WHERE user_id = ? AND investment_type = ?',
            [userId, 'isa']
        );
        
        const accountCount = await database.get(
            'SELECT COUNT(*) as count FROM investment_accounts WHERE user_id = ? AND account_type = ?',
            [userId, 'trading212']
        );
        
        const totalValue = await database.get(
            'SELECT SUM(total_value) as total FROM investments WHERE user_id = ? AND investment_type = ?',
            [userId, 'isa']
        );
        
        res.json({
            summary: {
                orders: orderCount.count,
                investments: investmentCount.count,
                accounts: accountCount.count,
                totalValue: totalValue.total || 0
            }
        });
    } catch (error) {
        console.error('Get Trading212 summary error:', error);
        res.status(500).json({ error: 'Failed to fetch Trading212 data summary' });
    }
});

module.exports = router;
