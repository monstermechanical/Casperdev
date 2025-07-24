# Slack Integration Setup Guide

This guide will walk you through setting up Slack integration for the Casperdev application.

## 📋 Prerequisites

- Admin access to a Slack workspace
- The Casperdev application running locally
- Environment variables file (`.env`) ready

## 🚀 Quick Setup

### Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Name your app: `Casperdev Bot`
5. Select your workspace

### Step 2: Configure Bot Token Scopes

1. Go to **"OAuth & Permissions"** in the sidebar
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Add these scopes:
   - `chat:write` - Send messages
   - `channels:read` - View public channels
   - `groups:read` - View private channels
   - `im:read` - View direct messages
   - `im:write` - Send direct messages
   - `users:read` - View users
   - `team:read` - View workspace info
   - `commands` - Add slash commands

### Step 3: Install App to Workspace

1. Still in **"OAuth & Permissions"**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Step 4: Get Signing Secret

1. Go to **"Basic Information"**
2. Under **"App Credentials"**, find **"Signing Secret"**
3. Click **"Show"** and copy the value

### Step 5: Update Environment Variables

Add these to your `.env` file:

```env
# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_DEFAULT_CHANNEL=#general
```

### Step 6: Configure Slash Commands

1. Go to **"Slash Commands"** in the sidebar
2. Click **"Create New Command"**
3. Add these commands:

#### `/casperdev` Command
- **Command**: `/casperdev`
- **Request URL**: `https://your-domain.com/api/slack/commands`
- **Short Description**: Main Casperdev command
- **Usage Hint**: `help | status | search [query] | profile`

#### `/search` Command  
- **Command**: `/search`
- **Request URL**: `https://your-domain.com/api/slack/commands`
- **Short Description**: Search for jobs
- **Usage Hint**: `[search query]`

#### `/status` Command
- **Command**: `/status`
- **Request URL**: `https://your-domain.com/api/slack/commands`
- **Short Description**: Check system status

### Step 7: Enable Events (Optional)

For real-time events:

1. Go to **"Event Subscriptions"**
2. Toggle **"Enable Events"** to On
3. Set Request URL: `https://your-domain.com/api/slack/events`
4. Under **"Subscribe to bot events"**, add:
   - `app_mention` - When someone mentions your bot
   - `message.im` - Direct messages to bot
5. Save changes

### Step 8: Configure Interactivity (Optional)

For buttons and modals:

1. Go to **"Interactivity & Shortcuts"**
2. Toggle On
3. Set Request URL: `https://your-domain.com/api/slack/interactive`
4. Save changes

## 🧪 Testing the Integration

### 1. Test Connection
```bash
curl -X GET http://localhost:5000/api/slack/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Send Test Message
```bash
curl -X POST http://localhost:5000/api/slack/send-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#general",
    "text": "Hello from Casperdev! 🚀"
  }'
```

### 3. Test Slash Commands
In Slack, type:
- `/casperdev help` - Show available commands
- `/casperdev status` - Check system status
- `/search python developer` - Search for jobs

## 📱 Available Slack Features

### Slash Commands
- `/casperdev help` - Show help menu
- `/casperdev status` - System health check
- `/casperdev search [query]` - Search jobs
- `/casperdev profile` - View profile
- `/search [query]` - Quick job search
- `/status` - Quick status check

### API Endpoints
- `GET /api/slack/test` - Test Slack connection
- `GET /api/slack/channels` - List available channels
- `POST /api/slack/send-message` - Send message to channel
- `POST /api/slack/commands` - Handle slash commands
- `POST /api/slack/events` - Handle Slack events
- `POST /api/slack/interactive` - Handle interactive components

### Message Formatting
The integration supports rich message formatting:
- Text messages
- Block Kit layouts
- Buttons and interactive elements
- Attachments and images

## 🔧 Troubleshooting

### Bot Not Responding
1. Check environment variables are set correctly
2. Verify bot has been invited to the channel
3. Check bot token starts with `xoxb-`
4. Restart the backend service

### Signature Verification Failing
1. Ensure signing secret is correct
2. Check request is not older than 5 minutes
3. Verify raw body is being captured

### Commands Not Working
1. Check Request URL in Slack app settings
2. Ensure your server is publicly accessible (use ngrok for local testing)
3. Verify slash commands are saved in Slack

## 🌐 Local Development with ngrok

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 5000

# Use the HTTPS URL for Slack configuration
# Example: https://abc123.ngrok.io/api/slack/commands
```

## 🚀 Advanced Features

### Custom Workflows
Create custom workflows by combining:
- Slash commands for user input
- Interactive messages for user choices
- Modals for complex forms
- Scheduled messages for reminders

### Integration with Other Services
The Slack integration can trigger:
- Upwork job searches
- HubSpot CRM updates
- Email notifications
- Custom automations

## 📝 Best Practices

1. **Error Handling**: Always respond to Slack within 3 seconds
2. **Permissions**: Only request necessary scopes
3. **Rate Limits**: Respect Slack's rate limits
4. **Security**: Verify all requests with signing secret
5. **User Experience**: Use ephemeral messages for errors

## 🔗 Resources

- [Slack API Documentation](https://api.slack.com/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder)
- [Slack App Directory](https://slack.com/apps)
- [API Rate Limits](https://api.slack.com/docs/rate-limits)