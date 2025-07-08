const express = require('express');
const { WebClient } = require('@slack/web-api');
const { Client } = require('@hubspot/api-client');
const { Client: NotionClient } = require('@notionhq/client');
const auth = require('../middleware/auth');
const { 
  asyncHandler, 
  validateSyncConfig, 
  rateLimiter,
  ConfigNotFoundError,
  ServiceUnavailableError 
} = require('../middleware/errorHandler');
const cron = require('node-cron');
const axios = require('axios');

// Import new services and models
const NotionSlackManager = require('../services/NotionSlackManager');
const { NotionSyncConfig, NotionSyncHistory } = require('../models/NotionSyncConfig');

const router = express.Router();

// Initialize HubSpot, Slack, and Notion clients
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const notionClient = new NotionClient({ auth: process.env.NOTION_API_KEY });

// Initialize Notion-Slack Manager
let notionSlackManager = null;

// Initialize services on module load
(async () => {
  try {
    notionSlackManager = new NotionSlackManager({
      notionApiKey: process.env.NOTION_API_KEY,
      slackBotToken: process.env.SLACK_BOT_TOKEN,
      slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
      slackAppToken: process.env.SLACK_APP_TOKEN,
      port: process.env.SLACK_PORT || 3001
    });
    
    // Set up event listeners
    notionSlackManager.on('messageSynced', (data) => {
      console.log(`✅ Message synced to Notion: ${data.notionPage.id}`);
    });
    
    notionSlackManager.on('syncError', (data) => {
      console.error(`❌ Sync error: ${data.error.message}`);
    });
    
    // Start the manager
    await notionSlackManager.start();
    
    console.log('✅ NotionSlackManager initialized and started');
  } catch (error) {
    console.error('❌ Failed to initialize NotionSlackManager:', error);
  }
})();

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
  notion: {
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

// Test Notion connection
router.get('/notion/test', auth, async (req, res) => {
  try {
    const usersList = await notionClient.users.list();
    integrationStatus.notion.connected = true;
    integrationStatus.notion.error = null;
    
    res.json({
      status: 'connected',
      message: 'Notion connection successful',
      workspaceInfo: {
        userCount: usersList.results.length,
        connected: true
      }
    });
  } catch (error) {
    integrationStatus.notion.connected = false;
    integrationStatus.notion.error = error.message;
    
    res.status(500).json({
      status: 'error',
      message: 'Notion connection failed',
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

// Create a new page in Notion
router.post('/notion/create-page', auth, async (req, res) => {
  try {
    const { title, content, databaseId, parentPageId, tags = [] } = req.body;
    
    if (!title) {
      return res.status(400).json({
        error: 'Title is required'
      });
    }

    const pageData = {
      parent: databaseId 
        ? { database_id: databaseId }
        : { page_id: parentPageId || process.env.NOTION_DEFAULT_PAGE_ID },
      properties: {
        title: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      }
    };

    // Add tags if provided and if it's a database
    if (databaseId && tags.length > 0) {
      pageData.properties.Tags = {
        multi_select: tags.map(tag => ({ name: tag }))
      };
    }

    // Add content as children blocks if provided
    if (content) {
      pageData.children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content
                }
              }
            ]
          }
        }
      ];
    }

    const response = await notionClient.pages.create(pageData);
    integrationStatus.notion.lastSync = new Date().toISOString();
    
    res.json({
      message: 'Page created successfully',
      pageId: response.id,
      url: response.url
    });
  } catch (error) {
    console.error('Notion create page error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create page',
      error: error.message
    });
  }
});

// Get pages from Notion database
router.get('/notion/pages', auth, async (req, res) => {
  try {
    const { databaseId = process.env.NOTION_DATABASE_ID, limit = 10 } = req.query;
    
    if (!databaseId) {
      return res.status(400).json({
        error: 'Database ID is required'
      });
    }

    const response = await notionClient.databases.query({
      database_id: databaseId,
      page_size: parseInt(limit),
      sorts: [
        {
          property: 'Created time',
          direction: 'descending'
        }
      ]
    });

    const pages = response.results.map(page => ({
      id: page.id,
      title: page.properties.title?.title?.[0]?.text?.content || 'Untitled',
      created: page.created_time,
      url: page.url,
      tags: page.properties.Tags?.multi_select?.map(tag => tag.name) || []
    }));

    res.json({
      pages: pages,
      totalCount: response.results.length,
      hasMore: response.has_more
    });
  } catch (error) {
    console.error('Notion get pages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get pages',
      error: error.message
    });
  }
});

