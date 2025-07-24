const express = require('express');
const { WebClient } = require('@slack/web-api');
const { Client } = require('@hubspot/api-client');
const auth = require('../middleware/auth');
const cron = require('node-cron');
const axios = require('axios');

const router = express.Router();

// Initialize HubSpot and Slack clients
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Zapier configuration
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;
const ZAPIER_API_KEY = process.env.ZAPIER_API_KEY;

// Integration status storage
let integrationStatus = {
  hubspot: {
    connected: false,
    lastSync: null,
    error: null
  },
  slack: {
    connected: false,
    lastSync: null,
    error: null
  },
  zapier: {
    connected: false,
    lastWebhook: null,
    lastTrigger: null,
    error: null
  }
};

// Test HubSpot connection
router.get('/hubspot/test', auth, async (req, res) => {
  try {
    const accountInfo = await hubspotClient.settings.users.usersApi.getPage();
    integrationStatus.hubspot.connected = true;
    integrationStatus.hubspot.error = null;
    
    res.json({
      status: 'connected',
      message: 'HubSpot connection successful',
      accountInfo: {
        users: accountInfo.results.length,
        connected: true
      }
    });
  } catch (error) {
    integrationStatus.hubspot.connected = false;
    integrationStatus.hubspot.error = error.message;
    
    res.status(500).json({
      status: 'error',
      message: 'HubSpot connection failed',
      error: error.message
    });
  }
});

// Test Slack connection
router.get('/slack/test', auth, async (req, res) => {
  try {
    const authTest = await slackClient.auth.test();
    integrationStatus.slack.connected = true;
    integrationStatus.slack.error = null;
    
    res.json({
      status: 'connected',
      message: 'Slack connection successful',
      botInfo: {
        botId: authTest.bot_id,
        teamName: authTest.team,
        connected: true
      }
    });
  } catch (error) {
    integrationStatus.slack.connected = false;
    integrationStatus.slack.error = error.message;
    
    res.status(500).json({
      status: 'error',
      message: 'Slack connection failed',
      error: error.message
    });
  }
});

// Get integration status
router.get('/status', auth, async (req, res) => {
  try {
    res.json({
      status: 'active',
      integrations: integrationStatus,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get integration status',
      error: error.message
    });
  }
});

// Sync HubSpot contacts to Slack channel
router.post('/hubspot/sync-contacts', auth, async (req, res) => {
  try {
    const { slackChannel = process.env.SLACK_DEFAULT_CHANNEL } = req.body;
    
    // Get recent contacts from HubSpot
    const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
      10, // limit
      undefined, // after
      ['firstname', 'lastname', 'email', 'createdate', 'hs_lead_status'],
      undefined, // associations
      undefined, // archived
      'createdate' // sort
    );

    const contacts = contactsResponse.results;
    
    if (contacts.length === 0) {
      return res.json({
        message: 'No contacts found to sync',
        synced: 0
      });
    }

    // Format contacts for Slack
    const contactsMessage = contacts.map(contact => {
      const props = contact.properties;
      return `• *${props.firstname || ''} ${props.lastname || ''}* (${props.email || 'No email'}) - Status: ${props.hs_lead_status || 'Unknown'}`;
    }).join('\n');

    // Send to Slack
    await slackClient.chat.postMessage({
      channel: slackChannel,
      text: `📊 *HubSpot Contacts Sync*\n\n${contactsMessage}\n\n_Synced ${contacts.length} contacts at ${new Date().toLocaleString()}_`,
      mrkdwn: true
    });

    integrationStatus.hubspot.lastSync = new Date().toISOString();
    
    res.json({
      message: 'Contacts synced successfully',
      synced: contacts.length,
      channel: slackChannel
    });
  } catch (error) {
    console.error('Contact sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to sync contacts',
      error: error.message
    });
  }
});

