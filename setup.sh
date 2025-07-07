#!/bin/bash

# Casperdev - Connect All Setup Script
echo "🚀 Setting up Casperdev - Connect All"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js v14 or higher."
        exit 1
    fi
}

# Check if MongoDB is available
check_mongodb() {
    if command -v mongod &> /dev/null; then
        print_status "MongoDB found locally"
    else
        print_warning "MongoDB not found locally. You can:"
        echo "  1. Install MongoDB locally"
        echo "  2. Use MongoDB Atlas (cloud)"
        echo "  3. Use Docker Compose (run: docker-compose up -d)"
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing backend dependencies..."
    npm install
    
    print_info "Installing frontend dependencies..."
    cd client && npm install && cd ..
    
    print_status "All dependencies installed successfully!"
}

# Setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        print_info "Creating environment file..."
        cp .env.example .env
        print_status "Environment file created!"
        print_warning "Please edit .env file with your configuration"
    else
        print_status "Environment file already exists"
    fi
}

# Create necessary directories
create_directories() {
    mkdir -p logs
    mkdir -p uploads
    print_status "Directories created"
}

# Start the application
start_application() {
    echo ""
    print_info "Starting Casperdev application..."
    echo "Backend will run on: http://localhost:5000"
    echo "Frontend will run on: http://localhost:3000"
    echo "Connection Hub: http://localhost:3000/connections"
    echo ""
    print_info "Press Ctrl+C to stop the application"
    echo ""
    
    # Start both frontend and backend
    npm run dev
}

# Main setup function
main() {
    echo ""
    print_info "Checking system requirements..."
    check_node
    check_mongodb
    
    echo ""
    print_info "Setting up project..."
    install_dependencies
    setup_environment
    create_directories
    
    echo ""
    print_status "Setup completed successfully!"
    echo ""
    
    # Ask if user wants to start the application
    read -p "Do you want to start the application now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_application
    else
        echo ""
        print_info "To start the application later, run:"
        echo "  npm run dev"
        echo ""
        print_info "Available commands:"
        echo "  npm run dev          # Start both frontend and backend"
        echo "  npm run server       # Start backend only"
        echo "  npm run client       # Start frontend only"
        echo "  npm run install-all  # Reinstall dependencies"
        echo ""
        print_info "Documentation: Check README.md for detailed instructions"
    fi
}

# Run the main function
main