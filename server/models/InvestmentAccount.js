const mongoose = require('mongoose');

const investmentAccountSchema = new mongoose.Schema({
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
    platform: {
        type: String,
        required: true,
        enum: ['trading212', 'tickertape', 'manual', 'other']
    },
    accountName: {
        type: String,
        required: true,
        trim: true
    },
    accountNumber: {
        type: String,
        trim: true
    },
    apiKey: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSync: {
        type: Date
    },
    syncStatus: {
        type: String,
        enum: ['success', 'error', 'pending', 'never'],
        default: 'never'
    },
    syncError: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
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
investmentAccountSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('InvestmentAccount', investmentAccountSchema);
