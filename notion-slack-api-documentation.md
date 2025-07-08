# Notion-Slack Integration API Documentation

## 🚀 Overview

The enhanced Notion-Slack integration provides comprehensive APIs for managing autonomous synchronization between Slack messages and Notion databases. This system features real-time event listeners, configurable sync rules, and detailed analytics.

## 🔐 Authentication

All endpoints require JWT authentication. Include your auth token in the request header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 📋 API Endpoints

### **1. Sync Configuration Management**

#### Create Sync Configuration
Create a new autonomous sync configuration for a Slack channel.

```bash
POST /api/integrations/notion/sync-config
```

**Request Body:**
```json
{
  "slackTeamId": "T1234567890",
  "slackChannelId": "C1234567890",
  "slackChannelName": "general",
  "notionDatabaseId": "abc123-def456-ghi789",
  "notionDatabaseName": "Slack Messages",
  "triggerEmoji": "📝",
  "syncInterval": 10,
  "maxMessagesPerSync": 20,
  "tags": ["slack", "autonomous"],
  "syncFilters": {
    "excludeBots": true,
    "excludeThreads": false,
    "minReactions": 1,
    "authorWhitelist": [],
    "authorBlacklist": []
  },
  "pageTemplate": {
    "titleFormat": "Message from {author} in #{channel}",
    "includeMetadata": true,
    "includeReactions": true,
    "includeThreads": false
  }
}
```

**Response:**
```json
{
  "message": "Sync configuration created successfully",
  "config": {
    "_id": "605c3b2e1234567890abcdef",
    "userId": "605c3b2e1234567890abcdef",
    "slackTeamId": "T1234567890",
    "slackChannelId": "C1234567890",
    "slackChannelName": "general",
    "notionDatabaseId": "abc123-def456-ghi789",
    "triggerEmoji": "📝",
    "syncInterval": 10,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "successRate": 0,
    "totalMessagesSynced": 0,
    "totalErrors": 0
  }
}
```

#### Get Sync Configurations
Retrieve all sync configurations for the authenticated user.

```bash
GET /api/integrations/notion/sync-configs?channelId=C1234567890
```

**Query Parameters:**
- `channelId` (optional) - Filter by specific Slack channel

