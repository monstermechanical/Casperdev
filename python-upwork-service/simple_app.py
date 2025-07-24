#!/usr/bin/env python3
"""
Simplified Upwork Integration Service - Demo Version
Uses only built-in Python libraries for autonomous demonstration
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

# Simple logging
def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

# Store for tracking requests
request_history = []

class UpworkServiceHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        if path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "service": "Upwork Integration Service (Demo)",
                "status": "running",
                "timestamp": datetime.now().isoformat(),
                "upwork_configured": "demo_mode",
                "message": "🤖 Autonomous agent ready for demonstration!"
            }
            self.wfile.write(json.dumps(response, indent=2).encode())
            
        elif path == '/health':
            self.health_check()
            
        elif path == '/upwork/jobs':
            self.search_jobs(query_params)
            
        elif path == '/history':
            self.get_history()
            
        else:
            self.send_error(404, "Not Found")
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except json.JSONDecodeError:
            data = {}
        
        if path == '/slack/command':
            self.handle_slack_command(data)
        else:
            self.send_error(404, "Not Found")
    
    def health_check(self):
        """Detailed health check"""
        # Check if Node.js service is running
        node_status = self.check_node_service()
        
        response = {
            "status": "healthy",
            "upwork_client": "demo_configured",
            "node_service": node_status,
            "environment": {
                "UPWORK_CONSUMER_KEY": "✓ (demo)",
                "UPWORK_CONSUMER_SECRET": "✓ (demo)",
                "NODE_SERVICE_URL": "http://localhost:5000"
            },
            "demo_mode": True,
            "autonomous_features": "active"
        }
        
        self.send_json_response(response)
    
    def check_node_service(self):
        """Check if Node.js service is accessible"""
        try:
            req = urllib.request.Request('http://localhost:5000/api/health')
            with urllib.request.urlopen(req, timeout=5) as response:
                return "connected" if response.status == 200 else "error"
        except Exception as e:
            log(f"Node.js service check failed: {e}")
            return "disconnected"
    
    def search_jobs(self, query_params):
        """Search for Upwork jobs (demo with mock data)"""
        query = query_params.get('query', [''])[0]
        limit = int(query_params.get('limit', [10])[0])
        
        log(f"🔍 Searching Upwork jobs for: '{query}'")
        
        # Generate realistic mock jobs
        mock_jobs = [
            {
                "id": f"job_{int(time.time())}_001",
                "title": f"Senior Python Developer - {query}",
                "description": "We're looking for an experienced Python developer to build scalable web applications using Django and FastAPI...",
                "budget": "$75-120/hour",
                "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "Docker"],
                "posted": "1 hour ago",
                "proposals": 2,
                "client_rating": "4.9/5",
                "url": f"https://upwork.com/jobs/job_{int(time.time())}_001",
                "autonomous_score": 95
            },
            {
                "id": f"job_{int(time.time())}_002",
                "title": f"Full Stack Developer - {query}",
                "description": "Remote position for building modern web applications with React frontend and Python backend...",
                "budget": "$50-80/hour",
                "skills": ["Python", "React", "Node.js", "MongoDB", "AWS"],
                "posted": "3 hours ago",
                "proposals": 8,
                "client_rating": "4.7/5",
                "url": f"https://upwork.com/jobs/job_{int(time.time())}_002",
                "autonomous_score": 87
            },
            {
                "id": f"job_{int(time.time())}_003",
                "title": f"AI/ML Engineer - {query}",
                "description": "Build machine learning models and AI solutions using Python, TensorFlow, and cloud platforms...",
                "budget": "$90-150/hour",
                "skills": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "AWS"],
                "posted": "5 hours ago",
                "proposals": 4,
                "client_rating": "5.0/5",
                "url": f"https://upwork.com/jobs/job_{int(time.time())}_003",
                "autonomous_score": 98
            }
        ]
        
        # Filter by limit
        filtered_jobs = mock_jobs[:limit]
        
        # Simulate autonomous filtering (keep high-scoring jobs)
        autonomous_filtered = [job for job in filtered_jobs if job["autonomous_score"] > 85]
        
        response = {
            "success": True,
            "message": f"Found {len(filtered_jobs)} jobs for '{query}' (Auto-filtered to {len(autonomous_filtered)} high-value opportunities)",
            "jobs": autonomous_filtered,
            "autonomous_analysis": {
                "total_found": len(filtered_jobs),
                "high_value_jobs": len(autonomous_filtered),
                "avg_score": sum(job["autonomous_score"] for job in autonomous_filtered) / len(autonomous_filtered) if autonomous_filtered else 0,
                "recommended_action": "Apply to top 2 jobs immediately"
            },
            "demo_mode": True
        }
        
        # Store request for tracking
        request_history.append({
            "timestamp": datetime.now().isoformat(),
            "action": "job_search",
            "query": query,
            "results": len(autonomous_filtered)
        })
        
        self.send_json_response(response)
        
        # Simulate autonomous notification to Slack
        self.send_slack_notification(query, autonomous_filtered)
    
    def handle_slack_command(self, data):
        """Handle Slack commands and trigger Upwork actions"""
        channel = data.get('channel', '#general')
        user_id = data.get('user_id', 'demo_user')
        command = data.get('command', '')
        text = data.get('text', '')
        
        log(f"🔗 Received Slack command: {command} from user {user_id}")
        
        # Store request for tracking
        request_history.append({
            "timestamp": datetime.now().isoformat(),
            "channel": channel,
            "user_id": user_id,
            "command": command,
            "text": text
        })
        
        # Process different commands
        if command.startswith('/jobs') or 'jobs' in text.lower():
            response = self.process_job_search(channel, text)
        elif command.startswith('/profile') or 'profile' in text.lower():
            response = self.process_profile_request(channel)
        elif command.startswith('/apply') or 'apply' in text.lower():
            response = self.process_job_application(channel, text)
        else:
            response = self.process_help_request(channel)
        
        self.send_json_response(response)
    
    def process_job_search(self, channel, text):
        """Process job search command autonomously"""
        search_query = text.replace('/jobs', '').strip() or 'python developer'
        
        log(f"🤖 Autonomous job search for: {search_query}")
        
        # Simulate intelligent job matching
        mock_response = {
            "success": True,
            "message": f"🤖 Autonomous search completed for '{search_query}'",
            "autonomous_actions": [
                f"✅ Searched Upwork for '{search_query}'",
                "✅ Applied AI filtering (score > 85%)",
                "✅ Ranked by budget and client rating",
                "✅ Prepared Slack notification",
                "🚀 Ready to auto-apply to top matches!"
            ],
            "jobs_found": 3,
            "slack_notification": f"Posted {3} high-value jobs to {channel}",
            "next_autonomous_action": "Will auto-apply to top job in 5 minutes"
        }
        
        return mock_response
    
    def process_profile_request(self, channel):
        """Process profile check autonomously"""
        log("🤖 Autonomous profile analysis")
        
        mock_profile = {
            "success": True,
            "message": "🤖 Autonomous profile analysis complete",
            "profile_data": {
                "name": "Your Upwork Profile",
                "skills": ["Python", "FastAPI", "React", "AI/ML"],
                "hourly_rate": "$85/hour",
                "total_earned": "$47,850",
                "jobs_completed": 67,
                "success_rate": "98%",
                "autonomous_score": 95
            },
            "autonomous_insights": [
                "✅ Profile is highly competitive",
                "💡 Consider increasing rate to $95/hour",
                "🎯 Add 'Machine Learning' to skills",
                "📈 Profile views up 23% this week"
            ],
            "recommended_actions": [
                "Update portfolio with recent projects",
                "Request testimonials from last 3 clients",
                "Apply to 2-3 high-value jobs today"
            ]
        }
        
        return mock_profile
    
    def process_job_application(self, channel, text):
        """Process job application autonomously"""
        job_info = text.replace('/apply', '').strip()
        
        log(f"🤖 Autonomous job application for: {job_info}")
        
        mock_application = {
            "success": True,
            "message": f"🤖 Autonomous application submitted for {job_info}",
            "application_details": {
                "job": job_info or "job_001",
                "cover_letter": "AI-generated personalized cover letter",
                "proposal_strength": "95%",
                "estimated_win_rate": "78%",
                "bid_amount": "$85/hour"
            },
            "autonomous_actions": [
                "✅ Analyzed job requirements",
                "✅ Generated personalized cover letter",
                "✅ Optimized bid based on market data",
                "✅ Submitted application",
                "📊 Set up tracking for response"
            ],
            "next_steps": [
                "Will follow up in 48 hours if no response",
                "Continue monitoring for similar opportunities",
                "Update you on application status"
            ]
        }
        
        return mock_application
    
    def process_help_request(self, channel):
        """Provide autonomous agent help"""
        help_response = {
            "success": True,
            "message": "🤖 Autonomous Upwork Assistant - Available Commands",
            "commands": [
                "/jobs [keywords] - AI-powered job search",
                "/profile - Analyze your Upwork profile",
                "/apply [job_id] - Smart job application",
                "/help - Show this help"
            ],
            "autonomous_features": [
                "🔍 Smart job filtering (85%+ score)",
                "📊 Market rate analysis",
                "✍️ AI cover letter generation",
                "📈 Performance tracking",
                "⏰ Scheduled job searches",
                "🚨 High-value job alerts"
            ],
            "demo_mode": True
        }
        
        return help_response
    
    def send_slack_notification(self, query, jobs):
        """Send notification to Slack via Node.js service (demo)"""
        try:
            notification_data = {
                "channel": "#jobs",
                "message": f"🤖 Found {len(jobs)} high-value jobs for '{query}'",
                "title": "Autonomous Job Alert",
                "jobs": jobs[:2]  # Top 2 jobs
            }
            
            # In demo mode, just log what would be sent
            log(f"📱 Would send Slack notification: {notification_data['message']}")
            
        except Exception as e:
            log(f"❌ Slack notification error: {e}")
    
    def get_history(self):
        """Get history of processed requests"""
        response = {
            "total_requests": len(request_history),
            "requests": request_history[-10:],  # Last 10 requests
            "demo_mode": True,
            "autonomous_actions_today": len([r for r in request_history if r['timestamp'].startswith(datetime.now().strftime('%Y-%m-%d'))])
        }
        
        self.send_json_response(response)
    
    def send_json_response(self, data):
        """Send JSON response with CORS headers"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """Override to reduce HTTP server logging"""
        pass  # Comment this out if you want to see HTTP requests

def start_autonomous_scheduler():
    """Start autonomous background tasks"""
    def autonomous_job_search():
        while True:
            try:
                log("🤖 Autonomous scheduled job search...")
                # Simulate autonomous job search every 30 seconds for demo
                request_history.append({
                    "timestamp": datetime.now().isoformat(),
                    "action": "autonomous_search",
                    "query": "python developer remote",
                    "results": 3
                })
                time.sleep(30)  # Every 30 seconds for demo (would be hourly in production)
            except Exception as e:
                log(f"❌ Autonomous scheduler error: {e}")
                time.sleep(30)
    
    # Start autonomous scheduler in background thread
    scheduler_thread = threading.Thread(target=autonomous_job_search, daemon=True)
    scheduler_thread.start()
    log("🤖 Autonomous scheduler started (demo mode: 30s intervals)")

def main():
    port = int(os.getenv("PYTHON_SERVICE_PORT", "8000"))
    
    print(f"""
🤖 Autonomous Upwork Integration Service - DEMO MODE
==================================================
Port: {port}
Node.js Service: http://localhost:5000
Demo Features: ✅ ALL AUTONOMOUS FEATURES ACTIVE

🎯 Autonomous Capabilities:
- Smart job filtering (AI-powered)
- Automated application submissions  
- Real-time Slack notifications
- Intelligent profile optimization
- Market rate analysis
- Scheduled job searches

📡 API Endpoints:
- GET  /         - Service info
- GET  /health   - Health check  
- POST /slack/command - Handle Slack commands
- GET  /upwork/jobs?query=... - Search jobs
- GET  /history  - Request history

🚀 Ready for autonomous demonstration!
""")
    
    # Start autonomous background tasks
    start_autonomous_scheduler()
    
    # Start HTTP server
    server = HTTPServer(('0.0.0.0', port), UpworkServiceHandler)
    log(f"🚀 Autonomous Upwork service started on port {port}")
    log("🤖 Demo Mode: Autonomous features active!")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("🛑 Shutting down autonomous service...")
        server.shutdown()

if __name__ == "__main__":
    main()