// Sync HubSpot deals to Slack channel
router.post('/hubspot/sync-deals', auth, async (req, res) => {
  try {
    const { slackChannel = process.env.SLACK_DEFAULT_CHANNEL } = req.body;
    
    // Get recent deals from HubSpot
    const dealsResponse = await hubspotClient.crm.deals.basicApi.getPage(
      10, // limit
      undefined, // after
      ['dealname', 'amount', 'closedate', 'dealstage', 'createdate'],
      undefined, // associations
      undefined, // archived
      'createdate' // sort
    );

    const deals = dealsResponse.results;
    
    if (deals.length === 0) {
      return res.json({
        message: 'No deals found to sync',
        synced: 0
      });
    }

    // Format deals for Slack
    const dealsMessage = deals.map(deal => {
      const props = deal.properties;
      const amount = props.amount ? `$${Number(props.amount).toLocaleString()}` : 'No amount';
      return `• *${props.dealname || 'Untitled Deal'}* - ${amount} - Stage: ${props.dealstage || 'Unknown'}`;
    }).join('\n');

    // Send to Slack
    await slackClient.chat.postMessage({
      channel: slackChannel,
      text: `💰 *HubSpot Deals Sync*\n\n${dealsMessage}\n\n_Synced ${deals.length} deals at ${new Date().toLocaleString()}_`,
      mrkdwn: true
    });

    integrationStatus.hubspot.lastSync = new Date().toISOString();
    
    res.json({
      message: 'Deals synced successfully',
      synced: deals.length,
      channel: slackChannel
    });
  } catch (error) {
    console.error('Deals sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to sync deals',
      error: error.message
    });
  }
});

