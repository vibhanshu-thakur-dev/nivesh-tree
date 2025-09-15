const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
    householdId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household',
        required: true
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InvestmentAccount'
    },
    symbol: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    investmentType: {
        type: String,
        required: true,
        enum: ['stock', 'mutual_fund', 'isa', 'etf', 'bond', 'crypto', 'other']
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    averagePrice: {
        type: Number,
        required: true,
        min: 0
    },
    currentPrice: {
        type: Number,
        min: 0
    },
    totalValue: {
        type: Number,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        enum: ['USD', 'EUR', 'GBP', 'INR', 'GBX']
    },
    sourceSystem: {
        type: String,
        enum: ['trading212', 'tickertape', 'manual', 'other'],
        default: 'manual'
    },
    sourceCountry: {
        type: String,
        default: 'US',
        uppercase: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update updatedAt on save
investmentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
investmentSchema.index({ householdId: 1, memberId: 1, symbol: 1, investmentType: 1 });
investmentSchema.index({ householdId: 1, memberId: 1, investmentType: 1 });
investmentSchema.index({ householdId: 1, investmentType: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
