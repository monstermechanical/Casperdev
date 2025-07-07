# ForgeAI - Slack Bot Assistant

🤖 An intelligent AI-powered Slack bot that acts as your personal development assistant using OpenAI's GPT models for billionforgeai.space.

## Features

- **Direct Messaging**: Have private conversations with ForgeAI
- **Channel Mentions**: Tag `@ForgeAI` in any channel for help
- **Slash Commands**: Use `/ask-forgeai` for quick questions
- **Context Awareness**: Remembers recent conversation history
- **Code Assistance**: Help with debugging, code review, and development questions
- **Project Management**: Task planning and brainstorming support

## Quick Setup

1. **Clone and Setup**:
   ```bash
   git clone <your-repo-url>
   cd billionforgeai.space
   python setup.py
   ```

2. **Configure Environment**:
   - Edit `.env` file with your tokens
   - Get Slack tokens from app settings
   - Add your OpenAI API key

3. **Create Slack App**:
   - Go to [Slack API](https://api.slack.com/apps)
   - Create new app "From a manifest"
   - Use `slack_app_manifest.json`
   - Install to your workspace

4. **Run the Bot**:
   ```bash
   python app.py
   ```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token  
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=sk-your-openai-key
```

## Usage

### Direct Messages
Send a DM to ForgeAI for private assistance:
```
Help me debug this Python function
```

### Channel Mentions
Tag ForgeAI in any channel:
```
@ForgeAI How do I optimize this database query?
```

### Slash Commands
Use the slash command anywhere:
```
/ask-forgeai What's the best way to structure a REST API?
```

## Customization

Edit the `system_prompt` in `app.py` to customize ForgeAI's personality and capabilities:

```python
self.system_prompt = """You are ForgeAI, an AI assistant specialized in...
```

## Dependencies

- `slack-bolt` - Slack app framework
- `openai` - OpenAI API client
- `python-dotenv` - Environment variable management
- `flask` - Web framework
- `langchain` - AI framework (optional advanced features)

## Development

The bot uses Socket Mode for real-time events. For production deployment, consider:
- Using HTTP mode with proper webhook endpoints
- Implementing rate limiting
- Adding error monitoring
- Using environment-specific configurations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your Slack workspace
5. Submit a pull request

## License

MIT License - see LICENSE file for details