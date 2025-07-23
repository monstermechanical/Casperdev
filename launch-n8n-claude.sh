#!/bin/bash

# n8n Claude Workflow Launcher
# This script sets up and launches n8n with Claude AI integration

echo "🚀 Launching n8n Claude Workflow"
echo "================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${BLUE}💡 Please create .env file with required variables:${NC}"
    echo "CLAUDE_API_KEY=your-claude-key"
    echo "SLACK_BOT_TOKEN=your-slack-token"
    echo "JWT_SECRET=your-jwt-secret"
    exit 1
fi

# Load environment variables
echo -e "${BLUE}📋 Loading environment variables...${NC}"
set -a
source .env 2>/dev/null || true
set +a

# Validate required environment variables
required_vars=("CLAUDE_API_KEY" "SLACK_BOT_TOKEN" "JWT_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Check if Docker is running
echo -e "${BLUE}🐳 Checking Docker status...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Check if CasperDev application is running
echo -e "${BLUE}🔍 Checking CasperDev application...${NC}"
if ! curl -s --fail http://localhost:5000/api/health >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  CasperDev application not detected on port 5000${NC}"
    echo -e "${BLUE}💡 Make sure to start your main application with: npm run dev${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ CasperDev application is running${NC}"
fi

# Create network if it doesn't exist
echo -e "${BLUE}🌐 Setting up Docker network...${NC}"
docker network create casperdev_default 2>/dev/null || true
echo -e "${GREEN}✅ Network ready${NC}"

# Stop any existing n8n containers
echo -e "${BLUE}🔄 Cleaning up existing containers...${NC}"
docker-compose -f docker-compose.n8n.yml down --remove-orphans 2>/dev/null || true

# Generate JWT token for n8n to use
echo -e "${BLUE}🔑 Setting up authentication...${NC}"
# You'll need to implement actual JWT token generation here
# For now, we'll use a placeholder
export CASPERDEV_JWT_TOKEN="your-jwt-token-here"

# Start n8n services
echo -e "${BLUE}🚀 Starting n8n services...${NC}"
docker-compose -f docker-compose.n8n.yml up -d

# Wait for n8n to be ready
echo -e "${BLUE}⏳ Waiting for n8n to start...${NC}"
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -s --fail http://localhost:5678 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ n8n is ready!${NC}"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done

if [ $counter -eq $timeout ]; then
    echo -e "${RED}❌ n8n failed to start within $timeout seconds${NC}"
    echo -e "${BLUE}💡 Check logs with: docker-compose -f docker-compose.n8n.yml logs${NC}"
    exit 1
fi

# Import workflows
echo -e "${BLUE}📁 Setting up workflows...${NC}"
sleep 5  # Give n8n a bit more time to fully initialize

# Function to import workflow
import_workflow() {
    local workflow_file=$1
    local workflow_name=$2
    
    echo -e "${BLUE}📊 Importing $workflow_name...${NC}"
    
    # Try to import the workflow via n8n API
    response=$(curl -s -w "%{http_code}" -o /tmp/n8n_response.json \
        -X POST "http://localhost:5678/rest/workflows/import" \
        -H "Content-Type: application/json" \
        -u "admin:admin123" \
        -d @"$workflow_file")
    
    if [ "$response" = "200" ] || [ "$response" = "201" ]; then
        echo -e "${GREEN}✅ $workflow_name imported successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  $workflow_name import may have failed (HTTP $response)${NC}"
        echo -e "${BLUE}💡 You can manually import it via the n8n web interface${NC}"
    fi
}

# Import workflows
import_workflow "n8n/workflows/claude-slack-workflow.json" "Claude Slack Integration"
import_workflow "n8n/workflows/claude-content-automation.json" "Claude Content Automation"

# Display success information
echo ""
echo -e "${GREEN}🎉 n8n Claude Workflow launched successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Access Information:${NC}"
echo -e "🌐 n8n Web Interface: ${YELLOW}http://localhost:5678${NC}"
echo -e "👤 Username: ${YELLOW}admin${NC}"
echo -e "🔒 Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${BLUE}🤖 Available Workflows:${NC}"
echo "1. 💬 Claude Slack Integration - Interactive AI in Slack"
echo "2. 📊 Claude Content Automation - Daily automated reports"
echo ""
echo -e "${BLUE}🎯 Quick Actions:${NC}"
echo "• Open n8n: http://localhost:5678"
echo "• Test in Slack: @claude hello"
echo "• View logs: docker-compose -f docker-compose.n8n.yml logs -f"
echo "• Stop n8n: docker-compose -f docker-compose.n8n.yml down"
echo ""
echo -e "${BLUE}📚 Next Steps:${NC}"
echo "1. Open n8n web interface and activate workflows"
echo "2. Configure Slack credentials in n8n"
echo "3. Test the Claude integration in your Slack workspace"
echo "4. Customize workflows for your specific use cases"
echo ""
echo -e "${GREEN}🚀 Ready to automate with Claude AI!${NC}"

# Optional: Open browser
if command -v xdg-open >/dev/null 2>&1; then
    read -p "Open n8n in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open http://localhost:5678
    fi
elif command -v open >/dev/null 2>&1; then
    read -p "Open n8n in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:5678
    fi
fi