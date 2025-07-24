const express = require('express');
const { Ollama } = require('ollama');
const axios = require('axios');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Ollama client
const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
});

// Integration status storage
let aiIntegrationStatus = {
  ollama: {
    connected: false,
    models: [],
    lastSync: null,
    error: null
  },
  pieces: {
    connected: false,
    lastSync: null,
    error: null
  }
};

// Test Ollama connection and list available models
router.get('/ollama/test', auth, async (req, res) => {
  try {
    // Test connection by listing available models
    const models = await ollama.list();
    
    aiIntegrationStatus.ollama.connected = true;
    aiIntegrationStatus.ollama.models = models.models || [];
    aiIntegrationStatus.ollama.error = null;
    aiIntegrationStatus.ollama.lastSync = new Date().toISOString();
    
    res.json({
      status: 'connected',
      message: 'Ollama connection successful',
      models: models.models || [],
      modelCount: models.models?.length || 0
    });
  } catch (error) {
    aiIntegrationStatus.ollama.connected = false;
    aiIntegrationStatus.ollama.error = error.message;
    
    res.status(500).json({
      status: 'error',
      message: 'Ollama connection failed',
      error: error.message
    });
  }
});

// Chat with Ollama model
router.post('/ollama/chat', auth, async (req, res) => {
  try {
    const { message, model = process.env.OLLAMA_MODEL || 'llama3.2', stream = false } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    const response = await ollama.chat({
      model: model,
      messages: [{ role: 'user', content: message }],
      stream: stream
    });

    res.json({
      status: 'success',
      response: response.message.content,
      model: model,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to chat with Ollama',
      error: error.message
    });
  }
});

// Pull/download a model
router.post('/ollama/pull', auth, async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({
        status: 'error',
        message: 'Model name is required'
      });
    }

    // Start the pull process
    const pullStream = await ollama.pull({ model: model, stream: true });
    
    res.json({
      status: 'started',
      message: `Started pulling model: ${model}`,
      model: model
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to pull model',
      error: error.message
    });
  }
});

// Test Pieces connection
router.get('/pieces/test', auth, async (req, res) => {
  try {
    const piecesUrl = process.env.PIECES_OS_URL || 'http://localhost:1000';
    
    // Test connection to Pieces OS
    const response = await axios.get(`${piecesUrl}/health`, {
      timeout: 5000
    });
    
    aiIntegrationStatus.pieces.connected = true;
    aiIntegrationStatus.pieces.error = null;
    aiIntegrationStatus.pieces.lastSync = new Date().toISOString();
    
    res.json({
      status: 'connected',
      message: 'Pieces OS connection successful',
      version: response.data.version || 'unknown',
      health: response.data
    });
  } catch (error) {
    aiIntegrationStatus.pieces.connected = false;
    aiIntegrationStatus.pieces.error = error.message;
    
    res.status(500).json({
      status: 'error',
      message: 'Pieces OS connection failed',
      error: error.message
    });
  }
});

// Save code snippet to Pieces
router.post('/pieces/save-snippet', auth, async (req, res) => {
  try {
    const { code, language, title, description } = req.body;
    const piecesUrl = process.env.PIECES_OS_URL || 'http://localhost:1000';
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Code content is required'
      });
    }

    const snippet = {
      raw: {
        value: code
      },
      fragment: {
        metadata: {
          title: title || 'Untitled Snippet',
          description: description || '',
          language: language || 'text'
        }
      }
    };

    const response = await axios.post(`${piecesUrl}/assets/create`, snippet, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    res.json({
      status: 'success',
      message: 'Snippet saved to Pieces',
      assetId: response.data.id,
      snippet: snippet
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to save snippet to Pieces',
      error: error.message
    });
  }
});

// Get snippets from Pieces
router.get('/pieces/snippets', auth, async (req, res) => {
  try {
    const piecesUrl = process.env.PIECES_OS_URL || 'http://localhost:1000';
    const { limit = 10, search } = req.query;
    
    let url = `${piecesUrl}/assets?limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await axios.get(url, {
      timeout: 10000
    });

    res.json({
      status: 'success',
      snippets: response.data.iterable || [],
      total: response.data.total || 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get snippets from Pieces',
      error: error.message
    });
  }
});

// Get AI integration status
router.get('/status', auth, async (req, res) => {
  res.json({
    status: 'success',
    integrations: aiIntegrationStatus,
    timestamp: new Date().toISOString()
  });
});

// Combined AI assistant endpoint (uses best available model)
router.post('/assist', auth, async (req, res) => {
  try {
    const { message, preferredModel = 'ollama' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    let response;
    let usedModel;

    // Try Ollama first if preferred or available
    if (preferredModel === 'ollama' && aiIntegrationStatus.ollama.connected) {
      try {
        const ollamaResponse = await ollama.chat({
          model: process.env.OLLAMA_MODEL || 'llama3.2',
          messages: [{ role: 'user', content: message }]
        });
        response = ollamaResponse.message.content;
        usedModel = 'ollama';
      } catch (err) {
        console.warn('Ollama failed, falling back to other models:', err.message);
      }
    }

    // Fallback to error if no model available
    if (!response) {
      return res.status(503).json({
        status: 'error',
        message: 'No AI models available. Please check Ollama connection.',
        availableModels: {
          ollama: aiIntegrationStatus.ollama.connected
        }
      });
    }

    res.json({
      status: 'success',
      response: response,
      model: usedModel,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'AI assistant failed',
      error: error.message
    });
  }
});

module.exports = router;