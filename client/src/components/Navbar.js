import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Chip,
  Badge
} from '@mui/material';
import {
  Dashboard,
  People,
  Message,
  Analytics,
  AccountCircle,
  Logout,
  Settings,
  Wifi,
  WifiOff,
  Hub
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const { connected: socketConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { label: 'Users', path: '/users', icon: <People /> },
    { label: 'Messages', path: '/messages', icon: <Message /> },
    { label: 'Connections', path: '/connections', icon: <Hub /> },
    { label: 'Analytics', path: '/analytics', icon: <Analytics /> }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="static">
      <Toolbar>
        {/* Logo/Brand */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ cursor: 'pointer', mr: 4 }}
          onClick={() => navigate('/')}
        >
          Casperdev
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 1,
                backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderRadius: 1
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Connection Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Chip
            icon={socketConnected ? <Wifi /> : <WifiOff />}
            label={socketConnected ? 'Connected' : 'Offline'}
            color={socketConnected ? 'success' : 'error'}
            variant="outlined"
            size="small"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
            {user?.username}
          </Typography>
          
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Badge
              badgeContent={socketConnected ? "●" : null}
              color="success"
              variant="dot"
              invisible={!socketConnected}
            >
              <Avatar 
                sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                src={user?.profile?.avatar}
              >
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            
            <MenuItem onClick={() => { navigate('/connections'); handleClose(); }}>
              <Hub sx={{ mr: 1 }} />
              Connection Hub
            </MenuItem>
            
            <MenuItem onClick={() => { navigate('/settings'); handleClose(); }}>
              <Settings sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Disconnect
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;