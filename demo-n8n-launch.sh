#!/bin/bash

# Demo n8n Claude Workflow Launcher
# This script demonstrates the n8n setup even without full API configuration

echo "🚀 Demo: n8n Claude Workflow System"
echo "====================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 This is a demonstration of the n8n Claude workflow system${NC}"
echo -e "${YELLOW}⚠️  For full functionality, configure your API keys in .env file${NC}"
echo ""

# Check if Docker is running
echo -e "${BLUE}🐳 Checking Docker status...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Create network if it doesn't exist
echo -e "${BLUE}🌐 Setting up Docker network...${NC}"
docker network create casperdev_default 2>/dev/null || true
echo -e "${GREEN}✅ Network ready${NC}"

# Stop any existing n8n containers
echo -e "${BLUE}🔄 Cleaning up existing containers...${NC}"
docker-compose -f docker-compose.n8n.yml down --remove-orphans 2>/dev/null || true

# Set basic environment variables for demo
export CLAUDE_API_KEY=${CLAUDE_API_KEY:-"demo-key-configure-in-env"}
export SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN:-"demo-token-configure-in-env"}
export JWT_SECRET=${JWT_SECRET:-"demo-secret-for-development"}
export CASPERDEV_JWT_TOKEN="demo-jwt-token"

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

# Display success information
echo ""
echo -e "${GREEN}🎉 n8n Demo launched successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Access Information:${NC}"
echo -e "🌐 n8n Web Interface: ${YELLOW}http://localhost:5678${NC}"
echo -e "👤 Username: ${YELLOW}admin${NC}"
echo -e "🔒 Password: ${YELLOW}admin123${NC}"
echo ""
echo -e "${BLUE}📁 Available Workflow Files:${NC}"
echo "• n8n/workflows/claude-slack-workflow.json"
echo "• n8n/workflows/claude-content-automation.json"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Open n8n web interface: http://localhost:5678"
echo "2. Import workflow files manually via the interface"
echo "3. Configure API credentials in n8n"
echo "4. Activate workflows once credentials are set"
echo ""
echo -e "${YELLOW}⚠️  For Full Integration:${NC}"
echo "• Add your Claude API key to .env: CLAUDE_API_KEY=sk-ant-..."
echo "• Add your Slack Bot Token to .env: SLACK_BOT_TOKEN=xoxb-..."
echo "• Ensure CasperDev app is running: npm run dev"
echo "• Run full launch: ./launch-n8n-claude.sh"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "• View logs: docker-compose -f docker-compose.n8n.yml logs -f"
echo "• Stop n8n: docker-compose -f docker-compose.n8n.yml down"
echo "• Restart n8n: docker-compose -f docker-compose.n8n.yml restart"
echo ""
echo -e "${GREEN}🚀 n8n is now running and ready for configuration!${NC}"

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