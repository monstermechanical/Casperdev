#!/bin/bash

# Claude Integration Test Script
# Run this after setting up your Claude API key

echo "🤖 Testing Claude Integration..."
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:5000"
API_BASE="/api/integrations"

# Check if server is running
echo -e "${BLUE}📡 Checking if server is running...${NC}"
if ! curl -s --fail "$SERVER_URL" > /dev/null; then
    echo -e "${RED}❌ Server not running. Please start with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"

# Function to get JWT token (you'll need to update this with actual login)
get_jwt_token() {
    # This is a placeholder - you'll need to implement actual login
    # For testing, you can manually set a token here
    echo "YOUR_JWT_TOKEN_HERE"
}

echo -e "${BLUE}🔑 Getting authentication token...${NC}"
JWT_TOKEN=$(get_jwt_token)

if [ "$JWT_TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
    echo -e "${RED}⚠️  Please update the JWT token in this script or implement proper login${NC}"
    echo -e "${BLUE}💡 You can get a token by logging in through the frontend or API${NC}"
    exit 1
fi

# Test 1: Claude Connection Test
echo -e "${BLUE}🧪 Test 1: Testing Claude connection...${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/claude_test.json \
    -X GET "$SERVER_URL$API_BASE/claude/test" \
    -H "Authorization: Bearer $JWT_TOKEN")

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Claude connection test passed${NC}"
    cat /tmp/claude_test.json | jq '.testResponse' 2>/dev/null || cat /tmp/claude_test.json
else
    echo -e "${RED}❌ Claude connection test failed (HTTP $RESPONSE)${NC}"
    cat /tmp/claude_test.json
fi

echo ""

# Test 2: Content Generation
echo -e "${BLUE}🧪 Test 2: Testing content generation...${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/claude_generate.json \
    -X POST "$SERVER_URL$API_BASE/claude/generate" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "Write a brief welcome message for a new team member joining a tech company.",
        "maxTokens": 200
    }')

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Content generation test passed${NC}"
    cat /tmp/claude_generate.json | jq '.response' 2>/dev/null || cat /tmp/claude_generate.json
else
    echo -e "${RED}❌ Content generation test failed (HTTP $RESPONSE)${NC}"
    cat /tmp/claude_generate.json
fi

echo ""

# Test 3: Data Analysis
echo -e "${BLUE}🧪 Test 3: Testing data analysis...${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/claude_analyze.json \
    -X POST "$SERVER_URL$API_BASE/claude/analyze" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "sales": [1000, 1200, 800, 1500, 1100],
            "months": ["Jan", "Feb", "Mar", "Apr", "May"]
        },
        "analysisType": "insights",
        "context": "Monthly sales data for our product"
    }')

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Data analysis test passed${NC}"
    cat /tmp/claude_analyze.json | jq '.analysis' 2>/dev/null || cat /tmp/claude_analyze.json
else
    echo -e "${RED}❌ Data analysis test failed (HTTP $RESPONSE)${NC}"
    cat /tmp/claude_analyze.json
fi

echo ""

# Test 4: Integration Status
echo -e "${BLUE}🧪 Test 4: Checking integration status...${NC}"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/integration_status.json \
    -X GET "$SERVER_URL$API_BASE/status" \
    -H "Authorization: Bearer $JWT_TOKEN")

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Integration status check passed${NC}"
    cat /tmp/integration_status.json | jq '.integrations.claude' 2>/dev/null || cat /tmp/integration_status.json
else
    echo -e "${RED}❌ Integration status check failed (HTTP $RESPONSE)${NC}"
    cat /tmp/integration_status.json
fi

echo ""
echo -e "${BLUE}🎉 Claude integration testing complete!${NC}"
echo ""
echo -e "${BLUE}📚 Next steps:${NC}"
echo "1. Check the Claude integration guide: ./claude-integration-guide.md"
echo "2. Set up your Claude API key in .env file"
echo "3. Try the HubSpot enhancement: POST /api/integrations/claude/enhance-hubspot"
echo "4. Build a frontend interface for Claude features"

# Cleanup temp files
rm -f /tmp/claude_*.json /tmp/integration_status.json

echo ""
echo -e "${GREEN}🚀 Happy building with Claude AI!${NC}"