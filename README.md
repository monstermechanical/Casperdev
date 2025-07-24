# Casperdev - Connect All

A comprehensive full-stack application demonstrating complete system connectivity - from database to real-time communications, user connections, and external API integrations.

## 🌐 System Architecture

This application showcases a fully connected ecosystem:

### Backend Connections
- **MongoDB Database** - User data and application state
- **Express.js API** - RESTful endpoints for all operations
- **Socket.IO Server** - Real-time bidirectional communication
- **JWT Authentication** - Secure user session management
- **External APIs** - Weather data and notification services

### Frontend Connections
- **React 18** - Modern component-based UI
- **Material-UI** - Beautiful, accessible design system
- **Socket.IO Client** - Real-time updates and messaging
- **React Query** - Efficient server state management
- **React Router** - Client-side navigation

### External Integrations
- **🔗 Zapier** - Workflow automation and app connectivity
- **📊 HubSpot** - CRM and contact management
- **💬 Slack** - Team communication and notifications
- **🐍 Python Services** - Specialized processing and APIs
- **🔄 n8n Workflows** - Advanced automation flows

### Features Connected
- 🔐 **User Authentication** - Secure login/registration
- 👥 **User Connections** - Friend requests and networking
- 💬 **Real-time Messaging** - Instant communication
- 📊 **Live Analytics** - System health monitoring
- 🔔 **Push Notifications** - Real-time alerts
- 🌐 **External Integrations** - Weather API example
- 📱 **Responsive Design** - Works on all devices
- ⚡ **Zapier Automation** - Connect with 5000+ apps

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
# Install backend dependencies
npm run install-all

# Or install separately:
npm install
cd client && npm install
```

2. **Environment Setup:**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration:
# - MongoDB connection string
# - JWT secret key
# - External API keys (optional)
```

3. **Start the application:**
```bash
# Development mode (starts both frontend and backend)
npm run dev

# Or start separately:
npm run server  # Backend on http://localhost:5000
npm run client  # Frontend on http://localhost:3000
```

## 🔧 Configuration

### Database Connection
```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/casperdev

# MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/casperdev
```

### Security Settings
```bash
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
```

### External Services (Optional)
```bash
# Weather API
WEATHER_API_KEY=your-weather-api-key

# Email notifications
SENDGRID_API_KEY=your-sendgrid-key

# Zapier Integration
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/your-webhook-id/
ZAPIER_API_KEY=your-zapier-api-key

# Cloud storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

## 📡 Connection Types

### 1. Database Connections
- **Primary**: MongoDB for user data, posts, messages
- **Connection pooling**: Automatic reconnection handling
- **Data validation**: Mongoose schemas with validation

### 2. Real-time Connections
- **WebSocket**: Socket.IO for instant messaging
- **Room management**: User-based chat rooms
- **Presence system**: Online/offline status tracking
- **Event broadcasting**: System-wide notifications

### 3. API Connections
- **RESTful endpoints**: Full CRUD operations
- **Authentication middleware**: JWT token validation
- **Rate limiting**: DDoS protection
- **Error handling**: Comprehensive error responses

### 4. User Connections
- **Friend system**: Send/accept/reject requests
- **Connection status**: Pending, accepted, blocked states
- **Social features**: User discovery and networking
- **Privacy controls**: Connection management

### 4. Integration Connections
- **HubSpot CRM**: Contact and deal management
- **Slack API**: Real-time team notifications
- **Zapier Webhooks**: Automation and workflow triggers
- **Python Bridge**: Specialized service communication
- **n8n Workflows**: Visual automation builder

## 🛠 API Endpoints

### Authentication
```bash
POST /api/auth/register  # Create user connection
POST /api/auth/login     # Establish user session
GET  /api/auth/me        # Verify connection
POST /api/auth/logout    # Terminate session
```

### User Management
```bash
GET    /api/users              # Discover users
GET    /api/users/:id          # User profile
POST   /api/users/:id/connect  # Send connection request
PUT    /api/users/:id/connection # Accept/reject request
GET    /api/users/:id/connections # User connections
```

### Data & Messaging
```bash
GET  /api/data/dashboard    # System overview
GET  /api/data/posts        # Activity feed
POST /api/data/posts        # Create post
GET  /api/data/messages     # Message history
POST /api/data/messages     # Send message
GET  /api/data/notifications # User notifications
```

### System Health
```bash
GET /api/health             # Overall system status
GET /api/data/health        # Detailed health check
GET /api/data/external/weather # External API test
```

### Integration & Automation
```bash
GET    /api/integrations/status         # Overall integration health
GET    /api/integrations/hubspot/test   # Test HubSpot connection
GET    /api/integrations/slack/test     # Test Slack connection
GET    /api/integrations/zapier/test    # Test Zapier connection
POST   /api/integrations/zapier/trigger # Trigger Zapier workflows
POST   /api/integrations/zapier/webhook # Receive Zapier webhooks
GET    /api/integrations/zapier/webhooks # Webhook history
```

## 🔄 Real-time Events

### Socket.IO Events
```javascript
// Client to Server
socket.emit('join-room', roomId)
socket.emit('send-message', messageData)
socket.emit('update-status', statusData)

