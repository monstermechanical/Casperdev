# ForgeAI Slack Bot Setup Guide

## ✅ Implementation Status

- ✅ **ForgeAI Core**: AI assistant class implemented and tested
- ✅ **Slack Integration**: Full Slack Bolt framework integration
- ✅ **OpenAI Integration**: GPT-3.5 Turbo integration ready
- ✅ **Multi-modal Interaction**: DMs, mentions, and slash commands
- ✅ **Context Awareness**: Conversation history tracking
- ✅ **Error Handling**: Comprehensive error management
- ✅ **Branding**: Complete rebrand to billionforgeai.space

## 🚀 Quick Start

### 1. Create Slack App

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From a manifest"**
3. Select your workspace
4. Copy and paste the contents of `slack_app_manifest.json`
5. Click **"Create"**

### 2. Get Your Tokens

After creating the app:

1. **Bot Token**: Go to **OAuth & Permissions** → Copy **Bot User OAuth Token**
2. **App Token**: Go to **Basic Information** → **App-Level Tokens** → **Generate Token and Scopes** → Add `connections:write` scope
3. **Signing Secret**: Go to **Basic Information** → Copy **Signing Secret**

### 3. Configure Environment

Edit the `.env` file with your tokens:

```bash
# Replace these with your actual tokens
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
SLACK_APP_TOKEN=xapp-your-actual-app-token
SLACK_SIGNING_SECRET=your-actual-signing-secret
OPENAI_API_KEY=sk-your-openai-api-key
```

### 4. Install to Workspace

1. In your Slack app settings, go to **OAuth & Permissions**
2. Click **"Install to Workspace"**
3. Authorize the app

### 5. Run ForgeAI

```bash
source venv/bin/activate
python app.py
```

You should see: `🚀 ForgeAI Slack Bot is starting...`

## 🤖 How to Use ForgeAI

### Direct Messages
1. Find **ForgeAI** in your Apps list
2. Click **Messages** tab
3. Start chatting!

### Channel Mentions
In any channel where ForgeAI is invited:
```
@ForgeAI How do I optimize this database query?
```

### Slash Commands
Anywhere in Slack:
```
/ask-forgeai What's the best way to structure a REST API?
```

## 🛠️ Features

- **Smart Responses**: GPT-3.5 Turbo powered responses
- **Context Memory**: Remembers recent conversation history
- **Thread Replies**: Keeps conversations organized
- **Error Recovery**: Graceful error handling
- **Typing Indicators**: Shows when ForgeAI is thinking
- **Markdown Support**: Rich text formatting in responses

## 🔧 Customization

Edit `app.py` to customize ForgeAI's personality:

```python
self.system_prompt = """You are ForgeAI, an AI assistant for the billionforgeai.space team...
```

## 📋 Required Permissions

The bot needs these Slack permissions:
- `app_mentions:read` - See @mentions
- `channels:history` - Read channel history
- `channels:read` - Access channel info
- `chat:write` - Send messages
- `commands` - Use slash commands
- `files:read` - Read file info
- `im:history` - Read DM history
- `im:read` - Access DM info
- `im:write` - Send DMs
- `users:read` - Read user info

## 🎯 Next Steps

1. **Get API Keys**: Obtain your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Configure Tokens**: Update `.env` with real Slack and OpenAI tokens
3. **Test**: Send ForgeAI a DM to test the connection
4. **Invite**: Add ForgeAI to relevant channels
5. **Customize**: Modify the system prompt for your team's needs

## 🆘 Troubleshooting

### "Invalid Auth" Error
- Check that all tokens in `.env` are correct
- Ensure the app is installed to your workspace

### "Missing Permissions" Error
- Reinstall the app using the manifest
- Check that all required scopes are granted

### OpenAI API Errors
- Verify your OpenAI API key is valid
- Check you have sufficient credits

## 📞 Support

ForgeAI is ready to assist your billionforgeai.space team! For technical support, check the error logs or reach out to your development team.