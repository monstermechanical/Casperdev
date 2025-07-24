# Casperdev - Connect All

A comprehensive full-stack application demonstrating complete system connectivity - from database to real-time communications, user connections, external API integrations, and AI-powered development tools.

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

### AI & Development Tools
- **🦙 Ollama/LLaMA** - Local large language models
- **🧩 Pieces** - AI-powered code snippet management
- **🤖 Claude AI** - Advanced AI assistant via n8n workflows
- **⚡ Cursor IDE** - Enhanced development experience

### Features Connected
- 🔐 **User Authentication** - Secure login/registration
- 👥 **User Connections** - Friend requests and networking
- 💬 **Real-time Messaging** - Instant communication
- 📊 **Live Analytics** - System health monitoring
- 🔔 **Push Notifications** - Real-time alerts
- 🌐 **External Integrations** - HubSpot, Slack, Weather API
- 🤖 **AI Assistant** - Local and cloud AI models
- 📱 **Responsive Design** - Works on all devices

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Docker & Docker Compose
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
# Install all dependencies
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
# - API keys for integrations
# - Ollama and Pieces configuration
```

3. **Start all services:**
```bash
# Start Docker services (MongoDB, Redis, n8n, Ollama, Pieces)
docker-compose up -d

# Start the application
npm run dev
```

4. **Setup AI integrations:**
```bash
# Run the AI setup script
./setup-llama-pieces.sh
```

## 🔧 Configuration

### Database Connection
```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/casperdev

# MongoDB Atlas (cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/casperdev
```

### AI & LLM Configuration
```bash
# Ollama (Local LLaMA models)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Pieces (Code snippet management)
PIECES_OS_URL=http://localhost:1000
PIECES_API_KEY=your-pieces-api-key

# Claude AI (via n8n)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Security Settings
```bash
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
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

### 3. AI Connections
- **Ollama**: Local LLaMA models for privacy-focused AI
- **Pieces**: Intelligent code snippet management
- **Claude**: Advanced AI assistant for complex tasks
- **Model Management**: Download and switch between AI models

### 4. External API Connections
- **HubSpot**: CRM data synchronization
- **Slack**: Team communication and notifications
- **Weather API**: External data integration example
- **n8n Workflows**: Automation and AI orchestration

## 🛠 API Endpoints

### Authentication
```bash
POST /api/auth/register  # Create user connection
POST /api/auth/login     # Establish user session
GET  /api/auth/me        # Verify connection
POST /api/auth/logout    # Terminate session
```

### AI Integrations
```bash
GET  /api/ai/status              # AI services status
GET  /api/ai/ollama/test         # Test Ollama connection
POST /api/ai/ollama/chat         # Chat with local LLaMA
POST /api/ai/ollama/pull         # Download AI models
GET  /api/ai/pieces/test         # Test Pieces connection
POST /api/ai/pieces/save-snippet # Save code to Pieces
GET  /api/ai/pieces/snippets     # Get saved snippets
POST /api/ai/assist              # Universal AI assistant
```

### External Integrations
```bash
GET  /api/integrations/status    # Integration status
GET  /api/integrations/hubspot/test    # Test HubSpot
GET  /api/integrations/slack/test      # Test Slack
POST /api/integrations/hubspot/sync-contacts  # Sync contacts
POST /api/integrations/hubspot/sync-deals     # Sync deals
```

## 🤖 AI Features

### Local AI with Ollama
- **Privacy-focused**: All processing happens locally
- **Multiple Models**: Support for LLaMA, CodeLLaMA, Mistral, and more
- **Code Generation**: AI-powered code assistance
- **Chat Interface**: Natural language interaction

### Code Management with Pieces
- **Smart Snippets**: AI-powered code snippet organization
- **Language Detection**: Automatic programming language recognition
- **Search & Discovery**: Find code snippets quickly
- **Integration**: Seamless integration with development workflow

### Claude AI Workflows
- **Advanced Reasoning**: Complex problem-solving capabilities
- **HubSpot Analysis**: AI-powered CRM insights
- **Automated Workflows**: n8n integration for automation
- **Multi-modal**: Text and data processing

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
socket.on('ai-response', aiData)
```

## 📊 Monitoring Connections

### Connection Hub
Access the **Connection Hub** (`/connections`) to monitor:
- Database connection status
- Real-time server connectivity
- AI service health (Ollama, Pieces, Claude)
- External API status (HubSpot, Slack)
- System performance metrics

