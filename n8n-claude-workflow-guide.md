# 🚀 n8n Claude Workflow Integration Guide

## 🎯 Overview

This guide sets up n8n workflow automation with Claude AI integration, enabling powerful automated workflows that combine your CasperDev application, Claude AI, and Slack.

### 🤖 What You'll Get:

1. **Interactive Slack Bot** - Chat with Claude directly in Slack
2. **Automated Daily Reports** - AI-generated business summaries
3. **Smart Content Creation** - Automated social media content
4. **HubSpot Intelligence** - AI-powered CRM insights

## 🛠 Prerequisites

Before launching, ensure you have:

- ✅ **CasperDev application running** (`npm run dev`)
- ✅ **Claude API key** from [Anthropic Console](https://console.anthropic.com/)
- ✅ **Slack Bot Token** with proper permissions
- ✅ **Docker installed** and running
- ✅ **Environment variables configured** in `.env`

## 🚀 Quick Launch

### 1. Launch n8n with Claude Workflows

```bash
# Make the script executable
chmod +x launch-n8n-claude.sh

# Launch n8n with Claude integration
./launch-n8n-claude.sh
```

### 2. Access n8n Interface

- **URL**: http://localhost:5678
- **Username**: `admin`
- **Password**: `admin123`

### 3. Configure Credentials

In n8n, set up:
1. **Slack API credentials** for bot communication
2. **CasperDev JWT token** for API access

## 📊 Available Workflows

### 1. 💬 Claude Slack Integration

**Purpose**: Interactive AI assistant in Slack

**Features**:
- Responds to `@claude` mentions
- Intelligent request routing (generate, analyze, hubspot, general)
- Real-time AI responses in threads
- Integration with your CasperDev Claude endpoints

**Usage Examples**:
```
@claude generate a marketing email for our new product
@claude analyze our sales data trends
@claude hubspot - show me lead insights
@claude what's the weather like today?
```

### 2. 📊 Claude Content Automation

**Purpose**: Daily automated business intelligence

**Features**:
- **9 AM Daily Trigger** - Runs automatically every morning
- **HubSpot Data Collection** - Fetches recent activities
- **AI-Generated Summaries** - Creates business intelligence reports
- **Social Media Content** - Generates LinkedIn-ready posts
- **Multi-Channel Distribution** - Sends to different Slack channels

**Outputs**:
- Daily business summary to `#daily-reports`
- Social media content suggestions to `#marketing`

## 🔧 Workflow Architecture

### Claude Slack Integration Flow:
```
Slack Message → Filter @claude → Process Request → Route by Type
     ↓                ↓               ↓              ↓
  Trigger        Clean Text     Determine Intent   Choose Endpoint
     ↓                ↓               ↓              ↓
Claude API ← Format Response ← CasperDev API ← Execute Action
     ↓                ↓               ↓              ↓
AI Response → Slack Thread → Formatted Output → User Receives
```

### Content Automation Flow:
```
Daily Cron → HubSpot Data → Generate Summary → Slack #daily-reports
     ↓            ↓              ↓                 ↓
  9 AM Trigger  Activities   Claude Analysis    Business Intelligence
     ↓            ↓              ↓                 ↓
     └────→ Social Content → Claude Creative → Slack #marketing
```

## ⚙️ Configuration

### Required Environment Variables

```bash
# Core Application
CLAUDE_API_KEY=sk-ant-your-claude-key
SLACK_BOT_TOKEN=xoxb-your-slack-token
JWT_SECRET=your-jwt-secret

# Optional Customization
SLACK_DEFAULT_CHANNEL=#general
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
```

### Slack Bot Permissions Required

Your Slack bot needs these OAuth scopes:
- `app_mentions:read` - Detect @mentions
- `channels:history` - Read channel messages
- `chat:write` - Send messages
- `users:read` - Get user information

## 🎛 Customization Options

### Modify Triggers

**Change Daily Report Time**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "hour",
        "triggerAtHour": 8  // Change to 8 AM
      }
    ]
  }
}
```

**Add More Channels**:
```json
{
  "events": ["app_mention", "message"],
  "additionalFields": {
    "channel": ["general", "ai-assistant", "support", "sales"]
  }
}
```

### Custom Request Types

Add new intelligent routing in the Process Message node:

```javascript
// Add custom request types
if (cleanText.toLowerCase().includes('email') || cleanText.toLowerCase().includes('newsletter')) {
  requestType = 'email';
} else if (cleanText.toLowerCase().includes('code') || cleanText.toLowerCase().includes('programming')) {
  requestType = 'code';
}
```

### Model Selection

**Use Different Claude Models**:
- **Haiku** (`claude-3-haiku-20240307`) - Fast, cost-effective
- **Sonnet** (`claude-3-sonnet-20240229`) - Balanced performance
- **Opus** (`claude-3-opus-20240229`) - Highest quality

```json
{
  "model": "claude-3-opus-20240229",
  "maxTokens": 3000
}
```

## 🔍 Monitoring & Debugging

### View n8n Logs
```bash
# Real-time logs
docker-compose -f docker-compose.n8n.yml logs -f

