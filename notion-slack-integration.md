# Notion-Slack Integration Setup Guide

## 🎯 Overview

This guide will help you set up the **Notion-Slack Integration** for your CasperDev application. This integration allows you to:

- **Autonomously save Slack messages to Notion** when they receive specific emoji reactions
- **Create pages and notes in Notion** directly from Slack
- **Sync important conversations** to your Notion workspace automatically
- **Manage knowledge base** by capturing valuable discussions

## 📋 Prerequisites

- Node.js application with Slack integration already configured
- Notion workspace with admin access
- Slack workspace with bot permissions

## 🔧 Setup Instructions

### 1. Create a Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in your integration details:
   - **Name**: `CasperDev Slack Integration`
   - **Associated workspace**: Select your workspace
   - **User Information**: Select "No user information"
4. Click **"Submit"**
5. **Copy the "Internal Integration Token"** - you'll need this for your `.env` file

### 2. Create a Notion Database

1. In your Notion workspace, create a new page
2. Type `/database` and select **"Table - Full page"**
3. Set up your database with these properties:
   - **Title** (Title property - automatically created)
   - **Tags** (Multi-select property)
   - **Created time** (Created time property)
   - **Last edited time** (Last edited time property)

4. **Get your Database ID**:
   - Click **"Share"** in the top right
   - Click **"Copy link"**
   - From the URL `https://www.notion.so/DATABASE_ID?v=...`
   - The `DATABASE_ID` is the 32-character string before the `?`

### 3. Connect Integration to Database

**⚠️ Important**: Don't skip this step!

1. In your Notion database, click the **"..."** menu (top right)
2. Select **"Connect to"**
3. Find and select your integration: **"CasperDev Slack Integration"**
4. Click **"Confirm"**

Your integration should now appear under "Connections" in the database menu.

### 4. Update Environment Variables

Add these variables to your `.env` file:

```bash
# Notion Integration
NOTION_API_KEY=secret_your-notion-integration-token-here
NOTION_DATABASE_ID=your-notion-database-id-here
NOTION_DEFAULT_PAGE_ID=your-notion-page-id-here
```

### 5. Install Dependencies

The Notion SDK is already installed in your project. If you need to install it separately:

```bash
npm install @notionhq/client
```

## 🚀 Available API Endpoints

### Authentication
All endpoints require JWT authentication. Include your auth token in the header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### 1. Test Notion Connection
```bash
GET /api/integrations/notion/test
```
**Response:**
```json
{
  "status": "connected",
  "message": "Notion connection successful",
  "workspaceInfo": {
    "userCount": 5,
    "connected": true
  }
}
```

### 2. Create a Page in Notion
```bash
POST /api/integrations/notion/create-page
```
**Body:**
```json
{
  "title": "Meeting Notes",
  "content": "Discussion about project timeline and deliverables",
  "databaseId": "your-database-id", // Optional, uses default if not provided
  "tags": ["meeting", "project"] // Optional
}
```

### 3. Get Pages from Notion
```bash
GET /api/integrations/notion/pages?databaseId=your-db-id&limit=10
```

### 4. Save Slack Message to Notion
```bash
POST /api/integrations/slack-to-notion
```
**Body:**
```json
{
  "slackMessage": "This is an important message from Slack",
  "channelName": "general",
  "userName": "John Doe",
  "title": "Important Decision",
  "databaseId": "your-database-id",
  "slackChannel": "#general"
}
```

### 5. Enable Autonomous Sync
```bash
POST /api/integrations/notion/auto-sync/enable
```
**Body:**
```json
{
  "slackChannel": "#general",
  "databaseId": "your-database-id",
  "triggerEmoji": "📝",
  "syncInterval": 10
}
```

## 🤖 Autonomous Features

### Auto-Sync Slack Messages

The integration includes an **autonomous sync feature** that:

1. **Monitors Slack channels** for messages with specific emoji reactions
2. **Automatically saves** those messages to Notion
3. **Runs every 10 minutes** (configurable)
4. **Sends confirmation** back to Slack

#### How it Works:

1. Someone posts a message in Slack
2. Another user reacts with the configured emoji (default: 📝)
3. The system automatically detects the reaction
4. The message gets saved to your Notion database
5. A confirmation is sent to the Slack channel

#### Configuration:

- **Trigger Emoji**: Default is 📝, but you can use any emoji
- **Sync Interval**: Default is every 10 minutes
- **Channel**: Monitors specified Slack channels
- **Database**: Saves to your configured Notion database

## 📊 Integration Status

Check the status of all integrations:
```bash
GET /api/integrations/status
```

**Response:**
```json
{
  "status": "active",
  "integrations": {
    "hubspot": {
      "connected": true,
      "lastSync": "2024-01-15T10:30:00Z",
      "error": null
    },
    "slack": {
      "connected": true,
      "lastSync": "2024-01-15T10:25:00Z",
      "error": null
    },
    "notion": {
      "connected": true,
      "lastSync": "2024-01-15T10:35:00Z",
      "error": null
    }
  },
  "lastChecked": "2024-01-15T10:35:00Z"
}
```

## 💡 Use Cases

### 1. Meeting Notes
- React to important decisions with 📝
- Automatically save to "Meeting Notes" database
- Create searchable knowledge base

### 2. Customer Feedback
- React to customer feedback with 💡
- Save insights to "Customer Insights" database
- Track feedback patterns over time

### 3. Project Updates
- React to project updates with 🚀
- Save to "Project Timeline" database
- Keep stakeholders informed

### 4. Technical Discussions
- React to technical solutions with 🔧
- Save to "Technical Documentation" database
- Build internal knowledge base

## 🔧 Testing the Integration

### 1. Test Connection
```bash
curl -X GET http://localhost:5000/api/integrations/notion/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Create a Test Page
```bash
curl -X POST http://localhost:5000/api/integrations/notion/create-page \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Page",
    "content": "This is a test page created via API",
    "tags": ["test", "api"]
  }'
```

### 3. Enable Autonomous Sync
```bash
curl -X POST http://localhost:5000/api/integrations/notion/auto-sync/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slackChannel": "#general",
    "triggerEmoji": "📝",
    "syncInterval": 5
  }'
```

## 🔍 Troubleshooting

### Common Issues:

1. **"Notion connection failed"**
   - Check your `NOTION_API_KEY` in `.env`
   - Verify the integration token is correct
   - Ensure the integration is connected to your database

2. **"Database not found"**
   - Verify your `NOTION_DATABASE_ID` is correct
   - Check that the integration has access to the database
   - Ensure the database exists and is accessible

3. **"Slack messages not syncing"**
   - Check your Slack bot permissions
   - Verify the trigger emoji is configured correctly
   - Ensure the autonomous sync is enabled

### Debug Tips:

1. **Check server logs** for detailed error messages
2. **Test individual endpoints** before enabling auto-sync
3. **Verify permissions** in both Slack and Notion
4. **Check integration status** regularly

## 🎉 Success!

Once everything is set up, you'll have:

- ✅ **Automatic Slack-to-Notion sync** based on emoji reactions
- ✅ **API endpoints** for manual integration
- ✅ **Real-time status monitoring**
- ✅ **Autonomous knowledge capture**

Your team can now effortlessly capture important conversations and build a comprehensive knowledge base in Notion!

## 📚 Next Steps

1. **Customize the database schema** to match your needs
2. **Set up multiple trigger emojis** for different categories
3. **Create workflow automation** with other tools
4. **Train your team** on using the emoji triggers
5. **Monitor usage** and optimize sync intervals

---

**Questions?** Check the integration status at `/api/integrations/status` or review the server logs for detailed troubleshooting information.