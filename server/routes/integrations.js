const express = require('express');
const { WebClient } = require('@slack/web-api');
const { Client } = require('@hubspot/api-client');
const auth = require('../middleware/auth');
const cron = require('node-cron');
const axios = require('axios');
const { sendEventToN8N, EVENT_TYPES } = require('./events');

const router = express.Router();

// Initialize HubSpot and Slack clients
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

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

    // Send event to n8n
    await sendEventToN8N(EVENT_TYPES.SLACK_NOTIFICATION, {
      channel: channel,
      message: message,
      title: title,
      sentBy: req.user.username,
      sentAt: new Date().toISOString()
    });
    
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

    // Send event to n8n
    await sendEventToN8N(EVENT_TYPES.HUBSPOT_SYNC, {
      type: 'contacts',
      contactCount: contacts.length,
      slackChannel: channel,
      syncedAt: new Date().toISOString()
    });
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