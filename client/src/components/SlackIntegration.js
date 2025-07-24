import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Message,
  Send,
  Refresh,
  CheckCircle,
  Error,
  Info,
  Groups,
  Lock,
  Public
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const SlackIntegration = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [message, setMessage] = useState('');
  const [sendStatus, setSendStatus] = useState(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [error, setError] = useState(null);

  // Test Slack connection
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/slack/test', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnectionStatus(response.data);
      if (response.data.success) {
        loadChannels();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to test connection');
      setConnectionStatus({ success: false, connection: 'failed' });
    } finally {
      setLoading(false);
    }
  };

  // Load available channels
  const loadChannels = async () => {
    try {
      const response = await axios.get('/api/slack/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChannels(response.data.channels || []);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  // Send message to Slack
  const sendMessage = async () => {
    if (!selectedChannel || !message.trim()) {
      setError('Please select a channel and enter a message');
      return;
    }

    setLoading(true);
    setSendStatus(null);
    setError(null);
    
    try {
      const response = await axios.post('/api/slack/send-message', {
        channel: selectedChannel,
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Sent from Casperdev by ${token ? 'authorized user' : 'guest'}`
              }
            ]
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSendStatus({
        success: true,
        message: 'Message sent successfully!',
        channel: response.data.channel
      });
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
      setSendStatus({
        success: false,
        message: 'Failed to send message'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Slack Integration
      </Typography>

      {/* Connection Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Connection Status
            </Typography>
            {connectionStatus && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {connectionStatus.success ? (
                  <>
                    <CheckCircle color="success" />
                    <Typography color="success.main">
                      Connected to {connectionStatus.workspace?.name}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Error color="error" />
                    <Typography color="error.main">
                      Not connected
                    </Typography>
                  </>
                )}
              </Box>
            )}
            {connectionStatus?.workspace && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Bot: {connectionStatus.workspace.bot.name} ({connectionStatus.workspace.bot.id})
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={testConnection}
            disabled={loading}
          >
            Test Connection
          </Button>
        </Box>
      </Paper>

      {/* Send Message */}
      {connectionStatus?.success && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Send Message
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Channel</InputLabel>
                <Select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  label="Channel"
                >
                  {channels.map((channel) => (
                    <MenuItem key={channel.id} value={`#${channel.name}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {channel.is_private ? <Lock fontSize="small" /> : <Public fontSize="small" />}
                        #{channel.name}
                        {channel.is_member && (
                          <Chip label="Member" size="small" color="primary" />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                rows={3}
                placeholder="Enter your message..."
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={sendMessage}
                disabled={loading || !selectedChannel || !message.trim()}
              >
                Send Message
              </Button>
            </Grid>
          </Grid>

          {sendStatus && (
            <Alert 
              severity={sendStatus.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
              onClose={() => setSendStatus(null)}
            >
              {sendStatus.message}
            </Alert>
          )}
        </Paper>
      )}

      {/* Slash Commands Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Slash Commands
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Message />
            </ListItemIcon>
            <ListItemText
              primary="/casperdev help"
              secondary="Show available commands and usage"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Info />
            </ListItemIcon>
            <ListItemText
              primary="/casperdev status"
              secondary="Check system health and status"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Message />
            </ListItemIcon>
            <ListItemText
              primary="/casperdev search [query]"
              secondary="Search for jobs matching your query"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Groups />
            </ListItemIcon>
            <ListItemText
              primary="/casperdev profile"
              secondary="View your profile information"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Setup Instructions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Setup Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          To use Slack integration, you need to:
        </Typography>
        <ol>
          <li>Create a Slack app at api.slack.com/apps</li>
          <li>Add bot token scopes: chat:write, channels:read, etc.</li>
          <li>Install the app to your workspace</li>
          <li>Add the bot token and signing secret to your .env file</li>
          <li>Configure slash commands with your server URL</li>
        </ol>
        <Button
          variant="outlined"
          onClick={() => setTestDialogOpen(true)}
          sx={{ mt: 2 }}
        >
          View Detailed Setup Guide
        </Button>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Setup Guide Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Slack Integration Setup Guide</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Follow these steps to set up Slack integration:
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            1. Environment Variables
          </Typography>
          <Typography variant="body2" component="pre" sx={{ 
            bgcolor: 'grey.100', 
            p: 2, 
            borderRadius: 1,
            overflow: 'auto'
          }}>
{`SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_DEFAULT_CHANNEL=#general`}
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            2. Required Bot Token Scopes
          </Typography>
          <List dense>
            <ListItem>• chat:write - Send messages</ListItem>
            <ListItem>• channels:read - View channels</ListItem>
            <ListItem>• commands - Add slash commands</ListItem>
            <ListItem>• users:read - View users</ListItem>
            <ListItem>• team:read - View workspace info</ListItem>
          </List>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            3. Slash Command URLs
          </Typography>
          <Typography variant="body2">
            Configure these in your Slack app settings:
          </Typography>
          <List dense>
            <ListItem>• Commands: /api/slack/commands</ListItem>
            <ListItem>• Events: /api/slack/events</ListItem>
            <ListItem>• Interactive: /api/slack/interactive</ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SlackIntegration;