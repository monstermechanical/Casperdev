const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
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
  process.exit(1);
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dataRoutes = require('./routes/data');
const integrationRoutes = require('./routes/integrations');

// Import error handling middleware
const { errorHandler, notFoundHandler, healthCheck } = require('./middleware/errorHandler');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/integrations', integrationRoutes);

// Health check endpoint
app.get('/api/health', healthCheck);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  
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
  
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
  console.log(`📡 Socket.IO server ready for real-time connections`);
});

module.exports = { app, io };