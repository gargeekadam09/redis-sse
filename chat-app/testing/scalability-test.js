const axios = require('axios');
const EventSource = require('eventsource');
const fs = require('fs');

class ScalabilityTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.users = [];
    this.connections = [];
  }

  async createTestUsers(count = 50) {
    console.log(`Creating ${count} test users for scalability testing...`);
    
    const batchSize = 10;
    for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
      const batchPromises = [];
      
      for (let i = 0; i < batchSize && (batch * batchSize + i) < count; i++) {
        const userIndex = batch * batchSize + i;
        batchPromises.push(this.createSingleUser(userIndex));
      }
      
      await Promise.allSettled(batchPromises);
      console.log(`Created batch ${batch + 1}/${Math.ceil(count / batchSize)}`);
      
    
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Total users created: ${this.users.length}`);
  }

  async createSingleUser(index) {
    try {
      const userData = {
        name: `ScaleUser${index + 1}`,
        email: `scale${index + 1}@test.com`,
        password: 'testpass123'
      };

      // Register user
      await axios.post(`${this.baseURL}/api/auth/register`, userData);
      
      // Login user
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: userData.email,
        password: userData.password
      });

      this.users.push({
        ...userData,
        token: loginResponse.data.token,
        userId: loginResponse.data.user.id,
        index: index + 1
      });

    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        // User exists, try to login
        try {
          const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
            email: `scale${index + 1}@test.com`,
            password: 'testpass123'
          });

          this.users.push({
            name: `ScaleUser${index + 1}`,
            email: `scale${index + 1}@test.com`,
            token: loginResponse.data.token,
            userId: loginResponse.data.user.id,
            index: index + 1
          });
        } catch (loginError) {
          console.error(`Failed to login user ${index + 1}:`, loginError.message);
        }
      } else {
        console.error(`Failed to create user ${index + 1}:`, error.message);
      }
    }
  }

  // Test concurrent connections
  async testConcurrentConnections(maxConnections = 100, connectionInterval = 100) {
    console.log(`\n🔗 Testing concurrent connections:`);
    console.log(`- Maximum connections: ${maxConnections}`);
    console.log(`- Connection interval: ${connectionInterval}ms`);

    const results = {
      successful: 0,
      failed: 0,
      connectionTimes: [],
      errors: [],
      peakConnections: 0
    };

    const connectionsToTest = Math.min(maxConnections, this.users.length);
    
    for (let i = 0; i < connectionsToTest; i++) {
      const user = this.users[i];
      const startTime = Date.now();
      
      try {
        // Create HTTP connection test
        const response = await axios.get(
          `${this.baseURL}/api/users`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
            timeout: 10000
          }
        );
        
        const connectionTime = Date.now() - startTime;
        results.connectionTimes.push(connectionTime);
        results.successful++;
        
        if ((i + 1) % 10 === 0) {
          console.log(` ${i + 1}/${connectionsToTest} connections tested`);
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push(`Connection ${i + 1}: ${error.message}`);
      }
      
      // Update peak connections
      results.peakConnections = Math.max(results.peakConnections, results.successful);
      
      // Wait before next connection
      if (i < connectionsToTest - 1) {
        await new Promise(resolve => setTimeout(resolve, connectionInterval));
      }
    }

    // Calculate statistics
    const avgConnectionTime = results.connectionTimes.length > 0
      ? results.connectionTimes.reduce((a, b) => a + b, 0) / results.connectionTimes.length
      : 0;

    const testResults = {
      maxConnections: connectionsToTest,
      successful: results.successful,
      failed: results.failed,
      peakConnections: results.peakConnections,
      avgConnectionTime: Math.round(avgConnectionTime * 100) / 100,
      successRate: ((results.successful / connectionsToTest) * 100).toFixed(2),
      errors: results.errors.slice(0, 10),
      timestamp: new Date().toISOString()
    };

    console.log(`\n CONCURRENT CONNECTIONS RESULTS:`);
    console.log(`Successful Connections: ${results.successful}/${connectionsToTest}`);
    console.log(`Failed Connections: ${results.failed}`);
    console.log(`Success Rate: ${testResults.successRate}%`);
    console.log(`Average Connection Time: ${testResults.avgConnectionTime}ms`);

    return testResults;
  }

  // Test SSE connections scalability
  async testSSEConnections(maxConnections = 50, testDuration = 30000) {
    console.log(`\n Testing SSE connections scalability:`);
    console.log(`- Maximum SSE connections: ${maxConnections}`);
    console.log(`- Test duration: ${testDuration / 1000}s`);

    const results = {
      successful: 0,
      failed: 0,
      messagesReceived: 0,
      connectionErrors: []
    };

    const connectionsToTest = Math.min(maxConnections, this.users.length);
    const connections = [];

    // Create SSE connections
    for (let i = 0; i < connectionsToTest; i++) {
      const user = this.users[i];
      
      try {
        const eventSource = new EventSource(
          `${this.baseURL}/api/sse/notifications?token=${user.token}`
        );

        eventSource.onopen = () => {
          results.successful++;
          console.log(`📡 SSE connection ${i + 1} established`);
        };

        eventSource.onmessage = (event) => {
          results.messagesReceived++;
        };

        eventSource.onerror = (error) => {
          results.failed++;
          results.connectionErrors.push(`Connection ${i + 1}: ${error.message || 'Unknown error'}`);
        };

        connections.push({
          eventSource,
          user,
          index: i + 1
        });

        // Small delay between connections
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        results.failed++;
        results.connectionErrors.push(`Connection ${i + 1}: ${error.message}`);
      }
    }

    // Wait for test duration
    console.log(` Maintaining ${connections.length} SSE connections for ${testDuration / 1000}s...`);
    
    // Send periodic messages to test the connections
    const messageInterval = setInterval(async () => {
      if (this.users.length >= 2) {
        try {
          await axios.post(
            `${this.baseURL}/api/chat/send`,
            {
              receiverId: this.users[0].userId,
              content: `SSE scalability test message - ${Date.now()}`
            },
            {
              headers: { Authorization: `Bearer ${this.users[1].token}` }
            }
          );
        } catch (error) {
          // Ignore message sending errors
        }
      }
    }, 2000);

    await new Promise(resolve => setTimeout(resolve, testDuration));
    clearInterval(messageInterval);

    // Close all connections
    connections.forEach(conn => {
      try {
        conn.eventSource.close();
      } catch (error) {
        // Ignore close errors
      }
    });

    const testResults = {
      maxConnections: connectionsToTest,
      successful: results.successful,
      failed: results.failed,
      messagesReceived: results.messagesReceived,
      testDuration: testDuration / 1000,
      successRate: ((results.successful / connectionsToTest) * 100).toFixed(2),
      avgMessagesPerConnection: results.successful > 0 
        ? Math.round((results.messagesReceived / results.successful) * 100) / 100 
        : 0,
      errors: results.connectionErrors.slice(0, 10),
      timestamp: new Date().toISOString()
    };

    console.log(`\nSSE CONNECTIONS RESULTS:`);
    console.log(`Successful SSE Connections: ${results.successful}/${connectionsToTest}`);
    console.log(`Failed Connections: ${results.failed}`);
    console.log(`Success Rate: ${testResults.successRate}%`);
    console.log(`Total Messages Received: ${results.messagesReceived}`);
    console.log(`Avg Messages per Connection: ${testResults.avgMessagesPerConnection}`);

    return testResults;
  }

  // Test load under stress
  async testLoadStress(userCount = 20, messagesPerUser = 10, duration = 60000) {
    console.log(`\n Testing load stress:`);
    console.log(`- ${userCount} concurrent users`);
    console.log(`- ${messagesPerUser} messages per user`);
    console.log(`- Duration: ${duration / 1000}s`);

    const results = {
      messagesSent: 0,
      messagesSuccessful: 0,
      messagesFailed: 0,
      errors: []
    };

    const testUsers = this.users.slice(0, Math.min(userCount, this.users.length));
    const startTime = Date.now();
    const endTime = startTime + duration;

    // Create continuous load
    const userPromises = testUsers.map(async (user, index) => {
      const receiver = testUsers[(index + 1) % testUsers.length];
      let messageCount = 0;
      
      while (Date.now() < endTime && messageCount < messagesPerUser) {
        try {
          await axios.post(
            `${this.baseURL}/api/chat/send`,
            {
              receiverId: receiver.userId,
              content: `Stress test message ${messageCount + 1} from user ${user.index}`
            },
            {
              headers: { Authorization: `Bearer ${user.token}` },
              timeout: 5000
            }
          );
          
          results.messagesSent++;
          results.messagesSuccessful++;
          messageCount++;
          
        } catch (error) {
          results.messagesSent++;
          results.messagesFailed++;
          results.errors.push(`User ${user.index}: ${error.message}`);
        }
        
        // Random delay between messages (100-500ms)
        const delay = Math.random() * 400 + 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    });

    await Promise.allSettled(userPromises);
    
    const actualDuration = (Date.now() - startTime) / 1000;
    const messagesPerSecond = results.messagesSuccessful / actualDuration;

    const testResults = {
      userCount: testUsers.length,
      plannedDuration: duration / 1000,
      actualDuration,
      messagesSent: results.messagesSent,
      messagesSuccessful: results.messagesSuccessful,
      messagesFailed: results.messagesFailed,
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      successRate: ((results.messagesSuccessful / results.messagesSent) * 100).toFixed(2),
      errors: results.errors.slice(0, 20),
      timestamp: new Date().toISOString()
    };

    console.log(`\nLOAD STRESS RESULTS:`);
    console.log(`Messages Sent: ${results.messagesSent}`);
    console.log(`Successful: ${results.messagesSuccessful}`);
    console.log(`Failed: ${results.messagesFailed}`);
    console.log(`Success Rate: ${testResults.successRate}%`);
    console.log(`Messages per Second: ${testResults.messagesPerSecond}`);

    return testResults;
  }

  // Save results to file
  saveResults(results, filename) {
    const data = {
      testType: 'scalability',
      timestamp: new Date().toISOString(),
      results
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Results saved to ${filename}`);
  }

  // Cleanup
  async cleanup() {
    console.log('\nCleaning up test users...');
    
    // Close any remaining connections
    this.connections.forEach(conn => {
      try {
        if (conn.eventSource) {
          conn.eventSource.close();
        }
      } catch (error) {
        // Ignore close errors
      }
    });

    // Logout users in batches
    const batchSize = 10;
    for (let i = 0; i < this.users.length; i += batchSize) {
      const batch = this.users.slice(i, i + batchSize);
      const logoutPromises = batch.map(user => 
        axios.post(
          `${this.baseURL}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${user.token}` } }
        ).catch(() => {}) // Ignore errors
      );
      
      await Promise.allSettled(logoutPromises);
    }
  }
}

// Run scalability tests
async function runScalabilityTests() {
  const tester = new ScalabilityTester();
  
  try {
    await tester.createTestUsers(30);
    
    // Test concurrent connections
    const connectionResults = await tester.testConcurrentConnections(25, 200);
    
    // Test SSE connections
    const sseResults = await tester.testSSEConnections(15, 20000);
    
    // Test load stress
    const stressResults = await tester.testLoadStress(10, 20, 30000);
    
    // Save results
    const allResults = {
      connections: connectionResults,
      sse: sseResults,
      stress: stressResults
    };
    
    tester.saveResults(allResults, `scalability-test-${Date.now()}.json`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await tester.cleanup();
  }
}

// Export for use in other scripts
module.exports = ScalabilityTester;

// Run if called directly
if (require.main === module) {
  runScalabilityTests();
}