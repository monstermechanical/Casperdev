const mongoose = require('mongoose');

const webhookHistorySchema = new mongoose.Schema({
  // Webhook identification
  webhookId: {
    type: String,
    required: true,
    unique: true,
    default: () => `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Webhook metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Request data
  action: {
    type: String,
    required: true,
    index: true
  },
  
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Processing information
  processed: {
    result: {
      type: mongoose.Schema.Types.Mixed
    },
    success: {
      type: Boolean,
      default: true
    },
    error: {
      type: String
    },
    processingTime: {
      type: Number // milliseconds
    }
  },
  
  // Request metadata
  source: {
    ip: String,
    userAgent: String,
    referer: String
  },
  
  // Response tracking
  response: {
    status: Number,
    message: String,
    data: mongoose.Schema.Types.Mixed
  },
  
  // Categorization
  category: {
    type: String,
    enum: ['incoming', 'outgoing', 'test', 'error'],
    default: 'incoming',
    index: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
    index: true
  }
}, {
  timestamps: true,
  // TTL index for automatic cleanup after 30 days
  expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days in seconds
});

// Create TTL index for automatic document expiration
webhookHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Create compound indexes for efficient queries
webhookHistorySchema.index({ action: 1, timestamp: -1 });
webhookHistorySchema.index({ category: 1, timestamp: -1 });
webhookHistorySchema.index({ 'processed.success': 1, timestamp: -1 });

// Static method to get recent webhooks with pagination
webhookHistorySchema.statics.getRecentWebhooks = async function(options = {}) {
  const {
    page = 1,
    limit = 50,
    action = null,
    category = null,
    success = null,
    startDate = null,
    endDate = null
  } = options;

  const query = {};
  
  // Add filters
  if (action) query.action = action;
  if (category) query.category = category;
  if (success !== null) query['processed.success'] = success;
  
  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  
  const [webhooks, total] = await Promise.all([
    this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    webhooks,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: webhooks.length,
      totalRecords: total,
      hasNext: skip + webhooks.length < total,
      hasPrev: page > 1
    }
  };
};

// Static method to get webhook statistics
webhookHistorySchema.statics.getStatistics = async function(options = {}) {
  const {
    period = '24h',
    startDate = null,
    endDate = null
  } = options;

  // Calculate date range based on period
  let start, end;
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    end = new Date();
    switch (period) {
      case '1h':
        start = new Date(end.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  const pipeline = [
    {
      $match: {
        timestamp: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        successful: {
          $sum: {
            $cond: [{ $eq: ['$processed.success', true] }, 1, 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$processed.success', false] }, 1, 0]
          }
        },
        actionBreakdown: {
          $push: '$action'
        },
        categoryBreakdown: {
          $push: '$category'
        },
        avgProcessingTime: {
          $avg: '$processed.processingTime'
        }
      }
    }
  ];

  const [stats] = await this.aggregate(pipeline);
  
  if (!stats) {
    return {
      period,
      startDate: start,
      endDate: end,
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      avgProcessingTime: 0,
      actionBreakdown: {},
      categoryBreakdown: {}
    };
  }

  // Calculate action and category breakdowns
  const actionCounts = stats.actionBreakdown.reduce((acc, action) => {
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});

  const categoryCounts = stats.categoryBreakdown.reduce((acc, category) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  return {
    period,
    startDate: start,
    endDate: end,
    total: stats.total,
    successful: stats.successful,
    failed: stats.failed,
    successRate: stats.total > 0 ? (stats.successful / stats.total * 100).toFixed(2) : 0,
    avgProcessingTime: Math.round(stats.avgProcessingTime || 0),
    actionBreakdown: actionCounts,
    categoryBreakdown: categoryCounts
  };
};

// Static method for cleanup of old webhooks (manual cleanup beyond TTL)
webhookHistorySchema.statics.cleanup = async function(options = {}) {
  const {
    olderThan = 30, // days
    category = null,
    failed = false
  } = options;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThan);

  const query = {
    timestamp: { $lt: cutoffDate }
  };

  if (category) query.category = category;
  if (failed) query['processed.success'] = false;

  const result = await this.deleteMany(query);
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate,
    criteria: query
  };
};

// Instance method to mark webhook as processed
webhookHistorySchema.methods.markProcessed = function(result, success = true, error = null, processingTime = null) {
  this.processed = {
    result,
    success,
    error,
    processingTime
  };
  return this.save();
};

// Instance method to add response data
webhookHistorySchema.methods.setResponse = function(status, message, data = null) {
  this.response = {
    status,
    message,
    data
  };
  return this.save();
};

module.exports = mongoose.model('WebhookHistory', webhookHistorySchema);