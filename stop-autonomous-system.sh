#!/bin/bash

echo "🛑 Stopping Autonomous System"
echo "============================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Function to stop process by PID file
stop_service_by_pid() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_info "Stopping $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null
            
            # Wait for graceful shutdown
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                print_warning "Force killing $service_name..."
                kill -9 "$pid" 2>/dev/null
            fi
            
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running (PID: $pid)"
        fi
        
        rm -f "$pid_file"
    else
        print_info "No PID file found for $service_name"
    fi
}

# Stop services by PID files
print_info "Stopping services using PID files..."

stop_service_by_pid "Autonomous Orchestrator" ".autonomous.pid"
stop_service_by_pid "Agent Orchestrator" ".orchestrator.pid"
stop_service_by_pid "Backend Server" ".backend.pid"
stop_service_by_pid "Python Service" ".python.pid"

# Kill any remaining processes by pattern matching
print_info "Killing remaining processes..."

# Kill processes by pattern
PATTERNS=(
    "node.*autonomous-deployment-orchestrator"
    "node.*agent-orchestrator"
    "node.*server/index.js"
    "python.*app.py"
)

for pattern in "${PATTERNS[@]}"; do
    pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_info "Killing processes matching: $pattern"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 2
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

# Kill processes on specific ports
print_info "Freeing up ports..."

PORTS=(4000 4001 5000 8000)
for port in "${PORTS[@]}"; do
    pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_info "Killing processes on port $port"
        echo "$pids" | xargs kill -TERM 2>/dev/null || true
        sleep 1
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

# Clean up Docker containers if running
if command -v docker >/dev/null 2>&1; then
    print_info "Checking Docker containers..."
    
    # Stop containers defined in docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
        docker-compose down --remove-orphans 2>/dev/null || true
        print_success "Docker containers stopped"
    fi
fi

# Deactivate Python virtual environment if active
if [ ! -z "$VIRTUAL_ENV" ]; then
    print_info "Deactivating Python virtual environment..."
    deactivate 2>/dev/null || true
fi

# Clean up temporary files
print_info "Cleaning up temporary files..."
rm -f .autonomous.pid .orchestrator.pid .backend.pid .python.pid

# Check if any processes are still running
print_info "Verifying all processes stopped..."

remaining_processes=0
for pattern in "${PATTERNS[@]}"; do
    if pgrep -f "$pattern" >/dev/null 2>&1; then
        print_warning "Some processes still running: $pattern"
        remaining_processes=$((remaining_processes + 1))
    fi
done

# Check ports
active_ports=0
for port in "${PORTS[@]}"; do
    if lsof -i:$port >/dev/null 2>&1; then
        print_warning "Port $port is still in use"
        active_ports=$((active_ports + 1))
    fi
done

echo ""
echo "🏁 Shutdown Summary"
echo "=================="

if [ $remaining_processes -eq 0 ] && [ $active_ports -eq 0 ]; then
    print_success "All autonomous services stopped successfully!"
    print_success "All ports freed"
else
    if [ $remaining_processes -gt 0 ]; then
        print_warning "$remaining_processes process patterns still active"
    fi
    if [ $active_ports -gt 0 ]; then
        print_warning "$active_ports ports still in use"
    fi
    echo ""
    print_info "If issues persist, you may need to:"
    echo "• Manually kill remaining processes: pkill -f 'node.*autonomous'"
    echo "• Check for zombie processes: ps aux | grep node"
    echo "• Restart your terminal session"
fi

echo ""
print_info "Log files preserved in logs/ directory"
print_info "To restart the system: ./deploy-autonomous-system.sh"
echo ""
echo "Shutdown completed at: $(date)"
echo "======================================"