# Webhook History Migration Documentation

## 🎯 Overview

This document outlines the comprehensive refactoring of webhook history management in the CasperDev application, transitioning from global state to a robust MongoDB-based persistent storage solution.

## 🔄 Migration Summary

### **Before**: Global State Issues
- ❌ **Data Loss**: Webhooks stored in `global.zapierWebhooks` array lost on server restart
- ❌ **Memory Leaks**: Unbounded growth of webhook data in memory
- ❌ **Multi-Instance Issues**: Each server instance maintained separate webhook history
- ❌ **Race Conditions**: Concurrent access to global array could cause data corruption
- ❌ **Limited Scalability**: No pagination, filtering, or advanced querying capabilities

### **After**: Persistent Database Storage
- ✅ **Data Persistence**: All webhooks stored in MongoDB with automatic TTL expiration
- ✅ **Memory Efficiency**: No memory accumulation, data stored on disk
- ✅ **Multi-Instance Safe**: Shared database ensures consistency across instances
- ✅ **Thread Safety**: MongoDB handles concurrent operations safely
- ✅ **Enhanced Features**: Pagination, filtering, statistics, and comprehensive querying

## 📁 Files Created/Modified

### 🆕 New Files

#### 1. `server/models/WebhookHistory.js`
**Purpose**: Mongoose schema for persistent webhook storage

**Key Features**:
- **TTL Index**: Automatic 30-day data expiration
- **Efficient Indexing**: Optimized queries on action, timestamp, category, and success status
- **Static Methods**: 
  - `getRecentWebhooks()` - Paginated webhook retrieval
  - `getStatistics()` - Aggregated webhook analytics
  - `cleanup()` - Manual cleanup utilities
- **Instance Methods**:
  - `markProcessed()` - Update processing status
  - `setResponse()` - Set response data

#### 2. `server/scripts/migrate-webhook-history.js`
**Purpose**: Safe migration of existing global webhook data

**Features**:
- **Dry Run Mode**: Preview migration without changes
- **Backup Creation**: Automatic backup before migration
- **Force Mode**: Overwrite existing records
- **Batch Processing**: Efficient handling of large datasets
- **Error Handling**: Comprehensive error reporting and recovery

#### 3. `WEBHOOK_MIGRATION.md`
**Purpose**: Comprehensive documentation (this file)

### 🔄 Modified Files

#### 1. `server/routes/integrations.js`
**Changes**:
- Added `WebhookHistory` model import
- Replaced `global.zapierWebhooks` with database operations
- Enhanced error tracking and processing time measurement
- Added comprehensive metadata capture (IP, User-Agent, etc.)

## 🚀 API Changes

### Enhanced Webhook Processing

#### **POST** `/api/integrations/zapier/webhook`

**New Features**:
```json
{
  "status": "success",
  "message": "Webhook processed successfully",
  "action": "new_lead",
  "result": { ... },
  "webhookId": "webhook_1640995200000_abc123def",
  "processingTime": 145
}
```

**Error Tracking**:
```json
{
  "status": "error",
  "message": "Webhook processing failed",
  "error": "HubSpot API timeout",
  "webhookId": "webhook_1640995200000_xyz789",
  "processingTime": 5000
}
```

### New Webhook History Endpoint

#### **GET** `/api/integrations/zapier/webhooks`

**Enhanced Pagination & Filtering**:
```http
GET /api/integrations/zapier/webhooks?page=1&limit=25&action=new_lead&success=true&startDate=2024-01-01
```

**Query Parameters**:
- `page` (default: 1) - Page number
- `limit` (default: 50, max: 100) - Records per page
- `action` - Filter by webhook action type
- `category` - Filter by category (incoming, outgoing, test, error)
- `success` - Filter by processing success (true/false)
- `startDate` - Start date filter (ISO 8601)
- `endDate` - End date filter (ISO 8601)

**Response Format**:
```json
{
  "status": "success",
  "webhooks": [...],
  "pagination": {
    "current": 1,
    "total": 15,
    "count": 25,
    "totalRecords": 367,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "action": "new_lead",
    "success": true,
    "startDate": "2024-01-01"
  }
}
```

### New Statistics Endpoint

#### **GET** `/api/integrations/zapier/webhooks/stats`

**Aggregated Analytics**:
```http
GET /api/integrations/zapier/webhooks/stats?period=7d
```

