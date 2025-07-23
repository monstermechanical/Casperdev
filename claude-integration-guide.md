# Claude AI Integration - Setup Guide

## 🚀 Claude Integration Overview

Your CasperDev application now includes a powerful Claude AI integration that provides:

- **Content Generation** - Create high-quality text content
- **Data Analysis** - Analyze and extract insights from your data
- **Chat Interface** - Interactive conversational AI capabilities
- **HubSpot Enhancement** - AI-powered insights for your CRM data

## 🔧 Quick Setup

### 1. Get Your Claude API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 2. Configure Environment Variables

Add the Claude API key to your `.env` file:

```bash
# Claude AI Integration
CLAUDE_API_KEY=sk-ant-your-actual-api-key-here
```

### 3. Install Dependencies (Already Done)

The Anthropic SDK has been automatically installed:
```bash
npm install @anthropic-ai/sdk
```

### 4. Start the Application

```bash
npm run dev
```

## 📡 Available Endpoints

### **Connection Testing**

#### Test Claude Connection
```bash
GET /api/integrations/claude/test
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "status": "connected",
  "message": "Claude connection successful",
  "testResponse": "Hello! The API connection is working perfectly...",
  "model": "claude-3-haiku-20240307",
  "connected": true
}
```

### **Content Generation**

#### Generate Content with Claude
```bash
POST /api/integrations/claude/generate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "prompt": "Write a professional email about a product launch",
  "model": "claude-3-haiku-20240307",
  "maxTokens": 1000
}
```

**Response:**
```json
{
  "message": "Content generated successfully",
  "response": "Subject: Exciting Product Launch...",
  "model": "claude-3-haiku-20240307",
  "usage": {
    "inputTokens": 15,
    "outputTokens": 150
  }
}
```

### **Chat Interface**

#### Multi-turn Chat with Claude
```bash
POST /api/integrations/claude/chat
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "I need help with my marketing strategy"
    }
  ],
  "model": "claude-3-sonnet-20240229",
  "maxTokens": 2000
}
```

### **Data Analysis**

#### Analyze Any Data with Claude
```bash
POST /api/integrations/claude/analyze
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "data": {
    "sales": [100, 150, 200, 180],
    "months": ["Jan", "Feb", "Mar", "Apr"]
  },
  "analysisType": "insights",
  "context": "Monthly sales data for Q1"
}
```

**Analysis Types:**
- `summary` - Concise overview
- `insights` - Key patterns and recommendations  
- `trends` - Trend identification
- `general` - Custom analysis with context

### **HubSpot + Claude Integration**

#### Enhance HubSpot Data with AI Insights
```bash
POST /api/integrations/claude/enhance-hubspot
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "dataType": "contacts",
  "limit": 10
}
```

**Data Types:**
- `contacts` - Analyze contact data for lead insights
- `deals` - Analyze deal data for sales performance

**Response:**
```json
{
  "message": "HubSpot contacts analysis completed successfully",
  "dataType": "contacts",
  "recordsAnalyzed": 10,
  "insights": "Based on the contact data analysis, here are key insights...",
  "usage": {
    "inputTokens": 500,
    "outputTokens": 800
  }
}
```

## 🛠 Integration Status

#### Check All Integration Status (Including Claude)
```bash
GET /api/integrations/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "status": "active",
  "integrations": {
    "hubspot": {
      "connected": true,
      "lastSync": "2024-01-15T10:30:00.000Z",
      "error": null
    },
    "slack": {
      "connected": true,
      "lastSync": "2024-01-15T10:30:00.000Z",
      "error": null
    },
    "claude": {
      "connected": true,
      "lastUsed": "2024-01-15T10:30:00.000Z",
      "error": null
    }
  },
  "lastChecked": "2024-01-15T10:30:00.000Z"
}
```

## 🎯 Use Cases

### **1. Content Marketing**
```bash
curl -X POST http://localhost:5000/api/integrations/claude/generate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a blog post about the benefits of AI in customer service",
    "maxTokens": 1500
  }'
```

### **2. Sales Intelligence** 
```bash
curl -X POST http://localhost:5000/api/integrations/claude/enhance-hubspot \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataType": "deals",
    "limit": 20
  }'
```

### **3. Customer Support**
```bash
curl -X POST http://localhost:5000/api/integrations/claude/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user", 
        "content": "How can I improve customer retention rates?"
      }
    ]
  }'
```

### **4. Data Insights**
```bash
curl -X POST http://localhost:5000/api/integrations/claude/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"revenue": [50000, 60000, 45000, 70000]},
    "analysisType": "trends",
    "context": "Quarterly revenue data"
  }'
```

## 🤖 Available Models

### **Claude 3 Haiku** (`claude-3-haiku-20240307`)
- **Best for:** Fast responses, simple tasks, content generation
- **Speed:** Fastest
- **Cost:** Most economical
- **Max tokens:** Up to 4,096 output tokens

### **Claude 3 Sonnet** (`claude-3-sonnet-20240229`)  
- **Best for:** Complex analysis, detailed responses, reasoning
- **Speed:** Balanced
- **Cost:** Moderate
- **Max tokens:** Up to 4,096 output tokens

### **Claude 3 Opus** (`claude-3-opus-20240229`)
- **Best for:** Most complex tasks, highest quality output
- **Speed:** Slower but most capable
- **Cost:** Premium
- **Max tokens:** Up to 4,096 output tokens

## 🔒 Security & Best Practices

### **API Key Security**
- ✅ Store API key in environment variables only
- ✅ Never commit API keys to version control
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly

### **Rate Limiting**
- Built-in error handling for rate limits
- Automatic retry logic for transient failures
- Token usage tracking for cost monitoring

### **Data Privacy**
- All requests are processed by Anthropic's API
- No data is stored by Claude after processing
- Ensure compliance with your data privacy policies

## 🚨 Troubleshooting

### **Common Issues**

#### "Claude connection failed"
```bash
# Check your API key
echo $CLAUDE_API_KEY

# Test with curl
curl -X GET http://localhost:5000/api/integrations/claude/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### "Authentication failed"  
- Verify your JWT token is valid
- Check that you're logged in to the application
- Ensure the auth middleware is working

#### "Rate limit exceeded"
- Wait for the rate limit to reset
- Consider upgrading your Anthropic plan
- Implement request queuing for high-volume usage

### **Debug Mode**
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## 📊 Integration Architecture

```
Your App → JWT Auth → Claude Integration → Anthropic API
    ↓         ↓            ↓                 ↓
Frontend  Middleware  Response Format   AI Processing
```

### **Data Flow:**
1. **Authentication** - JWT token validation
2. **Request Processing** - Input validation and formatting  
3. **Claude API Call** - Secure request to Anthropic
4. **Response Handling** - Format and return results
5. **Status Tracking** - Update integration status

## 🎉 What's Next?

### **Immediate Actions You Can Take:**
1. ✅ Test the Claude connection
2. ✅ Generate your first piece of content
3. ✅ Analyze some sample data
4. ✅ Enhance your HubSpot insights
5. ✅ Set up a chat interface

### **Advanced Features to Explore:**
- **Custom prompts** for your specific use case
- **Multi-model strategies** (Haiku for speed, Sonnet for quality)
- **Batch processing** for large datasets
- **Integration with other tools** in your stack

### **Frontend Integration Ideas:**
- Chat interface for customer support
- Content generation dashboard
- Data analysis visualization
- HubSpot insights panel

## 📞 Support Resources

- **Anthropic Documentation:** [https://docs.anthropic.com](https://docs.anthropic.com)
- **API Reference:** [https://docs.anthropic.com/claude/reference](https://docs.anthropic.com/claude/reference)
- **Rate Limits:** [https://docs.anthropic.com/claude/reference/rate-limits](https://docs.anthropic.com/claude/reference/rate-limits)

---

## 🎯 Ready to Use Claude!

Your Claude AI integration is now **fully operational** and ready to enhance your application with powerful AI capabilities!

**Test Command:**
```bash
curl -X GET http://localhost:5000/api/integrations/claude/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Start Generating:**
```bash
npm run dev
```

Happy building with Claude! 🚀