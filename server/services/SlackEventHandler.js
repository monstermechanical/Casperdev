const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const { NotionSyncConfig, NotionSyncHistory } = require('../models/NotionSyncConfig');
const NotionSlackManager = require('./NotionSlackManager');

/**
 * SlackEventHandler - Handles real-time Slack events
 * 
 * This class demonstrates the core event processing functionality
 * that powers the autonomous Notion-Slack integration.
 */
class SlackEventHandler {
  constructor(options = {}) {
    this.config = {
      token: options.token || process.env.SLACK_BOT_TOKEN,
      signingSecret: options.signingSecret || process.env.SLACK_SIGNING_SECRET,
      socketMode: options.socketMode || true,
      appToken: options.appToken || process.env.SLACK_APP_TOKEN,
      port: options.port || 3001,
      ...options
    };

    this.app = new App({
      token: this.config.token,
      signingSecret: this.config.signingSecret,
      socketMode: this.config.socketMode,
      appToken: this.config.appToken,
      port: this.config.port
    });

    this.webClient = new WebClient(this.config.token);
    this.notionManager = new NotionSlackManager();
    
    // Event statistics
    this.eventStats = {
      totalEvents: 0,
      reactionEvents: 0,
      messageEvents: 0,
      processedReactions: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      startTime: Date.now()
    };

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // ===========================================
    // REAL-TIME REACTION EVENT HANDLER
    // ===========================================
    this.app.event('reaction_added', async ({ event, client, logger }) => {
      this.eventStats.totalEvents++;
      this.eventStats.reactionEvents++;
      
      console.log(`\n🎯 REACTION EVENT RECEIVED:`);
      console.log(`   📝 Emoji: ${event.reaction}`);
      console.log(`   👤 User: ${event.user}`);
      console.log(`   📍 Channel: ${event.item.channel}`);
      console.log(`   ⏰ Timestamp: ${event.item.ts}`);
      
      try {
        await this.handleReactionAdded(event, client, logger);
      } catch (error) {
        this.eventStats.failedSyncs++;
        logger.error('❌ Reaction handling failed:', error);
      }
    });

    // ===========================================
    // MESSAGE EVENT HANDLER
    // ===========================================
    this.app.event('message', async ({ event, client, logger }) => {
      this.eventStats.totalEvents++;
      this.eventStats.messageEvents++;
      
      // Only log non-bot messages to avoid spam
      if (!event.bot_id && !event.subtype) {
        console.log(`\n📨 MESSAGE EVENT: ${event.user} in ${event.channel}`);
      }
    });

    // ===========================================
    // APP MENTION HANDLER
    // ===========================================
    this.app.event('app_mention', async ({ event, client, logger }) => {
      console.log(`\n🤖 APP MENTION: ${event.user} mentioned the bot`);
      
      await this.handleAppMention(event, client, logger);
    });

    // ===========================================
    // ERROR HANDLER
    // ===========================================
    this.app.error(async (error) => {
      console.error(`\n🚨 SLACK APP ERROR: ${error.message}`);
      if (error.code === 'ECONNRESET') {
        console.log('🔄 Connection reset, will attempt to reconnect...');
      }
    });

    // ===========================================
    // SHORTCUT HANDLERS (for interactive features)
    // ===========================================
    this.app.shortcut('sync_to_notion', async ({ shortcut, ack, client, logger }) => {
      await ack();
      console.log(`\n⚡ SHORTCUT TRIGGERED: sync_to_notion by ${shortcut.user.id}`);
      
      // Handle shortcut to sync specific messages
      await this.handleSyncShortcut(shortcut, client, logger);
    });

    // ===========================================
    // SLASH COMMAND HANDLERS
    // ===========================================
    this.app.command('/notion-sync', async ({ command, ack, respond, client, logger }) => {
      await ack();
      
      console.log(`\n🔧 SLASH COMMAND: /notion-sync ${command.text}`);
      await this.handleSyncCommand(command, respond, client, logger);
    });
  }

