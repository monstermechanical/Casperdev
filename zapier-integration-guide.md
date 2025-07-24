# Zapier Integration Guide

## 🚀 Quick Start

This guide will help you set up Zapier integration with your CasperDev application to automate workflows and connect with thousands of other apps.

## 📋 Prerequisites

- CasperDev application running
- Zapier account (free or paid)
- Valid API credentials for any connected services (HubSpot, Slack, etc.)

## 🔧 Step 1: Zapier Webhook Setup

### 1.1 Create Zapier Webhook (Incoming)
1. Go to [Zapier](https://zapier.com/) and create a new Zap
2. Choose "Webhooks by Zapier" as the trigger
3. Select "Catch Hook" event
4. Copy the webhook URL (format: `https://hooks.zapier.com/hooks/catch/...`)
5. Set up the action app (Slack, Gmail, Google Sheets, etc.)

### 1.2 Create Zapier Webhook (Outgoing) - Optional
1. In your Zap, choose an app as trigger (Gmail, Typeform, etc.)
2. Add "Webhooks by Zapier" as action
3. Select "POST" method
4. URL: `https://your-domain.com/api/integrations/zapier/webhook`
5. Configure payload format as JSON

## ⚙️ Step 2: Environment Configuration

### 2.1 Update .env File
```bash
# Copy from .env.example if not done already
cp .env.example .env

# Add Zapier configuration
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/your-webhook-id/
ZAPIER_API_KEY=your-zapier-api-key
ZAPIER_APP_ID=your-zapier-app-id
```

### 2.2 Optional: Zapier API Key
For advanced features, you can get a Zapier API key:
1. Go to [Zapier Developer Platform](https://developer.zapier.com/)
2. Create an account if needed
3. Generate API key from your dashboard

## 🛠️ Step 3: Installation & Testing

### 3.1 Install Dependencies (if needed)
```bash
npm install
```

### 3.2 Start the Application
```bash
npm run dev
```

### 3.3 Test Zapier Connection
```bash
# Test webhook connection
curl -X GET http://localhost:5000/api/integrations/zapier/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📡 API Endpoints

### Testing & Status
- **GET** `/api/integrations/zapier/test` - Test webhook connection
- **GET** `/api/integrations/status` - Get all integration statuses

### Triggering Workflows
- **POST** `/api/integrations/zapier/trigger` - Trigger custom Zapier workflow
- **POST** `/api/integrations/zapier/sync-hubspot` - Sync HubSpot data to Zapier

### Receiving Webhooks
- **POST** `/api/integrations/zapier/webhook` - Receive webhooks from Zapier (no auth required)

### Monitoring
- **GET** `/api/integrations/zapier/webhooks` - Get webhook history
- **POST** `/api/integrations/zapier/auto-trigger/enable` - Enable scheduled triggers

## 📊 Usage Examples

### 1. Trigger Custom Zapier Workflow
```bash
curl -X POST http://localhost:5000/api/integrations/zapier/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "new_user_signup",
    "data": {
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "premium"
    },
    "zap_name": "New User Welcome Email"
  }'
```

### 2. Sync HubSpot Data to Zapier
```bash
curl -X POST http://localhost:5000/api/integrations/zapier/sync-hubspot \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "contacts",
    "limit": 20
  }'
```

### 3. Enable Auto-Triggers
```bash
curl -X POST http://localhost:5000/api/integrations/zapier/auto-trigger/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "schedule": "0 */4 * * *",
    "triggers": [
      {"type": "hubspot_contacts"},
      {"type": "system_health"}
    ]
  }'
```

### 4. Get Webhook History
```bash
curl -X GET http://localhost:5000/api/integrations/zapier/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🔄 Webhook Processing

The integration automatically processes incoming webhooks based on the `action` field:

### Supported Actions
- `new_lead` - Creates new contact in HubSpot
- `update_contact` - Updates existing HubSpot contact
- `task_completed` - Sends Slack notification
- `send_notification` - Sends notification to configured channels

### Example Webhook Payload
```json
{
  "action": "new_lead",
  "data": {
    "email": "lead@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "company": "Example Corp"
  },
  "source": "contact_form"
}
```

## 🤖 Automation Examples

### 1. Form Submission → HubSpot Contact
**Trigger:** Typeform submission
**Action:** Create HubSpot contact via webhook
```json
{
  "action": "new_lead",
  "data": {
    "email": "{{email}}",
    "firstName": "{{first_name}}",
    "lastName": "{{last_name}}"
  }
}
```

### 2. HubSpot Deal → Slack Notification
**Trigger:** Scheduled sync
**Action:** Send deal updates to Slack
```bash
# Sync every 2 hours
curl -X POST /api/integrations/zapier/sync-hubspot \
  -d '{"type": "deals", "limit": 10}'
```

### 3. Task Completion → Multiple Notifications
**Trigger:** Project management tool
**Action:** Notify team via Slack
```json
{
  "action": "task_completed",
  "data": {
    "taskName": "Website Design Review",
    "description": "Final design approved by client",
    "assignee": "john@example.com"
  }
}
```

## 📱 Frontend Integration

