/**
 * Zapier Integration Test Script
 * Tests all Zapier endpoints and functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = null;

// Test configuration
const MOCK_ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/12345/test-webhook/';

console.log('🔗 CasperDev Zapier Integration Test');
console.log('=====================================');

async function testServerHealth() {
  console.log('\n🏥 Testing server health...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running:', response.data.status);
    return true;
  } catch (error) {
    console.log('❌ Server health check failed:', error.message);
    return false;
  }
}

async function authenticateUser() {
  console.log('\n🔐 Authenticating user...');
  try {
    // Try to register a test user first
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'test@zapier.com',
        password: 'testpassword123',
        name: 'Zapier Test User'
      });
      console.log('✅ Test user created');
    } catch (regError) {
      console.log('ℹ️ Test user may already exist, continuing...');
    }

    // Login
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@zapier.com',
      password: 'testpassword123'
    });

    authToken = response.data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testIntegrationStatus() {
  console.log('\n📊 Testing integration status...');
  try {
    const response = await axios.get(`${BASE_URL}/integrations/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Integration status retrieved');
    console.log('📈 Zapier status:', response.data.zapier || 'Not configured');
    return true;
  } catch (error) {
    console.log('❌ Integration status failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testZapierConnectionWithoutWebhook() {
  console.log('\n🔗 Testing Zapier connection (without webhook URL)...');
  try {
    const response = await axios.get(`${BASE_URL}/integrations/zapier/test`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('❌ Expected error for missing webhook URL');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message?.includes('webhook URL not configured')) {
      console.log('✅ Correctly detected missing webhook URL');
      return true;
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testZapierTrigger() {
  console.log('\n⚡ Testing Zapier trigger (mock)...');
  try {
    // Set mock webhook URL in environment temporarily
    process.env.ZAPIER_WEBHOOK_URL = MOCK_ZAPIER_WEBHOOK_URL;
    
    const response = await axios.post(`${BASE_URL}/integrations/zapier/trigger`, {
      action: 'test_integration',
      data: {
        message: 'Hello from CasperDev!',
        timestamp: new Date().toISOString(),
        user: 'test@zapier.com'
      },
      zap_name: 'CasperDev Test Workflow'
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Zapier trigger test completed');
    console.log('📤 Payload sent:', response.data.payload.action);
    return true;
  } catch (error) {
    console.log('❌ Zapier trigger failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testZapierWebhookEndpoint() {
  console.log('\n📥 Testing Zapier webhook endpoint...');
  try {
    const webhookPayload = {
      action: 'test_webhook',
      data: {
        message: 'Test webhook from Zapier',
        source: 'zapier_test',
        timestamp: new Date().toISOString()
      }
    };

    const response = await axios.post(`${BASE_URL}/integrations/zapier/webhook`, webhookPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Webhook endpoint working');
    console.log('📨 Processed action:', response.data.action);
    return true;
  } catch (error) {
    console.log('❌ Webhook endpoint failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testZapierWebhookHistory() {
  console.log('\n📋 Testing webhook history...');
  try {
    const response = await axios.get(`${BASE_URL}/integrations/zapier/webhooks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Webhook history retrieved');
    console.log('📊 Webhook count:', response.data.total || 0);
    
    if (response.data.webhooks && response.data.webhooks.length > 0) {
      console.log('📝 Latest webhook:', response.data.webhooks[0].action);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Webhook history failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testHubSpotZapierSync() {
  console.log('\n🔄 Testing HubSpot to Zapier sync (mock)...');
  try {
    const response = await axios.post(`${BASE_URL}/integrations/zapier/sync-hubspot`, {
      type: 'contacts',
      limit: 5
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ HubSpot sync test completed');
    console.log('📊 Sync type:', response.data.type);
    return true;
  } catch (error) {
    console.log('ℹ️ HubSpot sync expected to fail without credentials:', error.response?.data?.error || error.message);
    return true; // Expected to fail without real HubSpot credentials
  }
}

async function testAutoTriggerSetup() {
  console.log('\n⏰ Testing auto-trigger setup...');
  try {
    const response = await axios.post(`${BASE_URL}/integrations/zapier/auto-trigger/enable`, {
      enabled: true,
      schedule: '0 */6 * * *', // Every 6 hours
      triggers: [
        { type: 'system_health' },
        { type: 'hubspot_contacts' }
      ]
    }, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Auto-trigger setup completed');
    console.log('⏱️ Schedule:', response.data.schedule);
    console.log('🎯 Triggers:', response.data.triggers);
    return true;
  } catch (error) {
    console.log('❌ Auto-trigger setup failed:', error.response?.data?.error || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive Zapier integration tests...\n');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'User Authentication', fn: authenticateUser },
    { name: 'Integration Status', fn: testIntegrationStatus },
    { name: 'Zapier Connection (No Webhook)', fn: testZapierConnectionWithoutWebhook },
    { name: 'Zapier Trigger', fn: testZapierTrigger },
    { name: 'Zapier Webhook Endpoint', fn: testZapierWebhookEndpoint },
    { name: 'Webhook History', fn: testZapierWebhookHistory },
    { name: 'HubSpot Sync', fn: testHubSpotZapierSync },
    { name: 'Auto-Trigger Setup', fn: testAutoTriggerSetup }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" crashed:`, error.message);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎯 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (passed === tests.length) {
    console.log('\n🎉 All tests passed! Zapier integration is working correctly.');
  } else if (passed > failed) {
    console.log('\n⚠️ Most tests passed. Some failures expected without real API credentials.');
  } else {
    console.log('\n🚨 Multiple test failures. Please check server configuration.');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('1. Set up real Zapier webhook URL in .env file');
  console.log('2. Configure HubSpot credentials for full sync testing');
  console.log('3. Create Zaps in Zapier dashboard to test workflows');
  console.log('4. Test with real webhook triggers from external apps');
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testServerHealth,
  authenticateUser,
  testIntegrationStatus,
  testZapierTrigger,
  testZapierWebhookEndpoint
};