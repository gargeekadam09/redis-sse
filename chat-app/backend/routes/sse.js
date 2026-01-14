const express = require('express');
const sseAuth = require('../middleware/sseAuth');
const redisClient = require('../config/redis');

const router = express.Router();

// Simple SSE endpoint for real-time notifications
router.get('/notifications', sseAuth, async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const userId = req.user._id.toString();
  
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connected' })}\n\n`);

  // Create a new Redis client for this connection
  const subscriber = redisClient.duplicate();
  
  try {
    await subscriber.connect();
    
    // Subscribe to user's message channel
    await subscriber.subscribe(`user:${userId}:messages`, (message) => {
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

    console.log(`User ${userId} connected to SSE`);
  } catch (error) {
    console.error('Redis subscription error:', error);
  }

  // Keep alive ping
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  // Cleanup on disconnect
  req.on('close', async () => {
    clearInterval(keepAlive);
    try {
      await subscriber.unsubscribe();
      await subscriber.quit();
      console.log(`User ${userId} disconnected from SSE`);
    } catch (error) {
      console.error('Error cleaning up SSE connection:', error);
    }
  });
});

module.exports = router;
