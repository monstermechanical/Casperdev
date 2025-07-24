#!/usr/bin/env python3
"""
Python Upwork Integration Service
Microservice to handle Upwork API calls triggered by Slack via Node.js
"""

import os
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Upwork Integration Service",
    description="Python microservice for Slack-to-Upwork autonomous agent",
    version="1.0.0"
)

# Enable CORS for Node.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class SlackRequest(BaseModel):
    channel: str
    user_id: str
    command: str
    text: str
    response_url: Optional[str] = None

class UpworkJobSearch(BaseModel):
    query: str
    skills: Optional[List[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    limit: int = 10

class UpworkResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict] = None
    jobs: Optional[List[Dict]] = None

# Store for tracking requests (in production, use Redis/database)
request_history = []

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Upwork Integration Service",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "upwork_configured": bool(os.getenv("UPWORK_CONSUMER_KEY"))
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "upwork_client": "configured" if os.getenv("UPWORK_CONSUMER_KEY") else "not_configured",
        "node_service": await check_node_service(),
        "environment": {
            "UPWORK_CONSUMER_KEY": "✓" if os.getenv("UPWORK_CONSUMER_KEY") else "✗",
            "UPWORK_CONSUMER_SECRET": "✓" if os.getenv("UPWORK_CONSUMER_SECRET") else "✗",
            "NODE_SERVICE_URL": os.getenv("NODE_SERVICE_URL", "http://localhost:5000")
        }
    }

async def check_node_service():
    """Check if Node.js service is accessible"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{os.getenv('NODE_SERVICE_URL', 'http://localhost:5000')}/api/health",
                timeout=5.0
            )
            return "connected" if response.status_code == 200 else "error"
    except Exception as e:
        logger.warning(f"Node.js service check failed: {e}")
        return "disconnected"

@app.post("/slack/command", response_model=UpworkResponse)
async def handle_slack_command(request: SlackRequest, background_tasks: BackgroundTasks):
    """
    Handle Slack commands and trigger Upwork actions
    This is called by the Node.js service when Slack commands are received
    """
    logger.info(f"Received Slack command: {request.command} from user {request.user_id}")
    
    # Store request for tracking
    request_history.append({
        "timestamp": datetime.now().isoformat(),
        "channel": request.channel,
        "user_id": request.user_id,
        "command": request.command,
        "text": request.text
    })
    
    # Parse command and execute appropriate Upwork action
    try:
        if request.command.startswith("/jobs") or "find jobs" in request.text.lower():
            return await search_upwork_jobs(request)
        elif request.command.startswith("/profile") or "profile" in request.text.lower():
            return await get_upwork_profile(request)
        elif request.command.startswith("/apply") or "apply" in request.text.lower():
            return await apply_to_job(request)
        else:
            return await handle_general_query(request)
            
    except Exception as e:
        logger.error(f"Error processing Slack command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def search_upwork_jobs(request: SlackRequest) -> UpworkResponse:
    """Search for Upwork jobs based on Slack command"""
    
    # Parse search parameters from Slack text
    search_query = request.text.replace(request.command, "").strip()
    
    if not search_query:
        return UpworkResponse(
            success=False,
            message="Please provide search keywords. Example: `/jobs python developer`"
        )
    
    logger.info(f"Searching Upwork jobs for: {search_query}")
    
    # TODO: Implement actual Upwork API call
    # For now, return mock data
    mock_jobs = [
        {
            "id": "job_001",
            "title": f"Python Developer - {search_query}",
            "description": "Looking for an experienced Python developer...",
            "budget": "$50-100/hour",
            "skills": ["Python", "Django", "API Development"],
            "posted": "2 hours ago",
            "proposals": 3,
            "url": "https://upwork.com/jobs/job_001"
        },
        {
            "id": "job_002", 
            "title": f"Full Stack Developer - {search_query}",
            "description": "Need a full stack developer for web application...",
            "budget": "$30-60/hour",
            "skills": ["JavaScript", "React", "Node.js"],
            "posted": "5 hours ago",
            "proposals": 8,
            "url": "https://upwork.com/jobs/job_002"
        }
    ]
    
    # Schedule background task to notify Slack
    await send_slack_notification(
        request.channel,
        f"Found {len(mock_jobs)} jobs for '{search_query}'",
        mock_jobs
    )
    
    return UpworkResponse(
        success=True,
        message=f"Found {len(mock_jobs)} jobs for '{search_query}'",
        jobs=mock_jobs
    )

async def get_upwork_profile(request: SlackRequest) -> UpworkResponse:
    """Get Upwork profile information"""
    
    # TODO: Implement actual Upwork profile API call
    mock_profile = {
        "id": "profile_001",
        "name": "Your Upwork Profile",
        "skills": ["Python", "JavaScript", "API Development"],
        "hourly_rate": "$75/hour",
        "total_earned": "$25,450",
        "jobs_completed": 45,
        "success_rate": "98%"
    }
    
    await send_slack_notification(
        request.channel,
        "Your Upwork Profile Summary",
        [mock_profile]
    )
    
    return UpworkResponse(
        success=True,
        message="Profile information retrieved",
        data=mock_profile
    )

async def apply_to_job(request: SlackRequest) -> UpworkResponse:
    """Apply to an Upwork job"""
    
    job_info = request.text.replace(request.command, "").strip()
    
    if not job_info:
        return UpworkResponse(
            success=False,
            message="Please provide job ID or URL. Example: `/apply job_001`"
        )
    
    # TODO: Implement actual job application
    logger.info(f"Applying to job: {job_info}")
    
    await send_slack_notification(
        request.channel,
        f"Application submitted for job: {job_info}",
        [{"status": "submitted", "job": job_info}]
    )
    
    return UpworkResponse(
        success=True,
        message=f"Application submitted for {job_info}",
        data={"job": job_info, "status": "submitted"}
    )

async def handle_general_query(request: SlackRequest) -> UpworkResponse:
    """Handle general queries and provide help"""
    
    help_text = """
