#!/bin/bash

echo "🛑 Stopping Agent Orchestrator System"
echo "===================================="

# Function to stop a process by PID file
stop_process() {
    local name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "🛑 Stopping $name (PID: $pid)..."
            kill "$pid"
            
            # Wait up to 5 seconds for graceful shutdown
            for i in {1..5}; do
                if ! ps -p "$pid" > /dev/null 2>&1; then
                    echo "✅ $name stopped gracefully"
                    break
                fi
                sleep 1
            done
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "⚠️ Force killing $name..."
                kill -9 "$pid" 2>/dev/null
            fi
        else
            echo "⚠️ $name process not found"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️ $name PID file not found"
    fi
}

# Stop individual agents
stop_process "Python Agent" ".python.pid"
stop_process "Backend Agent" ".backend.pid"
stop_process "Orchestrator" ".orchestrator.pid"

# Additional cleanup - kill any remaining processes
echo "🧹 Additional cleanup..."
pkill -f "node.*agent-orchestrator" 2>/dev/null || true
pkill -f "node.*server/index.js" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

# Check if ports are now free
check_port_free() {
    local port=$1
    local name=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️ Port $port ($name) is still in use"
        return 1
    else
        echo "✅ Port $port ($name) is now free"
        return 0
    fi
}

echo "🔍 Checking ports..."
check_port_free 4000 "Orchestrator"
check_port_free 5000 "Backend"
check_port_free 8000 "Python"

# Clean up log files if requested
if [ "$1" = "--clean-logs" ]; then
    echo "🧹 Cleaning up log files..."
    rm -rf logs/
    echo "✅ Log files cleaned"
fi

echo ""
echo "✅ All agents stopped successfully"
echo "🚀 To start agents again, run: ./start-agents.sh"