// Send Slack message to Notion
router.post('/slack-to-notion', auth, async (req, res) => {
  try {
    const { slackMessage, channelName, userName, title, databaseId, slackChannel } = req.body;
    
    if (!slackMessage) {
      return res.status(400).json({
        error: 'Slack message is required'
      });
    }

    const pageTitle = title || `Message from ${userName || 'Slack'} in #${channelName || 'unknown'}`;
    const pageContent = `**From:** ${userName || 'Unknown User'}\n**Channel:** #${channelName || 'unknown'}\n**Date:** ${new Date().toLocaleString()}\n\n${slackMessage}`;

    // Create page in Notion
    const response = await notionClient.pages.create({
      parent: { database_id: databaseId || process.env.NOTION_DATABASE_ID },
      properties: {
        title: {
          title: [
            {
              text: {
                content: pageTitle
              }
            }
          ]
        },
        Tags: {
          multi_select: [
            { name: 'slack' },
            { name: channelName || 'unknown-channel' }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: pageContent
                }
              }
            ]
          }
        }
      ]
    });

    // Send confirmation to Slack if channel is provided
    if (slackChannel) {
      await slackClient.chat.postMessage({
        channel: slackChannel,
        text: `📝 *Message saved to Notion*\n\nOriginal message from ${userName}: "${slackMessage.substring(0, 100)}${slackMessage.length > 100 ? '...' : ''}"\n\n✅ Saved to Notion database at ${new Date().toLocaleString()}`,
        mrkdwn: true
      });
    }

    integrationStatus.notion.lastSync = new Date().toISOString();
    
    res.json({
      message: 'Message saved to Notion successfully',
      pageId: response.id,
      url: response.url
    });
  } catch (error) {
    console.error('Slack to Notion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save message to Notion',
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

// Enhanced Notion-Slack Integration Endpoints

// Create sync configuration
router.post('/notion/sync-config', auth, validateSyncConfig, rateLimiter(5, 300000), asyncHandler(async (req, res) => {
  const {
    slackTeamId,
    slackChannelId,
    slackChannelName,
    notionDatabaseId,
    notionDatabaseName,
    triggerEmoji = '📝',
    syncInterval = 10,
    maxMessagesPerSync = 20,
    tags = [],
    syncFilters = {},
    pageTemplate = {}
  } = req.body;

  // Check if configuration already exists
  const existingConfig = await NotionSyncConfig.findOne({
    userId: req.user.id,
    slackChannelId: slackChannelId
  });

  if (existingConfig) {
    return res.status(409).json({
      error: 'Sync configuration already exists for this channel'
    });
  }

  // Create new sync configuration
  const syncConfig = new NotionSyncConfig({
    userId: req.user.id,
    slackTeamId,
    slackChannelId,
    slackChannelName,
    notionDatabaseId,
    notionDatabaseName,
    triggerEmoji,
    syncInterval,
    maxMessagesPerSync,
    tags,
    syncFilters,
    pageTemplate
  });

  await syncConfig.save();

  res.status(201).json({
    message: 'Sync configuration created successfully',
    config: syncConfig
  });
}));

// Get sync configurations
router.get('/notion/sync-configs', auth, async (req, res) => {
  try {
    const { channelId } = req.query;
    
    let query = { userId: req.user.id };
    if (channelId) {
      query.slackChannelId = channelId;
    }

    const configs = await NotionSyncConfig.find(query)
      .sort({ createdAt: -1 });

    res.json({
      configs: configs,
      total: configs.length
    });
  } catch (error) {
    console.error('Get sync configs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync configurations',
      error: error.message
    });
  }
});

// Update sync configuration
router.put('/notion/sync-config/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const syncConfig = await NotionSyncConfig.findOne({
      _id: id,
      userId: req.user.id
    });

    if (!syncConfig) {
      return res.status(404).json({
        error: 'Sync configuration not found'
      });
    }

    // Update configuration
    Object.assign(syncConfig, updates);
    await syncConfig.save();

    res.json({
      message: 'Sync configuration updated successfully',
      config: syncConfig
    });
  } catch (error) {
    console.error('Update sync config error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update sync configuration',
      error: error.message
    });
  }
});

// Delete sync configuration
router.delete('/notion/sync-config/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const syncConfig = await NotionSyncConfig.findOneAndDelete({
      _id: id,
      userId: req.user.id
    });

    if (!syncConfig) {
      return res.status(404).json({
        error: 'Sync configuration not found'
      });
    }

    res.json({
      message: 'Sync configuration deleted successfully'
    });
  } catch (error) {
    console.error('Delete sync config error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete sync configuration',
      error: error.message
    });
  }
});