// Server to Client
socket.on('receive-message', messageData)
socket.on('user-joined', userId)
socket.on('connection-request', requestData)
socket.on('user-status-update', statusData)
```

### Zapier Integration Events
```javascript
// Trigger Zapier workflow
fetch('/api/integrations/zapier/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'new_user_signup',
    data: { email: 'user@example.com', plan: 'premium' },
    zap_name: 'Welcome Email Sequence'
  })
});

// Receive webhook from Zapier
// POST /api/integrations/zapier/webhook
{
  "action": "new_lead",
  "data": {
    "email": "lead@example.com",
    "source": "website_form"
  }
}
```

## 📊 Monitoring Connections

### Connection Hub
Access the **Connection Hub** (`/connections`) to monitor:
- Database connection status
- Real-time server connectivity
- User connection statistics
- External API health (Weather, HubSpot, Slack, Zapier)
- System performance metrics
- Webhook activity and automation status

### Health Checks
- **Endpoint**: `GET /api/health`
- **Includes**: Database, cache, external APIs
- **Auto-refresh**: Every 30 seconds
- **Alerts**: Real-time notifications for issues

## 🔧 Development

### Project Structure
```
casperdev/
├── server/                 # Backend application
│   ├── index.js           # Server entry point
│   ├── models/            # Database schemas
│   ├── routes/            # API endpoints
│   ├── middleware/        # Authentication, etc.
│   └── ...
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # State management
│   │   └── ...
│   └── package.json
├── package.json           # Root dependencies
└── .env.example          # Configuration template
```

### Available Scripts
```bash
npm run dev          # Development mode
npm run server       # Backend only
npm run client       # Frontend only
npm run build        # Production build
npm run install-all  # Install all dependencies
npm start           # Production mode
```

## 🚀 Deployment

### Backend Deployment
1. Set environment variables
2. Ensure MongoDB connection
3. Run `npm start`

### Frontend Deployment
1. Build: `cd client && npm run build`
2. Serve the `build` folder
3. Configure proxy to backend API

### Full-Stack Deployment (Heroku example)
```bash
# Add buildpacks
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static

# Configure environment
heroku config:set MONGODB_URI=your-mongodb-url
heroku config:set JWT_SECRET=your-jwt-secret

# Deploy
git push heroku main
```

## 🤝 Connection Features

### User Connections
- **Discovery**: Find users by name/username
- **Requests**: Send connection invitations
- **Management**: Accept, reject, or block connections
- **Status**: Track connection states and history

### Real-time Features
- **Instant messaging**: Socket.IO powered chat
- **Live notifications**: Real-time system alerts
- **Presence indicators**: See who's online
- **Activity feeds**: Live updates across the system

### System Integrations
- **External APIs**: Weather data integration
- **Health monitoring**: Continuous system checks
- **Analytics**: Real-time usage statistics
- **Logging**: Comprehensive activity tracking

## 🤝 Integration Features

### External Service Connections
- **HubSpot CRM**: Sync contacts, deals, and activities
- **Slack Integration**: Real-time notifications and team updates
- **Zapier Automation**: Connect with 5000+ apps and services
- **Python Bridge**: Specialized processing and external APIs
- **n8n Workflows**: Visual automation and advanced triggers

### Automation Capabilities
- **Zapier Workflows**: Trigger automations from app events
- **Scheduled Syncing**: Automatic data synchronization
- **Webhook Processing**: Handle incoming automation triggers
- **Cross-Platform**: Connect different services seamlessly
- **Real-time Updates**: Instant notifications across platforms

## 🔐 Security

- **JWT Authentication**: Secure token-based sessions
- **Password hashing**: bcrypt with salt rounds
- **Rate limiting**: API endpoint protection
- **CORS configuration**: Cross-origin request security
- **Input validation**: Comprehensive data sanitization
- **Helmet.js**: Security headers and protections

## 📈 Scaling Connections

This architecture supports horizontal scaling:
- **Database**: MongoDB replica sets
- **Real-time**: Socket.IO clustering
- **API**: Load balancer with multiple instances
- **Frontend**: CDN distribution
- **Cache**: Redis for session storage

## 🆘 Troubleshooting

### Common Connection Issues

**Database Connection Failed:**
```bash
# Check MongoDB status
mongod --version
# Verify connection string in .env
```

**Socket.IO Not Connecting:**
```bash
# Check CORS configuration
# Verify client URL in server settings
# Check firewall/port settings
```

**API Authentication Errors:**
```bash
# Verify JWT_SECRET in .env
# Check token in browser localStorage
# Clear browser cache and cookies
```

## 🎯 Next Steps

Extend the connections by adding:
- **Redis caching** for improved performance
- **Elasticsearch** for advanced search
- **WebRTC** for video/audio calls
- **Push notifications** for mobile devices
- **GraphQL** for efficient data fetching
- **More Zapier integrations** for expanded automation
- **Advanced n8n workflows** for complex automations
- **Microservices** architecture
- **Docker** containerization
- **Kubernetes** orchestration

---

**Connect all the things!** 🚀

For questions or contributions, please open an issue or submit a pull request.

### Quick Integration Setup:
- **Zapier**: See `zapier-integration-guide.md` for detailed setup
- **HubSpot**: Check `hubspot-slack-setup.md` for configuration
- **Slack**: Review `slack-integration-status.md` for troubleshooting