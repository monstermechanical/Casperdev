#!/bin/bash

echo "🚀 Setting up Llama & Pieces Integrations for Cursor"
echo "===================================================="
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
check_docker() {
    if docker info >/dev/null 2>&1; then
        print_status "Docker is running"
    else
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if Docker Compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        print_status "Docker Compose is available"
    else
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi
}

# Install additional Node.js dependencies
install_ai_dependencies() {
    print_info "Installing AI integration dependencies..."
    npm install ollama@^0.5.0
    print_status "AI dependencies installed successfully!"
}

# Start AI services
start_ai_services() {
    print_info "Starting Ollama and Pieces services..."
    docker-compose up -d ollama pieces-os
    
    echo ""
    print_info "Waiting for services to start..."
    sleep 15
    
    # Check if Ollama is running
    if docker ps | grep -q "casperdev-ollama"; then
        print_status "Ollama is running successfully!"
    else
        print_warning "Ollama may not be running properly"
    fi
    
    # Check if Pieces OS is running
    if docker ps | grep -q "casperdev-pieces-os"; then
        print_status "Pieces OS is running successfully!"
    else
        print_warning "Pieces OS may not be running properly"
    fi
}

# Download recommended Llama model
setup_llama_model() {
    print_info "Setting up Llama model..."
    echo "This will download the Llama 3.2 model (about 2GB)"
    echo ""
    
    read -p "Do you want to download Llama 3.2 model now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Downloading Llama 3.2 model..."
        docker exec casperdev-ollama ollama pull llama3.2
        print_status "Llama 3.2 model downloaded successfully!"
    else
        print_warning "Skipping model download. You can download it later with:"
        echo "  docker exec casperdev-ollama ollama pull llama3.2"
    fi
}

# Test integrations
test_integrations() {
    print_info "Testing AI integrations..."
    
    # Wait a bit more for services to be fully ready
    sleep 5
    
    # Test Ollama
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        print_status "Ollama API is responding"
    else
        print_warning "Ollama API is not responding yet (this is normal on first startup)"
    fi
    
    # Test Pieces OS
    if curl -s http://localhost:1000/health >/dev/null 2>&1; then
        print_status "Pieces OS API is responding"
    else
        print_warning "Pieces OS API is not responding yet (this is normal on first startup)"
    fi
}

# Create Cursor configuration
setup_cursor_config() {
    print_info "Setting up Cursor IDE configuration..."
    
    # Create .vscode directory if it doesn't exist
    mkdir -p .vscode
    
    # Create settings.json for Cursor
    cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "javascript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.env.example": "properties"
  },
  "editor.rulers": [80, 120],
  "workbench.colorCustomizations": {
    "editorRuler.foreground": "#ff4081"
  },
  "cursor.ai.model": "claude-3-sonnet",
  "cursor.ai.enableCodeCompletion": true,
  "cursor.ai.enableInlineEditing": true
}
EOF
    
    print_status "Cursor configuration created!"
}

# Main execution
main() {
    echo ""
    print_info "Checking prerequisites..."
    check_docker
    check_docker_compose
    
    echo ""
    print_info "Installing dependencies..."
    install_ai_dependencies
    
    echo ""
    print_info "Starting AI services..."
    start_ai_services
    
    echo ""
    setup_llama_model
    
    echo ""
    print_info "Testing integrations..."
    test_integrations
    
    echo ""
    setup_cursor_config
    
    echo ""
    echo "🎯 Llama & Pieces Integration Setup Complete!"
    echo "============================================="
    echo ""
    echo "📱 Service URLs:"
    echo "  🦙 Ollama API: http://localhost:11434"
    echo "  🧩 Pieces OS: http://localhost:1000"
    echo "  🔧 n8n Workflows: http://localhost:5678"
    echo ""
    echo "🤖 Available Models:"
    echo "  • Llama 3.2 (if downloaded)"
    echo "  • Claude 3 (via n8n with API key)"
    echo ""
    echo "🔧 API Testing:"
    echo "  # Test Ollama"
    echo "  curl http://localhost:11434/api/tags"
    echo ""
    echo "  # Test Pieces OS"
    echo "  curl http://localhost:1000/health"
    echo ""
    echo "  # Test via your application"
    echo "  curl -X GET http://localhost:5000/api/ai/ollama/test \\"
    echo "    -H \"Authorization: Bearer YOUR_JWT_TOKEN\""
    echo ""
    echo "🎯 Next Steps:"
    echo "  1. Start your application: npm run dev"
    echo "  2. Open Cursor IDE and enjoy enhanced AI features"
    echo "  3. Test the integrations via the API endpoints"
    echo "  4. Configure Pieces for code snippet management"
    echo ""
    echo "📚 Documentation:"
    echo "  • Ollama Models: https://ollama.ai/library"
    echo "  • Pieces API: https://docs.pieces.app"
    echo "  • Cursor Features: https://cursor.sh/docs"
    echo ""
    
    print_info "To stop services: docker-compose down"
    print_info "To view logs: docker-compose logs -f ollama pieces-os"
}

# Run the main function
main