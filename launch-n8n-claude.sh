#!/bin/bash

echo "🚀 Launching n8n Claude Workflow Platform"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
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

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

print_status "Docker Compose is available"

# Create necessary directories
mkdir -p n8n-workflows
print_status "Created workflow directories"

print_info "Starting n8n and supporting services..."
echo ""

# Start the services
docker-compose up -d mongodb redis n8n

echo ""
print_info "Waiting for services to start..."
sleep 10

# Check service status
if docker ps | grep -q "casperdev-n8n"; then
    print_status "n8n is running successfully!"
else
    print_error "Failed to start n8n"
    exit 1
fi

if docker ps | grep -q "casperdev-mongodb"; then
    print_status "MongoDB is running"
else
    print_warning "MongoDB may not be running properly"
fi

if docker ps | grep -q "casperdev-redis"; then
    print_status "Redis is running"
else
    print_warning "Redis may not be running properly"
fi

echo ""
echo "🎯 n8n Claude Workflow Platform Ready!"
echo "======================================"
echo ""
echo "📱 Access URLs:"
echo "  🔧 n8n Interface: http://localhost:5678"
echo "  🔑 Username: admin"
echo "  🔑 Password: password"
echo ""
echo "🤖 Claude Workflow Features:"
echo "  • HubSpot CRM integration"
echo "  • Claude AI assistant for data analysis"
echo "  • Slack notifications"
echo "  • Webhook triggers"
echo ""
echo "📝 Setup Instructions:"
echo "  1. Open http://localhost:5678 in your browser"
echo "  2. Login with admin/password"
echo "  3. Import the Claude workflow from: n8n-workflows/claude-hubspot-workflow.json"
echo "  4. Configure your API credentials:"
echo "     - Claude/Anthropic API key"
echo "     - HubSpot access token"
echo "     - Slack bot token"
echo ""
echo "🔧 API Credentials Setup:"
echo "  1. Go to Settings > Credentials in n8n"
echo "  2. Add these credential types:"
echo "     • Anthropic API (for Claude)"
echo "     • HubSpot API"
echo "     • Slack API"
echo ""
echo "🚀 Testing the Workflow:"
echo "  • Webhook URL: http://localhost:5678/webhook/claude-assistant"
echo "  • Method: POST"
echo "  • Example payload:"
echo "    {"
echo "      \"query\": \"Analyze this contact for follow-up actions\","
echo "      \"contactId\": \"123456\","
echo "      \"slackChannel\": \"#sales\""
echo "    }"
echo ""
echo "📚 Documentation:"
echo "  • n8n Docs: https://docs.n8n.io"
echo "  • Claude API: https://docs.anthropic.com"
echo "  • HubSpot API: https://developers.hubspot.com"
echo ""

print_info "To stop the services, run: docker-compose down"
print_info "To view logs, run: docker-compose logs -f n8n"
echo ""