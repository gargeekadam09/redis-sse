const axios = require('axios');
const fs = require('fs');

class ThroughputTester {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.users = [];
  }

  async createTestUsers(count = 10) {
    console.log(`Creating ${count} test users for throughput testing...`);
    
    for (let i = 0; i < count; i++) {
      try {
        const userData = {
          name: `ThroughputUser${i + 1}`,
          email: `throughput${i + 1}@test.com`,
          password: 'testpass123'
        };

 
        await axios.post(`${this.baseURL}/api/auth/register`, userData);
  
        const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: userData.email,
          password: userData.password
        });

        this.users.push({
          ...userData,
          token: loginResponse.data.token,
          userId: loginResponse.data.user.id
        });

        console.log(`Created user: ${userData.name}`);
      } catch (error) {
        if (error.response?.data?.message?.includes('already exists')) {

          const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
            email: `throughput${i + 1}@test.com`,
            password: 'testpass123'
          });

          this.users.push({
            name: `ThroughputUser${i + 1}`,
            email: `throughput${i + 1}@test.com`,
            token: loginResponse.data.token,
            userId: loginResponse.data.user.id
          });
        }
      }
    }
  }

  
  async testConcurrentThroughput(messagesPerUser = 100, concurrentUsers = 5) {
    console.log(`\n Testing concurrent throughput:`);
    console.log(`- ${concurrentUsers} concurrent users`);
    console.log(`- ${messagesPerUser} messages per user`);
    console.log(`- Total messages: ${concurrentUsers * messagesPerUser}`);

    const startTime = Date.now();
    const promises = [];
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    // Create concurrent message sending promises
    for (let userIndex = 0; userIndex < concurrentUsers; userIndex++) {
      const sender = this.users[userIndex % this.users.length];
      const receiver = this.users[(userIndex + 1) % this.users.length];

      const userPromise = this.sendMessagesForUser(
        sender, 
        receiver, 
        messagesPerUser, 
        userIndex
      );
      
      promises.push(userPromise);
    }


    const userResults = await Promise.allSettled(promises);
    
    // Aggregate results
    userResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.successful += result.value.successful;
        results.failed += result.value.failed;
        results.errors.push(...result.value.errors);
      } else {
        results.failed += messagesPerUser;
        results.errors.push(`User ${index} failed: ${result.reason}`);
      }
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    const totalMessages = concurrentUsers * messagesPerUser;
    const throughput = results.successful / duration;

    const testResults = {
      concurrentUsers,
      messagesPerUser,
      totalMessages,
      successful: results.successful,
      failed: results.failed,
      duration,
      throughput: Math.round(throughput * 100) / 100,
      errors: results.errors.slice(0, 10), // Keep first 10 errors
      timestamp: new Date().toISOString()
    };

    console.log(`\n THROUGHPUT TEST RESULTS:`);
    console.log(`Total Messages: ${totalMessages}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Throughput: ${testResults.throughput} messages/second`);
    console.log(`Success Rate: ${((results.successful / totalMessages) * 100).toFixed(2)}%`);

    return testResults;
  }


  async sendMessagesForUser(sender, receiver, messageCount, userIndex) {
    const results = { successful: 0, failed: 0, errors: [] };
    
    for (let i = 0; i < messageCount; i++) {
      try {
        await axios.post(
          `${this.baseURL}/api/chat/send`,
          {
            receiverId: receiver.userId,
            content: `Throughput test message ${i + 1} from user ${userIndex + 1}`
          },
          {
            headers: { Authorization: `Bearer ${sender.token}` },
            timeout: 5000 
          }
        );
        
        results.successful++;
        
        if ((i + 1) % 20 === 0) {
          console.log(`User ${userIndex + 1}: ${i + 1}/${messageCount} messages sent`);
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${userIndex + 1}, Message ${i + 1}: ${error.message}`);
      }
    }
    
    return results;
  }


  async testBurstThroughput(burstSize = 50, burstCount = 10, delayBetweenBursts = 1000) {
    console.log(`\n Testing burst throughput:`);
    console.log(`- ${burstCount} bursts of ${burstSize} messages each`);
    console.log(`- ${delayBetweenBursts}ms delay between bursts`);

    const sender = this.users[0];
    const receiver = this.users[1];
    const burstResults = [];
    
    for (let burst = 0; burst < burstCount; burst++) {
      console.log(`\nBurst ${burst + 1}/${burstCount}...`);
      
      const burstStartTime = Date.now();
      const promises = [];
      
     
      for (let i = 0; i < burstSize; i++) {
        const promise = axios.post(
          `${this.baseURL}/api/chat/send`,
          {
            receiverId: receiver.userId,
            content: `Burst ${burst + 1} message ${i + 1}`
          },
          {
            headers: { Authorization: `Bearer ${sender.token}` },
            timeout: 10000
          }
        );
        promises.push(promise);
      }
      
      const results = await Promise.allSettled(promises);
      const burstEndTime = Date.now();
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const burstDuration = (burstEndTime - burstStartTime) / 1000;
      const burstThroughput = successful / burstDuration;
      
      burstResults.push({
        burst: burst + 1,
        successful,
        failed,
        duration: burstDuration,
        throughput: burstThroughput
      });
      
      console.log(`Burst ${burst + 1}: ${successful}/${burstSize} successful, ${burstThroughput.toFixed(2)} msg/s`);
      
      
      if (burst < burstCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBursts));
      }
    }
    
    const totalSuccessful = burstResults.reduce((sum, b) => sum + b.successful, 0);
    const totalMessages = burstCount * burstSize;
    const avgThroughput = burstResults.reduce((sum, b) => sum + b.throughput, 0) / burstCount;
    
    const testResults = {
      burstSize,
      burstCount,
      totalMessages,
      totalSuccessful,
      totalFailed: totalMessages - totalSuccessful,
      avgThroughput: Math.round(avgThroughput * 100) / 100,
      burstResults,
      timestamp: new Date().toISOString()
    };
    
    console.log(`\n BURST THROUGHPUT RESULTS:`);
    console.log(`Total Messages: ${totalMessages}`);
    console.log(`Total Successful: ${totalSuccessful}`);
    console.log(`Average Throughput: ${testResults.avgThroughput} messages/second`);
    console.log(`Success Rate: ${((totalSuccessful / totalMessages) * 100).toFixed(2)}%`);
    
    return testResults;
  }


  saveResults(results, filename) {
    const data = {
      testType: 'throughput',
      timestamp: new Date().toISOString(),
      results
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(` Results saved to ${filename}`);
  }

  // Cleanup
  async cleanup() {
    console.log('\n Cleaning up test users...');
    for (const user of this.users) {
      try {
        await axios.post(
          `${this.baseURL}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (error) {
     
      }
    }
  }
}


async function runThroughputTests() {
  const tester = new ThroughputTester();
  
  try {
    await tester.createTestUsers(10);
    
    const concurrentResults = await tester.testConcurrentThroughput(50, 5);
  
    const burstResults = await tester.testBurstThroughput(30, 5, 2000);

    const allResults = {
      concurrent: concurrentResults,
      burst: burstResults
    };
    
    tester.saveResults(allResults, `throughput-test-${Date.now()}.json`);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await tester.cleanup();
  }
}

module.exports = ThroughputTester;

if (require.main === module) {
  runThroughputTests();
}