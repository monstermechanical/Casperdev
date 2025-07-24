const mongoose = require('mongoose');
const WebhookHistory = require('../models/WebhookHistory');

/**
 * Migration script to move webhook history from global array to persistent storage
 * This script can be run once during the deployment of the new webhook system
 */

async function migrateWebhookHistory() {
  try {
    console.log('🔄 Starting webhook history migration...');
    
    // Check if there's any existing global webhook data
    if (global.zapierWebhooks && Array.isArray(global.zapierWebhooks) && global.zapierWebhooks.length > 0) {
      console.log(`📦 Found ${global.zapierWebhooks.length} existing webhooks in global array`);
      
      const migrationPromises = global.zapierWebhooks.map(async (webhook, index) => {
        try {
          await WebhookHistory.create({
            webhookId: webhook.id ? `legacy_${webhook.id}` : `legacy_${Date.now()}_${index}`,
            source: 'zapier',
            action: webhook.action || 'unknown',
            data: webhook.data || {},
            processed: webhook.processed || { migrated: true },
            status: 'success',
            createdAt: webhook.timestamp ? new Date(webhook.timestamp) : new Date()
          });
          return true;
        } catch (error) {
          console.warn(`⚠️  Failed to migrate webhook ${index}:`, error.message);
          return false;
        }
      });
      
      const results = await Promise.allSettled(migrationPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      const failed = results.length - successful;
      
      console.log(`✅ Migration completed: ${successful} successful, ${failed} failed`);
      
      // Clear the global array after successful migration
      if (successful > 0) {
        global.zapierWebhooks = [];
        console.log('🧹 Cleared global webhook array');
      }
      
    } else {
      console.log('ℹ️  No existing webhook data found in global array');
    }
    
    // Display current database stats
    const totalWebhooks = await WebhookHistory.countDocuments({ source: 'zapier' });
    console.log(`📊 Total webhooks in database: ${totalWebhooks}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casperdev';
  
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('🔗 Connected to MongoDB');
    return migrateWebhookHistory();
  })
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });
}

module.exports = { migrateWebhookHistory };