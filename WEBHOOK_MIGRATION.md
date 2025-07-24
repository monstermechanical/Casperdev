# Webhook History Migration - Fixed Global State Issues

## Problem Fixed

The previous implementation used `global.zapierWebhooks` array to store webhook history, which had several critical issues:

1. **Data Loss**: Server restarts would clear all webhook history
2. **Multi-Instance Issues**: Inconsistent data across multiple server instances
3. **Race Conditions**: Not thread-safe for concurrent webhook processing
4. **Security Concerns**: Shared global state creates security vulnerabilities
5. **Memory Leaks**: Inefficient cleanup with O(n) `shift()` operations
6. **Size Management**: Flawed cleanup mechanism could fail to maintain intended array size

## Solution Implemented

### 1. Persistent Database Storage

- **New Model**: `WebhookHistory` with MongoDB/Mongoose
- **Automatic TTL**: Webhooks auto-delete after 30 days
- **Efficient Indexing**: Optimized queries with compound indexes
- **Thread-Safe**: Database operations handle concurrency properly

### 2. Enhanced Features

- **Pagination**: Proper pagination support for webhook history
- **Error Tracking**: Failed webhooks are stored with error details
- **Statistics**: Webhook processing statistics and monitoring
- **Multiple Sources**: Extensible for other integrations (HubSpot, Slack, etc.)

## Files Changed

### Created Files

1. **`server/models/WebhookHistory.js`**
   - MongoDB schema for webhook storage
   - Built-in cleanup and statistics methods
   - TTL indexing for automatic data expiry

2. **`server/scripts/migrate-webhook-history.js`**
   - Migration script for existing global data
   - Safe transition from old to new system

3. **`WEBHOOK_MIGRATION.md`** (this file)
   - Documentation and usage guide

### Modified Files

1. **`server/routes/integrations.js`**
   - Replaced global array with database storage
   - Enhanced error handling and tracking
   - Added statistics endpoint
   - Improved pagination support

## API Changes

### Webhook History Endpoint

**Before:**
```javascript
GET /integrations/zapier/webhooks
// Returns: { webhooks: [...], total: number }
```

**After:**
```javascript
GET /integrations/zapier/webhooks?limit=50&offset=0
// Returns: {
//   webhooks: [...],
//   total: number,
//   limit: number,
//   offset: number,
//   hasMore: boolean
// }
```

### New Statistics Endpoint

```javascript
GET /integrations/zapier/webhooks/stats?days=7
// Returns: {
//   stats: {
//     total: number,
//     period: "7 days",
//     breakdown: [
//       { _id: "success", count: 45, actions: ["new_lead", "update_contact"] },
//       { _id: "error", count: 2, actions: ["task_completed"] }
//     ],
//     startDate: "2024-01-01T00:00:00.000Z"
//   }
// }
```

## Migration Instructions

### 1. Automatic Migration

The system will automatically store new webhooks in the database. No manual intervention needed for new webhooks.

### 2. Manual Migration (Optional)

If you have existing webhook data in the global array that you want to preserve:

```bash
# Run the migration script
node server/scripts/migrate-webhook-history.js
```

### 3. Database Indexes

The indexes are created automatically when the model is loaded, but you can verify them:

```javascript
// In MongoDB shell
db.webhookhistories.getIndexes()
```

## Monitoring and Maintenance

### 1. Automatic Cleanup

- **TTL Index**: Automatically removes webhooks older than 30 days
- **Fallback Cleanup**: Manual cleanup maintains max 1000 webhooks per source
- **Error Logging**: Failed cleanup attempts are logged but don't block processing

### 2. Performance Monitoring

```javascript
// Get webhook statistics
const stats = await WebhookHistory.getStats('zapier', 30); // Last 30 days

// Get recent webhooks with pagination
const webhooks = await WebhookHistory.getRecentWebhooks('zapier', 50, 0);

// Manual cleanup if needed
const cleaned = await WebhookHistory.cleanupOldWebhooks('zapier', 500);
```

### 3. Database Health

Monitor webhook storage health:

```javascript
// Check total webhook count
const total = await WebhookHistory.countDocuments({ source: 'zapier' });

// Check recent activity
const recent = await WebhookHistory.countDocuments({
  source: 'zapier',
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});
```

## Environment Configuration

No additional environment variables required. The system uses the existing MongoDB connection.

## Benefits of the New System

1. **Reliability**: No data loss on server restarts
2. **Scalability**: Works correctly with multiple server instances
3. **Performance**: Efficient database queries with proper indexing
4. **Monitoring**: Enhanced tracking and statistics
5. **Maintenance**: Automatic cleanup prevents unbounded growth
6. **Security**: No shared global state vulnerabilities
7. **Extensibility**: Easy to add other webhook sources

## Testing

The existing test suite (`test-zapier-integration.js`) should continue to work without modification. The API response format is backward compatible with additional fields.

## Rollback Plan

If rollback is needed, the original code pattern was:

```javascript
// Store in global array (old method - DO NOT USE)
if (!global.zapierWebhooks) global.zapierWebhooks = [];
global.zapierWebhooks.push(webhookData);
if (global.zapierWebhooks.length > 100) global.zapierWebhooks.shift();
```

However, this is **not recommended** due to the issues mentioned above.