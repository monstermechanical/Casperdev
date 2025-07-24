const express = require('express');
const router = express.Router();
const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');
const auth = require('../middleware/auth');

// Initialize Slack client
const slackToken = process.env.SLACK_BOT_TOKEN;
const slack = slackToken && !slackToken.includes('your-slack-bot-token') 
  ? new WebClient(slackToken) 
  : null;

// Verify Slack request signature
const verifySlackRequest = (req, res, next) => {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const slackSignature = req.headers['x-slack-signature'];
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  
  if (!timestamp || !slackSignature || !signingSecret) {
    return res.status(401).json({ error: 'Missing Slack verification headers' });
  }
  
  // Check if request is older than 5 minutes
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) {
    return res.status(401).json({ error: 'Request timestamp too old' });
  }
  
  // Verify signature
  const sigBasestring = `v0:${timestamp}:${req.rawBody}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');
    
  if (crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(slackSignature, 'utf8')
  )) {
    next();
  } else {
    return res.status(401).json({ error: 'Invalid signature' });
  }
};

// Test Slack connection
router.get('/test', auth, async (req, res) => {
  try {
    if (!slack) {
      return res.status(503).json({
        success: false,
        error: 'Slack client not configured. Please add SLACK_BOT_TOKEN to environment variables.',
        connection: 'not_configured'
      });
    }
    
    const result = await slack.auth.test();
    
    // Get workspace info
    const teamInfo = await slack.team.info({ team: result.team_id });
    
    res.json({
      success: true,
      connection: 'active',
      workspace: {
        name: teamInfo.team.name,
        id: result.team_id,
        bot: {
          name: result.bot.name,
          id: result.bot_id
        }
      }
    });
  } catch (error) {
    console.error('Slack test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      connection: 'failed'
    });
  }
});

// Get Slack channels
router.get('/channels', auth, async (req, res) => {
  try {
    if (!slack) {
      return res.status(503).json({
        success: false,
        error: 'Slack client not configured',
        channels: []
      });
    }
    
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 100
    });
    
    res.json({
      success: true,
      channels: result.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
        is_member: channel.is_member,
        num_members: channel.num_members
      }))
    });
  } catch (error) {
    console.error('Slack channels error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send message to Slack channel
router.post('/send-message', auth, async (req, res) => {
  try {
    const { channel, text, blocks, attachments } = req.body;
    
    if (!channel || !text) {
      return res.status(400).json({
        success: false,
        error: 'Channel and text are required'
      });
    }
    
    if (!slack) {
      return res.status(503).json({
        success: false,
        error: 'Slack client not configured'
      });
    }
    
    const result = await slack.chat.postMessage({
      channel,
      text,
      blocks,
      attachments
    });
    
    res.json({
      success: true,
      message_id: result.ts,
      channel: result.channel
    });
  } catch (error) {
    console.error('Slack send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Handle Slack slash commands
router.post('/commands', async (req, res) => {
  try {
    // Parse the command
    const { command, text, user_id, user_name, channel_id, channel_name } = req.body;
    
    console.log(`Slack command received: ${command} ${text} from ${user_name}`);
    
    // Acknowledge receipt immediately (Slack requires response within 3 seconds)
    res.json({
      response_type: 'in_channel',
      text: `Processing command: ${command} ${text}...`
    });
    
    // Process command asynchronously
    processSlackCommand({
      command,
      text,
      user_id,
      user_name,
      channel_id,
      channel_name
    });
    
  } catch (error) {
    console.error('Slack command error:', error);
    res.json({
      response_type: 'ephemeral',
      text: `Error processing command: ${error.message}`
    });
  }
});

// Handle Slack events (requires Events API setup)
router.post('/events', async (req, res) => {
  const { type, challenge } = req.body;
  
  // URL verification for Events API
  if (type === 'url_verification') {
    return res.send(challenge);
  }
  
  // Handle events
  if (req.body.event) {
    const event = req.body.event;
    
    switch (event.type) {
      case 'app_mention':
        await handleAppMention(event);
        break;
      case 'message':
        if (!event.bot_id) { // Ignore bot messages
          await handleMessage(event);
        }
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
  }
  
  res.sendStatus(200);
});

// Handle interactive components (buttons, select menus, etc.)
router.post('/interactive', async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, user, actions, channel, message } = payload;
    
    console.log(`Interactive component: ${type} from ${user.name}`);
    
    // Handle different interaction types
    switch (type) {
      case 'block_actions':
        await handleBlockActions(payload);
        break;
      case 'view_submission':
        await handleViewSubmission(payload);
        break;
      default:
        console.log('Unhandled interaction type:', type);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Slack interactive error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a Slack modal/dialog
router.post('/open-modal', auth, async (req, res) => {
  try {
    const { trigger_id, view } = req.body;
    
    if (!trigger_id) {
      return res.status(400).json({
        success: false,
        error: 'trigger_id is required'
      });
    }
    
    if (!slack) {
      return res.status(503).json({
        success: false,
        error: 'Slack client not configured'
      });
    }
    
    const result = await slack.views.open({
      trigger_id,
      view: view || {
        type: 'modal',
        title: {
          type: 'plain_text',
          text: 'Casperdev Action'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Select an action to perform:'
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Search Jobs'
                },
                value: 'search_jobs',
                action_id: 'search_jobs_button'
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Profile'
                },
                value: 'view_profile',
                action_id: 'view_profile_button'
              }
            ]
          }
        ]
      }
    });
    
    res.json({
      success: true,
      view_id: result.view.id
    });
  } catch (error) {
    console.error('Slack modal error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
async function processSlackCommand({ command, text, user_id, channel_id }) {
  try {
    let response;
    
    switch (command) {
      case '/casperdev':
        response = await handleCasperdevCommand(text, user_id);
        break;
      case '/search':
        response = await handleSearchCommand(text);
        break;
      case '/status':
        response = await handleStatusCommand();
        break;
      default:
        response = {
          text: `Unknown command: ${command}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `I don't recognize the command \`${command}\`. Try:\n• \`/casperdev help\`\n• \`/search [query]\`\n• \`/status\``
              }
            }
          ]
        };
    }
    
    // Send response back to Slack
    if (slack) {
      await slack.chat.postMessage({
        channel: channel_id,
        ...response
      });
    } else {
      console.log('Slack client not configured - would send:', response);
    }
    
  } catch (error) {
    console.error('Command processing error:', error);
    if (slack) {
      await slack.chat.postMessage({
        channel: channel_id,
        text: `Error processing command: ${error.message}`
      });
    }
  }
}