🤖 **Upwork Assistant Commands:**

• `/jobs [keywords]` - Search for jobs
• `/profile` - View your profile stats  
• `/apply [job_id]` - Apply to a job
• `/help` - Show this help message

**Examples:**
• `/jobs python api development`
• `/apply job_001`
• `/profile`
"""
    
    await send_slack_notification(
        request.channel,
        "Upwork Assistant Help",
        [{"help": help_text}]
    )
    
    return UpworkResponse(
        success=True,
        message="Help information sent to Slack",
        data={"help": help_text}
    )

async def send_slack_notification(channel: str, message: str, data: List[Dict]):
    """Send notification back to Slack via Node.js service"""
    
    try:
        node_service_url = os.getenv("NODE_SERVICE_URL", "http://localhost:5000")
        
        async with httpx.AsyncClient() as client:
            # This would call your Node.js Slack integration
            response = await client.post(
                f"{node_service_url}/api/integrations/slack/notify",
                json={
                    "channel": channel,
                    "message": message,
                    "title": "Upwork Assistant",
                    "data": data
                },
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                logger.info(f"Slack notification sent successfully to {channel}")
            else:
                logger.error(f"Failed to send Slack notification: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error sending Slack notification: {e}")

@app.get("/upwork/jobs", response_model=UpworkResponse)
async def search_jobs_api(query: str, limit: int = 10):
    """Direct API endpoint for job search"""
    
    search_request = SlackRequest(
        channel="api",
        user_id="api_user",
        command="/jobs",
        text=query
    )
    
    return await search_upwork_jobs(search_request)

@app.get("/history")
async def get_request_history():
    """Get history of processed requests"""
    return {
        "total_requests": len(request_history),
        "requests": request_history[-10:]  # Last 10 requests
    }

if __name__ == "__main__":
    # Run the service
    port = int(os.getenv("PYTHON_SERVICE_PORT", "8000"))
    
    print(f"""
🐍 Upwork Integration Service Starting...
================================
Port: {port}
Node.js Service: {os.getenv('NODE_SERVICE_URL', 'http://localhost:5000')}
Upwork Configured: {bool(os.getenv('UPWORK_CONSUMER_KEY'))}

API Endpoints:
- GET  /         - Service info
- GET  /health   - Health check  
- POST /slack/command - Handle Slack commands
- GET  /upwork/jobs?query=... - Search jobs
- GET  /history  - Request history

Connect your Node.js service to: http://localhost:{port}
""")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )