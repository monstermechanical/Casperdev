#!/bin/bash

echo "=== Stopping All Services ==="
echo

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to stop a service
stop_service() {
    local name=$1
    local pattern=$2
    
    echo -n "Stopping $name... "
    
    pids=$(pgrep -f "$pattern")
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}Not running${NC}"
    else
        kill $pids 2>/dev/null
        sleep 1
        # Force kill if still running
        if pgrep -f "$pattern" > /dev/null; then
            pkill -9 -f "$pattern" 2>/dev/null
        fi
        echo -e "${GREEN}✓ Stopped${NC}"
    fi
}

# Stop all services
stop_service "Frontend (React)" "react-scripts start"
stop_service "Backend (Node.js)" "node server/index.js"
stop_service "Python Service" "uvicorn app:app"
stop_service "Orchestrator" "node agent-orchestrator.js"

# Also stop any npm start processes
echo -n "Stopping npm processes... "
pkill -f "npm start" 2>/dev/null
echo -e "${GREEN}✓ Done${NC}"

echo
echo "=== All Services Stopped ==="
echo
echo "To start all services again, run: ./start-all-services.sh"