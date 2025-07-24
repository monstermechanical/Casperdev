const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Socket.IO setup for real-time connections
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casperdev';

// Agent messaging system
let agentMessages = [];
const MAX_MESSAGES = 100;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  // Continue without MongoDB for now
  console.log('⚠️ Continuing without MongoDB - using memory storage');
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dataRoutes = require('./routes/data');
const integrationRoutes = require('./routes/integrations');
const pythonBridgeRoutes = require('./routes/python-bridge');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/bridge', pythonBridgeRoutes);

// Agent Communication Routes
app.post('/api/receive-message', (req, res) => {
  const { from_agent, to, message, action, timestamp } = req.body;
  
  console.log(`📨 Message received from ${from_agent}: ${action || 'message'}`);
  
  const messageData = {
    id: Date.now(),
    from: from_agent,
    to: 'backend',
    message,
    action,
    timestamp: timestamp || new Date().toISOString(),
    processed: false
  };
  
  // Store message
  agentMessages.push(messageData);
  if (agentMessages.length > MAX_MESSAGES) {
    agentMessages.shift();
  }
  
  // Emit to connected clients
  io.emit('agent-message', messageData);
  
  // Process the message based on action
  let response = { success: true, agent: 'backend' };
  
  try {
    switch (action) {
      case 'ping':
        response.message = 'pong';
        break;
      case 'status':
        response.data = {
          status: 'running',
          uptime: process.uptime(),
          connections: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        };
        break;
      case 'process-job':
        response.message = 'Job processing request received';
        response.data = { jobId: messageData.id, status: 'queued' };
        break;
      case 'slack-notification':
        response.message = 'Slack notification processed';
        // Here you would integrate with Slack API
        break;
      default:
        response.message = 'Message received and logged';
    }
    
    messageData.processed = true;
    messageData.response = response;
    
  } catch (error) {
    response.success = false;
    response.error = error.message;
  }
  
  res.json(response);
});

app.post('/api/send-message', async (req, res) => {
  const { to_agent, message, action } = req.body;
  
  if (!to_agent) {
    return res.status(400).json({ error: 'to_agent is required' });
  }
  
  try {
    const agentUrls = {
      python: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
      orchestrator: 'http://localhost:4000'
    };
    
    if (!agentUrls[to_agent]) {
      return res.status(400).json({ error: `Unknown agent: ${to_agent}` });
    }
    
    const messageData = {
      from_agent: 'backend',
      to: to_agent,
      message,
      action,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📤 Sending message to ${to_agent}: ${action || 'message'}`);
    
    const response = await axios.post(`${agentUrls[to_agent]}/api/receive-message`, messageData, {
      timeout: 5000
    });
    
    // Log the outgoing message
    agentMessages.push({
      ...messageData,
      id: Date.now(),
      direction: 'outgoing',
      response: response.data
    });
    
    res.json({ success: true, response: response.data });
    
  } catch (error) {
    console.error(`❌ Failed to send message to ${to_agent}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agent-messages', (req, res) => {
  res.json({ messages: agentMessages.slice(-50) });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    agent: 'backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: {
      database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      server: 'Running'
    },
    messageCount: agentMessages.length
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    agent: 'backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
  // Send recent messages to new clients
  socket.emit('recent-messages', agentMessages.slice(-10));
  
  socket.on('join-room', (room) => {
    socket.join(room);
    socket.to(room).emit('user-joined', socket.id);
    console.log(`User ${socket.id} joined room: ${room}`);
  });
  
  socket.on('send-message', (data) => {
    socket.to(data.room).emit('receive-message', {
      message: data.message,
      sender: socket.id,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('agent-command', async (data) => {
    try {
      const { command, target, payload } = data;
      console.log(`🎯 Agent command: ${command} → ${target}`);
      
      // Handle agent commands through socket
      socket.emit('command-result', {
        command,
        target,
        result: 'Command processed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('command-error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend Agent running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
  console.log(`📡 Socket.IO server ready for real-time connections`);
  console.log(`🤖 Agent communication endpoints ready`);
});

module.exports = { app, io };