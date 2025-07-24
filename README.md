# Casperdev - Full-Stack Connected Application

A multi-service application with Node.js backend, Python microservice, React frontend, and agent orchestration system.

## 🚀 Quick Start

```bash
# Start all services
./start-all-services.sh

# Test all services
./test-all-services.sh

# Stop all services
./stop-all-services.sh
```

## 🏗️ Architecture

The application consists of four main services:

1. **Frontend (Port 3000)** - React application with Material-UI
2. **Backend (Port 5000)** - Node.js/Express API server
3. **Python Service (Port 8000)** - FastAPI microservice for integrations
4. **Orchestrator (Port 4000)** - Agent coordination service

## 📋 Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- MongoDB (optional, will work without it)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd casperdev
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ..
   ```

3. **Install Python dependencies**
   ```bash
   cd python-upwork-service
   python3 -m pip install -r requirements.txt
   cd ..
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## 🔧 Configuration

Create a `.env` file in the root directory with:

```env
# Node.js Backend
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/casperdev

# Python Service
PYTHON_SERVICE_URL=http://localhost:8000

# Integrations (optional)
SLACK_BOT_TOKEN=xoxb-your-token
HUBSPOT_ACCESS_TOKEN=your-token
UPWORK_CONSUMER_KEY=your-key
```

## 🚦 Running Services

### All Services at Once
```bash
./start-all-services.sh
```

### Individual Services
```bash
# Backend
node server/index.js

# Python Service
cd python-upwork-service
python3 -m uvicorn app:app --host 0.0.0.0 --port 8000

# Frontend
cd client
npm start

# Orchestrator
node agent-orchestrator.js
```

## 📊 Monitoring

### Health Endpoints
- Backend: http://localhost:5000/api/health
- Python: http://localhost:8000/health
- Orchestrator: http://localhost:4000/health

### Logs
All service logs are stored in the `logs/` directory:
- `backend.log` - Node.js backend logs
- `python.log` - Python service logs
- `orchestrator.log` - Agent orchestrator logs
- `frontend.log` - React development server logs

### Testing
Run the comprehensive test suite:
```bash
./test-all-services.sh
```

## 🔌 API Endpoints

### Backend API (Port 5000)
- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/messages` - Get messages
- `POST /api/agents/message` - Send agent message

### Python API (Port 8000)
- `GET /health` - Health check
- `POST /slack/command` - Handle Slack commands
- `GET /upwork/jobs` - Search Upwork jobs
- `POST /api/receive-message` - Receive agent messages

### Orchestrator API (Port 4000)
- `GET /health` - Health check with agent status
- WebSocket connection for real-time updates

## 🏛️ Project Structure

```
casperdev/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   └── App.js        # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   └── index.js          # Server entry point
├── python-upwork-service/ # Python microservice
│   ├── app.py           # FastAPI application
│   └── requirements.txt  # Python dependencies
├── logs/                 # Service logs
├── agent-orchestrator.js # Agent coordination
└── .env                 # Environment configuration
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
The application will run without MongoDB. To enable database functionality:
1. Install MongoDB locally or use MongoDB Atlas
2. Update `MONGODB_URI` in `.env`
3. Restart the backend service

### Port Conflicts
If ports are already in use:
```bash
# Find process using a port
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Python Dependencies
If you encounter Python package installation issues:
```bash
# Use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 🚀 Deployment

For production deployment:

1. Update environment variables for production
2. Enable HTTPS/SSL certificates
3. Use process managers (PM2, systemd)
4. Configure reverse proxy (Nginx)
5. Set up monitoring (Prometheus, Grafana)

## 📝 License

[Your License Here]

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request