const redis = require('redis');

let client;

try {
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
    console.log('Running without Redis - some features may be limited');
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  // Connect to Redis
  client.connect().catch((err) => {
    console.error('Redis connection failed:', err);
    console.log('Running without Redis - some features may be limited');
  });
} catch (error) {
  console.error('Redis setup failed:', error);
  console.log('Running without Redis - some features may be limited');
}

module.exports = client;