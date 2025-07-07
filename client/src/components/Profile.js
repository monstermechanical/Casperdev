import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Welcome, {user?.username}!</Typography>
        <Typography variant="body1">
          This is the profile page where users can manage their account settings and connections.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Profile;