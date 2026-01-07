const LatencyTester = require('./latency-test');
const ThroughputTester = require('./throughput-test');
const ScalabilityTester = require('./scalability-test');
const PerformanceMonitor = require('./performance-monitor');
const fs = require('fs');

class MasterTestRunner {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.performanceMonitor = new PerformanceMonitor();
    this.testResults = {};
  }

  // Run all tests with performance monitoring
  async runAllTests() {
    console.log('🚀 Starting comprehensive chat application testing...\n');
    
    const startTime = Date.now();
    
    try {
      // Test 1: Latency Testing
      console.log('=' .repeat(60));
      console.log('📡 TEST 1: LATENCY TESTING');
      console.log('=' .repeat(60));
      
      this.testResults.latency = await this.performanceMonitor.monitorDuringTest(
        async () => {
          const tester = new LatencyTester(this.baseURL);
          await tester.createTestUsers(2);
          
          const httpResults = await tester.testMessageLatency(30);
          const sseResults = await tester.testSSELatency(20000);
          
          await tester.cleanup();
          
          return { http: httpResults, sse: sseResults };
        },
        'Latency Test'
      );

      // Wait between tests
      await this.waitBetweenTests(5000);

      // Test 2: Throughput Testing
      console.log('\n' + '=' .repeat(60));
      console.log('⚡ TEST 2: THROUGHPUT TESTING');
      console.log('=' .repeat(60));
      
      this.testResults.throughput = await this.performanceMonitor.monitorDuringTest(
        async () => {
          const tester = new ThroughputTester(this.baseURL);
          await tester.createTestUsers(8);
          
          const concurrentResults = await tester.testConcurrentThroughput(30, 4);
          const burstResults = await tester.testBurstThroughput(20, 5, 1500);
          
          await tester.cleanup();
          
          return { concurrent: concurrentResults, burst: burstResults };
        },
        'Throughput Test'
      );

      // Wait between tests
      await this.waitBetweenTests(5000);

      // Test 3: Scalability Testing
      console.log('\n' + '=' .repeat(60));
      console.log('📈 TEST 3: SCALABILITY TESTING');
      console.log('=' .repeat(60));
      
      this.testResults.scalability = await this.performanceMonitor.monitorDuringTest(
        async () => {
          const tester = new ScalabilityTester(this.baseURL);
          await tester.createTestUsers(20);
          
          const connectionResults = await tester.testConcurrentConnections(15, 300);
          const sseResults = await tester.testSSEConnections(10, 15000);
          const stressResults = await tester.testLoadStress(8, 15, 20000);
          
          await tester.cleanup();
          
          return {
            connections: connectionResults,
            sse: sseResults,
            stress: stressResults
          };
        },
        'Scalability Test'
      );

      // Test 4: Extended Performance Monitoring
      console.log('\n' + '=' .repeat(60));
      console.log('🔍 TEST 4: EXTENDED PERFORMANCE MONITORING');
      console.log('=' .repeat(60));
      
      this.testResults.extendedPerformance = await this.performanceMonitor.monitorDuringTest(
        async () => {
          console.log('🔄 Running extended performance monitoring (60 seconds)...');
          
          // Simulate realistic usage during monitoring
          const tester = new ThroughputTester(this.baseURL);
          await tester.createTestUsers(5);
          
          // Send messages continuously for 60 seconds
          const endTime = Date.now() + 60000;
          let messageCount = 0;
          
          while (Date.now() < endTime) {
            try {
              await tester.sendMessagesForUser(
                tester.users[0], 
                tester.users[1], 
                5, 
                0
              );
              messageCount += 5;
              
              // Wait 2 seconds between batches
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              console.error('Error in extended monitoring:', error.message);
            }
          }
          
          await tester.cleanup();
          
          return { messagesSent: messageCount, duration: 60 };
        },
        'Extended Performance Monitoring'
      );

      const totalTime = (Date.now() - startTime) / 1000;
      
      // Generate comprehensive report
      this.generateComprehensiveReport(totalTime);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      throw error;
    }
  }

  // Wait between tests
  async waitBetweenTests(ms) {
    console.log(`\n⏱️ Waiting ${ms/1000}s between tests for system recovery...`);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate comprehensive report
  generateComprehensiveReport(totalTime) {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(80));

    const report = {
      summary: {
        totalTestTime: Math.round(totalTime * 100) / 100,
        timestamp: new Date().toISOString(),
        testsCompleted: Object.keys(this.testResults).length
      },
      results: this.testResults,
      recommendations: this.generateRecommendations()
    };

    // Print summary
    console.log(`\n📋 TEST SUMMARY:`);
    console.log(`Total Test Duration: ${report.summary.totalTestTime}s`);
    console.log(`Tests Completed: ${report.summary.testsCompleted}/4`);

    // Print key metrics
    if (this.testResults.latency) {
      const latency = this.testResults.latency.testResult;
      console.log(`\n📡 LATENCY RESULTS:`);
      console.log(`- HTTP Message Latency: ${latency.http.avgLatency}ms (avg)`);
      console.log(`- SSE Latency: ${latency.sse.avgSSELatency}ms (avg)`);
      console.log(`- CPU Usage During Test: ${this.testResults.latency.performance.cpu.average}%`);
      console.log(`- Memory Usage During Test: ${this.testResults.latency.performance.memory.average}%`);
    }

    if (this.testResults.throughput) {
      const throughput = this.testResults.throughput.testResult;
      console.log(`\n⚡ THROUGHPUT RESULTS:`);
      console.log(`- Concurrent Throughput: ${throughput.concurrent.throughput} msg/s`);
      console.log(`- Burst Throughput: ${throughput.burst.avgThroughput} msg/s`);
      console.log(`- CPU Usage During Test: ${this.testResults.throughput.performance.cpu.average}%`);
      console.log(`- Memory Usage During Test: ${this.testResults.throughput.performance.memory.average}%`);
    }

    if (this.testResults.scalability) {
      const scalability = this.testResults.scalability.testResult;
      console.log(`\n📈 SCALABILITY RESULTS:`);
      console.log(`- Max Concurrent Connections: ${scalability.connections.successful}`);
      console.log(`- SSE Connection Success Rate: ${scalability.sse.successRate}%`);
      console.log(`- Stress Test Throughput: ${scalability.stress.messagesPerSecond} msg/s`);
      console.log(`- CPU Usage During Test: ${this.testResults.scalability.performance.cpu.average}%`);
      console.log(`- Memory Usage During Test: ${this.testResults.scalability.performance.memory.average}%`);
    }

    // Print recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Save detailed report
    const filename = `comprehensive-test-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${filename}`);

    return report;
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];

    // Analyze latency
    if (this.testResults.latency) {
      const latency = this.testResults.latency.testResult;
      if (latency.http.avgLatency > 100) {
        recommendations.push('HTTP latency is high (>100ms). Consider optimizing database queries and adding caching.');
      }
      if (latency.sse.avgSSELatency > 50) {
        recommendations.push('SSE latency is high (>50ms). Consider optimizing Redis pub/sub or server configuration.');
      }
    }

    // Analyze throughput
    if (this.testResults.throughput) {
      const throughput = this.testResults.throughput.testResult;
      if (throughput.concurrent.throughput < 50) {
        recommendations.push('Concurrent throughput is low (<50 msg/s). Consider connection pooling and async processing.');
      }
      if (throughput.concurrent.successful / throughput.concurrent.totalMessages < 0.95) {
        recommendations.push('Message success rate is low (<95%). Check error handling and server stability.');
      }
    }

    // Analyze scalability
    if (this.testResults.scalability) {
      const scalability = this.testResults.scalability.testResult;
      if (parseFloat(scalability.connections.successRate) < 90) {
        recommendations.push('Connection success rate is low (<90%). Consider increasing server limits and optimizing connection handling.');
      }
      if (parseFloat(scalability.sse.successRate) < 85) {
        recommendations.push('SSE connection success rate is low (<85%). Consider optimizing SSE implementation and server resources.');
      }
    }

    // Analyze CPU usage
    const avgCpuUsage = Object.values(this.testResults)
      .map(test => test.performance?.cpu?.average || 0)
      .reduce((sum, cpu) => sum + cpu, 0) / Object.keys(this.testResults).length;

    if (avgCpuUsage > 80) {
      recommendations.push('High CPU usage detected (>80%). Consider code optimization and horizontal scaling.');
    } else if (avgCpuUsage > 60) {
      recommendations.push('Moderate CPU usage detected (>60%). Monitor under production load.');
    }

    // Analyze memory usage
    const avgMemoryUsage = Object.values(this.testResults)
      .map(test => test.performance?.memory?.average || 0)
      .reduce((sum, mem) => sum + mem, 0) / Object.keys(this.testResults).length;

    if (avgMemoryUsage > 85) {
      recommendations.push('High memory usage detected (>85%). Check for memory leaks and optimize data structures.');
    } else if (avgMemoryUsage > 70) {
      recommendations.push('Moderate memory usage detected (>70%). Monitor memory growth over time.');
    }

    // General recommendations
    recommendations.push('Implement proper logging and monitoring for production deployment.');
    recommendations.push('Consider implementing rate limiting to prevent abuse.');
    recommendations.push('Set up health checks and graceful shutdown procedures.');
    recommendations.push('Implement proper error handling and retry mechanisms.');

    return recommendations;
  }
}

// Run all tests
async function runComprehensiveTests() {
  const runner = new MasterTestRunner();
  
  try {
    await runner.runAllTests();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = MasterTestRunner;

// Run if called directly
if (require.main === module) {
  runComprehensiveTests();
}