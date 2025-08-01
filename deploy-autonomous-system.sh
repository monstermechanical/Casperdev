#!/bin/bash

echo "🚀 Autonomous System Deployment Started"
echo "======================================"
echo "Target User: U098G3Y2YDT"
echo "System: BFai Team Multi-Agent Platform"
echo "======================================"

# Set environment variables if not already set
export NODE_ENV="${NODE_ENV:-development}"
export ORCHESTRATOR_PORT="${ORCHESTRATOR_PORT:-4001}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_phase() {
    echo -e "${PURPLE}🎯 PHASE $1: $2${NC}"
    echo "----------------------------------------"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️ $1${NC}"
}

# Function to check if a port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_success "$name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$name failed to start within expected time"
    return 1
}

# Function to kill existing processes
cleanup_existing_processes() {
    print_info "Cleaning up existing processes..."
    
    # Kill existing services
    pkill -f "node.*autonomous-deployment-orchestrator" 2>/dev/null || true
    pkill -f "node.*agent-orchestrator" 2>/dev/null || true
    pkill -f "node.*server/index.js" 2>/dev/null || true
    pkill -f "python.*app.py" 2>/dev/null || true
    
    # Wait for cleanup
    sleep 3
    
    print_success "Cleanup completed"
}

# Phase 1: Pre-deployment checks
print_phase "1" "Pre-deployment Verification"

