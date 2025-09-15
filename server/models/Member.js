const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  householdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Household',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // API keys for this member
  apiKeys: {
    trading212: {
      type: String,
      default: null
    },
    tickertape: {
      type: String,
      default: null
    }
  },
  // Member-specific settings
  settings: {
    defaultCurrency: {
      type: String,
      default: 'GBP'
    },
    timezone: {
      type: String,
      default: 'Europe/London'
    }
  },
  // Profile information
  profile: {
    avatar: String,
    phone: String,
    dateOfBirth: Date,
    occupation: String
  }
}, {
  timestamps: true
});

// Indexes
memberSchema.index({ householdId: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ householdId: 1, email: 1 }, { unique: true });
memberSchema.index({ isActive: 1 });

module.exports = mongoose.model('Member', memberSchema);
