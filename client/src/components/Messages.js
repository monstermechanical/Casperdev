import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Messages = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Real-time messaging interface with Socket.IO integration.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Messages;