  /**
   * Core reaction handling logic
   */
  async handleReactionAdded(event, client, logger) {
    const { reaction, item, user, event_ts } = event;
    
    // Only process message reactions
    if (item.type !== 'message') {
      logger.info('⏭️ Skipping non-message reaction');
      return;
    }

    // Find active sync configurations for this channel
    const syncConfigs = await NotionSyncConfig.find({
      slackChannelId: item.channel,
      isActive: true
    });

    if (syncConfigs.length === 0) {
      logger.info(`⏭️ No active sync configs for channel ${item.channel}`);
      return;
    }

    console.log(`   🔍 Found ${syncConfigs.length} active sync config(s)`);

    // Check if any config matches this emoji
    const matchingConfigs = syncConfigs.filter(config => 
      this.isMatchingEmoji(reaction, config.triggerEmoji)
    );

    if (matchingConfigs.length === 0) {
      logger.info(`⏭️ No matching trigger emoji for: ${reaction}`);
      return;
    }

    console.log(`   ✅ Found ${matchingConfigs.length} matching config(s)`);

    // Get the actual message content
    const messageInfo = await this.getMessageInfo(item.channel, item.ts);
    if (!messageInfo) {
      logger.error(`❌ Could not retrieve message info for ${item.ts}`);
      return;
    }

    console.log(`   📝 Message content: "${messageInfo.text?.substring(0, 50)}..."`);

    // Process sync for each matching configuration
    for (const config of matchingConfigs) {
      try {
        await this.processSyncForConfig(config, messageInfo, event);
        this.eventStats.processedReactions++;
        this.eventStats.successfulSyncs++;
        
        console.log(`   ✅ Successfully processed sync for config ${config._id}`);
      } catch (error) {
        this.eventStats.failedSyncs++;
        logger.error(`❌ Failed to process sync for config ${config._id}:`, error);
      }
    }
  }

  /**
   * Process sync for a specific configuration
   */
  async processSyncForConfig(config, messageInfo, reactionEvent) {
    console.log(`\n🔄 PROCESSING SYNC:`);
    console.log(`   📋 Config: ${config._id}`);
    console.log(`   📝 Message: ${messageInfo.ts}`);
    console.log(`   🎯 Trigger: ${config.triggerEmoji}`);

    // Check if already synced
    const existingSync = await NotionSyncHistory.findOne({
      slackMessageId: messageInfo.client_msg_id || messageInfo.ts,
      slackMessageTimestamp: messageInfo.ts,
      syncConfigId: config._id
    });

    if (existingSync) {
      console.log(`   ⏭️ Already synced (existing record found)`);
      return;
    }

    // Get user and channel information
    const [userInfo, channelInfo] = await Promise.all([
      this.getUserInfo(messageInfo.user),
      this.getChannelInfo(config.slackChannelId)
    ]);

    console.log(`   👤 User: ${userInfo.name}`);
    console.log(`   📺 Channel: #${channelInfo.name}`);

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
    console.log(`   💾 Created sync history record`);

    // Perform the actual sync to Notion
    const startTime = Date.now();
    
    try {
      const notionPage = await this.notionManager.createNotionPage(
        config, 
        messageInfo, 
        userInfo, 
        channelInfo
      );

      // Update sync history with success
      syncHistory.status = 'success';
      syncHistory.notionPageId = notionPage.id;
      syncHistory.notionPageUrl = notionPage.url;
      syncHistory.notionPageTitle = `Message from ${userInfo.name} in #${channelInfo.name}`;
      syncHistory.syncDuration = Date.now() - startTime;
      syncHistory.syncedAt = new Date();

      await syncHistory.save();

      // Update config statistics
      config.totalMessagesSynced += 1;
      config.lastSync = new Date();
      await config.save();

      console.log(`   ✅ Synced to Notion in ${syncHistory.syncDuration}ms`);
      console.log(`   🔗 Notion URL: ${notionPage.url}`);

      // Send confirmation to Slack
      await this.sendSyncConfirmation(
        config.slackChannelId,
        userInfo.name,
        notionPage.url,
        messageInfo.ts
      );

    } catch (error) {
      // Update sync history with error
      syncHistory.status = 'failed';
      syncHistory.error = {
        message: error.message,
        code: error.code,
        details: error.stack
      };
      await syncHistory.save();

      // Update config error count
      config.totalErrors += 1;
      await config.save();

      throw error;
    }
  }

