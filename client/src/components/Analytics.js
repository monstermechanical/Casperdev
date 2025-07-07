import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Analytics = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          System analytics and connection statistics will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Analytics;