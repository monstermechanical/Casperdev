# HubSpot-Slack Integration Setup Guide

## 🚀 Fast Track Setup

This guide will help you quickly set up the HubSpot-Slack integration for your CasperDev application.

## 📋 Prerequisites

- Node.js (v14 or higher)
- HubSpot account with API access
- Slack workspace with bot creation permissions
- MongoDB instance running

## 🔧 Step 1: HubSpot Configuration

### 1.1 Create HubSpot App
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app or use an existing one
3. Navigate to "Auth" tab and note your App ID
4. Go to "Scopes" and add the following permissions:
   - `crm.objects.contacts.read`
   - `crm.objects.deals.read`
   - `settings.users.read`

### 1.2 Get Access Token
1. Go to "Settings" → "Integrations" → "Private Apps"
2. Create a new private app
3. Add the required scopes mentioned above
4. Generate the access token
5. Copy the token - you'll need it for the `.env` file

## 🤖 Step 2: Slack Configuration

### 2.1 Create Slack App
1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Choose your workspace and give it a name (e.g., "HubSpot Integration")

### 2.2 Configure Bot Permissions
1. Go to "OAuth & Permissions"
2. Add the following Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
   - `channels:read`
   - `groups:read`
   - `im:read`
   - `mpim:read`

### 2.3 Install App to Workspace
1. Click "Install to Workspace"
2. Authorize the app
3. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## ⚙️ Step 3: Environment Configuration

### 3.1 Copy Environment File
```bash
cp .env.example .env
```

### 3.2 Update .env File
```bash
# HubSpot Integration
HUBSPOT_ACCESS_TOKEN=your-hubspot-access-token
HUBSPOT_APP_ID=your-hubspot-app-id

# Slack Integration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_DEFAULT_CHANNEL=#general
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Other required settings
MONGODB_URI=mongodb://localhost:27017/casperdev
JWT_SECRET=your-super-secret-key-here
```

## 🛠️ Step 4: Installation & Setup

### 4.1 Install Dependencies
```bash
npm run install-all
```

### 4.2 Start the Application
```bash
npm run dev
```

## 🧪 Step 5: Test the Integration

### 5.1 Test HubSpot Connection
```bash
curl -X GET http://localhost:5000/api/integrations/hubspot/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.2 Test Slack Connection
```bash
curl -X GET http://localhost:5000/api/integrations/slack/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📡 API Endpoints

### Integration Status
- **GET** `/api/integrations/status` - Get integration status

### HubSpot Endpoints
- **GET** `/api/integrations/hubspot/test` - Test HubSpot connection
- **POST** `/api/integrations/hubspot/sync-contacts` - Sync contacts to Slack
- **POST** `/api/integrations/hubspot/sync-deals` - Sync deals to Slack
- **GET** `/api/integrations/hubspot/activities` - Get recent HubSpot activities

### Slack Endpoints
- **GET** `/api/integrations/slack/test` - Test Slack connection
- **POST** `/api/integrations/slack/notify` - Send custom notification to Slack

### Auto-Sync
- **POST** `/api/integrations/auto-sync/enable` - Enable automated synchronization

## 📊 Usage Examples

### 1. Sync HubSpot Contacts to Slack
```bash
curl -X POST http://localhost:5000/api/integrations/hubspot/sync-contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slackChannel": "#sales"}'
```

### 2. Sync HubSpot Deals to Slack
```bash
curl -X POST http://localhost:5000/api/integrations/hubspot/sync-deals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slackChannel": "#deals"}'
```

### 3. Send Custom Notification
```bash
curl -X POST http://localhost:5000/api/integrations/slack/notify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "#general",
    "title": "New Lead Alert",
    "message": "A new qualified lead has been identified in HubSpot!"
  }'
```

### 4. Enable Auto-Sync
```bash
curl -X POST http://localhost:5000/api/integrations/auto-sync/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": true,
    "deals": true,
    "slackChannel": "#crm-updates"
  }'
```

## 🔄 Auto-Sync Features

The integration includes automated synchronization:
- **Contacts**: Syncs every hour at :00 (e.g., 1:00, 2:00, 3:00)
- **Deals**: Syncs every hour at :30 (e.g., 1:30, 2:30, 3:30)
- **Customizable**: Choose what to sync and which Slack channel to use

## 📱 Frontend Integration

### React Component Example
```jsx
import React, { useState } from 'react';
import axios from 'axios';

const HubSpotSlackIntegration = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const syncContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/integrations/hubspot/sync-contacts', {
        slackChannel: '#sales'
      });
      setStatus(`Synced ${response.data.synced} contacts successfully!`);
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  const syncDeals = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/integrations/hubspot/sync-deals', {
        slackChannel: '#deals'
      });
      setStatus(`Synced ${response.data.synced} deals successfully!`);
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <div className="integration-panel">
      <h2>HubSpot-Slack Integration</h2>
      
      <div className="actions">
        <button onClick={syncContacts} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync Contacts'}
        </button>
        
        <button onClick={syncDeals} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync Deals'}
        </button>
      </div>
      
      {status && <div className="status">{status}</div>}
    </div>
  );
};

export default HubSpotSlackIntegration;
```

## 🛡️ Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Token Security**: Rotate tokens regularly
3. **Rate Limiting**: The integration respects API rate limits
4. **Error Handling**: Comprehensive error handling prevents crashes
5. **Authentication**: All endpoints require valid JWT tokens

## 🚨 Troubleshooting

### Common Issues

**1. HubSpot Connection Failed**
- Check your access token is valid
- Verify app permissions/scopes
- Ensure token hasn't expired

**2. Slack Connection Failed**
- Verify bot token is correct
- Check bot permissions in Slack
- Ensure bot is added to the channel

**3. Sync Not Working**
- Check if data exists in HubSpot
- Verify channel name format (include #)
- Check server logs for detailed errors

**4. Auto-Sync Not Running**
- Ensure server is running continuously
- Check cron job configuration
- Verify environment variables are set

### Error Codes
- `400`: Bad Request - Check request parameters
- `401`: Unauthorized - Check JWT token
- `403`: Forbidden - Check API permissions
- `404`: Not Found - Check endpoints/channels
- `500`: Server Error - Check server logs

## 📈 Monitoring

Check integration status:
```bash
curl -X GET http://localhost:5000/api/integrations/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response includes:
- Connection status for both services
- Last sync timestamps
- Error messages if any

## 🔧 Advanced Configuration

### Custom Slack Message Format
You can customize the message format by modifying the integration route:

```javascript
// In server/routes/integrations.js
const contactsMessage = contacts.map(contact => {
  const props = contact.properties;
  return `🆕 ${props.firstname} ${props.lastname} - ${props.email}`;
}).join('\n');
```

### Webhook Integration
For real-time updates, consider setting up HubSpot webhooks:

1. Go to HubSpot App Settings
2. Navigate to "Webhooks"
3. Add webhook URL: `https://your-domain.com/api/integrations/webhook`
4. Select events to track

## 🎯 Next Steps

1. **Set up webhooks** for real-time updates
2. **Add more HubSpot objects** (companies, tickets, etc.)
3. **Create Slack slash commands** for manual triggers
4. **Add email notifications** for failed syncs
5. **Implement data filtering** based on criteria
6. **Add support for multiple Slack workspaces**

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs
3. Test individual endpoints
4. Verify environment configuration

---

**🚀 Your HubSpot-Slack integration is now ready!**

The integration will automatically sync your HubSpot data to Slack, keeping your team informed about new contacts, deals, and activities in real-time.