// Get sync history
router.get('/notion/sync-history', auth, async (req, res) => {
  try {
    const { configId, status, limit = 50, offset = 0 } = req.query;

    let query = {};
    
    if (configId) {
      // Verify user owns the config
      const config = await NotionSyncConfig.findOne({
        _id: configId,
        userId: req.user.id
      });
      
      if (!config) {
        return res.status(404).json({
          error: 'Sync configuration not found'
        });
      }
      
      query.syncConfigId = configId;
    } else {
      // Get all configs for user
      const userConfigs = await NotionSyncConfig.find({ userId: req.user.id });
      query.syncConfigId = { $in: userConfigs.map(c => c._id) };
    }

    if (status) {
      query.status = status;
    }

    const history = await NotionSyncHistory.find(query)
      .sort({ syncedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('syncConfigId', 'slackChannelName notionDatabaseName triggerEmoji');

    const total = await NotionSyncHistory.countDocuments(query);

    res.json({
      history: history,
      pagination: {
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get sync history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync history',
      error: error.message
    });
  }
});

// Get sync statistics
router.get('/notion/sync-stats', auth, async (req, res) => {
  try {
    const { configId } = req.query;

    let matchQuery = {};
    
    if (configId) {
      // Verify user owns the config
      const config = await NotionSyncConfig.findOne({
        _id: configId,
        userId: req.user.id
      });
      
      if (!config) {
        return res.status(404).json({
          error: 'Sync configuration not found'
        });
      }
      
      matchQuery.syncConfigId = configId;
    } else {
      // Get all configs for user
      const userConfigs = await NotionSyncConfig.find({ userId: req.user.id });
      matchQuery.syncConfigId = { $in: userConfigs.map(c => c._id) };
    }

    const stats = await NotionSyncHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$syncDuration' }
        }
      }
    ]);

    const totalSyncs = stats.reduce((sum, stat) => sum + stat.count, 0);
    const successfulSyncs = stats.find(s => s._id === 'success')?.count || 0;
    const failedSyncs = stats.find(s => s._id === 'failed')?.count || 0;

    res.json({
      totalSyncs: totalSyncs,
      successfulSyncs: successfulSyncs,
      failedSyncs: failedSyncs,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0,
      avgSyncDuration: stats.find(s => s._id === 'success')?.avgDuration || 0,
      breakdown: stats
    });
  } catch (error) {
    console.error('Get sync stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync statistics',
      error: error.message
    });
  }
});

// Trigger manual sync
router.post('/notion/sync/trigger', auth, async (req, res) => {
  try {
    const { configId, channelId } = req.body;

    if (!notionSlackManager || !notionSlackManager.isRunning) {
      return res.status(503).json({
        error: 'Notion-Slack manager not available'
      });
    }

    let result;
    
    if (configId) {
      // Verify user owns the config
      const config = await NotionSyncConfig.findOne({
        _id: configId,
        userId: req.user.id
      });
      
      if (!config) {
        return res.status(404).json({
          error: 'Sync configuration not found'
        });
      }
      
      result = await notionSlackManager.performBatchSync(config);
    } else if (channelId) {
      // Find configs for this channel
      const configs = await NotionSyncConfig.find({ 
        slackChannelId: channelId, 
        userId: req.user.id, 
        isActive: true 
      });
      
      if (configs.length === 0) {
        return res.status(404).json({
          error: 'No active sync configurations found for this channel'
        });
      }
      
      let totalSynced = 0;
      const results = [];
      
      for (const config of configs) {
        const configResult = await notionSlackManager.performBatchSync(config);
        totalSynced += configResult.syncedCount;
        results.push({ configId: config._id, ...configResult });
      }
      
      result = { syncedCount: totalSynced, results };
    } else {
      return res.status(400).json({
        error: 'Either configId or channelId is required'
      });
    }

    res.json({
      message: 'Manual sync triggered',
      result: result
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger manual sync',
      error: error.message
    });
  }
});

// Get service status
router.get('/notion/service-status', auth, async (req, res) => {
  try {
    const status = {
      notionSlackManager: notionSlackManager ? notionSlackManager.getStats() : null,
      integration: integrationStatus,
      timestamp: new Date().toISOString()
    };

    // Add connection status
    if (notionSlackManager) {
      try {
        const connections = await notionSlackManager.testConnections();
        status.connections = connections;
      } catch (error) {
        status.connections = { error: error.message };
      }
    }

    res.json(status);
  } catch (error) {
    console.error('Get service status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get service status',
      error: error.message
    });
  }
});

// Enable autonomous Slack to Notion sync (legacy endpoint - kept for backward compatibility)
router.post('/notion/auto-sync/enable', auth, async (req, res) => {
  try {
    const { 
      slackChannel = process.env.SLACK_DEFAULT_CHANNEL, 
      databaseId = process.env.NOTION_DATABASE_ID,
      triggerEmoji = '📝',
      syncInterval = 10 // minutes
    } = req.body;
    
    if (!databaseId) {
      return res.status(400).json({
        error: 'Notion database ID is required'
      });
    }

    // Create or update sync configuration
    const slackChannelId = slackChannel.replace('#', '');
    
    let syncConfig = await NotionSyncConfig.findOne({
      userId: req.user.id,
      slackChannelId: slackChannelId
    });

    if (syncConfig) {
      // Update existing configuration
      syncConfig.triggerEmoji = triggerEmoji;
      syncConfig.syncInterval = syncInterval;
      syncConfig.notionDatabaseId = databaseId;
      syncConfig.isActive = true;
      await syncConfig.save();
    } else {
      // Create new configuration
      syncConfig = new NotionSyncConfig({
        userId: req.user.id,
        slackTeamId: 'default', // This should be obtained from Slack API
        slackChannelId: slackChannelId,
        slackChannelName: slackChannel,
        notionDatabaseId: databaseId,
        triggerEmoji: triggerEmoji,
        syncInterval: syncInterval
      });
      await syncConfig.save();
    }

    res.json({
      message: 'Autonomous Slack-to-Notion sync enabled successfully',
      configuration: {
        configId: syncConfig._id,
        slackChannel: slackChannel,
        databaseId: databaseId,
        triggerEmoji: triggerEmoji,
        syncInterval: `Every ${syncInterval} minutes`
      }
    });
  } catch (error) {
    console.error('Autonomous sync enable error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to enable autonomous sync',
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

// Helper function for autonomous Slack-to-Notion sync
async function autonomousSlackToNotionSync(channel, databaseId, triggerEmoji) {
  try {
    // Get recent messages from Slack channel
    const messagesResponse = await slackClient.conversations.history({
      channel: channel,
      limit: 20,
      oldest: Math.floor((Date.now() - 10 * 60 * 1000) / 1000) // Last 10 minutes
    });

    const messages = messagesResponse.messages || [];
    
    // Filter messages that have the trigger emoji reaction
    const messagesToSync = [];
    
    for (const message of messages) {
      if (message.reactions) {
        const hasTargetReaction = message.reactions.some(reaction => 
          reaction.name === triggerEmoji.replace(/:/g, '') || reaction.name === triggerEmoji
        );
        
        if (hasTargetReaction && !message.bot_id) {
          messagesToSync.push(message);
        }
      }
    }

    if (messagesToSync.length === 0) {
      console.log('No messages with trigger emoji found for sync');
      return;
    }

    // Sync each message to Notion
    for (const message of messagesToSync) {
      try {
        // Get user info for the message author
        const userInfo = await slackClient.users.info({ user: message.user });
        const userName = userInfo.user.display_name || userInfo.user.real_name || 'Unknown User';

        const pageTitle = `Slack Message from ${userName}`;
        const pageContent = `**From:** ${userName}\n**Channel:** #${channel}\n**Date:** ${new Date(message.ts * 1000).toLocaleString()}\n**Reactions:** ${triggerEmoji}\n\n${message.text}`;

        await notionClient.pages.create({
          parent: { database_id: databaseId },
          properties: {
            title: {
              title: [
                {
                  text: {
                    content: pageTitle
                  }
                }
              ]
            },
            Tags: {
              multi_select: [
                { name: 'slack' },
                { name: 'autonomous-sync' },
                { name: channel }
              ]
            }
          },
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: pageContent
                    }
                  }
                ]
              }
            }
          ]
        });

        console.log(`✅ Synced message from ${userName} to Notion`);
      } catch (error) {
        console.error(`Failed to sync message ${message.ts}:`, error);
      }
    }

    // Send confirmation to Slack
    if (messagesToSync.length > 0) {
      await slackClient.chat.postMessage({
        channel: channel,
        text: `🤖 *Autonomous Sync Complete*\n\n✅ Synchronized ${messagesToSync.length} message(s) with ${triggerEmoji} reaction to Notion\n\n_Sync completed at ${new Date().toLocaleString()}_`,
        mrkdwn: true
      });
    }

    integrationStatus.notion.lastSync = new Date().toISOString();
  } catch (error) {
    console.error('Autonomous sync error:', error);
  }
}

module.exports = router;