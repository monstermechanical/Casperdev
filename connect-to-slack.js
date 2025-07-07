#!/usr/bin/env node

const { WebClient } = require('@slack/web-api');
require('dotenv').config();

async function connectToSlack() {
  console.log('🤖 Autonomous Assistant - Slack Connection Test');
  console.log('='.repeat(50));
  
  // Check if token exists
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token || token === 'xoxb-your-slack-bot-token') {
    console.log('❌ Slack bot token not found or is placeholder');
    console.log('📝 Please update your .env file with a real Slack bot token');
    console.log('📖 See slack-connection-setup.md for instructions');
    return;
  }
  
  // Initialize Slack client
  const slack = new WebClient(token);
  
  try {
    // Test the connection
    console.log('🔍 Testing Slack connection...');
    const authTest = await slack.auth.test();
    console.log('✅ Connected successfully!');
    console.log(`📋 Bot Name: ${authTest.bot_id}`);
    console.log(`🏢 Team: ${authTest.team}`);
    console.log(`👤 User: ${authTest.user}`);
    
    // Find a channel or DM to send message to
    const conversations = await slack.conversations.list({
      types: 'public_channel,private_channel,im',
      limit: 100
    });
    
    // Look for general channel or create DM
    let targetChannel = conversations.channels.find(c => c.name === 'general');
    if (!targetChannel) {
      // If no general channel, use the first available channel
      targetChannel = conversations.channels.find(c => c.is_member || c.is_channel);
    }
    
    if (!targetChannel) {
      console.log('⚠️  No suitable channel found. Creating DM...');
      // Create a DM with the user who owns the token
      const dmResponse = await slack.conversations.open({
        users: authTest.user_id
      });
      targetChannel = { id: dmResponse.channel.id };
    }
    
    // Send the first message
    const message = await slack.chat.postMessage({
      channel: targetChannel.id,
      text: '🤖 *Autonomous Assistant Connected!*',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🎉 *Your Autonomous Assistant is now connected to Slack!*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✨ I\'m ready to help you with:\n• Project management\n• Code assistance\n• Task automation\n• Research and analysis\n• Integration support'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '❓ *What would you like to work on next?*\n\nJust let me know what you need help with and I\'ll get started!'
          }
        }
      ]
    });
    
    console.log('📨 Message sent successfully!');
    console.log(`📍 Channel: ${targetChannel.id}`);
    console.log(`⏰ Timestamp: ${message.ts}`);
    console.log('');
    console.log('🎯 Your autonomous assistant is now ready to help!');
    console.log('💬 Check Slack for the welcome message and let me know what you need!');
    
  } catch (error) {
    console.error('❌ Error connecting to Slack:', error.message);
    if (error.message.includes('invalid_auth')) {
      console.log('🔑 Token appears to be invalid. Please check your SLACK_BOT_TOKEN in .env');
    }
    if (error.message.includes('not_authed')) {
      console.log('🔐 Authentication failed. Please verify your token has the correct scopes');
    }
  }
}

// Run the connection test
connectToSlack().catch(console.error);