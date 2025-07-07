import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People,
  Message,
  Notifications,
  CloudDone,
  Warning,
  CheckCircle,
  TrendingUp
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { connected: socketConnected, getConnectionStatus } = useSocket();
  const [systemHealth, setSystemHealth] = useState(null);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboardData',
    () => axios.get('/api/data/dashboard').then(res => res.data),
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Fetch system health
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await axios.get('/api/data/health');
        setSystemHealth(response.data);
      } catch (error) {
        console.error('Failed to fetch system health:', error);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const connectionStatus = getConnectionStatus();

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'success';
      case 'disconnected':
      case 'inactive':
        return 'error';
      case 'simulated':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Failed to load dashboard data. Please check your connection.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Welcome Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.username}!
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Here's your connection overview and system status
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Connection Status Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CloudDone color={socketConnected ? 'success' : 'error'} />
                <Typography variant="h6" ml={1}>
                  Real-time
                </Typography>
              </Box>
              <Typography variant="h4" color={socketConnected ? 'success.main' : 'error.main'}>
                {socketConnected ? 'Connected' : 'Disconnected'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Socket.IO Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <People color="primary" />
                <Typography variant="h6" ml={1}>
                  Users
                </Typography>
              </Box>
              <Typography variant="h4" color="primary.main">
                {dashboardData?.analytics?.totalUsers || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total registered users
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUp color="secondary" />
                <Typography variant="h6" ml={1}>
                  Active
                </Typography>
              </Box>
              <Typography variant="h4" color="secondary.main">
                {dashboardData?.analytics?.activeUsers || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active users online
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Message color="info" />
                <Typography variant="h6" ml={1}>
                  Messages
                </Typography>
              </Box>
              <Typography variant="h4" color="info.main">
                {dashboardData?.analytics?.totalMessages || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total messages sent
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <CloudDone sx={{ mr: 1, verticalAlign: 'middle' }} />
              System Connections
            </Typography>
            
            {systemHealth ? (
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color={getStatusColor(systemHealth.services?.database?.status)} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Database (${systemHealth.services?.database?.name})`}
                    secondary={`Status: ${systemHealth.services?.database?.status}`}
                  />
                  <Chip 
                    label={systemHealth.services?.database?.status} 
                    color={getStatusColor(systemHealth.services?.database?.status)}
                    size="small"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color={getStatusColor('connected')} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Real-time Server"
                    secondary={`WebSocket connection: ${socketConnected ? 'active' : 'inactive'}`}
                  />
                  <Chip 
                    label={socketConnected ? 'connected' : 'disconnected'} 
                    color={getStatusColor(socketConnected ? 'connected' : 'disconnected')}
                    size="small"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color={getStatusColor(systemHealth.services?.cache?.status)} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Cache (${systemHealth.services?.cache?.name})`}
                    secondary={`Status: ${systemHealth.services?.cache?.status}`}
                  />
                  <Chip 
                    label={systemHealth.services?.cache?.status} 
                    color={getStatusColor(systemHealth.services?.cache?.status)}
                    size="small"
                  />
                </ListItem>
              </List>
            ) : (
              <CircularProgress size={20} />
            )}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
              Recent Activity
            </Typography>
            
            {dashboardData?.recentActivity?.length > 0 ? (
              <List>
                {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={activity.content || activity.message}
                      secondary={`By ${activity.username} - ${new Date(activity.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No recent activity to display
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Connection Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Connection Statistics
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" color="primary">
                    {connectionStatus.onlineUsersCount}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Online Users
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" color="success.main">
                    {dashboardData?.analytics?.connectionStats?.totalConnections || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Connections
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" color="warning.main">
                    {dashboardData?.analytics?.connectionStats?.pendingRequests || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Requests
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h3" color="info.main">
                    {dashboardData?.analytics?.totalPosts || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Posts
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button variant="contained" href="/users">
                Connect with Users
              </Button>
              <Button variant="outlined" href="/messages">
                View Messages
              </Button>
              <Button variant="outlined" href="/connections">
                Manage Connections
              </Button>
              <Button variant="outlined" href="/analytics">
                View Analytics
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;