#!/bin/bash

echo "🎯 Starting Agent Orchestrator System"
echo "===================================="

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*agent-orchestrator" 2>/dev/null || true
pkill -f "node.*server/index.js" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
sleep 2

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️ Port $port is in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check required ports
echo "🔍 Checking required ports..."
check_port 4000  # Orchestrator
check_port 5000  # Backend
check_port 8000  # Python service

# Start the Agent Orchestrator in the background
echo "🚀 Starting Agent Orchestrator (Port 4000)..."
node agent-orchestrator.js > logs/orchestrator.log 2>&1 &
ORCHESTRATOR_PID=$!
echo "   📋 Orchestrator PID: $ORCHESTRATOR_PID"

# Wait for orchestrator to start
sleep 3

# Check if orchestrator is running
if ! ps -p $ORCHESTRATOR_PID > /dev/null; then
    echo "❌ Failed to start Agent Orchestrator"
    exit 1
fi

echo "✅ Agent Orchestrator started successfully"

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Backend Agent
echo "🚀 Starting Backend Agent (Port 5000)..."
node server/index.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   📋 Backend PID: $BACKEND_PID"

# Start Python Agent
echo "🚀 Starting Python Agent (Port 8000)..."
if [ -d "upwork_env" ]; then
    source upwork_env/bin/activate
    python3 python-upwork-service/app.py > logs/python.log 2>&1 &
else
    python3 python-upwork-service/app.py > logs/python.log 2>&1 &
fi
PYTHON_PID=$!
echo "   📋 Python PID: $PYTHON_PID"

# Wait for services to start
echo "⏳ Waiting for agents to initialize..."
sleep 5

# Check if all services are running
echo "🔍 Checking agent status..."

services_running=0

if ps -p $ORCHESTRATOR_PID > /dev/null; then
    echo "✅ Orchestrator is running (PID: $ORCHESTRATOR_PID)"
    services_running=$((services_running + 1))
else
    echo "❌ Orchestrator failed to start"
fi

if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend is running (PID: $BACKEND_PID)"
    services_running=$((services_running + 1))
else
    echo "❌ Backend failed to start"
fi

if ps -p $PYTHON_PID > /dev/null; then
    echo "✅ Python service is running (PID: $PYTHON_PID)"
    services_running=$((services_running + 1))
else
    echo "❌ Python service failed to start"
fi

# Test connections
echo "🔗 Testing agent connections..."

test_endpoint() {
    local name=$1
    local url=$2
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo "✅ $name is responding at $url"
        return 0
    else
        echo "❌ $name is not responding at $url"
        return 1
    fi
}

connections_working=0

if test_endpoint "Orchestrator" "http://localhost:4000/health"; then
    connections_working=$((connections_working + 1))
fi

if test_endpoint "Backend" "http://localhost:5000/health"; then
    connections_working=$((connections_working + 1))
fi

if test_endpoint "Python" "http://localhost:8000/health"; then
    connections_working=$((connections_working + 1))
fi

echo ""
echo "📊 Status Summary:"
echo "=================="
echo "Services running: $services_running/3"
echo "Connections working: $connections_working/3"
echo ""

if [ $services_running -eq 3 ] && [ $connections_working -eq 3 ]; then
    echo "🎉 All agents are connected and running!"
    echo ""
    echo "🌐 Access Points:"
    echo "• Agent Dashboard:  http://localhost:4000/health"
    echo "• Orchestrator API: http://localhost:4000"
    echo "• Backend API:      http://localhost:5000/api"
    echo "• Python API:       http://localhost:8000"
    echo ""
    echo "📱 Open the dashboard to monitor your agents:"
    echo "   file://$(pwd)/agent-dashboard.html"
    echo ""
    echo "🎮 Test agent communication:"
    echo "   curl -X POST http://localhost:4000/agents/communicate \\"
    echo "        -H 'Content-Type: application/json' \\"
    echo "        -d '{\"from\":\"orchestrator\",\"to\":\"python\",\"action\":\"ping\",\"message\":\"hello\"}'"
    echo ""
else
    echo "⚠️ Some agents failed to start properly"
    echo "📋 Process IDs:"
    echo "   Orchestrator: $ORCHESTRATOR_PID"
    echo "   Backend: $BACKEND_PID" 
    echo "   Python: $PYTHON_PID"
    echo ""
    echo "📋 Check logs for details:"
    echo "   tail -f logs/orchestrator.log"
    echo "   tail -f logs/backend.log"
    echo "   tail -f logs/python.log"
fi

# Save PIDs for later cleanup
echo "$ORCHESTRATOR_PID" > .orchestrator.pid
echo "$BACKEND_PID" > .backend.pid
echo "$PYTHON_PID" > .python.pid

echo ""
echo "🛑 To stop all agents, run: ./stop-agents.sh"