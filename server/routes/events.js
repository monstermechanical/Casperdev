const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// n8n webhook configuration
const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

// Event types that we'll capture and forward to n8n
const EVENT_TYPES = {
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  MESSAGE_SENT: 'message.sent',
  POST_CREATED: 'post.created',
  CONNECTION_REQUEST: 'connection.request',
  CONNECTION_ACCEPTED: 'connection.accepted',
  HUBSPOT_SYNC: 'hubspot.sync',
  SLACK_NOTIFICATION: 'slack.notification',
  SYSTEM_ALERT: 'system.alert'
};

// Event store for tracking
let eventHistory = [];

// Helper function to send event to n8n
const sendEventToN8N = async (eventType, data) => {
  try {
    const webhookUrl = `${N8N_WEBHOOK_BASE_URL}/${eventType.replace('.', '-')}`;
    
    const eventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: data,
      source: 'casperdev-app'
    };

    // Send to n8n webhook (but don't fail if n8n is not available)
    try {
      await axios.post(webhookUrl, eventPayload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Source': 'casperdev'
        }
      });

      // Store in event history
      eventHistory.push({
        ...eventPayload,
        status: 'sent',
        webhookUrl
      });

      console.log(`✅ Event sent to n8n: ${eventType}`);
      return true;
    } catch (webhookError) {
      // n8n might not be running, store event for later
      eventHistory.push({
        ...eventPayload,
        status: 'pending',
        webhookUrl,
        error: 'n8n not available'
      });
      
      console.log(`⏳ Event queued (n8n not available): ${eventType}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to process event: ${eventType}`, error.message);
    return false;
  }
};

// Endpoint to manually trigger events (for testing)
router.post('/trigger/:eventType', auth, async (req, res) => {
  try {
    const { eventType } = req.params;
    const eventData = req.body;

    // Validate event type
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
      return res.status(400).json({
        error: 'Invalid event type',
        validTypes: Object.values(EVENT_TYPES)
      });
    }

    // Send event to n8n
    const success = await sendEventToN8N(eventType, {
      ...eventData,
      triggeredBy: req.user.username,
      userId: req.user.userId
    });

    res.json({
      success: success,
      eventType: eventType,
      timestamp: new Date().toISOString(),
      message: success ? 'Event sent to n8n' : 'Event queued (n8n not available)'
    });

  } catch (error) {
    console.error('Event trigger error:', error);
    res.status(500).json({
      error: 'Failed to trigger event',
      message: error.message
    });
  }
});

// Get event history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50, eventType } = req.query;
    
    let filteredEvents = eventHistory;
    
    if (eventType) {
      filteredEvents = eventHistory.filter(event => event.event === eventType);
    }

    // Return most recent events
    const events = filteredEvents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      events: events,
      total: filteredEvents.length,
      eventTypes: Object.values(EVENT_TYPES)
    });

  } catch (error) {
    console.error('Event history error:', error);
    res.status(500).json({
      error: 'Failed to fetch event history',
      message: error.message
    });
  }
});

// Configure webhook endpoints for n8n
router.get('/config', auth, async (req, res) => {
  try {
    const webhookEndpoints = Object.values(EVENT_TYPES).map(eventType => ({
      eventType: eventType,
      webhookUrl: `${N8N_WEBHOOK_BASE_URL}/${eventType.replace('.', '-')}`,
      description: `Webhook for ${eventType} events`
    }));

    res.json({
      n8nWebhookBase: N8N_WEBHOOK_BASE_URL,
      webhookEndpoints: webhookEndpoints,
      availableEventTypes: EVENT_TYPES,
      callbackEndpoint: `${req.protocol}://${req.get('host')}/api/events/webhook/n8n/:action`
    });

  } catch (error) {
    console.error('Event config error:', error);
    res.status(500).json({
      error: 'Failed to fetch event configuration',
      message: error.message
    });
  }
});

// Export the event sender function for use in other routes
module.exports = { router, sendEventToN8N, EVENT_TYPES };