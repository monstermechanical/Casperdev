const express = require('express');
const { WebClient } = require('@slack/web-api');
const { Client } = require('@hubspot/api-client');
const Anthropic = require('@anthropic-ai/sdk');
const auth = require('../middleware/auth');
const cron = require('node-cron');
const axios = require('axios');

const router = express.Router();

// Initialize HubSpot, Slack, and Claude clients
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const claudeClient = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

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
  claude: {
    connected: false,
    lastUsed: null,
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

// Test Claude connection
router.get('/claude/test', auth, async (req, res) => {
  try {
    const testMessage = await claudeClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with a brief confirmation that the API connection is working.'
        }
      ]
    });
    
    integrationStatus.claude.connected = true;
    integrationStatus.claude.error = null;
    integrationStatus.claude.lastUsed = new Date().toISOString();
    
    res.json({
      status: 'connected',
      message: 'Claude connection successful',
      testResponse: testMessage.content[0].text,
      model: 'claude-3-haiku-20240307',
      connected: true
    });
  } catch (error) {
    integrationStatus.claude.connected = false;
    integrationStatus.claude.error = error.message;
    
    res.status(500).json({
      status: 'error',
      message: 'Claude connection failed',
      error: error.message
    });
  }
});

// Generate content with Claude
router.post('/claude/generate', auth, async (req, res) => {
  try {
    const { prompt, model = 'claude-3-haiku-20240307', maxTokens = 1000 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required'
      });
    }

    const response = await claudeClient.messages.create({
      model: model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    integrationStatus.claude.lastUsed = new Date().toISOString();
    
    res.json({
      message: 'Content generated successfully',
      response: response.content[0].text,
      model: model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Claude generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate content',
      error: error.message
    });
  }
});

// Chat with Claude
router.post('/claude/chat', auth, async (req, res) => {
  try {
    const { messages, model = 'claude-3-sonnet-20240229', maxTokens = 2000 } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      });
    }

    const response = await claudeClient.messages.create({
      model: model,
      max_tokens: maxTokens,
      messages: messages
    });

    integrationStatus.claude.lastUsed = new Date().toISOString();
    
    res.json({
      message: 'Chat response generated successfully',
      response: response.content[0].text,
      model: model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Claude chat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process chat',
      error: error.message
    });
  }
});

// Analyze data with Claude
router.post('/claude/analyze', auth, async (req, res) => {
  try {
    const { data, analysisType = 'general', context = '' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        error: 'Data is required for analysis'
      });
    }

    let prompt = '';
    switch (analysisType) {
      case 'summary':
        prompt = `Please provide a concise summary of the following data:\n\n${JSON.stringify(data, null, 2)}`;
        break;
      case 'insights':
        prompt = `Please analyze the following data and provide key insights, patterns, and recommendations:\n\n${JSON.stringify(data, null, 2)}`;
        break;
      case 'trends':
        prompt = `Please identify trends and patterns in the following data:\n\n${JSON.stringify(data, null, 2)}`;
        break;
      default:
        prompt = `${context}\n\nPlease analyze the following data:\n\n${JSON.stringify(data, null, 2)}`;
    }

    const response = await claudeClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    integrationStatus.claude.lastUsed = new Date().toISOString();
    
    res.json({
      message: 'Data analysis completed successfully',
      analysis: response.content[0].text,
      analysisType: analysisType,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Claude analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze data',
      error: error.message
    });
  }
});

// Enhance HubSpot data with Claude insights
router.post('/claude/enhance-hubspot', auth, async (req, res) => {
  try {
    const { dataType = 'contacts', limit = 5 } = req.body;
    
    let hubspotData;
    let analysisPrompt;

    if (dataType === 'contacts') {
      const contactsResponse = await hubspotClient.crm.contacts.basicApi.getPage(
        limit,
        undefined,
        ['firstname', 'lastname', 'email', 'jobtitle', 'company', 'hs_lead_status'],
        undefined,
        undefined,
        'createdate'
      );
      hubspotData = contactsResponse.results;
      analysisPrompt = 'Analyze these HubSpot contacts and provide insights about lead quality, engagement patterns, and recommendations for outreach strategies.';
    } else if (dataType === 'deals') {
      const dealsResponse = await hubspotClient.crm.deals.basicApi.getPage(
        limit,
        undefined,
        ['dealname', 'amount', 'dealstage', 'closedate', 'dealtype'],
        undefined,
        undefined,
        'createdate'
      );
      hubspotData = dealsResponse.results;
      analysisPrompt = 'Analyze these HubSpot deals and provide insights about sales performance, deal progression patterns, and recommendations for improving conversion rates.';
    } else {
      return res.status(400).json({
        error: 'Invalid dataType. Use "contacts" or "deals"'
      });
    }

    if (hubspotData.length === 0) {
      return res.json({
        message: `No ${dataType} found in HubSpot`,
        insights: 'No data available for analysis'
      });
    }

    // Format data for Claude analysis
    const formattedData = hubspotData.map(item => item.properties);

    const response = await claudeClient.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `${analysisPrompt}\n\nData:\n${JSON.stringify(formattedData, null, 2)}`
        }
      ]
    });

    integrationStatus.claude.lastUsed = new Date().toISOString();
    integrationStatus.hubspot.lastSync = new Date().toISOString();
    
    res.json({
      message: `HubSpot ${dataType} analysis completed successfully`,
      dataType: dataType,
      recordsAnalyzed: hubspotData.length,
      insights: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Claude HubSpot enhancement error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to enhance HubSpot data with Claude insights',
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

module.exports = router;