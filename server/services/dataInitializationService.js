const fs = require('fs').promises;
const path = require('path');
const StockSymbol = require('../models/StockSymbol');

class DataInitializationService {
    constructor() {
        this.isInitialized = false;
        this.stockSymbolsPath = path.join(__dirname, '../config/trading212StockSymbols.json');
    }

    /**
     * Initialize all required data on application startup
     */
    async initializeAllData() {
        try {
            console.log('🔄 Starting data initialization...');
            
            await this.initializeStockSymbols();
            
            this.isInitialized = true;
            console.log('✅ Data initialization completed successfully');
        } catch (error) {
            console.error('❌ Error during data initialization:', error);
            throw error;
        }
    }

    /**
     * Initialize stock symbols from JSON file
     */
    async initializeStockSymbols() {
        try {
            console.log('📊 Initializing stock symbols...');
            
            // Check if file exists
            await fs.access(this.stockSymbolsPath);
            
            // Read and parse JSON file
            const fileContent = await fs.readFile(this.stockSymbolsPath, 'utf8');
            const stockSymbolsData = JSON.parse(fileContent);
            
            if (!Array.isArray(stockSymbolsData)) {
                throw new Error('Stock symbols JSON file must contain an array of symbols');
            }

            console.log(`📈 Found ${stockSymbolsData.length} stock symbols to process`);

            // Process symbols in batches to avoid memory issues
            const batchSize = 1000;
            let processedCount = 0;
            let insertedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < stockSymbolsData.length; i += batchSize) {
                const batch = stockSymbolsData.slice(i, i + batchSize);
                const batchResults = await this.processStockSymbolBatch(batch);
                
                processedCount += batchResults.processed;
                insertedCount += batchResults.inserted;
                updatedCount += batchResults.updated;
                skippedCount += batchResults.skipped;

                // Log progress for large datasets
                if (i % 10000 === 0) {
                    console.log(`📊 Processed ${processedCount}/${stockSymbolsData.length} stock symbols...`);
                }
            }

            console.log(`✅ Stock symbols initialization completed:`);
            console.log(`   - Total processed: ${processedCount}`);
            console.log(`   - New symbols inserted: ${insertedCount}`);
            console.log(`   - Existing symbols updated: ${updatedCount}`);
            console.log(`   - Skipped (no changes): ${skippedCount}`);

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`⚠️  Stock symbols file not found at ${this.stockSymbolsPath}`);
                console.warn('   Skipping stock symbols initialization');
                return;
            }
            throw error;
        }
    }

    /**
     * Process a batch of stock symbols with upsert functionality
     */
    async processStockSymbolBatch(symbols) {
        const results = {
            processed: 0,
            inserted: 0,
            updated: 0,
            skipped: 0
        };

        const bulkOps = [];

        for (const symbolData of symbols) {
            try {
                // Validate required fields
                if (!symbolData.ticker || !symbolData.name || !symbolData.isin) {
                    console.warn(`⚠️  Skipping invalid symbol data:`, symbolData);
                    continue;
                }

                // Prepare data for upsert
                const processedData = {
                    ticker: symbolData.ticker.trim().toUpperCase(),
                    type: symbolData.type?.trim().toUpperCase() || 'UNKNOWN',
                    workingScheduleId: symbolData.workingScheduleId || 0,
                    isin: symbolData.isin.trim().toUpperCase(),
                    currencyCode: symbolData.currencyCode?.trim().toUpperCase() || 'USD',
                    name: symbolData.name.trim(),
                    shortName: symbolData.shortName?.trim().toUpperCase() || symbolData.ticker.trim().toUpperCase(),
                    maxOpenQuantity: symbolData.maxOpenQuantity || 0,
                    addedOn: symbolData.addedOn ? new Date(symbolData.addedOn) : new Date(),
                    updatedAt: new Date()
                };

                // Create upsert operation
                bulkOps.push({
                    updateOne: {
                        filter: { ticker: processedData.ticker },
                        update: { $set: processedData },
                        upsert: true
                    }
                });

                results.processed++;

            } catch (error) {
                console.warn(`⚠️  Error processing symbol ${symbolData.ticker}:`, error.message);
                continue;
            }
        }

        if (bulkOps.length === 0) {
            return results;
        }

        try {
            // Execute bulk upsert operations
            const bulkResult = await StockSymbol.bulkWrite(bulkOps, { 
                ordered: false,
                writeConcern: { w: 1 }
            });

            results.inserted = bulkResult.upsertedCount || 0;
            results.updated = bulkResult.modifiedCount || 0;
            results.skipped = (bulkResult.matchedCount || 0) - (bulkResult.modifiedCount || 0);

        } catch (error) {
            console.error('❌ Error during bulk upsert operation:', error);
            throw error;
        }

        return results;
    }

    /**
     * Check if data initialization has been completed
     */
    isDataInitialized() {
        return this.isInitialized;
    }

    /**
     * Get stock symbols statistics
     */
    async getStockSymbolsStats() {
        try {
            const totalCount = await StockSymbol.countDocuments();
            const typeStats = await StockSymbol.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);
            
            const currencyStats = await StockSymbol.aggregate([
                {
                    $group: {
                        _id: '$currencyCode',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]);

            return {
                totalSymbols: totalCount,
                byType: typeStats,
                byCurrency: currencyStats
            };
        } catch (error) {
            console.error('Error getting stock symbols stats:', error);
            throw error;
        }
    }
}

module.exports = new DataInitializationService();

