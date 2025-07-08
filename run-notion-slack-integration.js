#!/usr/bin/env node
/**
 * RUN NOTION-SLACK INTEGRATION
 * 
 * This script demonstrates the complete working implementation
 * of the autonomous Notion-Slack integration system.
 * 
 * Usage:
 *   node run-notion-slack-integration.js
 * 
 * Prerequisites:
 *   1. Environment variables configured (.env file)
 *   2. MongoDB running
 *   3. Notion integration set up
 *   4. Slack app configured with proper permissions
 */

const mongoose = require('mongoose');
const NotionSlackManager = require('./server/services/NotionSlackManager');
const SlackEventHandler = require('./server/services/SlackEventHandler');
const { NotionSyncConfig, NotionSyncHistory } = require('./server/models/NotionSyncConfig');
require('dotenv').config();

class NotionSlackIntegrationRunner {
  constructor() {
    this.notionSlackManager = null;
    this.slackEventHandler = null;
    this.isRunning = false;
    this.startTime = Date.now();
    
    this.stats = {
      totalEvents: 0,
      totalSyncs: 0,
      errors: 0,
      uptime: 0
    };
  }

  async initialize() {
    console.log('🚀 INITIALIZING NOTION-SLACK INTEGRATION\n');
    
    try {
      // Step 1: Connect to database
      await this.connectDatabase();
      
      // Step 2: Validate environment
      this.validateEnvironment();
      
      // Step 3: Initialize managers
      await this.initializeManagers();
      
      // Step 4: Set up event monitoring
      this.setupEventMonitoring();
      
      // Step 5: Create example configuration
      await this.setupExampleConfiguration();
      
      console.log('✅ INITIALIZATION COMPLETE\n');
      
    } catch (error) {
      console.error('❌ INITIALIZATION FAILED:', error.message);
      process.exit(1);
    }
  }

