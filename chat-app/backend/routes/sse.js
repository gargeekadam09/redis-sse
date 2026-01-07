const express = require('express');
const auth = require('../middleware/auth');
const redisClient = require('../config/redis');

const router = express.Router();

// SSE endpoint for real-time notifications
router.get('/notifications', auth, (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const userId = req.user._id.toString();
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connected' })}\n\n`);

  // Subscribe to Redis channel for this user
  const subscriber = redisClient.duplicate();
  
  subscriber.connect().then(() => {
    subscriber.subscribe(`user:${userId}:messages`, (message) => {
      try {
        const messageData = JSON.parse(message);
        res.write(`data: ${JSON.stringify({ 
          type: 'new_message', 
          data: messageData 
        })}\n\n`);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Subscribe to user status updates
    subscriber.subscribe(`user:${userId}:status`, (message) => {
      try {
        const statusData = JSON.parse(message);
        res.write(`data: ${JSON.stringify({ 
          type: 'user_status', 
          data: statusData 
        })}\n\n`);
      } catch (error) {
        console.error('Error parsing status:', error);
      }
    });
  });

  // Handle client disconnect
  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// SSE endpoint for online users
router.get('/online-users', auth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const userId = req.user._id.toString();
  
  // Send initial connection
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Subscribe to global user status updates
  const subscriber = redisClient.duplicate();
  
  subscriber.connect().then(() => {
    subscriber.subscribe('user:status:global', (message) => {
      try {
        const statusData = JSON.parse(message);
        res.write(`data: ${JSON.stringify({ 
          type: 'user_status_update', 
          data: statusData 
        })}\n\n`);
      } catch (error) {
        console.error('Error parsing global status:', error);
      }
    });
  });

  // Handle client disconnect
  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

module.exports = router;