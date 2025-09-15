const mongoose = require('mongoose');

const portfolioSnapshotSchema = new mongoose.Schema({
    householdId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household',
        required: true
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        default: null
    },
    totalValue: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        enum: ['USD', 'EUR', 'GBP', 'INR', 'GBX']
    },
    investmentCount: {
        type: Number,
        required: true,
        min: 0
    },
    platformBreakdown: [{
        platform: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true,
            min: 0
        },
        count: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    typeBreakdown: [{
        type: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true,
            min: 0
        },
        count: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    topInvestments: [{
        symbol: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        value: {
            type: Number,
            required: true,
            min: 0
        },
        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        }
    }],
    snapshotDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
portfolioSnapshotSchema.index({ householdId: 1, memberId: 1, snapshotDate: -1 });
portfolioSnapshotSchema.index({ householdId: 1, memberId: 1, createdAt: -1 });
portfolioSnapshotSchema.index({ householdId: 1, snapshotDate: -1 });

module.exports = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
