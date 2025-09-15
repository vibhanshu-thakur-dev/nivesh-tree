const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        enum: ['USD', 'EUR', 'GBP', 'INR', 'GBX']
    },
    targetDate: {
        type: Date,
        required: true
    },
    category: {
        type: String,
        enum: ['retirement', 'house', 'education', 'travel', 'emergency', 'investment', 'other'],
        default: 'investment'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true
    }],
    milestones: [{
        title: {
            type: String,
            required: true,
            trim: true
        },
        targetAmount: {
            type: Number,
            required: true,
            min: 0
        },
        achievedAt: {
            type: Date
        },
        isAchieved: {
            type: Boolean,
            default: false
        }
    }],
    progress: {
        percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        lastCalculated: {
            type: Date,
            default: Date.now
        }
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
goalSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Calculate progress percentage
    if (this.targetAmount > 0) {
        this.progress.percentage = Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
        this.progress.lastCalculated = Date.now();
    }
    
    next();
});

// Index for efficient queries
goalSchema.index({ householdId: 1, memberId: 1, status: 1 });
goalSchema.index({ householdId: 1, memberId: 1, targetDate: 1 });
goalSchema.index({ householdId: 1, memberId: 1, category: 1 });
goalSchema.index({ householdId: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);
