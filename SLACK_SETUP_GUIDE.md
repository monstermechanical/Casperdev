# 🔗 Connect Your Slack - Quick Setup Guide

## Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Choose a name (e.g., "CasperDev Integration")
4. Select your workspace
5. Click **"Create App"**

## Step 2: Configure Bot Permissions

1. In your app settings, go to **"OAuth & Permissions"**
2. Scroll down to **"Bot Token Scopes"**
3. Add these permissions:
   - `chat:write` (Send messages)
   - `chat:write.public` (Send messages to public channels)
   - `channels:read` (View basic info about public channels)

## Step 3: Install App to Workspace

1. At the top of the "OAuth & Permissions" page, click **"Install to Workspace"**
2. Click **"Allow"** to authorize the app
3. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

## Step 4: Configure Your Application

1. Open your `.env` file in the project root
2. Replace the Slack configuration with your actual values:

```bash
# Slack Integration - REQUIRED FOR SLACK CONNECTION
SLACK_BOT_TOKEN=xoxb-your-actual-token-here
SLACK_DEFAULT_CHANNEL=#general
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

**Important**: 
- Replace `xoxb-your-actual-token-here` with your actual bot token
- Change `#general` to your preferred default channel
- The signing secret is optional for basic usage

## Step 5: Test Your Connection

1. Start your application:
```bash
npm run dev
```

2. In another terminal, test the connection:
```bash
curl -X GET http://localhost:5000/api/integrations/slack/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Note**: You'll need to get a JWT token first by logging into your app or using the auth endpoints.

## Step 6: Send a Test Message

Once connected, you can send a test message:

```bash
curl -X POST http://localhost:5000/api/integrations/slack/notify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#general",
    "title": "Test Message",
    "message": "Hello from CasperDev! 🚀"
  }'
```

## 🎉 You're Connected!

Your Slack integration is now ready. You can:
- Send custom notifications to Slack
- Sync HubSpot data to Slack (if configured)
- Set up automated syncing
- Monitor integration status

## Available Features

- **Custom Notifications**: Send messages to any channel
- **HubSpot Sync**: Sync contacts and deals (requires HubSpot setup)
- **Auto-Sync**: Schedule automatic updates
- **Connection Testing**: Verify integration health

## Need Help?

- Check the detailed setup guide: `hubspot-slack-setup.md`
- View integration status: `GET /api/integrations/status`
- Test connection: `GET /api/integrations/slack/test`

---

**Quick Start Command**: `npm run dev` to start your app with Slack integration!