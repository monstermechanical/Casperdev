#!/bin/bash

echo "🐍 Setting up Slack-to-Upwork Python Integration"
echo "==============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Python is installed
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_status "Python found: $PYTHON_VERSION"
    else
        print_error "Python 3 is not installed. Please install Python 3.8 or higher."
        exit 1
    fi
}

# Check if pip is installed
check_pip() {
    if command -v pip3 &> /dev/null; then
        print_status "pip3 is available"
    else
        print_error "pip3 is not installed. Please install pip."
        exit 1
    fi
}

# Setup Python service
setup_python_service() {
    print_info "Setting up Python Upwork service..."
    
    # Create Python service directory if it doesn't exist
    if [ ! -d "python-upwork-service" ]; then
        print_error "Python service directory not found."
        print_info "Please ensure you're in the correct directory with python-upwork-service/ folder"
        exit 1
    fi
    
    cd python-upwork-service
    
    # Create virtual environment
    print_info "Creating Python virtual environment..."
    python3 -m venv upwork_env
    
    # Activate virtual environment
    source upwork_env/bin/activate
    
    # Install dependencies
    print_info "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Copy environment file
    if [ ! -f .env ]; then
        print_info "Creating Python service environment file..."
        cp .env.example .env
        print_warning "Please configure .env file with your Upwork API credentials"
    else
        print_status "Python service .env file already exists"
    fi
    
    cd ..
    print_status "Python service setup complete!"
}

# Update main .env file
update_main_env() {
    print_info "Updating main .env file with Python service configuration..."
    
    # Add Python service URL if not already present
    if ! grep -q "PYTHON_SERVICE_URL" .env; then
        echo "" >> .env
        echo "# Python Upwork Service Configuration" >> .env
        echo "PYTHON_SERVICE_URL=http://localhost:8000" >> .env
        print_status "Added Python service URL to .env"
    else
        print_status "Python service URL already configured"
    fi
}

# Test the setup
test_setup() {
    print_info "Testing the integrated setup..."
    
    # Check if Node.js server is running
    if curl -s http://localhost:5000/api/health > /dev/null; then
        print_status "Node.js server is running"
        
        # Test Python bridge endpoint
        if curl -s -H "Authorization: Bearer test" http://localhost:5000/api/bridge/python/health > /dev/null 2>&1; then
            print_status "Python bridge endpoint is accessible"
        else
            print_warning "Python bridge endpoint not accessible (this is normal if Python service isn't running)"
        fi
    else
        print_warning "Node.js server is not running. Start it with: npm run server"
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    print_info "🚀 Setup Complete! Next Steps:"
    echo "=============================="
    echo ""
    
    echo "1. 🔴 Configure Slack Bot Token (if not done):"
    echo "   - Get real token from https://api.slack.com/apps"
    echo "   - Update SLACK_BOT_TOKEN in .env"
    echo ""
    
    echo "2. 🔑 Configure Upwork API Credentials:"
    echo "   - Visit: https://www.upwork.com/services/api/apply"
    echo "   - Create API application"
    echo "   - Update python-upwork-service/.env with:"
    echo "     * UPWORK_CONSUMER_KEY"
    echo "     * UPWORK_CONSUMER_SECRET"
    echo "     * UPWORK_ACCESS_TOKEN"
    echo "     * UPWORK_ACCESS_TOKEN_SECRET"
    echo ""
    
    echo "3. 🚀 Start Both Services:"
    echo "   Terminal 1: npm run server"
    echo "   Terminal 2: cd python-upwork-service && source upwork_env/bin/activate && python app.py"
    echo ""
    
    echo "4. ✅ Test Integration:"
    echo "   - Check status: curl http://localhost:5000/api/bridge/python/health"
    echo "   - Search jobs: curl 'http://localhost:8000/upwork/jobs?query=python+developer'"
    echo ""
    
    echo "5. 🤖 Setup Autonomous Triggers:"
    echo "   - Cron jobs for scheduled searches"
    echo "   - Slack webhooks for real-time commands"
    echo "   - Custom automation logic"
    echo ""
    
    print_info "Architecture: Slack → Node.js → Python → Upwork API → Response → Slack"
    print_info "For detailed setup: See SLACK_VERIFICATION_CHECKLIST.md"
}

# Main setup function
main() {
    print_info "Starting Python integration setup..."
    
    check_python
    check_pip
    setup_python_service
    update_main_env
    test_setup
    show_next_steps
    
    echo ""
    print_status "Python integration setup completed!"
    echo ""
    print_warning "Remember to configure your API credentials before testing"
}

# Run main function
main