async function handleCasperdevCommand(text, user_id) {
  const args = text.trim().split(' ');
  const subcommand = args[0]?.toLowerCase();
  
  switch (subcommand) {
    case 'help':
      return {
        text: 'Casperdev Help',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Available Commands:*\n• `/casperdev help` - Show this help message\n• `/casperdev status` - Check system status\n• `/casperdev search [query]` - Search for jobs\n• `/casperdev profile` - View your profile'
            }
          }
        ]
      };
      
    case 'status':
      return await handleStatusCommand();
      
    case 'search':
      return await handleSearchCommand(args.slice(1).join(' '));
      
    case 'profile':
      return await handleProfileCommand(user_id);
      
    default:
      return {
        text: `Unknown subcommand: ${subcommand}. Type \`/casperdev help\` for available commands.`
      };
  }
}

async function handleStatusCommand() {
  try {
    // Check backend health
    const axios = require('axios');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    const health = healthResponse.data;
    
    return {
      text: 'System Status',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🟢 Casperdev System Status'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Backend:* ${health.status === 'OK' ? '✅ Online' : '❌ Offline'}`
            },
            {
              type: 'mrkdwn',
              text: `*Database:* ${health.connections?.database === 'Connected' ? '✅ Connected' : '⚠️ Disconnected'}`
            },
            {
              type: 'mrkdwn',
              text: `*Uptime:* ${Math.floor(health.uptime / 60)} minutes`
            },
            {
              type: 'mrkdwn',
              text: `*Messages:* ${health.messageCount || 0} processed`
            }
          ]
        }
      ]
    };
  } catch (error) {
    return {
      text: '❌ Unable to fetch system status',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Error: ${error.message}`
          }
        }
      ]
    };
  }
}

async function handleSearchCommand(query) {
  if (!query) {
    return {
      text: 'Please provide a search query. Example: `/search python developer`'
    };
  }
  
  // Forward to Python service for Upwork search
  try {
    const axios = require('axios');
    const response = await axios.post('http://localhost:8000/slack/command', {
      command: '/search',
      text: query,
      user_id: 'slack-user',
      channel: 'slack-channel'
    });
    
    const jobs = response.data.jobs || [];
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔍 Search Results for "${query}"`
        }
      }
    ];
    
    if (jobs.length === 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'No jobs found matching your criteria.'
        }
      });
    } else {
      jobs.slice(0, 5).forEach(job => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${job.title}*\n${job.description?.substring(0, 150)}...\n💰 Budget: ${job.budget || 'Not specified'}`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details'
            },
            url: job.url || '#',
            action_id: `view_job_${job.id}`
          }
        });
        blocks.push({ type: 'divider' });
      });
    }
    
    return { blocks };
  } catch (error) {
    return {
      text: `❌ Search failed: ${error.message}`
    };
  }
}

async function handleProfileCommand(user_id) {
  return {
    text: 'Profile Information',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*User Profile*\nUser ID: ${user_id}\n\nMore profile features coming soon!`
        }
      }
    ]
  };
}

async function handleAppMention(event) {
  const { text, channel, user } = event;
  
  if (slack) {
    await slack.chat.postMessage({
      channel,
      text: `Hello <@${user}>! You mentioned me. How can I help?`,
      thread_ts: event.ts
    });
  }
}

async function handleMessage(event) {
  // Handle direct messages to the bot
  if (event.channel_type === 'im' && slack) {
    await slack.chat.postMessage({
      channel: event.channel,
      text: `I received your message: "${event.text}". Type "help" for available commands.`
    });
  }
}

async function handleBlockActions(payload) {
  const { actions, channel, user } = payload;
  const action = actions[0];
  
  switch (action.action_id) {
    case 'search_jobs_button':
      if (slack) {
        await slack.chat.postMessage({
          channel: channel.id,
          text: `<@${user.id}> clicked Search Jobs. Use \`/search [query]\` to search for jobs.`
        });
      }
      break;
      
    case 'view_profile_button':
      if (slack) {
        await slack.chat.postMessage({
          channel: channel.id,
          text: `<@${user.id}> clicked View Profile. Use \`/casperdev profile\` to view your profile.`
        });
      }
      break;
      
    default:
      console.log('Unhandled action:', action.action_id);
  }
}

async function handleViewSubmission(payload) {
  // Handle modal form submissions
  console.log('View submission:', payload);
}

module.exports = router;