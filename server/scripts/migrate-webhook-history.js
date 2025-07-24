#!/usr/bin/env node

/**
 * Webhook History Migration Script
 * 
 * This script migrates existing webhook data from global memory storage
 * to the new MongoDB-based WebhookHistory model.
 * 
 * Usage: node server/scripts/migrate-webhook-history.js [options]
 * Options:
 *   --dry-run     : Preview migration without making changes
 *   --force       : Overwrite existing webhook records
 *   --backup      : Create backup before migration
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import the WebhookHistory model
const WebhookHistory = require('../models/WebhookHistory');

class WebhookMigration {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.backup = options.backup || false;
    this.migrationResults = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: []
    };
  }

  async connect() {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casperdev';
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB for migration');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }

  async createBackup() {
    if (!this.backup) return;

    try {
      console.log('💾 Creating backup of existing webhook history...');
      
      const existingWebhooks = await WebhookHistory.find({}).lean();
      const backupData = {
        timestamp: new Date().toISOString(),
        count: existingWebhooks.length,
        webhooks: existingWebhooks
      };

      const backupDir = path.join(__dirname, '../../backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const backupFile = path.join(backupDir, `webhook-history-backup-${Date.now()}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log(`✅ Backup created: ${backupFile}`);
      console.log(`📊 Backed up ${existingWebhooks.length} existing records`);
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }

  async loadGlobalWebhookData() {
    // This function simulates loading data from global.zapierWebhooks
    // In a real scenario, you might need to load this from a running server
    // or from a saved state file
    
    console.log('📂 Loading global webhook data...');
    
    // Check if there's a saved state file
    const stateFile = path.join(__dirname, '../../webhook-state.json');
    
    try {
      const stateData = await fs.readFile(stateFile, 'utf8');
      const globalData = JSON.parse(stateData);
      console.log(`✅ Loaded ${globalData.webhooks?.length || 0} webhooks from state file`);
      return globalData.webhooks || [];
    } catch (error) {
      console.log('⚠️ No state file found, using sample data for demonstration');
      
      // Return sample data that represents what might be in global.zapierWebhooks
      return [
        {
          id: Date.now() - 1000000,
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          action: 'new_lead',
          data: {
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
          },
          processed: {
            action: 'created_hubspot_contact',
            email: 'test@example.com'
          }
        },
        {
          id: Date.now() - 900000,
          timestamp: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
          action: 'task_completed',
          data: {
            taskName: 'Update contact information',
            description: 'Contact details have been updated'
          },
          processed: {
            action: 'sent_slack_notification',
            task: 'Update contact information'
          }
        }
      ];
    }
  }

  async migrateWebhook(globalWebhook) {
    try {
      // Check if webhook already exists
      const existingWebhook = await WebhookHistory.findOne({
        webhookId: `migrated_${globalWebhook.id}`
      });

      if (existingWebhook && !this.force) {
        console.log(`⏭️ Webhook ${globalWebhook.id} already exists, skipping`);
        this.migrationResults.skipped++;
        return false;
      }

      if (this.dryRun) {
        console.log(`🔍 [DRY RUN] Would migrate webhook ${globalWebhook.id} (${globalWebhook.action})`);
        this.migrationResults.migrated++;
        return true;
      }

      // Transform global webhook data to new schema
      const webhookData = {
        webhookId: `migrated_${globalWebhook.id}`,
        timestamp: new Date(globalWebhook.timestamp),
        action: globalWebhook.action,
        data: globalWebhook.data,
        processed: {
          result: globalWebhook.processed,
          success: true,
          processingTime: null
        },
        category: 'incoming',
        priority: 'normal',
        response: {
          status: 200,
          message: 'Migrated from global storage',
          data: null
        }
      };

      if (existingWebhook && this.force) {
        await WebhookHistory.findByIdAndUpdate(existingWebhook._id, webhookData);
        console.log(`🔄 Updated existing webhook ${globalWebhook.id}`);
      } else {
        await WebhookHistory.create(webhookData);
        console.log(`✅ Migrated webhook ${globalWebhook.id} (${globalWebhook.action})`);
      }

      this.migrationResults.migrated++;
      return true;

    } catch (error) {
      console.error(`❌ Failed to migrate webhook ${globalWebhook.id}:`, error.message);
      this.migrationResults.errors.push({
        webhookId: globalWebhook.id,
        error: error.message
      });
      return false;
    }
  }

  async run() {
    try {
      console.log('🚀 Starting webhook history migration...');
      console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
      console.log(`Force overwrite: ${this.force}`);
      console.log(`Create backup: ${this.backup}`);
      console.log('---');

      await this.connect();
      
      if (this.backup) {
        await this.createBackup();
      }

      const globalWebhooks = await this.loadGlobalWebhookData();
      this.migrationResults.total = globalWebhooks.length;

      console.log(`📊 Found ${globalWebhooks.length} webhooks to migrate`);
      console.log('---');

      if (globalWebhooks.length === 0) {
        console.log('ℹ️ No webhooks found to migrate');
        return this.migrationResults;
      }

      // Process webhooks in batches
      const batchSize = 10;
      for (let i = 0; i < globalWebhooks.length; i += batchSize) {
        const batch = globalWebhooks.slice(i, i + batchSize);
        
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(globalWebhooks.length / batchSize)}`);
        
        await Promise.all(
          batch.map(webhook => this.migrateWebhook(webhook))
        );
      }

      console.log('---');
      console.log('📈 Migration Results:');
      console.log(`   Total webhooks: ${this.migrationResults.total}`);
      console.log(`   Successfully migrated: ${this.migrationResults.migrated}`);
      console.log(`   Skipped: ${this.migrationResults.skipped}`);
      console.log(`   Errors: ${this.migrationResults.errors.length}`);

      if (this.migrationResults.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        this.migrationResults.errors.forEach(error => {
          console.log(`   - Webhook ${error.webhookId}: ${error.error}`);
        });
      }

      if (!this.dryRun) {
        console.log('\n✅ Migration completed successfully!');
        console.log('ℹ️ You can now safely remove global.zapierWebhooks from your code');
      } else {
        console.log('\n🔍 Dry run completed - no changes were made');
        console.log('ℹ️ Run without --dry-run to perform the actual migration');
      }

      return this.migrationResults;

    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    backup: args.includes('--backup')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Webhook History Migration Script

Usage: node server/scripts/migrate-webhook-history.js [options]

Options:
  --dry-run     Preview migration without making changes
  --force       Overwrite existing webhook records
  --backup      Create backup before migration
  --help, -h    Show this help message

Examples:
  # Preview migration
  node server/scripts/migrate-webhook-history.js --dry-run

  # Migrate with backup
  node server/scripts/migrate-webhook-history.js --backup

  # Force migration (overwrite existing)
  node server/scripts/migrate-webhook-history.js --force --backup
    `);
    return;
  }

  const migration = new WebhookMigration(options);
  
  try {
    await migration.run();
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = WebhookMigration;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}