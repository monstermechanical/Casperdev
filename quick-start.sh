#!/bin/bash

# HubSpot-Slack Integration Quick Start Script
# This script will help you set up the integration quickly

echo "🚀 HubSpot-Slack Integration Quick Start"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v14 or higher) first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep mongod &> /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   You can start it with: sudo service mongod start"
    echo "   Or use Docker: docker run -d -p 27017:27017 mongo"
    echo ""
fi

echo "📦 Installing dependencies..."
echo "=============================="

# Install root dependencies
npm install

# Install client dependencies
cd client 2>/dev/null && npm install && cd .. || echo "⚠️  Client directory not found, skipping client dependencies"

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment file..."
    echo "=================================="
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "📝 IMPORTANT: You need to configure your .env file with:"
    echo "   - HUBSPOT_ACCESS_TOKEN=your-hubspot-access-token"
    echo "   - SLACK_BOT_TOKEN=xoxb-your-slack-bot-token"
    echo "   - SLACK_DEFAULT_CHANNEL=#general"
    echo "   - JWT_SECRET=your-super-secret-key"
    echo ""
    echo "📖 See hubspot-slack-setup.md for detailed setup instructions"
    echo ""
else
    echo "✅ .env file already exists"
fi

echo "🔍 Checking environment configuration..."
echo "========================================"

# Check for required environment variables
if [ -f .env ]; then
    source .env
    
    missing_vars=""
    
    if [ -z "$HUBSPOT_ACCESS_TOKEN" ] || [ "$HUBSPOT_ACCESS_TOKEN" = "your-hubspot-access-token" ]; then
        missing_vars="$missing_vars HUBSPOT_ACCESS_TOKEN"
    fi
    
    if [ -z "$SLACK_BOT_TOKEN" ] || [ "$SLACK_BOT_TOKEN" = "xoxb-your-slack-bot-token" ]; then
        missing_vars="$missing_vars SLACK_BOT_TOKEN"
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-key-here-change-this-in-production" ]; then
        missing_vars="$missing_vars JWT_SECRET"
    fi
    
    if [ -z "$MONGODB_URI" ]; then
        missing_vars="$missing_vars MONGODB_URI"
    fi
    
    if [ -n "$missing_vars" ]; then
        echo "⚠️  Missing required environment variables:$missing_vars"
        echo "   Please update your .env file before starting the application"
        echo ""
    else
        echo "✅ All required environment variables are set!"
    fi
fi

echo "🎯 Quick Test Commands"
echo "====================="
echo ""
echo "After setting up your .env file, you can test the integration:"
echo ""
echo "# Start the application"
echo "npm run dev"
echo ""
echo "# Test HubSpot connection (in another terminal)"
echo "curl -X GET http://localhost:5000/api/integrations/hubspot/test \\"
echo "  -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
echo ""
echo "# Test Slack connection"
echo "curl -X GET http://localhost:5000/api/integrations/slack/test \\"
echo "  -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
echo ""

echo "📚 Documentation"
echo "================"
echo "- Setup Guide: hubspot-slack-setup.md"
echo "- API Documentation: See setup guide for endpoint details"
echo "- Environment Template: .env.example"
echo ""

echo "🚀 Ready to start!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Configure your .env file with API tokens"
echo "2. Run: npm run dev"
echo "3. Test the integration endpoints"
echo "4. Check hubspot-slack-setup.md for detailed usage"
echo ""

# Ask if user wants to start the application
read -p "Do you want to start the application now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting the application..."
    npm run dev
else
    echo "👍 You can start the application later with: npm run dev"
fi

echo ""
echo "🎉 Setup complete! Your HubSpot-Slack integration is ready to use."
echo "   Visit: http://localhost:3000 (frontend) and http://localhost:5000 (API)"