### AI Assistant
Access the **AI Assistant** (`/ai`) for:
- Chat with local LLaMA models
- Code snippet management with Pieces
- Model downloading and management
- Integration status monitoring

## 🐳 Docker Services

The application includes these containerized services:

```yaml
Services:
  - MongoDB (27017)     # Database
  - Redis (6379)        # Caching
  - n8n (5678)         # Workflow automation
  - Ollama (11434)     # Local LLaMA models
  - Pieces OS (1000)   # Code snippet management
  - Backend (5000)     # Express.js API
  - Frontend (3000)    # React application
```

Start all services:
```bash
docker-compose up -d
```

## 🎯 Cursor IDE Integration

The project includes comprehensive Cursor IDE configuration:

### Features
- **AI Code Completion**: Enhanced with project context
- **Smart Suggestions**: Project-specific patterns
- **Code Generation**: Follows established conventions
- **Integration Aware**: Understands the full stack architecture

### Configuration Files
- `.cursorrules` - Project-specific AI assistant rules
- `.vscode/settings.json` - IDE settings and preferences
- **Auto-setup**: Run `./setup-llama-pieces.sh` for automatic configuration

## 🔧 Development

### Project Structure
```
casperdev/
├── server/                 # Backend application
│   ├── index.js           # Server entry point
│   ├── models/            # Database schemas
│   ├── routes/            # API endpoints
│   │   ├── ai-integrations.js  # AI/LLM endpoints
│   │   └── integrations.js     # External API endpoints
│   └── middleware/        # Authentication, etc.
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   └── AIAssistant.js   # AI chat interface
│   │   └── contexts/      # State management
│   └── package.json
├── docker-compose.yml     # All services
├── .cursorrules          # Cursor IDE configuration
├── setup-llama-pieces.sh # AI setup script
└── .env.example          # Configuration template
```

### Available Scripts
```bash
npm run dev          # Development mode (all services)
npm run server       # Backend only
npm run client       # Frontend only
npm run build        # Production build
npm run install-all  # Install all dependencies

# AI & Docker
docker-compose up -d      # Start all services
./setup-llama-pieces.sh   # Setup AI integrations
docker exec casperdev-ollama ollama pull llama3.2  # Download models
```

## 🚀 Deployment

### Development Deployment
```bash
# Start all services
docker-compose up -d

# Run setup script
./setup-llama-pieces.sh

# Start application
npm run dev
```

### Production Deployment
```bash
# Build frontend
cd client && npm run build

# Set production environment
export NODE_ENV=production

# Start with PM2 or similar
npm start
```

## 🔐 Security

- **JWT Authentication**: Secure token-based sessions
- **Password hashing**: bcrypt with salt rounds
- **Rate limiting**: API endpoint protection
- **CORS configuration**: Cross-origin request security
- **Local AI**: Privacy-focused local model processing
- **Environment variables**: Secure configuration management

## 📈 Scaling Connections

This architecture supports horizontal scaling:
- **Database**: MongoDB replica sets
- **Real-time**: Socket.IO clustering
- **AI Services**: Ollama clustering for model serving
- **API**: Load balancer with multiple instances
- **Frontend**: CDN distribution
- **Containers**: Kubernetes orchestration ready

## 🆘 Troubleshooting

### Common Issues

**Ollama Not Responding:**
```bash
# Check if service is running
docker ps | grep ollama

# Check logs
docker logs casperdev-ollama

# Restart service
docker-compose restart ollama
```

**Pieces OS Connection Failed:**
```bash
# Check service status
curl http://localhost:1000/health

# Restart Pieces
docker-compose restart pieces-os
```

**Model Download Issues:**
```bash
# Check available space
df -h

# Download manually
docker exec casperdev-ollama ollama pull llama3.2
```

## 🎯 Next Steps

Extend the connections by adding:
- **🧠 More AI Models**: GPT-4, Gemini, local fine-tuned models
- **🔍 Vector Search**: Embeddings for semantic code search
- **📱 Mobile App**: React Native with AI features
- **🌐 WebRTC**: Video calls with AI transcription
- **⚡ Edge Computing**: Deploy AI models to edge devices
- **🔗 Blockchain**: Decentralized AI model sharing
- **📊 Analytics**: AI usage patterns and insights

---

**Connect all the things... with AI! 🚀🤖**

For questions, contributions, or AI-powered assistance, open an issue or chat with the built-in AI assistant.