# Specific service logs
docker-compose -f docker-compose.n8n.yml logs n8n
```

### Check Workflow Status
1. Open n8n interface: http://localhost:5678
2. Navigate to "Executions" tab
3. View execution history and debug failures

### Test Individual Nodes
1. Open workflow in n8n editor
2. Click "Execute Workflow" button
3. Use test data to debug specific nodes

## 🚨 Troubleshooting

### Common Issues

#### ❌ "Cannot connect to CasperDev API"
```bash
# Check if main application is running
curl http://localhost:5000/api/health

# Verify JWT token configuration
echo $CASPERDEV_JWT_TOKEN
```

#### ❌ "Slack credentials not working"
1. Verify bot token in n8n credentials
2. Check bot permissions in Slack app settings
3. Ensure bot is added to target channels

#### ❌ "Claude API errors"
```bash
# Test Claude API directly
curl -X GET http://localhost:5000/api/integrations/claude/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### ❌ "Workflows not importing"
1. Check n8n is fully started
2. Manually import via web interface
3. Verify workflow JSON syntax

### Performance Optimization

**Reduce Response Time**:
- Use Claude Haiku for simple requests
- Cache frequently requested data
- Implement request queuing for high volume

**Scale for Production**:
- Use external database for n8n (PostgreSQL)
- Set up Redis for queue management
- Monitor resource usage

## 📈 Analytics & Insights

### Track Usage
n8n provides built-in execution tracking:
- Total workflow executions
- Success/failure rates
- Average execution time
- Error patterns

### Claude Usage Monitoring
Monitor token usage through:
- CasperDev integration endpoints
- n8n execution logs
- Anthropic API dashboard

## 🔄 Workflow Maintenance

### Regular Updates
1. **Weekly**: Review workflow execution logs
2. **Monthly**: Update Claude models if new versions available
3. **Quarterly**: Optimize workflows based on usage patterns

### Backup Workflows
```bash
# Export workflows
curl -u admin:admin123 http://localhost:5678/rest/workflows > workflows_backup.json
```

### Version Control
- Store workflow JSON files in Git
- Tag versions for stable releases
- Document changes in workflow descriptions

## 🎯 Advanced Use Cases

### 1. Customer Support Automation
```
Slack Support Channel → Claude Analysis → Priority Routing → Auto-Response
```

### 2. Sales Intelligence
```
HubSpot Deal Updates → Claude Insights → Sales Team Notifications → Action Items
```

### 3. Content Calendar
```
Weekly Trigger → Past Performance Analysis → Content Suggestions → Approval Workflow
```

### 4. Competitive Intelligence
```
News API → Claude Analysis → Market Insights → Executive Summary
```

## 🔐 Security Best Practices

### API Key Management
- ✅ Store keys in environment variables only
- ✅ Use different keys for development/production
- ✅ Rotate keys regularly
- ✅ Monitor key usage

### Access Control
- ✅ Secure n8n with strong authentication
- ✅ Limit Slack bot permissions to minimum required
- ✅ Use HTTPS in production
- ✅ Regular security audits

## 📞 Support Resources

- **n8n Documentation**: [docs.n8n.io](https://docs.n8n.io)
- **Claude API Reference**: [docs.anthropic.com](https://docs.anthropic.com)
- **Slack API Docs**: [api.slack.com](https://api.slack.com)
- **Workflow Examples**: Check `/n8n/workflows/` directory

---

## 🎉 You're Ready!

Your n8n Claude workflow integration is now **fully operational**! 

### Quick Start Commands:
```bash
# Launch everything
./launch-n8n-claude.sh

# Test in Slack
@claude hello world

# Check status
docker-compose -f docker-compose.n8n.yml ps
```

**Happy automating with Claude AI and n8n!** 🚀