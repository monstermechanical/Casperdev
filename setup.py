#!/usr/bin/env python3

import os
import shutil
import subprocess
import sys

def create_env_file():
    """Create .env file from template if it doesn't exist"""
    if not os.path.exists('.env'):
        if os.path.exists('.env.example'):
            shutil.copy('.env.example', '.env')
            print("✅ Created .env file from template")
            print("🔧 Please edit .env file with your actual tokens and API keys")
        else:
            print("❌ .env.example file not found")
    else:
        print("ℹ️  .env file already exists")

def install_dependencies():
    """Install required Python packages"""
    print("📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        return False
    return True

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    return True

def print_next_steps():
    """Print instructions for next steps"""
    print("\n🚀 Setup complete! Next steps:")
    print("1. Edit .env file with your Slack and OpenAI credentials")
    print("2. Create a Slack app using the slack_app_manifest.json")
    print("3. Get your tokens from Slack app settings")
    print("4. Run: python app.py")
    print("\n📖 See README.md for detailed setup instructions")

def main():
    print("🤖 Casper AI Slack Bot Setup")
    print("=" * 30)
    
    if not check_python_version():
        sys.exit(1)
    
    if not install_dependencies():
        sys.exit(1)
    
    create_env_file()
    print_next_steps()

if __name__ == "__main__":
    main()