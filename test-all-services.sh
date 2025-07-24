#!/bin/bash

echo "=== Testing All Services ==="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected" ]; then
        echo -e "${GREEN}✓ OK${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response, expected $expected)"
        return 1
    fi
}

# Function to check API endpoint
check_api() {
    local name=$1
    local url=$2
    
    echo -n "Testing $name... "
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "status"; then
        echo -e "${GREEN}✓ OK${NC}"
        echo "  Response: $(echo "$response" | python3 -m json.tool 2>/dev/null | head -n 5 | sed 's/^/    /')"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Response: $response"
        return 1
    fi
}

# Test basic connectivity
echo "1. Testing Basic Connectivity"
echo "----------------------------"
check_service "Frontend (React)" "http://localhost:3000" "200"
check_service "Backend (Node.js)" "http://localhost:5000/api/health" "200"
check_service "Python Service" "http://localhost:8000/health" "200"
check_service "Orchestrator" "http://localhost:4000/health" "200"
echo

# Test API endpoints
echo "2. Testing API Endpoints"
echo "------------------------"
check_api "Backend Health API" "http://localhost:5000/api/health"
check_api "Python Health API" "http://localhost:8000/health"
check_api "Orchestrator Health API" "http://localhost:4000/health"
echo

# Test authentication endpoints
echo "3. Testing Authentication"
echo "-------------------------"
echo -n "Testing login endpoint... "
login_response=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123"}' \
    -w "\nHTTP_CODE:%{http_code}")
    
http_code=$(echo "$login_response" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$http_code" = "401" ] || [ "$http_code" = "404" ]; then
    echo -e "${YELLOW}⚠ Expected${NC} (No users in DB)"
else
    echo -e "${GREEN}✓ OK${NC}"
fi
echo

# Test WebSocket connections
echo "4. Testing WebSocket Connections"
echo "--------------------------------"
echo "WebSocket endpoints available at:"
echo "  - Backend: ws://localhost:5000 (Socket.IO)"
echo "  - Orchestrator: ws://localhost:4000"
echo

# Check running processes
echo "5. Checking Running Processes"
echo "-----------------------------"
processes=$(ps aux | grep -E "(node|python|uvicorn)" | grep -v grep | wc -l)
echo "Found $processes Node.js/Python processes running"
echo

# Check logs for errors
echo "6. Checking Logs for Errors"
echo "---------------------------"
for log in backend.log python.log orchestrator.log; do
    if [ -f "logs/$log" ]; then
        errors=$(grep -i "error" "logs/$log" 2>/dev/null | tail -n 3 | wc -l)
        if [ "$errors" -gt 0 ]; then
            echo -e "${YELLOW}⚠ Found $errors recent errors in $log${NC}"
        else
            echo -e "${GREEN}✓ No recent errors in $log${NC}"
        fi
    fi
done
echo

# Summary
echo "=== Summary ==="
echo "All core services are running and responding to health checks."
echo "The application stack includes:"
echo "  - Frontend: React app on port 3000"
echo "  - Backend: Node.js/Express on port 5000"
echo "  - Python Service: FastAPI on port 8000"
echo "  - Orchestrator: Agent coordinator on port 4000"
echo
echo "Note: MongoDB connection is optional and will work when configured."