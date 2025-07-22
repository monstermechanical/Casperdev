const express = require('express');
const auth = require('../middleware/auth');
const { sendEventToN8N, EVENT_TYPES } = require('./events');

const router = express.Router();

// Mock data storage (in production, this would connect to a database)
let applicationData = {
  posts: [],
  messages: [],
  notifications: [],
  analytics: {
    totalUsers: 0,
    activeConnections: 0,
    totalPosts: 0
  }
};

// Get dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Get real analytics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    const dashboardData = {
      analytics: {
        totalUsers,
        activeUsers,
        totalPosts: applicationData.posts.length,
        totalMessages: applicationData.messages.length,
        connectionStats: {
          totalConnections: applicationData.analytics.activeConnections,
          pendingRequests: 0 // Could be calculated from user connections
        }
      },
      recentActivity: applicationData.posts.slice(-5),
      notifications: applicationData.notifications.filter(n => n.userId === req.user.userId)
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all posts (feed)
router.get('/posts', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    
    const posts = applicationData.posts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(startIndex, endIndex);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: applicationData.posts.length,
        hasNext: endIndex < applicationData.posts.length
      }
    });
  } catch (error) {
    console.error('Posts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create new post
router.post('/posts', auth, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const newPost = {
      id: Date.now().toString(),
      userId: req.user.userId,
      username: req.user.username,
      content: content.trim(),
      type,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      shares: 0
    };

    applicationData.posts.push(newPost);
    applicationData.analytics.totalPosts++;

    // Create notification for user's connections
    const notification = {
      id: Date.now().toString() + '_notif',
      userId: req.user.userId,
      type: 'new_post',
      message: `${req.user.username} created a new post`,
      createdAt: new Date().toISOString(),
      read: false
    };

    applicationData.notifications.push(notification);

    // Send event to n8n
    await sendEventToN8N(EVENT_TYPES.POST_CREATED, {
      postId: newPost.id,
      userId: req.user.userId,
      username: req.user.username,
      content: newPost.content,
      type: newPost.type,
      createdAt: newPost.createdAt
    });

    res.status(201).json({
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get messages for a user
router.get('/messages', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationWith } = req.query;

    let messages = applicationData.messages.filter(msg => 
      msg.senderId === userId || msg.receiverId === userId
    );

    if (conversationWith) {
      messages = messages.filter(msg => 
        (msg.senderId === userId && msg.receiverId === conversationWith) ||
        (msg.senderId === conversationWith && msg.receiverId === userId)
      );
    }

    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ messages });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiverId, content, type = 'text' } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    const newMessage = {
      id: Date.now().toString(),
      senderId: req.user.userId,
      senderUsername: req.user.username,
      receiverId,
      content,
      type,
      createdAt: new Date().toISOString(),
      read: false
    };

    applicationData.messages.push(newMessage);

    // Create notification for receiver
    const notification = {
      id: Date.now().toString() + '_msg_notif',
      userId: receiverId,
      type: 'new_message',
      message: `New message from ${req.user.username}`,
      createdAt: new Date().toISOString(),
      read: false
    };

    applicationData.notifications.push(notification);

    // Send event to n8n
    await sendEventToN8N(EVENT_TYPES.MESSAGE_SENT, {
      messageId: newMessage.id,
      senderId: req.user.userId,
      senderUsername: req.user.username,
      receiverId: receiverId,
      content: newMessage.content,
      type: newMessage.type,
      sentAt: newMessage.createdAt
    });

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: newMessage
    });
  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const notifications = applicationData.notifications
      .filter(notif => notif.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20); // Limit to 20 most recent

    res.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', auth, async (req, res) => {
  try {
    const notification = applicationData.notifications.find(
      notif => notif.id === req.params.notificationId && notif.userId === req.user.userId
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// External API simulation - Get weather data (example of external service connection)
router.get('/external/weather', auth, async (req, res) => {
  try {
    // Simulate external API call
    const mockWeatherData = {
      location: 'Current Location',
      temperature: Math.floor(Math.random() * 30) + 10,
      condition: ['Sunny', 'Cloudy', 'Rainy', 'Snowy'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 100),
      lastUpdated: new Date().toISOString()
    };

    res.json({
      data: mockWeatherData,
      source: 'external-weather-api',
      connected: true
    });
  } catch (error) {
    console.error('External weather API error:', error);
    res.status(500).json({ error: 'Failed to connect to weather service' });
  }
});

// System health check with all connections
router.get('/health', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const mongoose = require('mongoose');
    
    const health = {
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          name: 'MongoDB'
        },
        cache: {
          status: 'simulated',
          name: 'In-Memory Cache'
        },
        externalApis: {
          weather: 'connected',
          notifications: 'connected'
        }
      },
      metrics: {
        totalUsers: await User.countDocuments(),
        activeUsers: await User.countDocuments({ isActive: true }),
        totalPosts: applicationData.posts.length,
        totalMessages: applicationData.messages.length
      }
    };

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

module.exports = router;