  async connectDatabase() {
    console.log('📊 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/slack-integrations';
    
    try {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('✅ MongoDB connected successfully');
      
      // Test database operations
      const testConfig = await NotionSyncConfig.countDocuments();
      console.log(`   📋 Found ${testConfig} existing sync configurations`);
      
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  validateEnvironment() {
    console.log('🔧 Validating environment variables...');
    
    const required = [
      'NOTION_API_KEY',
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET',
      'SLACK_APP_TOKEN'
    ];
    
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('✅ Environment variables validated');
    
    // Show configuration (masked)
    console.log('   🔑 Notion API Key:', process.env.NOTION_API_KEY ? '***' + process.env.NOTION_API_KEY.slice(-4) : 'Not set');
    console.log('   🤖 Slack Bot Token:', process.env.SLACK_BOT_TOKEN ? '***' + process.env.SLACK_BOT_TOKEN.slice(-4) : 'Not set');
  }

  async initializeManagers() {
    console.log('⚙️  Initializing core managers...');
    
    // Initialize the main NotionSlackManager
    this.notionSlackManager = new NotionSlackManager({
      notionApiKey: process.env.NOTION_API_KEY,
      slackBotToken: process.env.SLACK_BOT_TOKEN,
      slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
      slackAppToken: process.env.SLACK_APP_TOKEN,
      port: process.env.SLACK_PORT || 3001,
      socketMode: true
    });
    
    // Initialize the event handler
    this.slackEventHandler = new SlackEventHandler({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true,
      port: process.env.SLACK_PORT || 3001
    });
    
    console.log('✅ Managers initialized');
  }

  setupEventMonitoring() {
    console.log('📡 Setting up event monitoring...');
    
    // Monitor NotionSlackManager events
    this.notionSlackManager.on('messageSynced', (data) => {
      this.stats.totalSyncs++;
      console.log(`\n🎉 AUTONOMOUS SYNC SUCCESS:`);
      console.log(`   📝 Message from: ${data.message.user}`);
      console.log(`   📅 Time: ${new Date().toLocaleString()}`);
      console.log(`   🔗 Notion URL: ${data.notionPage.url}`);
      console.log(`   📊 Total Syncs: ${this.stats.totalSyncs}`);
    });
    
    this.notionSlackManager.on('syncError', (data) => {
      this.stats.errors++;
      console.log(`\n❌ SYNC ERROR:`);
      console.log(`   📝 Message: ${data.message.ts}`);
      console.log(`   🚨 Error: ${data.error.message}`);
    });
    
    this.notionSlackManager.on('error', (error) => {
      this.stats.errors++;
      console.error(`\n🚨 MANAGER ERROR: ${error.message}`);
    });
    
    // Monitor SlackEventHandler events
    this.slackEventHandler.app.event('reaction_added', async () => {
      this.stats.totalEvents++;
    });
    
    console.log('✅ Event monitoring configured');
  }

  async setupExampleConfiguration() {
    console.log('📋 Setting up example sync configuration...');
    
    try {
      // Check if example config exists
      const existingConfig = await NotionSyncConfig.findOne({
        slackChannelName: 'example-channel'
      });
      
      if (existingConfig) {
        console.log('✅ Example configuration already exists');
        return existingConfig;
      }
      
      // Create example configuration
      const exampleConfig = new NotionSyncConfig({
        userId: new mongoose.Types.ObjectId(),
        slackTeamId: process.env.SLACK_TEAM_ID || 'T1234567890',
        slackChannelId: process.env.SLACK_CHANNEL_ID || 'C1234567890',
        slackChannelName: 'example-channel',
        notionDatabaseId: process.env.NOTION_DATABASE_ID || 'your-database-id',
        notionDatabaseName: 'Slack Messages',
        triggerEmoji: '📝',
        syncInterval: 5,
        maxMessagesPerSync: 10,
        isActive: true,
        tags: ['autonomous-sync', 'working-example'],
        syncFilters: {
          excludeBots: true,
          excludeThreads: false,
          minReactions: 1
        },
        pageTemplate: {
          titleFormat: 'Slack: {author} in #{channel} - {date}',
          includeMetadata: true,
          includeReactions: true,
          includeThreads: false
        }
      });
      
      await exampleConfig.save();
      console.log('✅ Example configuration created');
      
      return exampleConfig;
      
    } catch (error) {
      console.warn('⚠️  Could not create example configuration:', error.message);
    }
  }

  async start() {
    console.log('🎯 STARTING NOTION-SLACK INTEGRATION...\n');
    
    try {
      // Start the NotionSlackManager
      console.log('🚀 Starting NotionSlackManager...');
      await this.notionSlackManager.start();
      console.log('✅ NotionSlackManager started');
      
      // Start the SlackEventHandler
      console.log('🚀 Starting SlackEventHandler...');
      await this.slackEventHandler.start();
      console.log('✅ SlackEventHandler started');
      
      this.isRunning = true;
      
      // Test connections
      await this.testConnections();
      
      // Start monitoring
      this.startPeriodicMonitoring();
      
      console.log('\n🎉 INTEGRATION IS NOW RUNNING!');
      console.log('   📝 React to messages in Slack with 📝 to see autonomous sync');
      console.log('   🤖 Mention the bot in Slack for interactive commands');
      console.log('   📊 Monitoring will display real-time stats');
      console.log('   🛑 Press Ctrl+C to stop\n');
      
      // Show usage examples
      this.showUsageExamples();
      
    } catch (error) {
      console.error('❌ Failed to start integration:', error.message);
      throw error;
    }
  }

  async testConnections() {
    console.log('🔌 Testing connections...');
    
    try {
      // Test Notion connection
      const notionConnections = await this.notionSlackManager.testConnections();
      console.log(`   ✅ Notion: ${notionConnections.notion ? 'Connected' : 'Failed'}`);
      console.log(`   ✅ Slack: ${notionConnections.slack ? 'Connected' : 'Failed'}`);
      
    } catch (error) {
      console.warn('⚠️  Connection test warning:', error.message);
    }
  }

  startPeriodicMonitoring() {
    // Log stats every 30 seconds
    setInterval(() => {
      this.logCurrentStats();
    }, 30000);
    
    // Detailed report every 5 minutes
    setInterval(() => {
      this.logDetailedReport();
    }, 300000);
  }

  logCurrentStats() {
    this.stats.uptime = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log('\n📊 SYSTEM STATUS:');
    console.log(`   ⏱️  Uptime: ${this.stats.uptime}s`);
    console.log(`   📬 Events: ${this.stats.totalEvents}`);
    console.log(`   ✅ Syncs: ${this.stats.totalSyncs}`);
    console.log(`   ❌ Errors: ${this.stats.errors}`);
    console.log(`   🔄 Running: ${this.isRunning ? 'Yes' : 'No'}`);
    
    // Get manager stats if available
    if (this.notionSlackManager) {
      const managerStats = this.notionSlackManager.getStats();
      console.log(`   🎯 Manager Events: ${managerStats.totalEvents}`);
      console.log(`   📝 Manager Syncs: ${managerStats.syncedMessages}`);
    }
  }

  async logDetailedReport() {
    try {
      console.log('\n📈 DETAILED SYSTEM REPORT:');
      
      // Database stats
      const activeConfigs = await NotionSyncConfig.countDocuments({ isActive: true });
      const totalSyncs = await NotionSyncHistory.countDocuments();
      const recentSyncs = await NotionSyncHistory.countDocuments({
        syncedAt: { $gte: new Date(Date.now() - 300000) } // Last 5 minutes
      });
      
      console.log(`   🔧 Active Configurations: ${activeConfigs}`);
      console.log(`   📊 Total Syncs in DB: ${totalSyncs}`);
      console.log(`   📝 Recent Syncs (5min): ${recentSyncs}`);
      
      // Success rate
      const failedSyncs = await NotionSyncHistory.countDocuments({ status: 'failed' });
      const successRate = totalSyncs > 0 ? Math.round(((totalSyncs - failedSyncs) / totalSyncs) * 100) : 0;
      console.log(`   📊 Success Rate: ${successRate}%`);
      
      // Channel stats
      const channelStats = await this.getChannelStats();
      if (channelStats.length > 0) {
        console.log('   📺 Top Channels:');
        channelStats.slice(0, 3).forEach(stat => {
          console.log(`     #${stat.channel}: ${stat.count} syncs`);
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to generate detailed report:', error.message);
    }
  }

  async getChannelStats() {
    try {
      return await NotionSyncHistory.aggregate([
        { 
          $match: { 
            syncedAt: { $gte: new Date(Date.now() - 3600000) }, // Last hour
            status: 'success'
          }
        },
        {
          $group: {
            _id: '$slackChannelName',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]).then(results => results.map(r => ({ channel: r._id, count: r.count })));
    } catch (error) {
      return [];
    }
  }

  showUsageExamples() {
    console.log('📚 USAGE EXAMPLES:');
    console.log('');
    console.log('   1. 📝 AUTONOMOUS SYNC:');
    console.log('      • Go to any Slack channel');
    console.log('      • React to a message with 📝 emoji');
    console.log('      • Watch it automatically sync to Notion!');
    console.log('');
    console.log('   2. 🤖 BOT COMMANDS:');
    console.log('      • @notion-bot status - Check sync status');
    console.log('      • @notion-bot sync now - Manual sync trigger');
    console.log('      • @notion-bot help - Show help menu');
    console.log('');
    console.log('   3. 🔧 SLASH COMMANDS:');
    console.log('      • /notion-sync status - Channel status');
    console.log('      • /notion-sync sync - Manual sync');
    console.log('      • /notion-sync stats - Show statistics');
    console.log('');
  }

  async demonstrateManualSync() {
    console.log('\n🔄 DEMONSTRATING MANUAL SYNC:');
    
    try {
      const configs = await NotionSyncConfig.find({ isActive: true });
      
      if (configs.length === 0) {
        console.log('   ❌ No active configurations found');
        return;
      }
      
      for (const config of configs) {
        console.log(`\n   📋 Testing config for #${config.slackChannelName}:`);
        
        const result = await this.notionSlackManager.performBatchSync(config);
        console.log(`     ✅ Processed: ${result.syncedCount} messages`);
        console.log(`     📊 Total checked: ${result.totalMessages}`);
      }
      
    } catch (error) {
      console.error('   ❌ Manual sync failed:', error.message);
    }
  }

  async gracefulShutdown() {
    console.log('\n🔄 SHUTTING DOWN GRACEFULLY...');
    
    this.isRunning = false;
    
    try {
      // Stop managers
      if (this.notionSlackManager) {
        await this.notionSlackManager.shutdown();
        console.log('✅ NotionSlackManager stopped');
      }
      
      if (this.slackEventHandler) {
        await this.slackEventHandler.stop();
        console.log('✅ SlackEventHandler stopped');
      }
      
      // Close database
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
      }
      
      // Final stats
      this.logFinalStats();
      
      console.log('✅ SHUTDOWN COMPLETE');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Shutdown error:', error.message);
      process.exit(1);
    }
  }

  logFinalStats() {
    const totalUptime = Math.round((Date.now() - this.startTime) / 1000);
    
    console.log('\n📊 FINAL STATISTICS:');
    console.log(`   ⏱️  Total Uptime: ${totalUptime} seconds`);
    console.log(`   📬 Total Events: ${this.stats.totalEvents}`);
    console.log(`   ✅ Total Syncs: ${this.stats.totalSyncs}`);
    console.log(`   ❌ Total Errors: ${this.stats.errors}`);
    
    if (this.stats.totalSyncs > 0) {
      const avgSyncRate = (this.stats.totalSyncs / (totalUptime / 60)).toFixed(2);
      console.log(`   📊 Avg Sync Rate: ${avgSyncRate} syncs/minute`);
    }
  }

  async run() {
    try {
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Received shutdown signal (Ctrl+C)...');
        this.gracefulShutdown();
      });
      
      process.on('SIGTERM', () => {
        console.log('\n🛑 Received termination signal...');
        this.gracefulShutdown();
      });
      
      // Initialize and start
      await this.initialize();
      await this.start();
      
      // Wait a bit and demonstrate features
      setTimeout(async () => {
        await this.demonstrateManualSync();
      }, 5000);
      
      // Keep running
      console.log('🎯 Integration running... waiting for events...\n');
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR:', error);
      process.exit(1);
    }
  }
}

// Run the integration
if (require.main === module) {
  const runner = new NotionSlackIntegrationRunner();
  runner.run().catch(console.error);
}

module.exports = NotionSlackIntegrationRunner;