**Query Parameters**:
- `period` - Time period (1h, 24h, 7d, 30d)
- `startDate` - Custom start date
- `endDate` - Custom end date

**Response Format**:
```json
{
  "status": "success",
  "statistics": {
    "period": "7d",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-22T00:00:00.000Z",
    "total": 1247,
    "successful": 1189,
    "failed": 58,
    "successRate": "95.35",
    "avgProcessingTime": 234,
    "actionBreakdown": {
      "new_lead": 456,
      "task_completed": 321,
      "update_contact": 289,
      "send_notification": 181
    },
    "categoryBreakdown": {
      "incoming": 1198,
      "test": 49
    }
  },
  "query": { ... },
  "generated": "2024-01-22T10:30:45.123Z"
}
```

## 🛠 Migration Process

### Step 1: Preparation
```bash
# Ensure MongoDB is running
systemctl status mongod

# Backup current system (if any global state exists)
npm run backup-webhook-state
```

### Step 2: Install Dependencies
```bash
# Dependencies are already included in package.json
npm install
```

### Step 3: Run Migration Script
```bash
# Preview migration (recommended first step)
node server/scripts/migrate-webhook-history.js --dry-run

# Run migration with backup
node server/scripts/migrate-webhook-history.js --backup

# Force migration (if needed)
node server/scripts/migrate-webhook-history.js --force --backup
```

### Step 4: Verification
```bash
# Test the new API endpoints
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5000/api/integrations/zapier/webhooks?limit=5"

# Check statistics
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5000/api/integrations/zapier/webhooks/stats?period=24h"
```

### Step 5: Cleanup (After Verification)
Remove any remaining references to `global.zapierWebhooks` from your codebase.

## 🗄 Database Schema

### WebhookHistory Collection

```javascript
{
  _id: ObjectId,
  webhookId: "webhook_1640995200000_abc123def", // Unique identifier
  timestamp: ISODate,                           // Webhook received time
  action: "new_lead",                          // Action type
  data: { ... },                              // Original webhook payload
  processed: {
    result: { ... },                          // Processing result
    success: true,                            // Processing success flag
    error: "Error message if failed",         // Error details
    processingTime: 145                       // Processing time in ms
  },
  source: {
    ip: "192.168.1.100",                     // Client IP
    userAgent: "Mozilla/5.0...",             // User agent
    referer: "https://zapier.com"            // Referer header
  },
  response: {
    status: 200,                             // HTTP response status
    message: "Webhook processed successfully", // Response message
    data: { ... }                            // Response data
  },
  category: "incoming",                      // incoming|outgoing|test|error
  priority: "normal",                        // low|normal|high|critical
  createdAt: ISODate,                        // Auto-generated
  updatedAt: ISODate                         // Auto-generated
}
```

### Indexes
- **TTL Index**: `{ createdAt: 1 }` with 30-day expiration
- **Compound Indexes**:
  - `{ action: 1, timestamp: -1 }`
  - `{ category: 1, timestamp: -1 }`
  - `{ "processed.success": 1, timestamp: -1 }`
- **Single Indexes**:
  - `{ timestamp: 1 }`
  - `{ action: 1 }`
  - `{ category: 1 }`
  - `{ priority: 1 }`

## 📊 Performance Benefits

### Memory Usage
- **Before**: Linear memory growth with webhook volume
- **After**: Constant memory footprint

### Query Performance
- **Before**: O(n) linear search through array
- **After**: O(log n) indexed database queries

### Scalability
- **Before**: Limited to single instance memory
- **After**: Horizontally scalable across multiple instances

### Data Retention
- **Before**: Manual cleanup required
- **After**: Automatic TTL-based expiration

## 🔧 Configuration Options

### Environment Variables
```bash
# MongoDB connection (required)
MONGODB_URI=mongodb://localhost:27017/casperdev

# Webhook retention period (optional, default: 30 days)
WEBHOOK_TTL_DAYS=30

# Maximum webhook processing timeout (optional, default: 30 seconds)
WEBHOOK_TIMEOUT_MS=30000
```

### Model Configuration
```javascript
// Adjust TTL period (in WebhookHistory.js)
expireAfterSeconds: 30 * 24 * 60 * 60 // 30 days

// Modify priority levels
priority: {
  type: String,
  enum: ['low', 'normal', 'high', 'critical', 'urgent'], // Add 'urgent'
  default: 'normal'
}
```

