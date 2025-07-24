import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as AIIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AIAssistant = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState({
    ollama: { connected: false, models: [] },
    pieces: { connected: false }
  });
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [showModels, setShowModels] = useState(false);
  const [snippets, setSnippets] = useState([]);
  const [snippetCode, setSnippetCode] = useState('');
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetLanguage, setSnippetLanguage] = useState('javascript');

  // Check integration status on component mount
  useEffect(() => {
    checkIntegrationStatus();
  }, []);

  const checkIntegrationStatus = async () => {
    try {
      const response = await axios.get('/api/ai/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIntegrationStatus(response.data.integrations);
    } catch (error) {
      console.error('Failed to check integration status:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    const userMessage = { role: 'user', content: message, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const response = await axios.post('/api/ai/ollama/chat', {
        message: message,
        model: selectedModel
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.response,
        model: response.data.model,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'error',
        content: `Error: ${error.response?.data?.message || 'Failed to get AI response'}`,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    }

    setMessage('');
    setLoading(false);
  };

  const downloadModel = async () => {
    try {
      setLoading(true);
      await axios.post('/api/ai/ollama/pull', {
        model: selectedModel
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(`Started downloading ${selectedModel}. This may take several minutes.`);
      // Refresh status after a short delay
      setTimeout(checkIntegrationStatus, 2000);
    } catch (error) {
      alert(`Failed to download model: ${error.response?.data?.message || error.message}`);
    }
    setLoading(false);
  };

  const saveSnippet = async () => {
    if (!snippetCode.trim()) return;

    try {
      await axios.post('/api/ai/pieces/save-snippet', {
        code: snippetCode,
        language: snippetLanguage,
        title: snippetTitle || 'Untitled Snippet',
        description: `Saved from AI Assistant at ${new Date().toLocaleString()}`
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Snippet saved to Pieces successfully!');
      setSnippetCode('');
      setSnippetTitle('');
      loadSnippets();
    } catch (error) {
      alert(`Failed to save snippet: ${error.response?.data?.message || error.message}`);
    }
  };

  const loadSnippets = async () => {
    try {
      const response = await axios.get('/api/ai/pieces/snippets?limit=20', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSnippets(response.data.snippets || []);
    } catch (error) {
      console.error('Failed to load snippets:', error);
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AIIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            AI Assistant Hub
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Chip
              label={`Ollama: ${integrationStatus.ollama.connected ? 'Connected' : 'Disconnected'}`}
              color={integrationStatus.ollama.connected ? 'success' : 'error'}
              size="small"
            />
            <Chip
              label={`Pieces: ${integrationStatus.pieces.connected ? 'Connected' : 'Disconnected'}`}
              color={integrationStatus.pieces.connected ? 'success' : 'error'}
              size="small"
            />
            <Tooltip title="Refresh Status">
              <IconButton size="small" onClick={checkIntegrationStatus}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Chat with AI" />
          <Tab label="Code Snippets" />
          <Tab label="Model Management" />
        </Tabs>

        {/* Chat Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ height: 400, overflowY: 'auto', mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {chatHistory.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ mt: 10 }}>
                Start a conversation with your AI assistant
              </Typography>
            ) : (
              chatHistory.map((msg, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Chip
                    label={msg.role === 'user' ? 'You' : msg.role === 'assistant' ? `AI (${msg.model})` : 'Error'}
                    color={msg.role === 'user' ? 'primary' : msg.role === 'assistant' ? 'secondary' : 'error'}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                    {msg.content}
                  </Typography>
                </Box>
              ))
            )}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask your AI assistant anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              multiline
              maxRows={3}
              disabled={!integrationStatus.ollama.connected}
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={loading || !message.trim() || !integrationStatus.ollama.connected}
              startIcon={<SendIcon />}
            >
              Send
            </Button>
          </Box>

          {!integrationStatus.ollama.connected && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Ollama is not connected. Please make sure the Ollama service is running.
            </Alert>
          )}
        </TabPanel>

        {/* Snippets Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Save Code Snippet to Pieces
            </Typography>
            <TextField
              fullWidth
              label="Snippet Title"
              value={snippetTitle}
              onChange={(e) => setSnippetTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Programming Language"
              value={snippetLanguage}
              onChange={(e) => setSnippetLanguage(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Code"
              value={snippetCode}
              onChange={(e) => setSnippetCode(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Paste your code here..."
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={saveSnippet}
                disabled={!snippetCode.trim() || !integrationStatus.pieces.connected}
                startIcon={<SaveIcon />}
              >
                Save to Pieces
              </Button>
              <Button
                variant="outlined"
                onClick={loadSnippets}
                startIcon={<SearchIcon />}
              >
                Load Snippets
              </Button>
            </Box>
          </Box>

          {snippets.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Recent Snippets
              </Typography>
              <List>
                {snippets.slice(0, 5).map((snippet, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={snippet.name || `Snippet ${index + 1}`}
                      secondary={snippet.classification?.specific || 'No language detected'}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {!integrationStatus.pieces.connected && (
            <Alert severity="warning">
              Pieces OS is not connected. Please make sure the Pieces service is running.
            </Alert>
          )}
        </TabPanel>

        {/* Model Management Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Ollama Model Management
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Available Models:
            </Typography>
            {integrationStatus.ollama.models.length > 0 ? (
              integrationStatus.ollama.models.map((model) => (
                <Chip
                  key={model.name}
                  label={`${model.name} (${Math.round(model.size / 1e9)}GB)`}
                  color={selectedModel === model.name ? 'primary' : 'default'}
                  onClick={() => setSelectedModel(model.name)}
                  sx={{ mr: 1, mb: 1 }}
                />
              ))
            ) : (
              <Typography color="text.secondary">
                No models found. Download a model to get started.
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              label="Model to Download"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              sx={{ mr: 2 }}
              placeholder="e.g., llama3.2, codellama"
            />
            <Button
              variant="contained"
              onClick={downloadModel}
              disabled={loading || !integrationStatus.ollama.connected}
              startIcon={<DownloadIcon />}
            >
              Download Model
            </Button>
          </Box>

          <Alert severity="info">
            Popular models: llama3.2, codellama, mistral, phi3
            <br />
            Model downloads can be large (1-8GB) and may take time.
          </Alert>

          {!integrationStatus.ollama.connected && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Ollama service is not running. Please start it with Docker Compose.
            </Alert>
          )}
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default AIAssistant;