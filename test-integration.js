#!/usr/bin/env node

const axios = require('axios');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.blue}🎯 Slack-to-Upwork Integration Test${colors.reset}`);
console.log('====================================');
console.log('');

async function testNodeJSHealth() {
  try {
    console.log(`${colors.blue}🔍 Testing Node.js server health...${colors.reset}`);
    const response = await axios.get('http://localhost:5000/api/health');
    console.log(`${colors.green}✅ Node.js server is running${colors.reset}`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Uptime: ${Math.round(response.data.uptime)}s`);
    console.log('');
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Node.js server is not running${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Please run: npm run server`);
    return false;
  }
}

async function testPythonService() {
  try {
    console.log(`${colors.blue}🔍 Testing Python service health...${colors.reset}`);
    const response = await axios.get('http://localhost:8000/health');
    console.log(`${colors.green}✅ Python service is running${colors.reset}`);
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Upwork Configured: ${response.data.upwork_client}`);
    console.log(`   Node Service: ${response.data.node_service}`);
    console.log('');
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Python service is not running${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Please run: cd python-upwork-service && python app.py`);
    return false;
  }
}

async function testSlackToken() {
  console.log(`${colors.blue}🔍 Testing Slack connection...${colors.reset}`);
  
  const token = process.env.SLACK_BOT_TOKEN;
  console.log(`📧 Using token: ${token.substring(0, 15)}...`);
  
  if (token === 'xoxb-1234567890-1234567890123-aBcDeFgHiJkLmNoPqRsTuVwX') {
    console.log(`${colors.yellow}⚠️  WARNING: Using placeholder token${colors.reset}`);
    console.log('   This is not a real Slack bot token.');
    console.log('   Please replace it with a real token from your Slack app.');
    console.log('');
    return false;
  }

  try {
    const slack = new WebClient(token);
    const authTest = await slack.auth.test();
    
    console.log(`${colors.green}✅ Slack connection successful!${colors.reset}`);
    console.log(`   Bot ID: ${authTest.bot_id}`);
    console.log(`   Team: ${authTest.team}`);
    console.log(`   User: ${authTest.user}`);
    console.log('');
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Slack connection failed:${colors.reset}`);
    console.log(`   - Error: ${error.message}`);
    console.log('');
    return false;
  }
}