**Response:**
```json
{
  "configs": [
    {
      "_id": "605c3b2e1234567890abcdef",
      "slackChannelName": "general",
      "notionDatabaseName": "Slack Messages",
      "triggerEmoji": "📝",
      "isActive": true,
      "totalMessagesSynced": 156,
      "successRate": 98.7,
      "lastSync": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

#### Update Sync Configuration
Update an existing sync configuration.

```bash
PUT /api/integrations/notion/sync-config/605c3b2e1234567890abcdef
```

**Request Body:** (partial update supported)
```json
{
  "triggerEmoji": "⭐",
  "syncInterval": 5,
  "isActive": false
}
```

#### Delete Sync Configuration
Delete a sync configuration.

```bash
DELETE /api/integrations/notion/sync-config/605c3b2e1234567890abcdef
```

### **2. Sync History & Analytics**

#### Get Sync History
Retrieve detailed sync history with pagination.

```bash
GET /api/integrations/notion/sync-history?configId=605c3b2e1234567890abcdef&status=success&limit=50&offset=0
```

**Query Parameters:**
- `configId` (optional) - Filter by sync configuration
- `status` (optional) - Filter by sync status (`pending`, `success`, `failed`, `retrying`)
- `limit` (optional) - Number of records per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "history": [
    {
      "_id": "605c3b2e1234567890abcdef",
      "syncConfigId": {
        "slackChannelName": "general",
        "notionDatabaseName": "Slack Messages",
        "triggerEmoji": "📝"
      },
      "slackMessageId": "1234567890.123456",
      "slackUserName": "John Doe",
      "messageText": "This is an important message",
      "notionPageId": "abc123-def456",
      "notionPageUrl": "https://notion.so/abc123-def456",
      "status": "success",
      "syncDuration": 1250,
      "syncedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Sync Statistics
Retrieve comprehensive sync statistics and analytics.

```bash
GET /api/integrations/notion/sync-stats?configId=605c3b2e1234567890abcdef
```

**Response:**
```json
{
  "totalSyncs": 156,
  "successfulSyncs": 154,
  "failedSyncs": 2,
  "successRate": 98.71,
  "avgSyncDuration": 1180,
  "breakdown": [
    {
      "_id": "success",
      "count": 154,
      "avgDuration": 1180
    },
    {
      "_id": "failed",
      "count": 2,
      "avgDuration": 0
    }
  ]
}
```

### **3. Manual Operations**

#### Trigger Manual Sync
Manually trigger a sync operation for a specific configuration or channel.

```bash
POST /api/integrations/notion/sync/trigger
```

**Request Body:**
```json
{
  "configId": "605c3b2e1234567890abcdef"
}
// OR
{
  "channelId": "C1234567890"
}
```

**Response:**
```json
{
  "message": "Manual sync triggered",
  "result": {
    "success": true,
    "results": [
      {
        "configId": "605c3b2e1234567890abcdef",
        "result": {
          "syncedCount": 3,
          "errors": []
        }
      }
    ]
  }
}
```

### **4. Service Status & Monitoring**

#### Get Service Status
Retrieve real-time status of all integration services.

```bash
GET /api/integrations/notion/service-status
```

**Response:**
```json
{
  "notionSlackService": {
    "connected": true,
    "lastSync": "2024-01-15T10:30:00Z",
    "error": null,
    "syncCount": 156,
    "errorCount": 2,
    "syncHistorySize": 50,
    "uptime": 86400
  },
  "slackEventListener": {
    "totalEvents": 1250,
    "reactionEvents": 89,
    "messageEvents": 1100,
    "errors": 2,
    "processedReactions": 85,
    "isListening": true,
    "uptime": 86400,
    "memoryUsage": {
      "rss": 45678912,
      "heapTotal": 18874368,
      "heapUsed": 16234567,
      "external": 1234567
    }
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### **5. Legacy Endpoints (Backward Compatibility)**

#### Enable Auto-Sync (Legacy)
Simplified endpoint for enabling autonomous sync.

```bash
POST /api/integrations/notion/auto-sync/enable
```

**Request Body:**
```json
{
  "slackChannel": "#general",
  "databaseId": "abc123-def456-ghi789",
  "triggerEmoji": "📝",
  "syncInterval": 10
}
```

### **6. Existing Notion Endpoints**

#### Test Notion Connection
```bash
GET /api/integrations/notion/test
```

#### Create Notion Page
```bash
POST /api/integrations/notion/create-page
```

#### Get Notion Pages
```bash
GET /api/integrations/notion/pages
```

#### Save Slack Message to Notion
```bash
POST /api/integrations/slack-to-notion
```

## 🔧 Integration Setup Requirements

### **Environment Variables**

```bash
# Notion Integration
NOTION_API_KEY=secret_your-notion-integration-token-here
NOTION_DATABASE_ID=your-notion-database-id-here
NOTION_DEFAULT_PAGE_ID=your-notion-page-id-here

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here
SLACK_SIGNING_SECRET=your-slack-signing-secret-here
SLACK_APP_TOKEN=xapp-your-slack-app-token-here
SLACK_DEFAULT_CHANNEL=#general
SLACK_PORT=3001
```

### **Required Slack App Permissions**

- `app_mentions:read` - Read mentions of your app
- `channels:history` - View messages in public channels
- `channels:read` - View basic information about public channels
- `chat:write` - Send messages
- `groups:history` - View messages in private channels
- `reactions:read` - View emoji reactions and their associated metadata
- `users:read` - View people in the workspace

### **Event Subscriptions**

Configure these events in your Slack app:

- `app_mention` - App was mentioned
- `message.channels` - A message was posted to a channel
- `reaction_added` - A member has added an emoji reaction to an item
- `reaction_removed` - A member removed an emoji reaction

## 📊 Real-time Features

### **Event Listener Architecture**

The integration uses Slack's real-time events API to:

1. **Monitor emoji reactions** in real-time
2. **Automatically trigger syncs** when configured emojis are used
3. **Track sync history** and performance metrics
4. **Provide immediate feedback** to Slack channels

### **Autonomous Sync Flow**

1. User reacts to a message with configured emoji (e.g., 📝)
2. Event listener detects the reaction
3. System checks for active sync configurations
4. Message is automatically synced to Notion
5. Confirmation sent back to Slack channel
6. Sync history and statistics updated

## 🔍 Error Handling

### **Common Error Responses**

```json
{
  "status": "error",
  "message": "Failed to create sync configuration",
  "error": "Notion database ID is required"
}
```

### **Error Codes**
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid JWT token)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `503` - Service Unavailable (external service down)

## 📈 Usage Examples

### **Complete Setup Workflow**

1. **Create Sync Configuration**
```bash
curl -X POST http://localhost:5000/api/integrations/notion/sync-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slackTeamId": "T1234567890",
    "slackChannelId": "C1234567890",
    "slackChannelName": "general",
    "notionDatabaseId": "abc123-def456-ghi789",
    "triggerEmoji": "📝"
  }'
```

2. **Monitor Sync Status**
```bash
curl -X GET http://localhost:5000/api/integrations/notion/service-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

3. **View Sync History**
```bash
curl -X GET http://localhost:5000/api/integrations/notion/sync-history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

4. **Get Analytics**
```bash
curl -X GET http://localhost:5000/api/integrations/notion/sync-stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Best Practices

### **Configuration Recommendations**

1. **Sync Interval**: 5-15 minutes for active channels
2. **Max Messages**: 10-50 based on channel activity
3. **Trigger Emojis**: Use distinctive emojis (📝, ⭐, 💡)
4. **Filters**: Enable `excludeBots` to avoid syncing bot messages

### **Performance Optimization**

1. **Monitor sync duration** via analytics
2. **Use specific trigger emojis** to reduce false positives
3. **Configure appropriate filters** to reduce noise
4. **Regular cleanup** of sync history for better performance

### **Security Considerations**

1. **JWT tokens** expire and need renewal
2. **Slack app permissions** should be minimal required set
3. **Notion database access** should be restricted appropriately
4. **Environment variables** must be secured in production

---

**📞 Support**: Check service status at `/api/integrations/notion/service-status` for troubleshooting information.