  /**
   * Handle app mentions
   */
  async handleAppMention(event, client, logger) {
    const { channel, user, text, ts } = event;
    
    try {
      let response;
      
      if (text.includes('status')) {
        response = await this.generateStatusMessage(channel);
      } else if (text.includes('sync now')) {
        response = await this.triggerManualSync(channel);
      } else if (text.includes('stats')) {
        response = this.generateStatsMessage();
      } else {
        response = this.generateHelpMessage();
      }

      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: response,
        mrkdwn: true
      });

    } catch (error) {
      logger.error('Failed to handle app mention:', error);
    }
  }

  /**
   * Handle sync shortcuts (interactive features)
   */
  async handleSyncShortcut(shortcut, client, logger) {
    try {
      // This would be triggered by a Slack shortcut
      console.log(`🔄 Processing sync shortcut for user ${shortcut.user.id}`);
      
      // Implementation would depend on specific shortcut requirements
      await client.chat.postMessage({
        channel: shortcut.channel.id,
        text: `🎯 Sync shortcut triggered! Processing...`,
        user: shortcut.user.id
      });
      
    } catch (error) {
      logger.error('Failed to handle sync shortcut:', error);
    }
  }

  /**
   * Handle slash commands
   */
  async handleSyncCommand(command, respond, client, logger) {
    try {
      const args = command.text.split(' ');
      const action = args[0];
      
      switch (action) {
        case 'status':
          const status = await this.generateStatusMessage(command.channel_id);
          await respond(status);
          break;
          
        case 'sync':
          const result = await this.triggerManualSync(command.channel_id);
          await respond(result);
          break;
          
        case 'stats':
          const stats = this.generateStatsMessage();
          await respond(stats);
          break;
          
        default:
          await respond(this.generateHelpMessage());
      }
      
    } catch (error) {
      logger.error('Failed to handle slash command:', error);
      await respond('❌ Command failed. Please try again.');
    }
  }

  /**
   * Helper methods
   */
  async getMessageInfo(channelId, messageTs) {
    try {
      const response = await this.webClient.conversations.history({
        channel: channelId,
        latest: messageTs,
        limit: 1,
        inclusive: true
      });

      return response.messages && response.messages.length > 0 
        ? response.messages[0] 
        : null;
    } catch (error) {
      console.error('Error getting message info:', error);
      return null;
    }
  }

  async getUserInfo(userId) {
    try {
      const response = await this.webClient.users.info({ user: userId });
      return {
        id: userId,
        name: response.user.display_name || response.user.real_name || 'Unknown User',
        email: response.user.profile?.email || null
      };
    } catch (error) {
      console.warn(`Failed to get user info for ${userId}:`, error.message);
      return { id: userId, name: 'Unknown User', email: null };
    }
  }

  async getChannelInfo(channelId) {
    try {
      const response = await this.webClient.conversations.info({ channel: channelId });
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

  isMatchingEmoji(reaction, triggerEmoji) {
    const cleanReaction = reaction.replace(/:/g, '');
    const cleanTrigger = triggerEmoji.replace(/:/g, '');
    
    return cleanReaction === cleanTrigger || 
           `:${cleanReaction}:` === triggerEmoji ||
           cleanReaction === triggerEmoji;
  }

  async sendSyncConfirmation(channelId, userName, notionUrl, threadTs) {
    try {
      await this.webClient.chat.postMessage({
        channel: channelId,
        thread_ts: threadTs,
        text: `✅ Message from ${userName} has been saved to Notion!`,
        attachments: [
          {
            color: 'good',
            text: `<${notionUrl}|🔗 View in Notion>`,
            mrkdwn_in: ['text']
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send sync confirmation:', error);
    }
  }

  async generateStatusMessage(channelId) {
    try {
      const configs = await NotionSyncConfig.find({ 
        slackChannelId: channelId, 
        isActive: true 
      });
      
      const recentSyncs = await NotionSyncHistory.find({ 
        slackChannelId: channelId 
      }).sort({ syncedAt: -1 }).limit(5);

      return `📊 **Notion Sync Status**\n\n` +
             `🔧 Active Configurations: ${configs.length}\n` +
             `📝 Recent Syncs: ${recentSyncs.length}\n` +
             `⏱️ Total Events: ${this.eventStats.totalEvents}\n` +
             `✅ Successful Syncs: ${this.eventStats.successfulSyncs}\n` +
             `❌ Failed Syncs: ${this.eventStats.failedSyncs}\n` +
             `🔄 Uptime: ${Math.round((Date.now() - this.eventStats.startTime) / 1000 / 60)} minutes`;
    } catch (error) {
      return `❌ Failed to generate status: ${error.message}`;
    }
  }

  async triggerManualSync(channelId) {
    try {
      const configs = await NotionSyncConfig.find({ 
        slackChannelId: channelId, 
        isActive: true 
      });

      if (configs.length === 0) {
        return '❌ No active sync configurations found for this channel';
      }

      let totalSynced = 0;
      for (const config of configs) {
        const result = await this.notionManager.performBatchSync(config);
        totalSynced += result.syncedCount;
      }

      return `✅ Manual sync complete! Processed ${totalSynced} messages.`;
    } catch (error) {
      return `❌ Manual sync failed: ${error.message}`;
    }
  }

  generateStatsMessage() {
    const uptime = Math.round((Date.now() - this.eventStats.startTime) / 1000 / 60);
    const successRate = this.eventStats.successfulSyncs + this.eventStats.failedSyncs > 0 
      ? Math.round((this.eventStats.successfulSyncs / (this.eventStats.successfulSyncs + this.eventStats.failedSyncs)) * 100)
      : 0;

    return `📈 **Event Processing Stats**\n\n` +
           `📊 Total Events: ${this.eventStats.totalEvents}\n` +
           `🎯 Reaction Events: ${this.eventStats.reactionEvents}\n` +
           `📨 Message Events: ${this.eventStats.messageEvents}\n` +
           `⚡ Processed Reactions: ${this.eventStats.processedReactions}\n` +
           `✅ Successful Syncs: ${this.eventStats.successfulSyncs}\n` +
           `❌ Failed Syncs: ${this.eventStats.failedSyncs}\n` +
           `📊 Success Rate: ${successRate}%\n` +
           `⏱️ Uptime: ${uptime} minutes`;
  }

  generateHelpMessage() {
    return `🤖 **Notion Sync Bot Commands**\n\n` +
           `📝 React to messages with configured emojis to sync to Notion\n\n` +
           `**Commands:**\n` +
           `• \`@notion-bot status\` - Check sync status\n` +
           `• \`@notion-bot sync now\` - Trigger manual sync\n` +
           `• \`@notion-bot stats\` - Show processing statistics\n` +
           `• \`@notion-bot help\` - Show this help\n\n` +
           `**Slash Commands:**\n` +
           `• \`/notion-sync status\` - Channel status\n` +
           `• \`/notion-sync sync\` - Manual sync\n` +
           `• \`/notion-sync stats\` - Statistics`;
  }

  /**
   * Start the event handler
   */
  async start() {
    try {
      console.log('🚀 Starting Slack Event Handler...');
      
      await this.app.start();
      
      console.log(`✅ Slack Event Handler is now running on port ${this.config.port}`);
      console.log(`🎯 Listening for events with socket mode: ${this.config.socketMode}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to start Slack Event Handler:', error);
      throw error;
    }
  }

  /**
   * Stop the event handler
   */
  async stop() {
    try {
      console.log('🛑 Stopping Slack Event Handler...');
      
      await this.app.stop();
      
      console.log('✅ Slack Event Handler stopped');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop Slack Event Handler:', error);
      throw error;
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.eventStats,
      uptime: Date.now() - this.eventStats.startTime
    };
  }
}

module.exports = SlackEventHandler;