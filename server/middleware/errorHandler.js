const { NotionSyncHistory } = require('../models/NotionSyncConfig');

// Custom error classes
class NotionSlackError extends Error {
  constructor(message, code = 'NOTION_SLACK_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'NotionSlackError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class NotionError extends NotionSlackError {
  constructor(message, details = null) {
    super(message, 'NOTION_ERROR', 500, details);
    this.name = 'NotionError';
  }
}

class SlackError extends NotionSlackError {
  constructor(message, details = null) {
    super(message, 'SLACK_ERROR', 500, details);
    this.name = 'SlackError';
  }
}

class ValidationError extends NotionSlackError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

class ConfigNotFoundError extends NotionSlackError {
  constructor(message = 'Sync configuration not found') {
    super(message, 'CONFIG_NOT_FOUND', 404);
    this.name = 'ConfigNotFoundError';
  }
}

class ServiceUnavailableError extends NotionSlackError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 'SERVICE_UNAVAILABLE', 503);
    this.name = 'ServiceUnavailableError';
  }
}

// Error logging function
const logError = async (error, context = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name || 'Error',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
      stack: error.stack,
      details: error.details
    },
    context: {
      userId: context.userId,
      configId: context.configId,
      channelId: context.channelId,
      messageId: context.messageId,
      endpoint: context.endpoint,
      userAgent: context.userAgent,
      ip: context.ip
    }
  };

  console.error('Error Log:', JSON.stringify(errorLog, null, 2));

  // Log to sync history if related to a sync operation
  if (context.configId && context.messageId) {
    try {
      await NotionSyncHistory.updateOne(
        {
          syncConfigId: context.configId,
          slackMessageId: context.messageId
        },
        {
          status: 'failed',
          error: {
            message: error.message,
            code: error.code,
            details: error.details || error.stack
          }
        },
        { upsert: false }
      );
    } catch (logError) {
      console.error('Failed to log error to sync history:', logError);
    }
  }
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware
const validateSyncConfig = (req, res, next) => {
  const { slackTeamId, slackChannelId, notionDatabaseId } = req.body;
  
  const errors = [];
  
  if (!slackTeamId || typeof slackTeamId !== 'string') {
    errors.push('slackTeamId is required and must be a string');
  }
  
  if (!slackChannelId || typeof slackChannelId !== 'string') {
    errors.push('slackChannelId is required and must be a string');
  }
  
  if (!notionDatabaseId || typeof notionDatabaseId !== 'string') {
    errors.push('notionDatabaseId is required and must be a string');
  }
  
  if (req.body.syncInterval && (typeof req.body.syncInterval !== 'number' || req.body.syncInterval < 1 || req.body.syncInterval > 60)) {
    errors.push('syncInterval must be a number between 1 and 60');
  }
  
  if (req.body.maxMessagesPerSync && (typeof req.body.maxMessagesPerSync !== 'number' || req.body.maxMessagesPerSync < 1 || req.body.maxMessagesPerSync > 100)) {
    errors.push('maxMessagesPerSync must be a number between 1 and 100');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

// Rate limiting for specific operations
const rateLimitMap = new Map();

const rateLimiter = (maxRequests = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const key = `${req.user?.id || req.ip}_${req.route.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }
    
    const requests = rateLimitMap.get(key);
    
    // Remove old requests
    const recentRequests = requests.filter(time => time > windowStart);
    rateLimitMap.set(key, recentRequests);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }
    
    recentRequests.push(now);
    next();
  };
};

// Main error handling middleware
const errorHandler = async (err, req, res, next) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  const context = {
    userId: req.user?.id,
    endpoint: `${req.method} ${req.originalUrl}`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    body: req.method !== 'GET' ? req.body : undefined
  };

  await logError(err, context);

  // Handle specific error types
  if (err instanceof NotionSlackError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details
    });
  }

  // Handle Notion API errors
  if (err.code && err.code.startsWith('notion_')) {
    const notionError = new NotionError(
      `Notion API error: ${err.message}`,
      { notionCode: err.code, notionMessage: err.message }
    );
    
    return res.status(500).json({
      error: 'Notion integration error',
      code: notionError.code,
      details: notionError.details
    });
  }

  // Handle Slack API errors
  if (err.data && err.data.error) {
    const slackError = new SlackError(
      `Slack API error: ${err.data.error}`,
      { slackError: err.data.error, slackCode: err.data.code }
    );
    
    return res.status(500).json({
      error: 'Slack integration error',
      code: slackError.code,
      details: slackError.details
    });
  }

  // Handle MongoDB/Mongoose errors
  if (err.name === 'ValidationError') {
    const validationError = new ValidationError(
      'Database validation failed',
      Object.keys(err.errors).join(', ')
    );
    
    return res.status(400).json({
      error: validationError.message,
      code: validationError.code,
      details: validationError.details
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
      details: { duplicateKey: Object.keys(err.keyValue || {}).join(', ') }
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
};

// Health check for error monitoring
const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    // Check database connection
    try {
      const mongoose = require('mongoose');
      health.database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    } catch (error) {
      health.database = 'error';
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};

// Cleanup function for rate limiter
const cleanupRateLimiter = () => {
  const now = Date.now();
  const oneHourAgo = now - 3600000; // 1 hour
  
  for (const [key, requests] of rateLimitMap.entries()) {
    const recentRequests = requests.filter(time => time > oneHourAgo);
    if (recentRequests.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, recentRequests);
    }
  }
};

// Cleanup every hour
setInterval(cleanupRateLimiter, 3600000);

module.exports = {
  // Error classes
  NotionSlackError,
  NotionError,
  SlackError,
  ValidationError,
  ConfigNotFoundError,
  ServiceUnavailableError,
  
  // Middleware functions
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateSyncConfig,
  rateLimiter,
  healthCheck,
  logError
};