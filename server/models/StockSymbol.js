const mongoose = require('mongoose');

const stockSymbolSchema = new mongoose.Schema({
    ticker: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    workingScheduleId: {
        type: Number,
        required: true
    },
    isin: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    currencyCode: {
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
    shortName: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    maxOpenQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    addedOn: {
        type: Date,
        required: true
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
stockSymbolSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
stockSymbolSchema.index({ ticker: 1 });
stockSymbolSchema.index({ isin: 1 });
stockSymbolSchema.index({ type: 1 });
stockSymbolSchema.index({ name: 'text', shortName: 'text' });

module.exports = mongoose.model('StockSymbol', stockSymbolSchema);
