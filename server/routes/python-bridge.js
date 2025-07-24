const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// Python service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Test Python service connection
router.get('/python/health', auth, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
      timeout: 5000
    });
    
    res.json({
      status: 'connected',
      python_service: response.data,
      bridge_status: 'operational'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Python service unavailable',
      error: error.message,
      python_service_url: PYTHON_SERVICE_URL
    });
  }
});

// Bridge Slack commands to Python service
router.post('/slack/upwork-command', auth, async (req, res) => {
  try {
    const { channel, user_id, command, text, response_url } = req.body;
    
    if (!channel || !command) {
      return res.status(400).json({
        error: 'Missing required fields: channel, command'
      });
    }

    console.log(`🔗 Bridging Slack command to Python: ${command}`);
    
    // Forward to Python service
    const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/slack/command`, {
      channel,
      user_id: user_id || req.user.id,
      command,
      text: text || '',
      response_url
    }, {
      timeout: 30000, // 30 seconds for Upwork API calls
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Log the interaction
    console.log(`✅ Python service response: ${pythonResponse.data.message}`);

    res.json({
      status: 'success',
      message: 'Command processed by Python service',
      python_response: pythonResponse.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Python bridge error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        status: 'error',
        message: 'Python service is not running',
        suggestion: 'Start the Python service: cd python-upwork-service && python app.py'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to process command via Python service',
      error: error.message
    });
  }
});

// Autonomous trigger - called by cron job or webhooks
router.post('/trigger/autonomous-upwork', auth, async (req, res) => {
  try {
    const { trigger_type = 'scheduled', data = {} } = req.body;
    
    console.log(`🤖 Autonomous Upwork trigger: ${trigger_type}`);
    
    // Example autonomous actions
    const autonomousActions = [
      {
        command: '/jobs',
        text: 'python developer remote',
        channel: process.env.SLACK_DEFAULT_CHANNEL || '#general'
      },
      {
        command: '/profile',
        text: '',
        channel: process.env.SLACK_DEFAULT_CHANNEL || '#general'
      }
    ];

    const results = [];
    
    for (const action of autonomousActions) {
      try {
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/slack/command`, {
          channel: action.channel,
          user_id: 'autonomous_agent',
          command: action.command,
          text: action.text
        }, { timeout: 30000 });
        
        results.push({
          action: action.command,
          status: 'success',
          response: pythonResponse.data
        });
        
        // Wait between actions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        results.push({
          action: action.command,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      status: 'completed',
      trigger_type,
      actions_executed: results.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Autonomous trigger error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Autonomous trigger failed',
      error: error.message
    });
  }
});

// Get Python service status and history
router.get('/python/status', auth, async (req, res) => {
  try {
    const [healthResponse, historyResponse] = await Promise.all([
      axios.get(`${PYTHON_SERVICE_URL}/health`),
      axios.get(`${PYTHON_SERVICE_URL}/history`)
    ]);

    res.json({
      health: healthResponse.data,
      history: historyResponse.data,
      bridge_status: 'operational',
      last_check: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get Python service status',
      error: error.message
    });
  }
});

// Search Upwork jobs directly
router.get('/upwork/jobs', auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        error: 'Query parameter is required'
      });
    }

    const response = await axios.get(`${PYTHON_SERVICE_URL}/upwork/jobs`, {
      params: { query, limit },
      timeout: 30000
    });

    res.json(response.data);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to search Upwork jobs',
      error: error.message
    });
  }
});

module.exports = router;