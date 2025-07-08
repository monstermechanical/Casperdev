const mongoose = require('mongoose');

// Schema for storing Notion-Slack sync configurations
const notionSyncConfigSchema = new mongoose.Schema({
  // User/Organization identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Slack configuration
  slackTeamId: {
    type: String,
    required: true
  },
  slackChannelId: {
    type: String,
    required: true
  },
  slackChannelName: {
    type: String,
    required: true
  },
  
  // Notion configuration
  notionDatabaseId: {
    type: String,
    required: true
  },
  notionDatabaseName: {
    type: String,
    default: 'Slack Messages'
  },
  
  // Sync settings
  triggerEmoji: {
    type: String,
    default: '📝'
  },
  syncInterval: {
    type: Number,
    default: 10, // minutes
    min: 1,
    max: 60
  },
  maxMessagesPerSync: {
    type: Number,
    default: 20,
    min: 1,
    max: 100
  },
  
  // Status and control
  isActive: {
    type: Boolean,
    default: true
  },
  lastSync: {
    type: Date,
    default: null
  },
  
  // Statistics
  totalMessagesSynced: {
    type: Number,
    default: 0
  },
  totalErrors: {
    type: Number,
    default: 0
  },
  
  // Error handling
  retryAttempts: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  retryDelay: {
    type: Number,
    default: 1000, // milliseconds
    min: 100,
    max: 10000
  },
  
  // Additional metadata
  tags: [{
    type: String,
    trim: true
  }],
  
  // Filtering options
  syncFilters: {
    excludeBots: {
      type: Boolean,
      default: true
    },
    excludeThreads: {
      type: Boolean,
      default: false
    },
    minReactions: {
      type: Number,
      default: 1,
      min: 1
    },
    authorWhitelist: [String],
    authorBlacklist: [String]
  },
  
  // Notion page formatting
  pageTemplate: {
    titleFormat: {
      type: String,
      default: 'Message from {author} in #{channel}'
    },
    includeMetadata: {
      type: Boolean,
      default: true
    },
    includeReactions: {
      type: Boolean,
      default: true
    },
    includeThreads: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Schema for storing sync history and logs
const notionSyncHistorySchema = new mongoose.Schema({
  // Reference to sync configuration
  syncConfigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotionSyncConfig',
    required: true
  },
  
  // Slack message details
  slackMessageId: {
    type: String,
    required: true
  },
  slackMessageTimestamp: {
    type: String,
    required: true
  },
  slackUserId: {
    type: String,
    required: true
  },
  slackUserName: {
    type: String,
    required: true
  },
  slackChannelId: {
    type: String,
    required: true
  },
  slackChannelName: {
    type: String,
    required: true
  },
  
  // Message content
  messageText: {
    type: String,
    required: true
  },
  messageReactions: [{
    emoji: String,
    count: Number,
    users: [String]
  }],
  
  // Notion page details
  notionPageId: {
    type: String,
    required: true
  },
  notionPageUrl: {
    type: String,
    required: true
  },
  notionPageTitle: {
    type: String,
    required: true
  },
  
  // Sync metadata
  syncedAt: {
    type: Date,
    default: Date.now
  },
  syncDuration: {
    type: Number, // milliseconds
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'retrying'],
    default: 'pending'
  },
  
  // Error information
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // Retry information
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date,
    default: null
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notionSyncConfigSchema.index({ userId: 1, slackChannelId: 1 });
notionSyncConfigSchema.index({ isActive: 1 });
notionSyncConfigSchema.index({ lastSync: 1 });

notionSyncHistorySchema.index({ syncConfigId: 1 });
notionSyncHistorySchema.index({ slackMessageTimestamp: 1 });
notionSyncHistorySchema.index({ syncedAt: 1 });
notionSyncHistorySchema.index({ status: 1 });

// Compound index for preventing duplicates
notionSyncHistorySchema.index({ 
  slackMessageId: 1, 
  slackMessageTimestamp: 1 
}, { unique: true });

// Virtual for sync success rate
notionSyncConfigSchema.virtual('successRate').get(function() {
  const total = this.totalMessagesSynced + this.totalErrors;
  return total > 0 ? (this.totalMessagesSynced / total) * 100 : 0;
});

// Virtual for average sync frequency
notionSyncConfigSchema.virtual('averageSyncFrequency').get(function() {
  if (!this.lastSync || this.totalMessagesSynced === 0) return 0;
  
  const daysSinceFirstSync = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return daysSinceFirstSync > 0 ? this.totalMessagesSynced / daysSinceFirstSync : 0;
});

// Instance methods
notionSyncConfigSchema.methods.incrementSyncCount = function() {
  this.totalMessagesSynced += 1;
  this.lastSync = new Date();
  return this.save();
};

notionSyncConfigSchema.methods.incrementErrorCount = function() {
  this.totalErrors += 1;
  return this.save();
};

notionSyncConfigSchema.methods.updateLastSync = function() {
  this.lastSync = new Date();
  return this.save();
};

notionSyncConfigSchema.methods.isReadyForSync = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  const lastSyncTime = this.lastSync || new Date(0);
  const timeSinceLastSync = (now - lastSyncTime) / (1000 * 60); // minutes
  
  return timeSinceLastSync >= this.syncInterval;
};

// Static methods
notionSyncConfigSchema.statics.findActiveConfigs = function() {
  return this.find({ isActive: true });
};

notionSyncConfigSchema.statics.findByChannel = function(channelId) {
  return this.find({ slackChannelId: channelId, isActive: true });
};

notionSyncConfigSchema.statics.findByUser = function(userId) {
  return this.find({ userId: userId });
};

notionSyncHistorySchema.statics.findRecentSyncs = function(configId, limit = 10) {
  return this.find({ syncConfigId: configId })
    .sort({ syncedAt: -1 })
    .limit(limit);
};

notionSyncHistorySchema.statics.findByStatus = function(status) {
  return this.find({ status: status });
};

notionSyncHistorySchema.statics.getSuccessRate = function(configId) {
  return this.aggregate([
    { $match: { syncConfigId: configId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Pre-save middleware
notionSyncConfigSchema.pre('save', function(next) {
  // Ensure triggerEmoji is properly formatted
  if (this.triggerEmoji && !this.triggerEmoji.includes(':')) {
    // Add colons if not present (for emoji code format)
    this.triggerEmoji = this.triggerEmoji;
  }
  
  next();
});

notionSyncHistorySchema.pre('save', function(next) {
  // Calculate sync duration if not set
  if (this.syncDuration === 0 && this.status === 'success') {
    this.syncDuration = Date.now() - this.createdAt.getTime();
  }
  
  next();
});

// Create models
const NotionSyncConfig = mongoose.model('NotionSyncConfig', notionSyncConfigSchema);
const NotionSyncHistory = mongoose.model('NotionSyncHistory', notionSyncHistorySchema);

module.exports = {
  NotionSyncConfig,
  NotionSyncHistory
};