async function testBridgeConnection() {
  try {
    console.log(`${colors.blue}🔍 Testing Node.js ↔ Python bridge...${colors.reset}`);
    
    // Test if bridge endpoint exists (will get 401 without auth, which is expected)
    try {
      await axios.get('http://localhost:5000/api/bridge/python/health');
      console.log(`${colors.green}✅ Bridge endpoint accessible${colors.reset}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`${colors.green}✅ Bridge endpoint available (requires auth)${colors.reset}`);
      } else {
        console.log(`${colors.red}❌ Bridge endpoint error: ${error.message}${colors.reset}`);
        return false;
      }
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Bridge connection test failed${colors.reset}`);
    return false;
  }
}

async function testUpworkMockAPI() {
  try {
    console.log(`${colors.blue}🔍 Testing Upwork API (mock data)...${colors.reset}`);
    const response = await axios.get('http://localhost:8000/upwork/jobs?query=python+developer');
    
    if (response.data.success && response.data.jobs) {
      console.log(`${colors.green}✅ Upwork integration working${colors.reset}`);
      console.log(`   Found: ${response.data.jobs.length} mock jobs`);
      console.log(`   Message: ${response.data.message}`);
    } else {
      console.log(`${colors.yellow}⚠️  Upwork API returned unexpected format${colors.reset}`);
    }
    console.log('');
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Upwork API test failed${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function showCurrentConfiguration() {
  console.log(`${colors.blue}📋 Current Configuration:${colors.reset}`);
  console.log('========================');
  
  const config = {
    'Slack Bot Token': process.env.SLACK_BOT_TOKEN ? 
      (process.env.SLACK_BOT_TOKEN.startsWith('xoxb-') ? 
        (process.env.SLACK_BOT_TOKEN === 'xoxb-1234567890-1234567890123-aBcDeFgHiJkLmNoPqRsTuVwX' ? 
          '❌ PLACEHOLDER TOKEN' : '✅ VALID FORMAT') : 
        '❌ INVALID FORMAT') : 
      '❌ NOT SET',
    'Default Channel': process.env.SLACK_DEFAULT_CHANNEL || '❌ NOT SET',
    'Python Service URL': process.env.PYTHON_SERVICE_URL || '❌ NOT SET',
    'MongoDB URI': process.env.MONGODB_URI || '❌ NOT SET',
    'JWT Secret': process.env.JWT_SECRET ? '✅ SET' : '❌ NOT SET'
  };
  
  for (const [key, value] of Object.entries(config)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
}

async function testFullWorkflow() {
  console.log(`${colors.blue}🔍 Testing full autonomous workflow...${colors.reset}`);
  
  try {
    // Test Python service command processing
    const testCommand = {
      channel: '#test',
      user_id: 'test_user',
      command: '/jobs',
      text: 'python developer remote'
    };

    const response = await axios.post('http://localhost:8000/slack/command', testCommand);
    
    if (response.data.success) {
      console.log(`${colors.green}✅ Autonomous workflow functioning${colors.reset}`);
      console.log(`   Command processed: ${response.data.message}`);
      if (response.data.jobs) {
        console.log(`   Jobs found: ${response.data.jobs.length}`);
      }
    } else {
      console.log(`${colors.yellow}⚠️  Workflow responded but with issues${colors.reset}`);
      console.log(`   Message: ${response.data.message}`);
    }
    console.log('');
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Autonomous workflow test failed${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function showNextSteps() {
  console.log(`${colors.bold}${colors.yellow}🚀 Next Steps:${colors.reset}`);
  console.log('==============');
  console.log('');
  
  if (process.env.SLACK_BOT_TOKEN === 'xoxb-1234567890-1234567890123-aBcDeFgHiJkLmNoPqRsTuVwX') {
    console.log(`${colors.yellow}1. 🔴 CRITICAL: Get a real Slack bot token${colors.reset}`);
    console.log('   - Go to https://api.slack.com/apps');
    console.log('   - Create a new app or select existing');
    console.log('   - Copy Bot User OAuth Token');
    console.log('   - Update SLACK_BOT_TOKEN in .env file');
    console.log('');
  }
  
  console.log(`${colors.blue}2. 🔑 Configure Upwork API Credentials:${colors.reset}`);
  console.log('   - Visit: https://www.upwork.com/services/api/apply');
  console.log('   - Create API application');
  console.log('   - Update python-upwork-service/.env with real credentials');
  console.log('');
  
  console.log(`${colors.green}3. 🤖 Test Autonomous Features:${colors.reset}`);
  console.log('   - Send Slack commands: /jobs python developer');
  console.log('   - Check profile: /profile');
  console.log('   - Apply to jobs: /apply job_001');
  console.log('');
  
  console.log(`${colors.blue}4. 📊 Monitor & Scale:${colors.reset}`);
  console.log('   - View logs: Check both Node.js and Python console outputs');
  console.log('   - Monitor requests: curl http://localhost:8000/history');
  console.log('   - Setup scheduling: Configure cron jobs for regular searches');
  console.log('');
}

async function main() {
  console.log(`${colors.bold}Testing Slack-to-Upwork Integration...${colors.reset}`);
  console.log('');
  
  const nodeHealthy = await testNodeJSHealth();
  const pythonHealthy = await testPythonService();
  
  if (!nodeHealthy) {
    console.log(`${colors.red}Please start Node.js server first: npm run server${colors.reset}`);
  }
  
  if (!pythonHealthy) {
    console.log(`${colors.red}Please start Python service first: cd python-upwork-service && python app.py${colors.reset}`);
  }
  
  if (!nodeHealthy || !pythonHealthy) {
    console.log('');
    console.log(`${colors.yellow}Start both services and run this test again.${colors.reset}`);
    process.exit(1);
  }
  
  await testSlackToken();
  await testBridgeConnection();
  await testUpworkMockAPI();
  await testFullWorkflow();
  await showCurrentConfiguration();
  await showNextSteps();
  
  console.log(`${colors.bold}${colors.green}🎉 Integration test complete!${colors.reset}`);
  console.log('');
  console.log('📚 For detailed setup instructions, see:');
  console.log('   - SLACK_VERIFICATION_CHECKLIST.md');
  console.log('   - FINAL_INTEGRATION_SUMMARY.md');
  console.log('');
  console.log('🚀 Run this test again after configuring your API tokens!');
}

// Run the test
main().catch(console.error);