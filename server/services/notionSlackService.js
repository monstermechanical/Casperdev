const { Client: NotionClient } = require('@notionhq/client');
const { WebClient } = require('@slack/web-api');
const EventEmitter = require('events');

class NotionSlackService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.notionClient = new NotionClient({ 
      auth: options.notionApiKey || process.env.NOTION_API_KEY 
    });
    
    this.slackClient = new WebClient(
      options.slackBotToken || process.env.SLACK_BOT_TOKEN
    );
    
    this.config = {
      defaultDatabaseId: options.databaseId || process.env.NOTION_DATABASE_ID,
      defaultChannel: options.defaultChannel || process.env.SLACK_DEFAULT_CHANNEL,
      triggerEmoji: options.triggerEmoji || '📝',
      syncInterval: options.syncInterval || 10, // minutes
      maxMessagesPerSync: options.maxMessagesPerSync || 20,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // milliseconds
      ...options
    };
    
    this.syncHistory = new Map(); // Track synced messages to avoid duplicates
    this.status = {
      connected: false,
      lastSync: null,
      error: null,
      syncCount: 0,
      errorCount: 0
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.testConnections();
      this.status.connected = true;
      this.emit('initialized');
      console.log('✅ NotionSlackService initialized successfully');
    } catch (error) {
      this.status.error = error.message;
      this.emit('error', error);
      console.error('❌ NotionSlackService initialization failed:', error);
    }
  }

  async testConnections() {
    try {
      // Test Notion connection
      const notionTest = await this.notionClient.users.list();
      console.log(`✅ Notion connected - ${notionTest.results.length} users`);
      
      // Test Slack connection
      const slackTest = await this.slackClient.auth.test();
      console.log(`✅ Slack connected - Team: ${slackTest.team}, Bot: ${slackTest.bot_id}`);
      
      return { notion: true, slack: true };
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async createNotionPage(pageData) {
    try {
      const { title, content, tags = [], databaseId, metadata = {} } = pageData;
      
      if (!title) {
        throw new Error('Page title is required');
      }

      const targetDatabaseId = databaseId || this.config.defaultDatabaseId;
      if (!targetDatabaseId) {
        throw new Error('Database ID is required');
      }

      const pageProperties = {
        title: {
          title: [{ text: { content: title } }]
        }
      };

      // Add tags if provided
      if (tags.length > 0) {
        pageProperties.Tags = {
          multi_select: tags.map(tag => ({ name: tag }))
        };
      }

      // Add metadata properties
      if (metadata.source) {
        pageProperties.Source = {
          select: { name: metadata.source }
        };
      }

      if (metadata.author) {
        pageProperties.Author = {
          rich_text: [{ text: { content: metadata.author } }]
        };
      }

      if (metadata.channel) {
        pageProperties.Channel = {
          select: { name: metadata.channel }
        };
      }

      const pageCreateData = {
        parent: { database_id: targetDatabaseId },
        properties: pageProperties
      };

      // Add content as blocks if provided
      if (content) {
        pageCreateData.children = this.formatContentBlocks(content);
      }

      const response = await this.notionClient.pages.create(pageCreateData);
      
      this.emit('pageCreated', response);
      return response;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  formatContentBlocks(content) {
    const blocks = [];
    
    // Split content into paragraphs
    const paragraphs = content.split('\n\n');
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim()) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: paragraph.trim() } }]
          }
        });
      }
    });

    return blocks;
  }

  async getRecentSlackMessages(channelId, timeRange = 10) {
    try {
      const oldest = Math.floor((Date.now() - timeRange * 60 * 1000) / 1000);
      
      const response = await this.slackClient.conversations.history({
        channel: channelId,
        limit: this.config.maxMessagesPerSync,
        oldest: oldest.toString()
      });

      return response.messages || [];
    } catch (error) {
      throw new Error(`Failed to fetch Slack messages: ${error.message}`);
    }
  }

  async getMessagesWithReactions(messages, targetEmoji) {
    const messagesWithReactions = [];
    
    for (const message of messages) {
      if (message.reactions && !message.bot_id) {
        const hasTargetReaction = message.reactions.some(reaction => 
          reaction.name === targetEmoji.replace(/:/g, '') || 
          reaction.name === targetEmoji
        );
        
        if (hasTargetReaction) {
          // Check if we've already synced this message
          const messageKey = `${message.user}_${message.ts}`;
          if (!this.syncHistory.has(messageKey)) {
            messagesWithReactions.push(message);
            this.syncHistory.set(messageKey, Date.now());
          }
        }
      }
    }
    
    return messagesWithReactions;
  }

  async getUserInfo(userId) {
    try {
      const response = await this.slackClient.users.info({ user: userId });
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
      const response = await this.slackClient.conversations.info({ 
        channel: channelId 
      });
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

  async syncSlackMessageToNotion(message, channelInfo, userInfo) {
    try {
      const messageDate = new Date(message.ts * 1000);
      const title = `Message from ${userInfo.name} in #${channelInfo.name}`;
      
      const content = `**From:** ${userInfo.name}\n**Channel:** #${channelInfo.name}\n**Date:** ${messageDate.toLocaleString()}\n**Message ID:** ${message.ts}\n\n${message.text}`;
      
      const pageData = {
        title: title,
        content: content,
        tags: ['slack', 'autonomous-sync', channelInfo.name],
        metadata: {
          source: 'slack',
          author: userInfo.name,
          channel: channelInfo.name
        }
      };

      const response = await this.createNotionPage(pageData);
      
      this.emit('messageSynced', { message, response });
      return response;
    } catch (error) {
      this.emit('syncError', { message, error });
      throw error;
    }
  }

  async performAutonomousSync(channelId) {
    try {
      console.log(`🔄 Starting autonomous sync for channel: ${channelId}`);
      
      // Get recent messages
      const messages = await this.getRecentSlackMessages(channelId, this.config.syncInterval);
      
      if (messages.length === 0) {
        console.log('No recent messages found');
        return { syncedCount: 0, errors: [] };
      }

      // Filter messages with target emoji reactions
      const messagesToSync = await this.getMessagesWithReactions(messages, this.config.triggerEmoji);
      
      if (messagesToSync.length === 0) {
        console.log('No messages with trigger emoji found');
        return { syncedCount: 0, errors: [] };
      }

      console.log(`📝 Found ${messagesToSync.length} messages to sync`);
      
      // Get channel info
      const channelInfo = await this.getChannelInfo(channelId);
      
      const results = [];
      const errors = [];

      // Sync each message
      for (const message of messagesToSync) {
        try {
          const userInfo = await this.getUserInfo(message.user);
          const syncResult = await this.syncSlackMessageToNotion(message, channelInfo, userInfo);
          results.push(syncResult);
          
          console.log(`✅ Synced message from ${userInfo.name}`);
        } catch (error) {
          console.error(`❌ Failed to sync message ${message.ts}:`, error.message);
          errors.push({ message: message.ts, error: error.message });
        }
      }

      // Send confirmation to Slack
      if (results.length > 0) {
        await this.sendSyncConfirmation(channelId, results.length, errors.length);
      }

      // Update status
      this.status.lastSync = new Date().toISOString();
      this.status.syncCount += results.length;
      this.status.errorCount += errors.length;

      this.emit('syncComplete', { 
        syncedCount: results.length, 
        errorCount: errors.length,
        channelId 
      });

      return { syncedCount: results.length, errors };
    } catch (error) {
      this.status.error = error.message;
      this.emit('error', error);
      throw error;
    }
  }

  async sendSyncConfirmation(channelId, syncedCount, errorCount) {
    try {
      const emoji = syncedCount > 0 ? '✅' : '⚠️';
      const message = `${emoji} **Autonomous Sync Complete**\n\n` +
        `📝 Synchronized ${syncedCount} message(s) to Notion\n` +
        (errorCount > 0 ? `❌ ${errorCount} error(s) occurred\n` : '') +
        `🕐 Sync completed at ${new Date().toLocaleString()}`;

      await this.slackClient.chat.postMessage({
        channel: channelId,
        text: message,
        mrkdwn: true
      });
    } catch (error) {
      console.error('Failed to send sync confirmation:', error.message);
    }
  }

  async queryNotionPages(databaseId, filters = {}) {
    try {
      const targetDatabaseId = databaseId || this.config.defaultDatabaseId;
      
      const queryOptions = {
        database_id: targetDatabaseId,
        page_size: filters.limit || 100,
        sorts: [
          {
            property: 'Created time',
            direction: 'descending'
          }
        ]
      };

      // Add filters if provided
      if (filters.tags && filters.tags.length > 0) {
        queryOptions.filter = {
          property: 'Tags',
          multi_select: {
            contains: filters.tags[0]
          }
        };
      }

      const response = await this.notionClient.databases.query(queryOptions);
      
      return response.results.map(page => ({
        id: page.id,
        title: page.properties.title?.title?.[0]?.text?.content || 'Untitled',
        created: page.created_time,
        url: page.url,
        tags: page.properties.Tags?.multi_select?.map(tag => tag.name) || [],
        source: page.properties.Source?.select?.name || null,
        author: page.properties.Author?.rich_text?.[0]?.text?.content || null,
        channel: page.properties.Channel?.select?.name || null
      }));
    } catch (error) {
      throw new Error(`Failed to query Notion pages: ${error.message}`);
    }
  }

  async retryOperation(operation, maxRetries = null) {
    const retries = maxRetries || this.config.retryAttempts;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        console.warn(`Attempt ${attempt} failed, retrying in ${this.config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
  }

  // Clean up old sync history to prevent memory leaks
  cleanupSyncHistory() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, timestamp] of this.syncHistory.entries()) {
      if (timestamp < cutoff) {
        this.syncHistory.delete(key);
      }
    }
  }

  getStatus() {
    return {
      ...this.status,
      syncHistorySize: this.syncHistory.size,
      uptime: process.uptime()
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down NotionSlackService...');
    this.emit('shutdown');
    this.removeAllListeners();
    console.log('✅ NotionSlackService shutdown complete');
  }
}

module.exports = NotionSlackService;