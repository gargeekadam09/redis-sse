const axios = require('axios');
const EventSource = require('eventsource');
const fs = require('fs');

class LatencyTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.results = [];
    this.users = [];
  }

  // Create test users
  async createTestUsers(count = 2) {
    console.log(`Creating ${count} test users...`);
    
    for (let i = 0; i < count; i++) {
      try {
        const userData = {
          name: `TestUser${i + 1}`,
          email: `testuser${i + 1}@test.com`,
          password: 'testpass123'
        };

        console.log(`Attempting to create user: ${userData.email}`);

        // Register user
        try {
          await axios.post(`${this.baseURL}/api/auth/register`, userData);
          console.log(`✅ Registered user: ${userData.name}`);
        } catch (regError) {
          if (regError.response?.data?.message?.includes('already exists')) {
            console.log(`ℹ️ User ${userData.email} already exists, attempting login...`);
          } else {
            console.error(`❌ Registration failed for ${userData.email}:`, regError.response?.data || regError.message);
            throw regError;
          }
        }
        
        // Login user
        const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: userData.email,
          password: userData.password
        });

        this.users.push({
          ...userData,
          token: loginResponse.data.token,
          userId: loginResponse.data.user.id
        });

        console.log(`✅ Logged in user: ${userData.name} (ID: ${loginResponse.data.user.id})`);
      } catch (error) {
        console.error(`❌ Failed to create/login user ${i + 1}:`, error.response?.data || error.message);
        // Don't throw here, continue with other users
      }
    }
    
    console.log(`📊 Successfully created ${this.users.length} out of ${count} users`);
    
    if (this.users.length === 0) {
      throw new Error('Failed to create any test users. Check backend connection and authentication.');
    }
  }

  // Test message round-trip latency
  async testMessageLatency(messageCount = 100) {
    console.log(`\n🚀 Testing message latency with ${messageCount} messages...`);
    
    if (this.users.length < 2) {
      throw new Error('Need at least 2 users for latency testing');
    }

    const sender = this.users[0];
    const receiver = this.users[1];
    const latencies = [];

    for (let i = 0; i < messageCount; i++) {
      const startTime = Date.now();
      
      try {
        // Send message
        const response = await axios.post(
          `${this.baseURL}/api/chat/send`,
          {
            receiverId: receiver.userId,
            content: `Test message ${i + 1} - ${startTime}`
          },
          {
            headers: { Authorization: `Bearer ${sender.token}` }
          }
        );

        const endTime = Date.now();
        const latency = endTime - startTime;
        latencies.push(latency);

        if ((i + 1) % 10 === 0) {
          console.log(`📨 Sent ${i + 1}/${messageCount} messages`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ Error sending message ${i + 1}:`, error.message);
      }
    }

    // Calculate statistics
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);
    const medianLatency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];

    const results = {
      messageCount,
      avgLatency: Math.round(avgLatency * 100) / 100,
      minLatency,
      maxLatency,
      medianLatency,
      latencies,
      timestamp: new Date().toISOString()
    };

    console.log(`\n📊 LATENCY TEST RESULTS:`);
    console.log(`Average Latency: ${results.avgLatency}ms`);
    console.log(`Min Latency: ${results.minLatency}ms`);
    console.log(`Max Latency: ${results.maxLatency}ms`);
    console.log(`Median Latency: ${results.medianLatency}ms`);

    return results;
  }

  // Test SSE latency
  async testSSELatency(duration = 30000) {
    console.log(`\n🔄 Testing SSE latency for ${duration/1000} seconds...`);
    
    return new Promise((resolve) => {
      const latencies = [];
      const startTime = Date.now();
      
      // Create SSE connection
      const eventSource = new EventSource(
        `${this.baseURL}/api/sse/notifications?token=${this.users[0].token}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message') {
            const messageTime = parseInt(data.data.content.split(' - ')[1]);
            const receiveTime = Date.now();
            const latency = receiveTime - messageTime;
            latencies.push(latency);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      // Send messages during the test
      const sendInterval = setInterval(async () => {
        const messageTime = Date.now();
        try {
          await axios.post(
            `${this.baseURL}/api/chat/send`,
            {
              receiverId: this.users[0].userId,
              content: `SSE test message - ${messageTime}`
            },
            {
              headers: { Authorization: `Bearer ${this.users[1].token}` }
            }
          );
        } catch (error) {
          console.error('Error sending SSE test message:', error.message);
        }
      }, 1000);

      // Stop test after duration
      setTimeout(() => {
        clearInterval(sendInterval);
        eventSource.close();

        const avgSSELatency = latencies.length > 0 
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
          : 0;

        const results = {
          duration: duration / 1000,
          messagesReceived: latencies.length,
          avgSSELatency: Math.round(avgSSELatency * 100) / 100,
          latencies,
          timestamp: new Date().toISOString()
        };

        console.log(`📊 SSE LATENCY RESULTS:`);
        console.log(`Messages Received: ${results.messagesReceived}`);
        console.log(`Average SSE Latency: ${results.avgSSELatency}ms`);

        resolve(results);
      }, duration);
    });
  }

  // Save results to file
  saveResults(results, filename) {
    const data = {
      testType: 'latency',
      timestamp: new Date().toISOString(),
      results
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Results saved to ${filename}`);
  }

  // Cleanup test users
  async cleanup() {
    console.log('\n🧹 Cleaning up test users...');
    for (const user of this.users) {
      try {
        await axios.post(
          `${this.baseURL}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (error) {
        // Ignore logout errors
      }
    }
  }
}

// Run latency tests
async function runLatencyTests() {
  const tester = new LatencyTester();
  
  try {
    await tester.createTestUsers(2);
    
    // Test HTTP message latency
    const httpResults = await tester.testMessageLatency(20);
    
    // Test SSE latency
    const sseResults = await tester.testSSELatency(15000);
    
    // Save results
    const allResults = {
      http: httpResults,
      sse: sseResults
    };
    
    tester.saveResults(allResults, `latency-test-${Date.now()}.json`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await tester.cleanup();
  }
}

// Export for use in other scripts
module.exports = LatencyTester;

// Run if called directly
if (require.main === module) {
  runLatencyTests();
}