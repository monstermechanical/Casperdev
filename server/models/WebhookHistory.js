const mongoose = require('mongoose');

const webhookHistorySchema = new mongoose.Schema({
  webhookId: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    type: String,
    required: true,
    enum: ['zapier', 'hubspot', 'slack', 'other'],
    default: 'zapier'
  },
  action: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processed: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error', 'pending'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
webhookHistorySchema.index({ source: 1, createdAt: -1 });
webhookHistorySchema.index({ action: 1, createdAt: -1 });

// TTL index to automatically delete webhooks older than 30 days
webhookHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static method to get recent webhooks with pagination
webhookHistorySchema.statics.getRecentWebhooks = async function(source = 'zapier', limit = 50, offset = 0) {
  return this.find({ source })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .lean();
};

// Static method to cleanup old webhooks (fallback if TTL doesn't work)
webhookHistorySchema.statics.cleanupOldWebhooks = async function(source = 'zapier', maxCount = 1000) {
  const totalCount = await this.countDocuments({ source });
  
  if (totalCount > maxCount) {
    const webhooksToDelete = await this.find({ source })
      .sort({ createdAt: 1 })
      .limit(totalCount - maxCount)
      .select('_id');
    
    const idsToDelete = webhooksToDelete.map(w => w._id);
    await this.deleteMany({ _id: { $in: idsToDelete } });
    
    return totalCount - maxCount;
  }
  
  return 0;
};

// Static method to get webhook statistics
webhookHistorySchema.statics.getStats = async function(source = 'zapier', days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    { $match: { source, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        actions: { $addToSet: '$action' }
      }
    }
  ]);
  
  const total = await this.countDocuments({ source, createdAt: { $gte: startDate } });
  
  return {
    total,
    period: `${days} days`,
    breakdown: stats,
    startDate: startDate.toISOString()
  };
};

module.exports = mongoose.model('WebhookHistory', webhookHistorySchema);