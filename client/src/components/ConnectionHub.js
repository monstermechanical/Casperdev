import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  CloudDone,
  Storage,
  Wifi,
  People,
  Message,
  Speed,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const ConnectionHub = () => {
  const [tabValue, setTabValue] = useState(0);
  const [systemHealth, setSystemHealth] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { user } = useAuth();
  const { connected: socketConnected, getConnectionStatus } = useSocket();

  // Fetch system health data
  const { data: healthData, isLoading, refetch } = useQuery(
    'systemHealth',
    () => axios.get('/api/data/health').then(res => res.data),
    {
      refetchInterval: 30000,
      onSuccess: (data) => setSystemHealth(data)
    }
  );

  // Fetch user connections
  const { data: userConnections } = useQuery(
    ['userConnections', user?.id],
    () => axios.get(`/api/users/${user.id}/connections`).then(res => res.data),
    {
      enabled: !!user?.id
    }
  );

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle color="success" />;
      case 'simulated':
        return <Warning color="warning" />;
      case 'disconnected':
      case 'inactive':
        return <ErrorIcon color="error" />;
      default:
        return <Warning color="action" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'success';
      case 'simulated':
        return 'warning';
      case 'disconnected':
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const connectionStatus = getConnectionStatus();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" gutterBottom>
            Connection Hub
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Monitor and manage all system connections
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="connection tabs">
          <Tab label="System Status" />
          <Tab label="User Connections" />
          <Tab label="Real-time" />
          <Tab label="External APIs" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Overall Status */}
          <Grid item xs={12}>
            <Alert 
              severity={systemHealth ? 'success' : 'warning'} 
              sx={{ mb: 2 }}
            >
              {systemHealth 
                ? `All systems operational as of ${new Date(systemHealth.timestamp).toLocaleString()}`
                : 'System status check in progress...'
              }
            </Alert>
          </Grid>

          {/* Core Services */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Core Services
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(systemHealth?.services?.database?.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary="Database Connection"
                      secondary={`MongoDB - ${systemHealth?.services?.database?.status || 'Unknown'}`}
                    />
                    <Chip 
                      label={systemHealth?.services?.database?.status || 'Unknown'} 
                      color={getStatusColor(systemHealth?.services?.database?.status)}
                      size="small"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(socketConnected ? 'connected' : 'disconnected')}
                    </ListItemIcon>
                    <ListItemText
                      primary="Real-time Server"
                      secondary={`WebSocket - ${socketConnected ? 'Connected' : 'Disconnected'}`}
                    />
                    <Chip 
                      label={socketConnected ? 'Connected' : 'Disconnected'} 
                      color={getStatusColor(socketConnected ? 'connected' : 'disconnected')}
                      size="small"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(systemHealth?.services?.cache?.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary="Cache Service"
                      secondary={`${systemHealth?.services?.cache?.name || 'Cache'} - ${systemHealth?.services?.cache?.status || 'Unknown'}`}
                    />
                    <Chip 
                      label={systemHealth?.services?.cache?.status || 'Unknown'} 
                      color={getStatusColor(systemHealth?.services?.cache?.status)}
                      size="small"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Speed sx={{ mr: 1, verticalAlign: 'middle' }} />
                  System Metrics
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <People color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Users"
                      secondary={`${systemHealth?.metrics?.totalUsers || 0} registered users`}
                    />
                    <Typography variant="h6" color="primary">
                      {systemHealth?.metrics?.totalUsers || 0}
                    </Typography>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Active Users"
                      secondary={`${systemHealth?.metrics?.activeUsers || 0} users online`}
                    />
                    <Typography variant="h6" color="success.main">
                      {systemHealth?.metrics?.activeUsers || 0}
                    </Typography>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Message color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Messages"
                      secondary={`${systemHealth?.metrics?.totalMessages || 0} messages sent`}
                    />
                    <Typography variant="h6" color="info.main">
                      {systemHealth?.metrics?.totalMessages || 0}
                    </Typography>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <People sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Your Connections
                </Typography>
                
                {userConnections?.connections?.length > 0 ? (
                  <List>
                    {userConnections.connections.map((connection, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={connection.username}
                          secondary={`Connected on ${new Date(connection.connectedAt).toLocaleDateString()}`}
                        />
                        <Chip 
                          label={connection.connectionStatus} 
                          color={getStatusColor(connection.connectionStatus)}
                          size="small"
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No connections found. Start connecting with other users!
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Connection Stats
                </Typography>
                <Box textAlign="center" mb={2}>
                  <Typography variant="h3" color="primary">
                    {userConnections?.count || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Connections
                  </Typography>
                </Box>
                
                <Button variant="contained" fullWidth href="/users">
                  Find More Users
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Wifi sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Real-time Connection Status
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(connectionStatus.connected ? 'connected' : 'disconnected')}
                    </ListItemIcon>
                    <ListItemText
                      primary="WebSocket Connection"
                      secondary={connectionStatus.connected ? 'Active and receiving updates' : 'Disconnected'}
                    />
                    <Chip 
                      label={connectionStatus.connected ? 'Connected' : 'Disconnected'} 
                      color={getStatusColor(connectionStatus.connected ? 'connected' : 'disconnected')}
                      size="small"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <People color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Online Users"
                      secondary={`${connectionStatus.onlineUsersCount} users currently online`}
                    />
                    <Typography variant="h6" color="info.main">
                      {connectionStatus.onlineUsersCount}
                    </Typography>
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Message color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Active Room"
                      secondary={connectionStatus.activeRoom || 'No active room'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Real-time Features
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color={connectionStatus.connected ? 'success' : 'action'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Instant Messaging"
                      secondary="Send and receive messages in real-time"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color={connectionStatus.connected ? 'success' : 'action'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Live Notifications"
                      secondary="Get notified of new activities instantly"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <CheckCircle color={connectionStatus.connected ? 'success' : 'action'} />
                    </ListItemIcon>
                    <ListItemText
                      primary="User Presence"
                      secondary="See who's online and active"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CloudDone sx={{ mr: 1, verticalAlign: 'middle' }} />
                  External API Connections
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(systemHealth?.services?.externalApis?.weather)}
                    </ListItemIcon>
                    <ListItemText
                      primary="Weather Service"
                      secondary="External weather data API connection"
                    />
                    <Chip 
                      label={systemHealth?.services?.externalApis?.weather || 'Unknown'} 
                      color={getStatusColor(systemHealth?.services?.externalApis?.weather)}
                      size="small"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(systemHealth?.services?.externalApis?.notifications)}
                    </ListItemIcon>
                    <ListItemText
                      primary="Notification Service"
                      secondary="Push notification service connection"
                    />
                    <Chip 
                      label={systemHealth?.services?.externalApis?.notifications || 'Unknown'} 
                      color={getStatusColor(systemHealth?.services?.externalApis?.notifications)}
                      size="small"
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Available API Endpoints
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  • GET /api/data/external/weather - Weather data
                  • GET /api/health - System health check
                  • WebSocket connection for real-time updates
                </Typography>
                
                <Button variant="outlined" size="small">
                  Test External APIs
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ConnectionHub;