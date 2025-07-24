#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

class AgentOrchestrator {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.agents = {
            backend: { port: 5000, process: null, url: 'http://localhost:5000', status: 'stopped' },
            python: { port: 8000, process: null, url: 'http://localhost:8000', status: 'stopped' },
            frontend: { port: 3000, process: null, url: 'http://localhost:3000', status: 'stopped' },
            n8n: { port: 5678, process: null, url: 'http://localhost:5678', status: 'stopped' }
        };
        
        this.messageQueue = [];
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }
    
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                agents: this.agents,
                timestamp: new Date().toISOString()
            });
        });
        
        // Start all agents
        this.app.post('/agents/start', async (req, res) => {
            try {
                await this.startAllAgents();
                res.json({ message: 'All agents started', agents: this.agents });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Stop all agents
        this.app.post('/agents/stop', async (req, res) => {
            try {
                await this.stopAllAgents();
                res.json({ message: 'All agents stopped', agents: this.agents });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Agent communication proxy
        this.app.post('/agents/communicate', async (req, res) => {
            try {
                const { from, to, message, action } = req.body;
                const result = await this.relayMessage(from, to, message, action);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // Agent status
        this.app.get('/agents/status', async (req, res) => {
            const status = await this.checkAllAgentStatus();
            res.json(status);
        });
        
        // Message queue
        this.app.get('/messages', (req, res) => {
            res.json({ messages: this.messageQueue.slice(-50) }); // Last 50 messages
        });
    }
    
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Client connected to orchestrator');
            
            // Send current agent status
            socket.emit('agent-status', this.agents);
            
            socket.on('start-agents', async () => {
                try {
                    await this.startAllAgents();
                    this.io.emit('agent-status', this.agents);
                } catch (error) {
                    socket.emit('error', error.message);
                }
            });
            
            socket.on('stop-agents', async () => {
                try {
                    await this.stopAllAgents();
                    this.io.emit('agent-status', this.agents);
                } catch (error) {
                    socket.emit('error', error.message);
                }
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Client disconnected from orchestrator');
            });
        });
    }
    
    async startAllAgents() {
        console.log('🚀 Starting all agents...');
        
        // Start backend agent
        await this.startAgent('backend', 'node', ['server/index.js']);
        
        // Start Python service
        await this.startAgent('python', 'python3', ['python-upwork-service/app.py']);
        
        // Start frontend (if build exists)
        try {
            await this.startAgent('frontend', 'npm', ['run', 'start'], { cwd: 'client' });
        } catch (error) {
            console.log('⚠️ Frontend start failed:', error.message);
        }
        
        // Wait for agents to be ready
        await this.waitForAgentsReady();
        
        console.log('✅ All agents started and connected');
    }
    
    async startAgent(name, command, args, options = {}) {
        if (this.agents[name].process) {
            console.log(`⚠️ Agent ${name} already running`);
            return;
        }
        
        console.log(`🚀 Starting ${name} agent...`);
        
        const process = spawn(command, args, {
            cwd: options.cwd || process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, ...options.env }
        });
        
        this.agents[name].process = process;
        this.agents[name].status = 'starting';
        
        process.stdout.on('data', (data) => {
            const message = `[${name}] ${data.toString()}`;
            console.log(message);
            this.logMessage('info', name, message);
        });
        
        process.stderr.on('data', (data) => {
            const message = `[${name}] ERROR: ${data.toString()}`;
            console.log(message);
            this.logMessage('error', name, message);
        });
        
        process.on('close', (code) => {
            console.log(`[${name}] Process exited with code ${code}`);
            this.agents[name].process = null;
            this.agents[name].status = 'stopped';
            this.io.emit('agent-status', this.agents);
        });
        
        // Give the process time to start
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    async stopAllAgents() {
        console.log('🛑 Stopping all agents...');
        
        for (const [name, agent] of Object.entries(this.agents)) {
            if (agent.process) {
                console.log(`🛑 Stopping ${name} agent...`);
                agent.process.kill('SIGTERM');
                agent.status = 'stopped';
            }
        }
        
        console.log('✅ All agents stopped');
    }
    
    async checkAllAgentStatus() {
        const status = {};
        
        for (const [name, agent] of Object.entries(this.agents)) {
            try {
                const response = await axios.get(`${agent.url}/health`, { timeout: 2000 });
                status[name] = { ...agent, status: 'running', health: response.data };
            } catch (error) {
                status[name] = { ...agent, status: 'stopped', error: error.message };
            }
        }
        
        return status;
    }
    
    async waitForAgentsReady() {
        console.log('⏳ Waiting for agents to be ready...');
        
        const maxAttempts = 30;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const status = await this.checkAllAgentStatus();
            const runningAgents = Object.values(status).filter(agent => agent.status === 'running');
            
            if (runningAgents.length >= 2) { // At least backend and python
                console.log(`✅ ${runningAgents.length} agents ready`);
                
                // Update status
                for (const [name, agent] of Object.entries(status)) {
                    this.agents[name].status = agent.status;
                }
                
                this.io.emit('agent-status', this.agents);
                return;
            }
            
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Agents failed to start within timeout');
    }
    
    async relayMessage(from, to, message, action) {
        const timestamp = new Date().toISOString();
        const messageData = { from, to, message, action, timestamp };
        
        this.logMessage('relay', from, `→ ${to}: ${action || 'message'}`);
        
        if (!this.agents[to]) {
            throw new Error(`Unknown agent: ${to}`);
        }
        
        try {
            const response = await axios.post(`${this.agents[to].url}/api/receive-message`, {
                ...messageData,
                from_agent: from
            }, { timeout: 5000 });
            
            return response.data;
        } catch (error) {
            this.logMessage('error', 'orchestrator', `Failed to relay to ${to}: ${error.message}`);
            throw error;
        }
    }
    
    logMessage(level, agent, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            agent,
            message
        };
        
        this.messageQueue.push(logEntry);
        
        // Keep only last 100 messages
        if (this.messageQueue.length > 100) {
            this.messageQueue.shift();
        }
        
        // Emit to connected clients
        this.io.emit('log-message', logEntry);
    }
    
    start(port = 4000) {
        this.server.listen(port, () => {
            console.log(`🎯 Agent Orchestrator running on port ${port}`);
            console.log(`📊 Dashboard: http://localhost:${port}/health`);
            console.log(`🔗 WebSocket: ws://localhost:${port}`);
        });
    }
}

// Start the orchestrator
if (require.main === module) {
    const orchestrator = new AgentOrchestrator();
    orchestrator.start();
}

module.exports = AgentOrchestrator;