// Send custom notification to Slack
router.post('/slack/notify', auth, async (req, res) => {
  try {
    const { channel, message, title = 'HubSpot Notification' } = req.body;
    
    if (!channel || !message) {
      return res.status(400).json({
        error: 'Channel and message are required'
      });
    }

    await slackClient.chat.postMessage({
      channel: channel,
      text: `🔔 *${title}*\n\n${message}\n\n_Sent from CasperDev at ${new Date().toLocaleString()}_`,
      mrkdwn: true
    });

    integrationStatus.slack.lastSync = new Date().toISOString();
    
    res.json({
      message: 'Notification sent successfully',
      channel: channel
    });
  } catch (error) {
    console.error('Slack notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

// Get HubSpot recent activities
router.get('/hubspot/activities', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get recent contacts and deals
    const [contactsResponse, dealsResponse] = await Promise.all([
      hubspotClient.crm.contacts.basicApi.getPage(
        Math.floor(limit / 2),
        undefined,
        ['firstname', 'lastname', 'email', 'createdate'],
        undefined,
        undefined,
        'createdate'
      ),
      hubspotClient.crm.deals.basicApi.getPage(
        Math.floor(limit / 2),
        undefined,
        ['dealname', 'amount', 'createdate'],
        undefined,
        undefined,
        'createdate'
      )
    ]);

    const activities = [
      ...contactsResponse.results.map(contact => ({
        type: 'contact',
        title: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`,
        email: contact.properties.email,
        date: contact.properties.createdate,
        id: contact.id
      })),
      ...dealsResponse.results.map(deal => ({
        type: 'deal',
        title: deal.properties.dealname || 'Untitled Deal',
        amount: deal.properties.amount,
        date: deal.properties.createdate,
        id: deal.id
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      activities: activities.slice(0, limit),
      total: activities.length
    });
  } catch (error) {
    console.error('HubSpot activities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch HubSpot activities',
      error: error.message
    });
  }
});

// Auto-sync functionality - runs every hour
router.post('/auto-sync/enable', auth, async (req, res) => {
  try {
    const { contacts = true, deals = true, slackChannel = process.env.SLACK_DEFAULT_CHANNEL } = req.body;
    
    // Schedule contact sync
    if (contacts) {
      cron.schedule('0 * * * *', async () => {
        try {
          console.log('Running automated contact sync...');
          await syncContactsToSlack(slackChannel);
        } catch (error) {
          console.error('Auto-sync contacts error:', error);
        }
      });
    }

    // Schedule deals sync
    if (deals) {
      cron.schedule('30 * * * *', async () => {
        try {
          console.log('Running automated deals sync...');
          await syncDealsToSlack(slackChannel);
        } catch (error) {
          console.error('Auto-sync deals error:', error);
        }
      });
    }

    res.json({
      message: 'Auto-sync enabled successfully',
      schedule: {
        contacts: contacts ? 'Every hour at :00' : 'Disabled',
        deals: deals ? 'Every hour at :30' : 'Disabled'
      }
    });
  } catch (error) {
    console.error('Auto-sync enable error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to enable auto-sync',
      error: error.message
    });
  }
});

// Helper function to sync contacts
async function syncContactsToSlack(channel) {
  try {
    const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
      5, // limit to 5 for auto-sync
      undefined,
      ['firstname', 'lastname', 'email', 'createdate'],
      undefined,
      undefined,
      'createdate'
    );

    const contacts = contactsResponse.results;
    
    if (contacts.length === 0) return;

    const contactsMessage = contacts.map(contact => {
      const props = contact.properties;
      return `• *${props.firstname || ''} ${props.lastname || ''}* (${props.email || 'No email'})`;
    }).join('\n');

    await slackClient.chat.postMessage({
      channel: channel,
      text: `🔄 *Auto-Sync: New HubSpot Contacts*\n\n${contactsMessage}\n\n_Auto-synced ${contacts.length} contacts_`,
      mrkdwn: true
    });

    integrationStatus.hubspot.lastSync = new Date().toISOString();
  } catch (error) {
    console.error('Auto-sync contacts error:', error);
  }
}

// Helper function to sync deals
async function syncDealsToSlack(channel) {
  try {
    const dealsResponse = await hubspotClient.crm.deals.basicApi.getPage(
      5, // limit to 5 for auto-sync
      undefined,
      ['dealname', 'amount', 'dealstage', 'createdate'],
      undefined,
      undefined,
      'createdate'
    );

    const deals = dealsResponse.results;
    
    if (deals.length === 0) return;

    const dealsMessage = deals.map(deal => {
      const props = deal.properties;
      const amount = props.amount ? `$${Number(props.amount).toLocaleString()}` : 'No amount';
      return `• *${props.dealname || 'Untitled Deal'}* - ${amount}`;
    }).join('\n');

    await slackClient.chat.postMessage({
      channel: channel,
      text: `🔄 *Auto-Sync: New HubSpot Deals*\n\n${dealsMessage}\n\n_Auto-synced ${deals.length} deals_`,
      mrkdwn: true
    });

    integrationStatus.hubspot.lastSync = new Date().toISOString();
  } catch (error) {
    console.error('Auto-sync deals error:', error);
  }
}

// Zapier Integration Endpoints

// Test Zapier webhook connection
router.get('/zapier/test', auth, async (req, res) => {
  try {
    if (!ZAPIER_WEBHOOK_URL) {
      return res.status(400).json({
        status: 'error',
        message: 'Zapier webhook URL not configured',
        suggestion: 'Set ZAPIER_WEBHOOK_URL in environment variables'
      });
    }

    // Send test payload to Zapier
    const testPayload = {
      test: true,
      message: 'Zapier connection test from CasperDev',
      timestamp: new Date().toISOString(),
      source: 'casperdev-integration-test'
    };

    const response = await axios.post(ZAPIER_WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    integrationStatus.zapier.connected = true;
    integrationStatus.zapier.lastTrigger = new Date().toISOString();
    integrationStatus.zapier.error = null;

    res.json({
      status: 'connected',
      message: 'Zapier webhook connection successful',
      webhook_response: {
        status: response.status,
        statusText: response.statusText
      },
      test_payload: testPayload
    });

  } catch (error) {
    integrationStatus.zapier.connected = false;
    integrationStatus.zapier.error = error.message;

    console.error('Zapier test error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Zapier webhook connection failed',
      error: error.message,
      suggestion: 'Check ZAPIER_WEBHOOK_URL and ensure the webhook is active'
    });
  }
});

// Trigger Zapier workflow with custom data
router.post('/zapier/trigger', auth, async (req, res) => {
  try {
    const { action, data, zap_name } = req.body;

    if (!ZAPIER_WEBHOOK_URL) {
      return res.status(400).json({
        error: 'Zapier webhook URL not configured'
      });
    }

    if (!action) {
      return res.status(400).json({
        error: 'Action is required'
      });
    }

    const zapierPayload = {
      action,
      data: data || {},
      zap_name: zap_name || 'CasperDev Trigger',
      timestamp: new Date().toISOString(),
      source: 'casperdev-backend',
      triggered_by: req.user.id || 'system'
    };

    console.log(`🔗 Triggering Zapier workflow: ${action}`);

    const response = await axios.post(ZAPIER_WEBHOOK_URL, zapierPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    integrationStatus.zapier.lastTrigger = new Date().toISOString();

    res.json({
      status: 'success',
      message: 'Zapier workflow triggered successfully',
      action,
      webhook_response: {
        status: response.status,
        statusText: response.statusText
      },
      payload: zapierPayload
    });

  } catch (error) {
    console.error('Zapier trigger error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger Zapier workflow',
      error: error.message
    });
  }
});

// Receive webhook from Zapier
router.post('/zapier/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('📥 Received Zapier webhook:', {
      action: webhookData.action || 'unknown',
      timestamp: new Date().toISOString()
    });

    integrationStatus.zapier.lastWebhook = new Date().toISOString();

    // Process webhook based on action type
    let processedResult = {};
    
    switch (webhookData.action) {
      case 'new_lead':
        // Handle new lead from Zapier
        processedResult = await processNewLead(webhookData.data);
        break;
      
      case 'update_contact':
        // Handle contact update from Zapier
        processedResult = await processContactUpdate(webhookData.data);
        break;
      
      case 'task_completed':
        // Handle task completion from Zapier
        processedResult = await processTaskCompletion(webhookData.data);
        break;
      
      case 'send_notification':
        // Send notification via other integrations
        processedResult = await processSendNotification(webhookData.data);
        break;
      
      default:
        processedResult = {
          action: 'logged',
          message: 'Webhook received and logged',
          data: webhookData
        };
    }

    // Store webhook data for monitoring
    if (!global.zapierWebhooks) {
      global.zapierWebhooks = [];
    }
    global.zapierWebhooks.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action: webhookData.action,
      data: webhookData,
      processed: processedResult
    });

    // Keep only last 100 webhooks
    if (global.zapierWebhooks.length > 100) {
      global.zapierWebhooks.shift();
    }

    res.json({
      status: 'success',
      message: 'Webhook processed successfully',
      action: webhookData.action,
      result: processedResult
    });

  } catch (error) {
    console.error('Zapier webhook processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook',
      error: error.message
    });
  }
});

// Sync data to Zapier
router.post('/zapier/sync-hubspot', auth, async (req, res) => {
  try {
    const { type = 'contacts', limit = 10 } = req.body;

    if (!ZAPIER_WEBHOOK_URL) {
      return res.status(400).json({
        error: 'Zapier webhook URL not configured'
      });
    }

    let hubspotData = [];
    
    if (type === 'contacts') {
      const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
        limit,
        undefined,
        ['firstname', 'lastname', 'email', 'phone', 'company', 'hs_lead_status'],
        undefined,
        undefined,
        'createdate'
      );
      hubspotData = contactsResponse.results;
    } else if (type === 'deals') {
      const dealsResponse = await hubspotClient.crm.deals.basicApi.getPage(
        limit,
        undefined,
        ['dealname', 'amount', 'closedate', 'dealstage'],
        undefined,
        undefined,
        'createdate'
      );
      hubspotData = dealsResponse.results;
    }

    // Send to Zapier
    const zapierPayload = {
      action: `hubspot_${type}_sync`,
      data: hubspotData,
      count: hubspotData.length,
      timestamp: new Date().toISOString(),
      source: 'casperdev-hubspot-sync'
    };

    await axios.post(ZAPIER_WEBHOOK_URL, zapierPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    integrationStatus.zapier.lastTrigger = new Date().toISOString();

    res.json({
      status: 'success',
      message: `HubSpot ${type} synced to Zapier successfully`,
      synced: hubspotData.length,
      type
    });

  } catch (error) {
    console.error('Zapier HubSpot sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to sync HubSpot data to Zapier',
      error: error.message
    });
  }
});

// Get Zapier webhook history
router.get('/zapier/webhooks', auth, async (req, res) => {
  try {
    const webhooks = global.zapierWebhooks || [];
    
    res.json({
      status: 'success',
      webhooks: webhooks.slice(-50), // Last 50 webhooks
      total: webhooks.length
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve webhook history',
      error: error.message
    });
  }
});

// Auto-trigger Zapier workflows
router.post('/zapier/auto-trigger/enable', auth, async (req, res) => {
  try {
    const { enabled = true, triggers = [], schedule = '0 */2 * * *' } = req.body;

    if (enabled) {
      // Schedule automatic Zapier triggers every 2 hours by default
      cron.schedule(schedule, async () => {
        console.log('🔄 Running scheduled Zapier triggers...');
        
        for (const trigger of triggers) {
          try {
            if (trigger.type === 'hubspot_contacts' && ZAPIER_WEBHOOK_URL) {
              await axios.post(ZAPIER_WEBHOOK_URL, {
                action: 'scheduled_hubspot_contacts',
                timestamp: new Date().toISOString(),
                source: 'casperdev-auto-trigger'
              });
            }
            
            if (trigger.type === 'system_health' && ZAPIER_WEBHOOK_URL) {
              await axios.post(ZAPIER_WEBHOOK_URL, {
                action: 'system_health_check',
                data: {
                  status: 'running',
                  integrations: integrationStatus,
                  uptime: process.uptime()
                },
                timestamp: new Date().toISOString(),
                source: 'casperdev-health-check'
              });
            }
          } catch (error) {
            console.error(`Auto-trigger error for ${trigger.type}:`, error);
          }
        }
      });

      console.log(`🔄 Zapier auto-triggers enabled with schedule: ${schedule}`);
    }

    res.json({
      status: 'success',
      message: enabled ? 'Zapier auto-triggers enabled' : 'Zapier auto-triggers disabled',
      schedule,
      triggers: triggers.length
    });

  } catch (error) {
    console.error('Zapier auto-trigger setup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to setup auto-triggers',
      error: error.message
    });
  }
});

// Helper functions for webhook processing
async function processNewLead(data) {
  try {
    // Example: Create lead in HubSpot when Zapier sends new lead
    if (hubspotClient && data.email) {
      await hubspotClient.crm.contacts.basicApi.create({
        properties: {
          email: data.email,
          firstname: data.firstName || '',
          lastname: data.lastName || '',
          hs_lead_status: 'NEW',
          lead_source: 'Zapier Integration'
        }
      });
      
      return { action: 'created_hubspot_contact', email: data.email };
    }
    
    return { action: 'logged_new_lead', data };
  } catch (error) {
    console.error('Process new lead error:', error);
    return { action: 'error', error: error.message };
  }
}

async function processContactUpdate(data) {
  try {
    // Example: Update contact in HubSpot
    if (hubspotClient && data.contactId) {
      await hubspotClient.crm.contacts.basicApi.update(data.contactId, {
        properties: data.properties || {}
      });
      
      return { action: 'updated_hubspot_contact', contactId: data.contactId };
    }
    
    return { action: 'logged_contact_update', data };
  } catch (error) {
    console.error('Process contact update error:', error);
    return { action: 'error', error: error.message };
  }
}

async function processTaskCompletion(data) {
  try {
    // Example: Send Slack notification for completed tasks
    if (slackClient && data.taskName) {
      await slackClient.chat.postMessage({
        channel: process.env.SLACK_DEFAULT_CHANNEL || '#general',
        text: `✅ Task completed via Zapier: *${data.taskName}*\n\nDetails: ${data.description || 'No additional details'}`,
        mrkdwn: true
      });
      
      return { action: 'sent_slack_notification', task: data.taskName };
    }
    
    return { action: 'logged_task_completion', data };
  } catch (error) {
    console.error('Process task completion error:', error);
    return { action: 'error', error: error.message };
  }
}

async function processSendNotification(data) {
  try {
    const results = [];
    
    // Send to Slack if configured
    if (slackClient && data.message) {
      await slackClient.chat.postMessage({
        channel: data.channel || process.env.SLACK_DEFAULT_CHANNEL || '#general',
        text: `🔔 Zapier Notification: ${data.message}`,
        mrkdwn: true
      });
      results.push('slack_sent');
    }
    
    return { action: 'notifications_sent', results };
  } catch (error) {
    console.error('Process send notification error:', error);
    return { action: 'error', error: error.message };
  }
}

module.exports = router;