### React Component Example
```jsx
import React, { useState } from 'react';
import axios from 'axios';

const ZapierIntegration = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const triggerZapier = async (action, data) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/integrations/zapier/trigger', {
        action,
        data,
        zap_name: `CasperDev ${action}`
      });
      setStatus(`Zapier workflow triggered: ${response.data.message}`);
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  const syncToZapier = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/integrations/zapier/sync-hubspot', {
        type: 'contacts',
        limit: 10
      });
      setStatus(`Synced ${response.data.synced} contacts to Zapier`);
    } catch (error) {
      setStatus(`Error: ${error.response?.data?.error || 'Unknown error'}`);
    }
    setLoading(false);
  };

  return (
    <div className="zapier-integration">
      <h2>Zapier Integration</h2>
      
      <div className="actions">
        <button 
          onClick={() => triggerZapier('test_event', { message: 'Hello from React!' })}
          disabled={loading}
        >
          {loading ? 'Triggering...' : 'Test Zapier'}
        </button>
        
        <button onClick={syncToZapier} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync HubSpot to Zapier'}
        </button>
      </div>
      
      {status && <div className="status">{status}</div>}
    </div>
  );
};

export default ZapierIntegration;
```

## 🔧 Advanced Configuration

### Custom Webhook Processing
Add custom webhook handlers by modifying the switch statement in `processWebhook()`:

```javascript
// In server/routes/integrations.js
case 'custom_action':
  processedResult = await processCustomAction(webhookData.data);
  break;

async function processCustomAction(data) {
  // Your custom logic here
  return { action: 'custom_processed', result: data };
}
```

### Webhook Validation
For production, add webhook signature validation:

```javascript
// Add to webhook endpoint
const crypto = require('crypto');

const validateWebhook = (req, res, next) => {
  const signature = req.headers['x-zapier-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  // Validate signature with your webhook secret
  const expectedSignature = crypto
    .createHmac('sha256', process.env.ZAPIER_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};
```

## 📊 Monitoring & Analytics

### Integration Dashboard
Monitor Zapier integration through:
- Webhook success/failure rates
- Trigger frequency and timing
- Data sync volumes
- Error patterns and troubleshooting

### Logging
All Zapier activities are logged with:
- Timestamp
- Action type
- Success/failure status
- Payload data (sanitized)
- Response details

## 🚨 Troubleshooting

### Common Issues

**1. Webhook Not Triggering**
- Check webhook URL in Zapier
- Verify endpoint is accessible
- Check for authentication requirements
- Review Zapier logs

**2. Connection Test Fails**
- Verify `ZAPIER_WEBHOOK_URL` in .env
- Check internet connectivity
- Ensure webhook is published and active
- Test with curl command

**3. Data Not Syncing**
- Check HubSpot/Slack credentials
- Verify API permissions
- Review server logs for errors
- Test individual endpoints

**4. Webhook Processing Errors**
- Check webhook payload format
- Verify required fields are present
- Review custom processing logic
- Check integration status

### Debug Commands
```bash
# Check integration status
curl -X GET http://localhost:5000/api/integrations/status

# Test webhook manually
curl -X POST http://localhost:5000/api/integrations/zapier/webhook \
  -H "Content-Type: application/json" \
  -d '{"action": "test", "data": {"message": "debug test"}}'

# Check webhook history
curl -X GET http://localhost:5000/api/integrations/zapier/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Use Cases & Examples

### 1. E-commerce Order Processing
```
New Order (Shopify) → Zapier → CasperDev Webhook → Create HubSpot Deal → Slack Notification
```

### 2. Customer Support Automation
```
Support Ticket (Zendesk) → Zapier → CasperDev → Update HubSpot Contact → Assign to Team
```

### 3. Marketing Lead Processing
```
Form Submission (Website) → Zapier → CasperDev → HubSpot Contact → Email Campaign → Slack Alert
```

### 4. Project Management
```
Task Completed (Asana) → Zapier → CasperDev → Slack Notification → Update Dashboard
```

## 🔐 Security Best Practices

1. **Environment Variables**: Store all credentials in environment variables
2. **Webhook Validation**: Implement signature validation for production
3. **Rate Limiting**: Use built-in rate limiting for webhook endpoints
4. **Authentication**: Require JWT tokens for admin endpoints
5. **Input Sanitization**: Validate all incoming webhook data
6. **Logging**: Log all activities but sanitize sensitive data

## 📈 Scaling & Performance

### Optimization Tips
- Use webhook queues for high-volume processing
- Implement caching for frequently accessed data
- Add error retry logic with exponential backoff
- Monitor webhook processing times
- Set appropriate timeout values

### Load Balancing
For high-traffic scenarios:
- Use multiple webhook endpoints
- Implement round-robin distribution
- Add Redis for shared state management
- Consider using message queues (RabbitMQ, SQS)

## 🎉 What You Can Do Now

### Immediate Actions
1. ✅ Set up Zapier webhook in your Zap
2. ✅ Test webhook connection
3. ✅ Trigger custom workflows
4. ✅ Sync HubSpot data to Zapier
5. ✅ Monitor webhook activity

### Next Steps
- Create custom webhook processors for your specific needs
- Set up automated triggers for regular data syncing
- Integrate with additional services through Zapier
- Build frontend dashboard for managing integrations
- Add webhook signature validation for production

---

**Automate everything with Zapier!** ⚡

For questions or custom implementations, check the troubleshooting section or review the integration status endpoints.