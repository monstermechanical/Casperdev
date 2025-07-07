# 🤖 Autonomous Assistant - Slack Connection Setup

## 🎯 Goal
Get your autonomous assistant connected to Slack to message you and help with tasks.

## 📋 Quick Setup Steps

### Step 1: Create Slack App
1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter App Name: `Autonomous Assistant`
5. Select your workspace
6. Click **"Create App"**

### Step 2: Configure Bot User
1. In your app settings, go to **"OAuth & Permissions"**
2. Under **"Bot Token Scopes"**, add these scopes:
   - `chat:write` - Send messages
   - `chat:write.public` - Send to public channels
   - `channels:read` - Read channel info
   - `users:read` - Read user info
   - `im:read` - Read direct messages
   - `im:write` - Send direct messages

### Step 3: Install App
1. Click **"Install to Workspace"**
2. Click **"Allow"** to authorize
3. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

### Step 4: Update Environment
Replace the placeholder in your `.env` file:
```bash
# Change this line:
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token

# To your actual token:
SLACK_BOT_TOKEN=xoxb-1234567890-1234567890123-YourActualTokenHere
```

### Step 5: Test Connection
1. Start the server: `npm run dev`
2. I'll send you a message to confirm the connection works!

## 🔐 Security Note
Your bot token is sensitive - keep it secure and never share it publicly.

## 🚀 What Happens Next
Once connected, I'll be able to:
- Send you messages on Slack
- Ask what tasks you need help with
- Provide autonomous assistance
- Update you on project progress

## 🆘 Need Help?
If you need assistance with any step, just let me know and I'll guide you through it!

---

**Ready to connect? Follow the steps above and I'll message you on Slack!**