const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const EventEmitter = require('events');
const { NotionSyncConfig, NotionSyncHistory } = require('../models/NotionSyncConfig');
const NotionSlackService = require('./notionSlackService');

class SlackEventListener extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      signingSecret: options.signingSecret || process.env.SLACK_SIGNING_SECRET,
      botToken: options.botToken || process.env.SLACK_BOT_TOKEN,
      appToken: options.appToken || process.env.SLACK_APP_TOKEN,
      port: options.port || process.env.SLACK_PORT || 3001,
      socketMode: options.socketMode || false,
      ...options
    };
    
    this.slackApp = null;
    this.webClient = null;
    this.notionService = null;
    this.isListening = false;
    
    // Event tracking
    this.eventStats = {
      totalEvents: 0,
      reactionEvents: 0,
      messageEvents: 0,
      errors: 0,
      processedReactions: 0
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Slack app
      this.slackApp = new App({
        token: this.config.botToken,
        signingSecret: this.config.signingSecret,
        socketMode: this.config.socketMode,
        appToken: this.config.appToken,
        port: this.config.port
      });

      // Initialize web client
      this.webClient = new WebClient(this.config.botToken);
      
      // Initialize Notion service
      this.notionService = new NotionSlackService({
        slackBotToken: this.config.botToken
      });

      // Set up event listeners
      this.setupEventListeners();
      
      console.log('✅ SlackEventListener initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ SlackEventListener initialization failed:', error);
      this.emit('error', error);
    }
  }

  setupEventListeners() {
    // Listen for reaction added events
    this.slackApp.event('reaction_added', async ({ event, client, logger }) => {
      try {
        this.eventStats.totalEvents++;
        this.eventStats.reactionEvents++;
        
        await this.handleReactionAdded(event, client, logger);
      } catch (error) {
        this.eventStats.errors++;
        logger.error('Error handling reaction_added event:', error);
        this.emit('error', error);
      }
    });

    // Listen for reaction removed events
    this.slackApp.event('reaction_removed', async ({ event, client, logger }) => {
      try {
        this.eventStats.totalEvents++;
        this.eventStats.reactionEvents++;
        
        await this.handleReactionRemoved(event, client, logger);
      } catch (error) {
        this.eventStats.errors++;
        logger.error('Error handling reaction_removed event:', error);
        this.emit('error', error);
      }
    });

    // Listen for message events
    this.slackApp.event('message', async ({ event, client, logger }) => {
      try {
        this.eventStats.totalEvents++;
        this.eventStats.messageEvents++;
        
        await this.handleMessage(event, client, logger);
      } catch (error) {
        this.eventStats.errors++;
        logger.error('Error handling message event:', error);
        this.emit('error', error);
      }
    });

    // Listen for app mentions
    this.slackApp.event('app_mention', async ({ event, client, logger }) => {
      try {
        await this.handleAppMention(event, client, logger);
      } catch (error) {
        logger.error('Error handling app_mention event:', error);
        this.emit('error', error);
      }
    });

    // Error handling
    this.slackApp.error(async (error) => {
      this.eventStats.errors++;
      console.error('Slack app error:', error);
      this.emit('error', error);
    });
  }

  async handleReactionAdded(event, client, logger) {
    const { reaction, item, user } = event;
    
    // Only handle message reactions
    if (item.type !== 'message') {
      return;
    }

    logger.info(`Reaction added: ${reaction} by ${user} on message ${item.ts} in channel ${item.channel}`);
    
    // Find sync configurations for this channel
    const syncConfigs = await NotionSyncConfig.findByChannel(item.channel);
    
    if (syncConfigs.length === 0) {
      logger.info(`No sync configurations found for channel ${item.channel}`);
      return;
    }

    // Check if any config has this emoji as trigger
    const matchingConfigs = syncConfigs.filter(config => 
      config.triggerEmoji === reaction || 
      config.triggerEmoji === `:${reaction}:`
    );

    if (matchingConfigs.length === 0) {
      logger.info(`No matching trigger emoji found for reaction: ${reaction}`);
      return;
    }

    // Get the message details
    const messageInfo = await this.getMessageInfo(item.channel, item.ts);
    if (!messageInfo) {
      logger.error(`Could not retrieve message info for ${item.ts}`);
      return;
    }

    // Process sync for each matching configuration
    for (const config of matchingConfigs) {
      try {
        await this.processSyncForMessage(config, messageInfo, event);
        this.eventStats.processedReactions++;
      } catch (error) {
        logger.error(`Failed to process sync for config ${config._id}:`, error);
      }
    }
  }

  async handleReactionRemoved(event, client, logger) {
    const { reaction, item, user } = event;
    
    logger.info(`Reaction removed: ${reaction} by ${user} on message ${item.ts} in channel ${item.channel}`);
    
    // Optional: Handle reaction removal logic
    // This could be used to remove pages from Notion if needed
    this.emit('reactionRemoved', { reaction, item, user });
  }

  async handleMessage(event, client, logger) {
    const { channel, user, text, ts } = event;
    
    // Skip bot messages
    if (event.bot_id) {
      return;
    }

    logger.info(`Message received in channel ${channel} from user ${user}: ${text?.substring(0, 100)}...`);
    
    // Emit message event for potential processing
    this.emit('messageReceived', { channel, user, text, ts });
  }

  async handleAppMention(event, client, logger) {
    const { channel, user, text, ts } = event;
    
    logger.info(`App mentioned in channel ${channel} by user ${user}: ${text}`);
    
    // Respond to app mentions with help information
    try {
      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: `Hello! I'm your Notion sync bot. React to messages with 📝 to save them to Notion automatically.\n\n` +
              `Commands:\n` +
              `• \`@notion-bot status\` - Check sync status\n` +
              `• \`@notion-bot help\` - Show this help message\n` +
              `• \`@notion-bot sync now\` - Trigger manual sync`
      });
    } catch (error) {
      logger.error('Failed to respond to app mention:', error);
    }
  }

  async getMessageInfo(channelId, messageTs) {
    try {
      const response = await this.webClient.conversations.history({
        channel: channelId,
        latest: messageTs,
        limit: 1,
        inclusive: true
      });

      if (response.messages && response.messages.length > 0) {
        return response.messages[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting message info:', error);
      return null;
    }
  }

  async processSyncForMessage(config, messageInfo, reactionEvent) {
    try {
      // Check if message has already been synced
      const existingSync = await NotionSyncHistory.findOne({
        slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
        slackMessageTimestamp: messageInfo.ts,
        syncConfigId: config._id
      });

      if (existingSync) {
        console.log(`Message ${messageInfo.ts} already synced, skipping`);
        return;
      }

      // Get user and channel info
      const userInfo = await this.notionService.getUserInfo(messageInfo.user);
      const channelInfo = await this.notionService.getChannelInfo(config.slackChannelId);

      // Create sync history entry
      const syncHistory = new NotionSyncHistory({
        syncConfigId: config._id,
        slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
        slackMessageTimestamp: messageInfo.ts,
        slackUserId: messageInfo.user,
        slackUserName: userInfo.name,
        slackChannelId: config.slackChannelId,
        slackChannelName: channelInfo.name,
        messageText: messageInfo.text,
        messageReactions: messageInfo.reactions || [],
        status: 'pending'
      });

      await syncHistory.save();

      // Sync to Notion
      const syncStartTime = Date.now();
      const notionPage = await this.notionService.syncSlackMessageToNotion(
        messageInfo, 
        channelInfo, 
        userInfo
      );

      // Update sync history with success
      syncHistory.status = 'success';
      syncHistory.notionPageId = notionPage.id;
      syncHistory.notionPageUrl = notionPage.url;
      syncHistory.notionPageTitle = `Message from ${userInfo.name} in #${channelInfo.name}`;
      syncHistory.syncDuration = Date.now() - syncStartTime;
      syncHistory.syncedAt = new Date();

      await syncHistory.save();

      // Update config statistics
      await config.incrementSyncCount();

      console.log(`✅ Successfully synced message ${messageInfo.ts} to Notion`);
      
      // Emit success event
      this.emit('messageSynced', {
        config: config,
        message: messageInfo,
        notionPage: notionPage,
        syncHistory: syncHistory
      });

    } catch (error) {
      console.error(`❌ Failed to sync message ${messageInfo.ts}:`, error);
      
      // Update sync history with error
      try {
        const syncHistory = await NotionSyncHistory.findOne({
          slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
          slackMessageTimestamp: messageInfo.ts,
          syncConfigId: config._id
        });

        if (syncHistory) {
          syncHistory.status = 'failed';
          syncHistory.error = {
            message: error.message,
            code: error.code,
            details: error.stack
          };
          await syncHistory.save();
        }

        // Update config error count
        await config.incrementErrorCount();
      } catch (updateError) {
        console.error('Failed to update sync history with error:', updateError);
      }

      // Emit error event
      this.emit('syncError', {
        config: config,
        message: messageInfo,
        error: error
      });
    }
  }

  async startListening() {
    try {
      if (this.isListening) {
        console.log('SlackEventListener is already listening');
        return;
      }

      await this.slackApp.start();
      this.isListening = true;
      
      console.log(`⚡️ SlackEventListener started on port ${this.config.port}`);
      this.emit('listening');
    } catch (error) {
      console.error('Failed to start SlackEventListener:', error);
      this.emit('error', error);
    }
  }

  async stopListening() {
    try {
      if (!this.isListening) {
        console.log('SlackEventListener is not listening');
        return;
      }

      await this.slackApp.stop();
      this.isListening = false;
      
      console.log('🛑 SlackEventListener stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('Failed to stop SlackEventListener:', error);
      this.emit('error', error);
    }
  }

  getStats() {
    return {
      ...this.eventStats,
      isListening: this.isListening,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  async getChannelSyncStatus(channelId) {
    try {
      const configs = await NotionSyncConfig.findByChannel(channelId);
      const histories = await Promise.all(
        configs.map(config => NotionSyncHistory.findRecentSyncs(config._id, 5))
      );

      return {
        channelId: channelId,
        activeConfigs: configs.length,
        configs: configs,
        recentSyncs: histories.flat().sort((a, b) => b.syncedAt - a.syncedAt)
      };
    } catch (error) {
      console.error('Error getting channel sync status:', error);
      return null;
    }
  }

  async triggerManualSync(channelId) {
    try {
      const configs = await NotionSyncConfig.findByChannel(channelId);
      
      if (configs.length === 0) {
        return { success: false, message: 'No sync configurations found for this channel' };
      }

      const results = [];
      
      for (const config of configs) {
        try {
          const result = await this.notionService.performAutonomousSync(channelId);
          results.push({ configId: config._id, result });
        } catch (error) {
          results.push({ configId: config._id, error: error.message });
        }
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async shutdown() {
    try {
      console.log('🔄 Shutting down SlackEventListener...');
      
      await this.stopListening();
      
      if (this.notionService) {
        await this.notionService.shutdown();
      }
      
      this.removeAllListeners();
      
      console.log('✅ SlackEventListener shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      console.error('Error during SlackEventListener shutdown:', error);
      this.emit('error', error);
    }
  }
}

module.exports = SlackEventListener;