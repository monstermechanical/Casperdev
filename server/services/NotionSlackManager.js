const { Client: NotionClient } = require('@notionhq/client');
const { WebClient } = require('@slack/web-api');
const { App } = require('@slack/bolt');
const EventEmitter = require('events');
const cron = require('node-cron');
const { NotionSyncConfig, NotionSyncHistory } = require('../models/NotionSyncConfig');

class NotionSlackManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      notionApiKey: options.notionApiKey || process.env.NOTION_API_KEY,
      slackBotToken: options.slackBotToken || process.env.SLACK_BOT_TOKEN,
      slackSigningSecret: options.slackSigningSecret || process.env.SLACK_SIGNING_SECRET,
      slackAppToken: options.slackAppToken || process.env.SLACK_APP_TOKEN,
      port: options.port || process.env.SLACK_PORT || 3001,
      socketMode: options.socketMode !== false,
      ...options
    };
    
    // Initialize clients
    this.notionClient = new NotionClient({ auth: this.config.notionApiKey });
    this.slackWebClient = new WebClient(this.config.slackBotToken);
    
    // Initialize Slack app
    this.slackApp = new App({
      token: this.config.slackBotToken,
      signingSecret: this.config.slackSigningSecret,
      socketMode: this.config.socketMode,
      appToken: this.config.slackAppToken,
      port: this.config.port
    });
    
    // State management
    this.isRunning = false;
    this.syncJobs = new Map();
    this.processedMessages = new Set();
    
    // Statistics
    this.stats = {
      totalEvents: 0,
      reactionEvents: 0,
      syncedMessages: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    this.setupEventHandlers();
    this.setupCleanupTasks();
  }

  setupEventHandlers() {
    // Handle reaction added events
    this.slackApp.event('reaction_added', async ({ event, client, logger }) => {
      try {
        this.stats.totalEvents++;
        this.stats.reactionEvents++;
        
        await this.handleReactionAdded(event, client, logger);
      } catch (error) {
        this.stats.errors++;
        logger.error('Error handling reaction_added:', error);
        this.emit('error', error);
      }
    });

    // Handle app mentions
    this.slackApp.event('app_mention', async ({ event, client, logger }) => {
      try {
        await this.handleAppMention(event, client, logger);
      } catch (error) {
        logger.error('Error handling app_mention:', error);
        this.emit('error', error);
      }
    });

    // Handle errors
    this.slackApp.error(async (error) => {
      this.stats.errors++;
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
    
    try {
      // Find active sync configurations for this channel
      const syncConfigs = await NotionSyncConfig.find({
        slackChannelId: item.channel,
        isActive: true
      });
      
      if (syncConfigs.length === 0) {
        logger.info(`No active sync configurations for channel ${item.channel}`);
        return;
      }

      // Check if any config matches this emoji
      const matchingConfigs = syncConfigs.filter(config => 
        this.isMatchingEmoji(reaction, config.triggerEmoji)
      );

      if (matchingConfigs.length === 0) {
        logger.info(`No matching trigger emoji for reaction: ${reaction}`);
        return;
      }

      // Get message details
      const messageInfo = await this.getMessageInfo(item.channel, item.ts);
      if (!messageInfo) {
        logger.error(`Could not retrieve message info for ${item.ts}`);
        return;
      }

      // Skip if message already processed
      const messageKey = `${item.channel}_${item.ts}`;
      if (this.processedMessages.has(messageKey)) {
        logger.info(`Message ${item.ts} already processed`);
        return;
      }

      // Process sync for each matching configuration
      for (const config of matchingConfigs) {
        await this.processSyncForMessage(config, messageInfo, event);
      }

      // Mark message as processed
      this.processedMessages.add(messageKey);
      
    } catch (error) {
      logger.error('Error processing reaction:', error);
      throw error;
    }
  }

  async handleAppMention(event, client, logger) {
    const { channel, user, text, ts } = event;
    
    logger.info(`App mentioned in channel ${channel} by user ${user}`);
    
    try {
      if (text.includes('status')) {
        await this.sendStatusMessage(channel, ts);
      } else if (text.includes('sync now')) {
        await this.triggerManualSync(channel, ts);
      } else {
        await this.sendHelpMessage(channel, ts);
      }
    } catch (error) {
      logger.error('Error responding to app mention:', error);
    }
  }

  async sendStatusMessage(channel, threadTs) {
    const configs = await NotionSyncConfig.find({ slackChannelId: channel, isActive: true });
    const recentSyncs = await NotionSyncHistory.find({ slackChannelId: channel })
      .sort({ syncedAt: -1 })
      .limit(5);

    const statusText = `📊 **Notion Sync Status**\n\n` +
      `Active Configurations: ${configs.length}\n` +
      `Recent Syncs: ${recentSyncs.length}\n` +
      `Total Events: ${this.stats.totalEvents}\n` +
      `Synced Messages: ${this.stats.syncedMessages}\n` +
      `Uptime: ${Math.round((Date.now() - this.stats.startTime) / 1000 / 60)} minutes`;

    await this.slackWebClient.chat.postMessage({
      channel: channel,
      thread_ts: threadTs,
      text: statusText,
      mrkdwn: true
    });
  }

  async sendHelpMessage(channel, threadTs) {
    const helpText = `🤖 **Notion Sync Bot**\n\n` +
      `React to messages with configured emojis to save them to Notion!\n\n` +
      `**Commands:**\n` +
      `• \`@notion-bot status\` - Check sync status\n` +
      `• \`@notion-bot sync now\` - Trigger manual sync\n` +
      `• \`@notion-bot help\` - Show this help`;

    await this.slackWebClient.chat.postMessage({
      channel: channel,
      thread_ts: threadTs,
      text: helpText,
      mrkdwn: true
    });
  }

  async triggerManualSync(channel, threadTs) {
    try {
      const configs = await NotionSyncConfig.find({ slackChannelId: channel, isActive: true });
      
      if (configs.length === 0) {
        await this.slackWebClient.chat.postMessage({
          channel: channel,
          thread_ts: threadTs,
          text: '❌ No active sync configurations found for this channel'
        });
        return;
      }

      let totalSynced = 0;
      for (const config of configs) {
        const result = await this.performBatchSync(config);
        totalSynced += result.syncedCount;
      }

      await this.slackWebClient.chat.postMessage({
        channel: channel,
        thread_ts: threadTs,
        text: `✅ Manual sync complete! Processed ${totalSynced} messages.`
      });
    } catch (error) {
      await this.slackWebClient.chat.postMessage({
        channel: channel,
        thread_ts: threadTs,
        text: `❌ Manual sync failed: ${error.message}`
      });
    }
  }

  async getMessageInfo(channelId, messageTs) {
    try {
      const response = await this.slackWebClient.conversations.history({
        channel: channelId,
        latest: messageTs,
        limit: 1,
        inclusive: true
      });

      return response.messages && response.messages.length > 0 ? response.messages[0] : null;
    } catch (error) {
      console.error('Error getting message info:', error);
      return null;
    }
  }

  async processSyncForMessage(config, messageInfo, reactionEvent) {
    try {
      // Check if already synced
      const existingSync = await NotionSyncHistory.findOne({
        slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
        slackMessageTimestamp: messageInfo.ts,
        syncConfigId: config._id
      });

      if (existingSync) {
        console.log(`Message ${messageInfo.ts} already synced for config ${config._id}`);
        return;
      }

      // Get user and channel info
      const [userInfo, channelInfo] = await Promise.all([
        this.getUserInfo(messageInfo.user),
        this.getChannelInfo(config.slackChannelId)
      ]);

      // Create sync history record
      const syncHistory = new NotionSyncHistory({
        syncConfigId: config._id,
        slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
        slackMessageTimestamp: messageInfo.ts,
        slackUserId: messageInfo.user,
        slackUserName: userInfo.name,
        slackChannelId: config.slackChannelId,
        slackChannelName: channelInfo.name,
        messageText: messageInfo.text || '',
        messageReactions: messageInfo.reactions || [],
        status: 'pending'
      });

      await syncHistory.save();

      // Sync to Notion
      const startTime = Date.now();
      const notionPage = await this.createNotionPage(config, messageInfo, userInfo, channelInfo);

      // Update sync history with success
      syncHistory.status = 'success';
      syncHistory.notionPageId = notionPage.id;
      syncHistory.notionPageUrl = notionPage.url;
      syncHistory.notionPageTitle = this.formatPageTitle(config, userInfo, channelInfo);
      syncHistory.syncDuration = Date.now() - startTime;
      syncHistory.syncedAt = new Date();
      await syncHistory.save();

      // Update config stats
      config.totalMessagesSynced += 1;
      config.lastSync = new Date();
      await config.save();

      this.stats.syncedMessages++;
      
      console.log(`✅ Successfully synced message ${messageInfo.ts} to Notion`);
      this.emit('messageSynced', { config, message: messageInfo, notionPage });

      // Send confirmation to channel
      await this.sendSyncConfirmation(config.slackChannelId, userInfo.name, notionPage.url);

    } catch (error) {
      console.error(`❌ Failed to sync message ${messageInfo.ts}:`, error);
      
      // Update sync history with error
      await NotionSyncHistory.updateOne(
        {
          slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
          slackMessageTimestamp: messageInfo.ts,
          syncConfigId: config._id
        },
        {
          status: 'failed',
          error: {
            message: error.message,
            code: error.code,
            details: error.stack
          }
        }
      );

      // Update config error count
      config.totalErrors += 1;
      await config.save();

      this.emit('syncError', { config, message: messageInfo, error });
    }
  }

  async createNotionPage(config, messageInfo, userInfo, channelInfo) {
    const messageDate = new Date(parseFloat(messageInfo.ts) * 1000);
    const title = this.formatPageTitle(config, userInfo, channelInfo);
    
    const contentBlocks = [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `From: ${userInfo.name}` },
              annotations: { bold: true }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Channel: #${channelInfo.name}` },
              annotations: { bold: true }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Date: ${messageDate.toLocaleString()}` },
              annotations: { bold: true }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'divider',
        divider: {}
      }
    ];

    // Add message content
    if (messageInfo.text) {
      const messageParagraphs = messageInfo.text.split('\n').filter(p => p.trim());
      messageParagraphs.forEach(paragraph => {
        contentBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content: paragraph }
              }
            ]
          }
        });
      });
    }

    // Add reactions if present
    if (messageInfo.reactions && messageInfo.reactions.length > 0) {
      contentBlocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });

      const reactionsText = messageInfo.reactions
        .map(reaction => `${reaction.name} (${reaction.count})`)
        .join(', ');

      contentBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `Reactions: ${reactionsText}` },
              annotations: { italic: true }
            }
          ]
        }
      });
    }

    const pageData = {
      parent: { database_id: config.notionDatabaseId },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        },
        Tags: {
          multi_select: [
            { name: 'slack' },
            { name: 'autonomous-sync' },
            { name: channelInfo.name },
            ...config.tags.map(tag => ({ name: tag }))
          ]
        }
      },
      children: contentBlocks
    };

    // Add additional properties if they exist in the database
    if (config.pageTemplate.includeMetadata) {
      pageData.properties.Source = { select: { name: 'slack' } };
      pageData.properties.Author = { 
        rich_text: [{ text: { content: userInfo.name } }] 
      };
      pageData.properties.Channel = { 
        select: { name: channelInfo.name } 
      };
    }

    return await this.notionClient.pages.create(pageData);
  }

  async getUserInfo(userId) {
    try {
      const response = await this.slackWebClient.users.info({ user: userId });
      return {
        id: userId,
        name: response.user.display_name || response.user.real_name || 'Unknown User',
        email: response.user.profile?.email || null,
        avatar: response.user.profile?.image_72 || null
      };
    } catch (error) {
      console.warn(`Failed to get user info for ${userId}:`, error.message);
      return { id: userId, name: 'Unknown User', email: null, avatar: null };
    }
  }

  async getChannelInfo(channelId) {
    try {
      const response = await this.slackWebClient.conversations.info({ channel: channelId });
      return {
        id: channelId,
        name: response.channel.name || 'unknown',
        isPrivate: response.channel.is_private || false
      };
    } catch (error) {
      console.warn(`Failed to get channel info for ${channelId}:`, error.message);
      return { id: channelId, name: 'unknown', isPrivate: false };
    }
  }

  formatPageTitle(config, userInfo, channelInfo) {
    const template = config.pageTemplate?.titleFormat || 'Message from {author} in #{channel}';
    return template
      .replace('{author}', userInfo.name)
      .replace('{channel}', channelInfo.name)
      .replace('{date}', new Date().toLocaleDateString());
  }

  async sendSyncConfirmation(channelId, userName, notionUrl) {
    try {
      await this.slackWebClient.chat.postMessage({
        channel: channelId,
        text: `📝 Message from ${userName} has been saved to Notion!`,
        attachments: [
          {
            color: 'good',
            text: `<${notionUrl}|View in Notion>`,
            mrkdwn_in: ['text']
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send sync confirmation:', error);
    }
  }

  isMatchingEmoji(reaction, triggerEmoji) {
    // Handle different emoji formats
    const cleanReaction = reaction.replace(/:/g, '');
    const cleanTrigger = triggerEmoji.replace(/:/g, '');
    
    return cleanReaction === cleanTrigger || 
           `:${cleanReaction}:` === triggerEmoji ||
           cleanReaction === triggerEmoji;
  }

  async performBatchSync(config) {
    try {
      const messages = await this.getRecentMessages(config.slackChannelId, config.syncInterval);
      const messagesToSync = messages.filter(msg => 
        msg.reactions && 
        msg.reactions.some(reaction => this.isMatchingEmoji(reaction.name, config.triggerEmoji)) &&
        !msg.bot_id
      );

      let syncedCount = 0;
      for (const message of messagesToSync) {
        try {
          await this.processSyncForMessage(config, message, null);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync message ${message.ts}:`, error);
        }
      }

      return { syncedCount, totalMessages: messages.length };
    } catch (error) {
      console.error('Batch sync error:', error);
      return { syncedCount: 0, totalMessages: 0 };
    }
  }

  async getRecentMessages(channelId, timeRangeMinutes = 60) {
    try {
      const oldest = Math.floor((Date.now() - timeRangeMinutes * 60 * 1000) / 1000);
      
      const response = await this.slackWebClient.conversations.history({
        channel: channelId,
        oldest: oldest.toString(),
        limit: 100
      });

      return response.messages || [];
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  setupCleanupTasks() {
    // Clean up processed messages cache every hour
    cron.schedule('0 * * * *', () => {
      if (this.processedMessages.size > 1000) {
        this.processedMessages.clear();
        console.log('Cleaned up processed messages cache');
      }
    });

    // Clean up old sync history every day
    cron.schedule('0 2 * * *', async () => {
      try {
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const result = await NotionSyncHistory.deleteMany({
          syncedAt: { $lt: cutoffDate },
          status: 'success'
        });
        console.log(`Cleaned up ${result.deletedCount} old sync history records`);
      } catch (error) {
        console.error('Error cleaning up sync history:', error);
      }
    });
  }

  async start() {
    try {
      if (this.isRunning) {
        console.log('NotionSlackManager is already running');
        return;
      }

      // Test connections
      await this.testConnections();
      
      // Start Slack app
      await this.slackApp.start();
      this.isRunning = true;
      
      console.log(`⚡️ NotionSlackManager started on port ${this.config.port}`);
      this.emit('started');
    } catch (error) {
      console.error('Failed to start NotionSlackManager:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (!this.isRunning) {
        console.log('NotionSlackManager is not running');
        return;
      }

      await this.slackApp.stop();
      this.isRunning = false;
      
      console.log('🛑 NotionSlackManager stopped');
      this.emit('stopped');
    } catch (error) {
      console.error('Failed to stop NotionSlackManager:', error);
      this.emit('error', error);
    }
  }

  async testConnections() {
    try {
      // Test Notion
      const notionUsers = await this.notionClient.users.list();
      console.log(`✅ Notion connected - ${notionUsers.results.length} users`);
      
      // Test Slack
      const slackAuth = await this.slackWebClient.auth.test();
      console.log(`✅ Slack connected - Team: ${slackAuth.team}, Bot: ${slackAuth.bot_id}`);
      
      return { notion: true, slack: true };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime: Date.now() - this.stats.startTime,
      processedMessagesCount: this.processedMessages.size,
      activeConfigs: this.syncJobs.size
    };
  }

  async shutdown() {
    try {
      console.log('🔄 Shutting down NotionSlackManager...');
      
      await this.stop();
      this.removeAllListeners();
      
      console.log('✅ NotionSlackManager shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      console.error('Error during shutdown:', error);
      this.emit('error', error);
    }
  }
}

module.exports = NotionSlackManager;