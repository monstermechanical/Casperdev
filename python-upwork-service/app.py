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
from pydantic import BaseModel, Field
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
    allow_origins=["http://localhost:5000", "http://localhost:3000", "http://localhost:4000"],
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

class AgentMessage(BaseModel):
    from_agent: str
    to: str
    message: str
    action: Optional[str] = None
    timestamp: Optional[str] = None

# Store for tracking requests (in production, use Redis/database)
request_history = []
agent_messages = []
MAX_MESSAGES = 100

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Upwork Integration Service",
        "agent": "python",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "upwork_configured": bool(os.getenv("UPWORK_CONSUMER_KEY"))
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "agent": "python",
        "upwork_client": "configured" if os.getenv("UPWORK_CONSUMER_KEY") else "not_configured",
        "node_service": await check_node_service(),
        "environment": {
            "UPWORK_CONSUMER_KEY": "✓" if os.getenv("UPWORK_CONSUMER_KEY") else "✗",
            "UPWORK_CONSUMER_SECRET": "✓" if os.getenv("UPWORK_CONSUMER_SECRET") else "✗",
            "NODE_SERVICE_URL": os.getenv("NODE_SERVICE_URL", "http://localhost:5000")
        },
        "messageCount": len(agent_messages)
    }

@app.post("/api/receive-message")
async def receive_agent_message(message: AgentMessage):
    """Receive messages from other agents"""
    
    logger.info(f"📨 Message received from {message.from_agent}: {message.action or 'message'}")
    
    message_data = {
        "id": int(datetime.now().timestamp() * 1000),
        "from": message.from_agent,
        "to": "python",
        "message": message.message,
        "action": message.action,
        "timestamp": message.timestamp or datetime.now().isoformat(),
        "processed": False
    }
    
    # Store message
    agent_messages.append(message_data)
    if len(agent_messages) > MAX_MESSAGES:
        agent_messages.pop(0)
    
    # Process the message based on action
    response = {"success": True, "agent": "python"}
    
    try:
        if message.action == "ping":
            response["message"] = "pong"
        elif message.action == "status":
            response["data"] = {
                "status": "running",
                "upwork_configured": bool(os.getenv("UPWORK_CONSUMER_KEY")),
                "active_jobs": 0,
                "message_count": len(agent_messages)
            }
        elif message.action == "search-jobs":
            # Parse job search from message
            search_query = message.message
            jobs = await perform_job_search(search_query)
            response["message"] = f"Found {len(jobs)} jobs for '{search_query}'"
            response["data"] = {"jobs": jobs, "query": search_query}
        elif message.action == "apply-job":
            # Handle job application
            job_id = message.message
            result = await perform_job_application(job_id)
            response["message"] = f"Application result for {job_id}"
            response["data"] = result
        elif message.action == "get-profile":
            profile = await get_profile_data()
            response["message"] = "Profile data retrieved"
            response["data"] = profile
        else:
            response["message"] = "Message received and logged"
        
        message_data["processed"] = True
        message_data["response"] = response
        
    except Exception as e:
        response["success"] = False
        response["error"] = str(e)
        logger.error(f"Error processing message: {e}")
    
    return response

@app.post("/api/send-message")
async def send_agent_message(to_agent: str, message: str, action: str = None):
    """Send message to another agent"""
    
    agent_urls = {
        "backend": os.getenv("NODE_SERVICE_URL", "http://localhost:5000"),
        "orchestrator": "http://localhost:4000"
    }
    
    if to_agent not in agent_urls:
        raise HTTPException(status_code=400, detail=f"Unknown agent: {to_agent}")
    
    message_data = {
        "from_agent": "python",
        "to": to_agent,
        "message": message,
        "action": action,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        logger.info(f"📤 Sending message to {to_agent}: {action or 'message'}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{agent_urls[to_agent]}/api/receive-message",
                json=message_data,
                timeout=5.0
            )
        
        # Log the outgoing message
        agent_messages.append({
            **message_data,
            "id": int(datetime.now().timestamp() * 1000),
            "direction": "outgoing",
            "response": response.json() if response.status_code == 200 else {"error": "Failed"}
        })
        
        return {"success": True, "response": response.json()}
        
    except Exception as e:
        logger.error(f"❌ Failed to send message to {to_agent}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agent-messages")
async def get_agent_messages():
    """Get recent agent messages"""
    return {"messages": agent_messages[-50:]}

async def perform_job_search(query: str) -> List[Dict]:
    """Perform actual job search logic"""
    # This would integrate with real Upwork API
    mock_jobs = [
        {
            "id": f"job_{hash(query) % 1000}",
            "title": f"Python Developer - {query}",
            "description": "Looking for an experienced Python developer...",
            "budget": "$50-100/hour",
            "skills": ["Python", "Django", "API Development"],
            "posted": "2 hours ago",
            "proposals": 3,
            "url": f"https://upwork.com/jobs/job_{hash(query) % 1000}"
        }
    ]
    return mock_jobs

async def perform_job_application(job_id: str) -> Dict:
    """Perform job application logic"""
    # This would integrate with real Upwork API
    return {
        "job_id": job_id,
        "status": "submitted",
        "timestamp": datetime.now().isoformat(),
        "application_id": f"app_{hash(job_id) % 1000}"
    }

async def get_profile_data() -> Dict:
    """Get profile information"""
    # This would integrate with real Upwork API
    return {
        "id": "profile_001",
        "name": "Your Upwork Profile",
        "skills": ["Python", "JavaScript", "API Development"],
        "hourly_rate": "$75/hour",
        "total_earned": "$25,450",
        "jobs_completed": 45,
        "success_rate": "98%"
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
    
    # Use the new job search function
    jobs = await perform_job_search(search_query)
    
    # Schedule background task to notify Slack
    await send_slack_notification(
        request.channel,
        f"Found {len(jobs)} jobs for '{search_query}'",
        jobs
    )
    
    return UpworkResponse(
        success=True,
        message=f"Found {len(jobs)} jobs for '{search_query}'",
        jobs=jobs
    )

async def get_upwork_profile(request: SlackRequest) -> UpworkResponse:
    """Get Upwork profile information"""
    
    profile = await get_profile_data()
    
    await send_slack_notification(
        request.channel,
        "Your Upwork Profile Summary",
        [profile]
    )
    
    return UpworkResponse(
        success=True,
        message="Profile information retrieved",
        data=profile
    )

async def apply_to_job(request: SlackRequest) -> UpworkResponse:
    """Apply to an Upwork job"""
    
    job_info = request.text.replace(request.command, "").strip()
    
    if not job_info:
        return UpworkResponse(
            success=False,
            message="Please provide job ID or URL. Example: `/apply job_001`"
        )
    
    logger.info(f"Applying to job: {job_info}")
    
    result = await perform_job_application(job_info)
    
    await send_slack_notification(
        request.channel,
        f"Application submitted for job: {job_info}",
        [result]
    )
    
    return UpworkResponse(
        success=True,
        message=f"Application submitted for {job_info}",
        data=result
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
🐍 Python Upwork Agent Starting...
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
- POST /api/receive-message - Agent communication
- POST /api/send-message - Send to other agents
- GET  /api/agent-messages - Message history

Agent Communication Ready!
Connect to orchestrator: http://localhost:4000
""")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )