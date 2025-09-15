const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member'
  }],
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
householdSchema.index({ name: 1 });
householdSchema.index({ createdBy: 1 });
householdSchema.index({ isActive: 1 });

module.exports = mongoose.model('Household', householdSchema);
