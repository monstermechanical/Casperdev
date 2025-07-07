import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Users = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Discover Users
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          This is where users can discover and connect with other users in the system.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Users;