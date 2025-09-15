const mongoose = require('mongoose');

const trading212OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    ticker: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    instrumentCode: {
        type: String,
        trim: true
    },
    orderType: {
        type: String,
        required: true,
        enum: ['BUY', 'SELL', 'DIVIDEND', 'DIVIDEND_REINVESTMENT', 'OTHER']
    },
    fillType: {
        type: String,
        enum: ['OTC', 'MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'OTHER']
    },
    orderedQuantity: {
        type: Number,
        default: 0
    },
    filledQuantity: {
        type: Number,
        default: 0
    },
    fillPrice: {
        type: Number,
        min: 0
    },
    filledValue: {
        type: Number,
        min: 0
    },
    status: {
        type: String,
        enum: ['PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED', 'OTHER']
    },
    orderTime: {
        type: Date,
        required: true
    },
    fillTime: {
        type: Date
    },
    fees: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        enum: ['USD', 'EUR', 'GBP', 'INR', 'GBX']
    },
    notes: {
        type: String,
        trim: true
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
trading212OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries
trading212OrderSchema.index({ userId: 1, orderTime: -1 });
trading212OrderSchema.index({ userId: 1, ticker: 1 });
trading212OrderSchema.index({ orderId: 1 });

module.exports = mongoose.model('Trading212Order', trading212OrderSchema);