## 🚨 Error Handling & Recovery

### Database Connection Issues
```javascript
// Automatic retry logic in place
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  retryReads: true
});
```

### Processing Failures
- All webhook processing errors are captured and stored
- Failed webhooks include error details and processing time
- Partial processing results are preserved

### Migration Safety
- **Dry run mode** prevents accidental data modification
- **Backup creation** ensures data recovery options
- **Batch processing** handles large datasets efficiently
- **Error reporting** provides detailed failure information

## 📈 Monitoring & Analytics

### Key Metrics Available
1. **Processing Success Rate**: Percentage of successfully processed webhooks
2. **Average Processing Time**: Mean time to process webhooks
3. **Action Distribution**: Breakdown by webhook action types
4. **Category Analysis**: Incoming vs outgoing webhook patterns
5. **Error Patterns**: Common failure modes and frequencies

### Dashboard Integration
The new statistics endpoint enables easy integration with monitoring dashboards:

```javascript
// Example: Grafana query for success rate
const stats = await fetch('/api/integrations/zapier/webhooks/stats?period=1h');
const successRate = stats.statistics.successRate;
```

## 🔮 Future Enhancements

### Planned Features
1. **Real-time Webhook Monitoring**: WebSocket-based live updates
2. **Advanced Filtering**: Search by payload content, IP ranges
3. **Webhook Replay**: Ability to reprocess failed webhooks
4. **Export Functionality**: CSV/JSON export of webhook history
5. **Rate Limiting**: Per-source webhook rate limiting
6. **Alerting**: Configurable alerts for processing failures

### Performance Optimizations
1. **Aggregation Pipeline Caching**: Cache frequently accessed statistics
2. **Archival Strategy**: Long-term storage for compliance
3. **Sharding Support**: Horizontal scaling for high-volume deployments

## ✅ Testing

### Unit Tests
```bash
# Test webhook storage
npm test -- --grep "WebhookHistory"

# Test migration script
npm test -- --grep "migration"
```

### Integration Tests
```bash
# Test complete webhook flow
npm run test:integration

# Load testing
npm run test:load
```

### Manual Testing
```bash
# Test webhook reception
curl -X POST http://localhost:5000/api/integrations/zapier/webhook \
  -H "Content-Type: application/json" \
  -d '{"action":"test","data":{"message":"Test webhook"}}'

# Test history retrieval
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5000/api/integrations/zapier/webhooks"

# Test statistics
curl -H "Authorization: Bearer YOUR_JWT" \
  "http://localhost:5000/api/integrations/zapier/webhooks/stats"
```

## 📞 Support & Troubleshooting

### Common Issues

#### Issue: Migration fails with "Connection timeout"
**Solution**: Ensure MongoDB is running and accessible
```bash
# Check MongoDB status
systemctl status mongod

# Test connection
mongo --eval "db.runCommand('ping')"
```

#### Issue: "Webhook already exists" errors during migration
**Solution**: Use force mode or check for duplicate data
```bash
# Force migration
node server/scripts/migrate-webhook-history.js --force
```

#### Issue: High memory usage after migration
**Solution**: Verify TTL index is working
```bash
# Check TTL index
mongo casperdev --eval "db.webhookhistories.getIndexes()"
```

### Logs & Debugging
- Enable debug logging: `DEBUG=webhook:* npm start`
- Monitor MongoDB logs: `tail -f /var/log/mongodb/mongod.log`
- Check webhook processing: `grep "webhook" logs/backend.log`

---

## 📝 Conclusion

This migration represents a significant improvement in the reliability, scalability, and maintainability of webhook processing in the CasperDev application. The transition from global state to persistent MongoDB storage eliminates critical issues while adding powerful new capabilities for monitoring and analytics.

The comprehensive error handling, automatic data expiration, and extensive API enhancements provide a robust foundation for webhook processing that can scale with your application's growth.

**Next Steps**:
1. Run the migration script in your environment
2. Test the new API endpoints
3. Update any client applications to use the new pagination features
4. Set up monitoring for the new webhook statistics
5. Remove any legacy references to `global.zapierWebhooks`

For additional support or questions about this migration, please refer to the troubleshooting section or contact the development team.