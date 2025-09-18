#!/usr/bin/env node

/**
 * Manual data initialization script
 * Usage: node scripts/initializeData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dataInitializationService = require('../services/dataInitializationService');

async function initializeData() {
    try {
        console.log('🔄 Starting manual data initialization...');
        
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        
        // Initialize data
        await dataInitializationService.initializeAllData();
        
        // Get statistics
        const stats = await dataInitializationService.getStockSymbolsStats();
        console.log('\n📊 Data Initialization Summary:');
        console.log(`   Total Stock Symbols: ${stats.totalSymbols}`);
        console.log(`   By Type: ${stats.byType.map(t => `${t._id}: ${t.count}`).join(', ')}`);
        console.log(`   By Currency: ${stats.byCurrency.slice(0, 3).map(c => `${c._id}: ${c.count}`).join(', ')}...`);
        
        console.log('\n✅ Data initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during data initialization:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    initializeData();
}

module.exports = initializeData;

