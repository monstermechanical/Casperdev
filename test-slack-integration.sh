#!/bin/bash

echo "=== Testing Slack Integration ==="
echo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get JWT token (you'll need to login first and get a valid token)
# For testing, we'll simulate this
echo "Note: You need a valid JWT token from logging in to test authenticated endpoints"
echo

# 1. Test Slack connection without auth (should fail)
echo "1. Testing Slack connection without auth..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/slack/test)
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✓ Correctly requires authentication${NC}"
else
    echo -e "${RED}✗ Expected 401, got $response${NC}"
fi
echo

# 2. Test Slack endpoints exist
echo "2. Checking Slack endpoints..."
endpoints=(
    "/api/slack/test"
    "/api/slack/channels"
    "/api/slack/send-message"
    "/api/slack/commands"
    "/api/slack/events"
    "/api/slack/interactive"
)

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000$endpoint)
    if [ "$response" = "401" ] || [ "$response" = "400" ]; then
        echo -e "${GREEN}✓ $endpoint exists${NC}"
    else
        echo -e "${YELLOW}⚠ $endpoint returned $response${NC}"
    fi
done
echo

# 3. Test Slack command simulation
echo "3. Testing Slack command endpoint..."
curl -X POST http://localhost:5000/api/slack/commands \
  -H "Content-Type: application/json" \
  -d '{
    "command": "/casperdev",
    "text": "help",
    "user_id": "U123456",
    "user_name": "testuser",
    "channel_id": "C123456",
    "channel_name": "general"
  }' \
  -s | python3 -m json.tool
echo

# 4. Test Events URL verification
echo "4. Testing Events API URL verification..."
challenge="test-challenge-string"
response=$(curl -X POST http://localhost:5000/api/slack/events \
  -H "Content-Type: application/json" \
  -d "{\"type\": \"url_verification\", \"challenge\": \"$challenge\"}" \
  -s)

if [ "$response" = "$challenge" ]; then
    echo -e "${GREEN}✓ URL verification works${NC}"
else
    echo -e "${RED}✗ URL verification failed${NC}"
fi
echo

# 5. Check if Slack tokens are configured
echo "5. Checking Slack configuration..."
if grep -q "SLACK_BOT_TOKEN=xoxb-your" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠ Slack bot token not configured (using placeholder)${NC}"
else
    echo -e "${GREEN}✓ Slack bot token appears to be configured${NC}"
fi

if grep -q "SLACK_SIGNING_SECRET=your" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠ Slack signing secret not configured (using placeholder)${NC}"
else
    echo -e "${GREEN}✓ Slack signing secret appears to be configured${NC}"
fi
echo

# 6. Frontend Slack route
echo "6. Testing frontend Slack route..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/slack)
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Frontend Slack page accessible${NC}"
else
    echo -e "${YELLOW}⚠ Frontend returned $response${NC}"
fi
echo

echo "=== Slack Integration Test Complete ==="
echo
echo "Next steps:"
echo "1. Create a Slack app at https://api.slack.com/apps"
echo "2. Add bot token and signing secret to .env"
echo "3. Configure slash commands with your server URL"
echo "4. Test from within Slack workspace"
echo
echo "See SLACK_SETUP_GUIDE.md for detailed instructions"