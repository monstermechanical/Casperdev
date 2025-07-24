#!/bin/bash

echo "=== Starting All Services ==="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to start a service
start_service() {
    local name=$1
    local command=$2
    local log_file=$3
    
    echo -n "Starting $name... "
    
    # Check if already running
    if pgrep -f "$command" > /dev/null; then
        echo -e "${YELLOW}Already running${NC}"
    else
        nohup $command > "logs/$log_file" 2>&1 &
        sleep 2
        if pgrep -f "$command" > /dev/null; then
            echo -e "${GREEN}✓ Started${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    fi
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Backend (Node.js)
echo "1. Starting Backend Service (Node.js)"
cd /workspace
start_service "Backend" "node server/index.js" "backend.log"

# Start Python Service
echo "2. Starting Python Service (FastAPI)"
cd /workspace/python-upwork-service
start_service "Python" "python3 -m uvicorn app:app --host 0.0.0.0 --port 8000" "python.log"

# Start Orchestrator
echo "3. Starting Agent Orchestrator"
cd /workspace
start_service "Orchestrator" "node agent-orchestrator.js" "orchestrator.log"

# Start Frontend
echo "4. Starting Frontend (React)"
cd /workspace/client
echo -n "Starting Frontend... "
if lsof -i:3000 > /dev/null; then
    echo -e "${YELLOW}Already running${NC}"
else
    export BROWSER=none  # Prevent opening browser
    nohup npm start > ../logs/frontend.log 2>&1 &
    echo -e "${GREEN}✓ Started${NC}"
fi

echo
echo "=== All Services Started ==="
echo
echo "Access the application at:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend API: http://localhost:5000/api"
echo "  - Python API: http://localhost:8000"
echo "  - Orchestrator: http://localhost:4000"
echo
echo "View logs in the 'logs' directory:"
echo "  - tail -f logs/backend.log"
echo "  - tail -f logs/python.log"
echo "  - tail -f logs/orchestrator.log"
echo "  - tail -f logs/frontend.log"
echo
echo "To stop all services, run: ./stop-all-services.sh"