# Check required files
REQUIRED_FILES=(
    "package.json"
    "server/index.js"
    "agent-orchestrator.js"
    "autonomous-deployment-orchestrator.js"
    "docker-compose.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found $file"
    else
        print_error "Missing required file: $file"
        exit 1
    fi
done

# Check Node.js and npm
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    print_success "Node.js version: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    print_success "npm version: $NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi

# Check for .env file
if [ -f ".env" ]; then
    print_success "Environment file found"
else
    print_warning "No .env file found - using defaults"
fi

# Phase 2: Dependencies Installation
print_phase "2" "Dependencies Installation"

print_info "Installing Node.js dependencies..."
npm install --silent

if [ $? -eq 0 ]; then
    print_success "Node.js dependencies installed"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

# Check if Python service dependencies are installed
if [ -d "python-upwork-service" ]; then
    if [ -f "python-upwork-service/requirements.txt" ]; then
        print_info "Installing Python dependencies..."
        cd python-upwork-service
        
        # Create virtual environment if it doesn't exist
        if [ ! -d "../upwork_env" ]; then
            python3 -m venv ../upwork_env
        fi
        
        source ../upwork_env/bin/activate
        pip install -r requirements.txt --quiet
        cd ..
        
        print_success "Python dependencies installed"
    fi
fi

# Phase 3: System Cleanup
print_phase "3" "System Cleanup"

cleanup_existing_processes

# Check ports availability
REQUIRED_PORTS=(4000 4001 5000 8000)
for port in "${REQUIRED_PORTS[@]}"; do
    if check_port $port; then
        print_success "Port $port is available"
    else
        print_warning "Port $port is in use - will attempt to kill existing process"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        
        if check_port $port; then
            print_success "Port $port is now available"
        else
            print_error "Failed to free port $port"
            exit 1
        fi
    fi
done

# Phase 4: Service Startup
print_phase "4" "Multi-Service Startup"

# Create logs directory
mkdir -p logs

print_info "Starting Autonomous Deployment Orchestrator (Port 4001)..."
node autonomous-deployment-orchestrator.js > logs/autonomous-orchestrator.log 2>&1 &
AUTONOMOUS_PID=$!
echo "$AUTONOMOUS_PID" > .autonomous.pid
print_success "Autonomous Orchestrator PID: $AUTONOMOUS_PID"

print_info "Starting Agent Orchestrator (Port 4000)..."
node agent-orchestrator.js > logs/orchestrator.log 2>&1 &
ORCHESTRATOR_PID=$!
echo "$ORCHESTRATOR_PID" > .orchestrator.pid
print_success "Agent Orchestrator PID: $ORCHESTRATOR_PID"

print_info "Starting Backend Server (Port 5000)..."
node server/index.js > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > .backend.pid
print_success "Backend Server PID: $BACKEND_PID"

# Start Python service if available
if [ -d "python-upwork-service" ]; then
    print_info "Starting Python Service (Port 8000)..."
    if [ -d "upwork_env" ]; then
        source upwork_env/bin/activate
    fi
    python3 python-upwork-service/app.py > logs/python.log 2>&1 &
    PYTHON_PID=$!
    echo "$PYTHON_PID" > .python.pid
    print_success "Python Service PID: $PYTHON_PID"
fi

# Phase 5: Service Health Verification
print_phase "5" "Service Health Verification"

# Wait for services to start
sleep 5

# Verify services are running
SERVICES=(
    "Autonomous Orchestrator|$AUTONOMOUS_PID|http://localhost:4001/health"
    "Agent Orchestrator|$ORCHESTRATOR_PID|http://localhost:4000/health"
    "Backend Server|$BACKEND_PID|http://localhost:5000/health"
)

if [ ! -z "$PYTHON_PID" ]; then
    SERVICES+=("Python Service|$PYTHON_PID|http://localhost:8000/health")
fi

HEALTHY_SERVICES=0
TOTAL_SERVICES=${#SERVICES[@]}

for service_info in "${SERVICES[@]}"; do
    IFS='|' read -r name pid url <<< "$service_info"
    
    if ps -p $pid > /dev/null; then
        if wait_for_service "$name" "$url"; then
            HEALTHY_SERVICES=$((HEALTHY_SERVICES + 1))
        else
            print_warning "$name is running but not responding to health checks"
        fi
    else
        print_error "$name failed to start (PID: $pid)"
    fi
done

# Phase 6: Autonomous Deployment Trigger
print_phase "6" "Autonomous Deployment Execution"

if [ $HEALTHY_SERVICES -ge 3 ]; then
    print_success "System is ready for autonomous deployment"
    
    # Wait a bit more for systems to fully initialize
    sleep 5
    
    print_info "Triggering autonomous onboarding for user U098G3Y2YDT..."
    
    # Trigger the autonomous deployment
    DEPLOY_RESPONSE=$(curl -s -X POST http://localhost:4001/deploy/autonomous \
        -H "Content-Type: application/json" \
        -w "HTTP_STATUS:%{http_code}" 2>/dev/null)
    
    HTTP_STATUS=$(echo "$DEPLOY_RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$DEPLOY_RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$HTTP_STATUS" = "200" ]; then
        print_success "Autonomous deployment triggered successfully!"
        
        # Parse and display deployment status
        echo ""
        echo "📊 Deployment Status:"
        echo "===================="
        echo "$RESPONSE_BODY" | jq -r '
            "Start Time: " + .startTime,
            "Status: " + .status,
            "",
            "Phases Completed:",
            (.phases[] | "• " + .name + ": " + .status)
        ' 2>/dev/null || echo "$RESPONSE_BODY"
        
    else
        print_warning "Failed to trigger autonomous deployment (HTTP $HTTP_STATUS)"
        echo "Response: $RESPONSE_BODY"
    fi
    
else
    print_error "Insufficient healthy services ($HEALTHY_SERVICES/$TOTAL_SERVICES) - skipping autonomous deployment"
fi

# Phase 7: System Status Summary
print_phase "7" "Deployment Summary"

echo ""
echo "🎯 Autonomous System Deployment Complete!"
echo "========================================"
echo ""
echo "📊 Service Status:"
echo "• Healthy Services: $HEALTHY_SERVICES/$TOTAL_SERVICES"
echo "• Target User: U098G3Y2YDT"
echo "• BFai Team Integration: Multi-system access provisioning"
echo ""
echo "🌐 Access Points:"
echo "• Autonomous Orchestrator: http://localhost:4001/health"
echo "• Agent Orchestrator:     http://localhost:4000/health"
echo "• Backend API:            http://localhost:5000/health"
if [ ! -z "$PYTHON_PID" ]; then
    echo "• Python Service:         http://localhost:8000/health"
fi
echo ""
echo "📋 Management Commands:"
echo "• Check onboarding status: curl http://localhost:4001/onboard/status"
echo "• Trigger user onboarding: curl -X POST http://localhost:4001/onboard/user"
echo "• Verify all systems:      curl -X POST http://localhost:4001/verify/systems"
echo "• View agent dashboard:    file://$(pwd)/agent-dashboard.html"
echo ""
echo "📁 Log Files:"
echo "• Autonomous Orchestrator: tail -f logs/autonomous-orchestrator.log"
echo "• Agent Orchestrator:      tail -f logs/orchestrator.log"
echo "• Backend Server:          tail -f logs/backend.log"
if [ ! -z "$PYTHON_PID" ]; then
    echo "• Python Service:          tail -f logs/python.log"
fi
echo ""
echo "🛑 To stop all services: ./stop-autonomous-system.sh"
echo ""

if [ $HEALTHY_SERVICES -eq $TOTAL_SERVICES ]; then
    print_success "All systems operational - Autonomous deployment ready!"
    echo ""
    echo "🎉 User U098G3Y2YDT onboarding workflow has been initiated!"
    echo "Check Slack #team-introductions channel for welcome message."
else
    print_warning "Some services may not be fully operational - check logs for details"
fi

echo ""
echo "Deployment completed at: $(date)"
echo "======================================"