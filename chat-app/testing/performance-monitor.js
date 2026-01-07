const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class PerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  // Get current system metrics
  getCurrentMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - ~~(100 * idle / total);

    return {
      timestamp: Date.now(),
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: Math.round((usedMem / totalMem) * 100 * 100) / 100
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        loadavg: os.loadavg()
      }
    };
  }

  // Get Node.js process metrics
  async getProcessMetrics(processName = 'node') {
    try {
      let command;
      
      if (os.platform() === 'win32') {
        // Windows command
        command = `wmic process where "name='${processName}.exe'" get ProcessId,PageFileUsage,WorkingSetSize /format:csv`;
      } else {
        // Unix/Linux command
        command = `ps aux | grep ${processName} | grep -v grep`;
      }
      
      const { stdout } = await execAsync(command);
      
      if (os.platform() === 'win32') {
        return this.parseWindowsProcessMetrics(stdout);
      } else {
        return this.parseUnixProcessMetrics(stdout);
      }
    } catch (error) {
      console.error('Error getting process metrics:', error.message);
      return null;
    }
  }

  parseWindowsProcessMetrics(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const processes = [];
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 4 && parts[1] && parts[2] && parts[3]) {
        processes.push({
          pid: parseInt(parts[3]),
          memory: parseInt(parts[1]) * 1024, // Convert KB to bytes
          workingSet: parseInt(parts[2]) * 1024
        });
      }
    }
    
    return processes;
  }

  parseUnixProcessMetrics(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const processes = [];
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        processes.push({
          pid: parseInt(parts[1]),
          cpuPercent: parseFloat(parts[2]),
          memoryPercent: parseFloat(parts[3]),
          memory: parseInt(parts[5]) * 1024, // Convert KB to bytes
          command: parts.slice(10).join(' ')
        });
      }
    });
    
    return processes;
  }

  // Start monitoring
  startMonitoring(interval = 1000) {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already started');
      return;
    }

    console.log(`🔍 Starting performance monitoring (interval: ${interval}ms)`);
    this.isMonitoring = true;
    this.metrics = [];

    this.monitoringInterval = setInterval(async () => {
      try {
        const systemMetrics = this.getCurrentMetrics();
        const processMetrics = await this.getProcessMetrics();
        
        const metric = {
          ...systemMetrics,
          processes: processMetrics || []
        };
        
        this.metrics.push(metric);
        
        // Log every 10 seconds
        if (this.metrics.length % 10 === 0) {
          console.log(`📊 Collected ${this.metrics.length} metrics | CPU: ${systemMetrics.cpu.usage}% | Memory: ${systemMetrics.memory.usagePercent}%`);
        }
        
      } catch (error) {
        console.error('Error collecting metrics:', error.message);
      }
    }, interval);
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('⚠️ Monitoring not started');
      return;
    }

    console.log('🛑 Stopping performance monitoring');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Analyze collected metrics
  analyzeMetrics() {
    if (this.metrics.length === 0) {
      console.log('⚠️ No metrics collected');
      return null;
    }

    console.log(`\n📊 Analyzing ${this.metrics.length} metrics...`);

    // CPU analysis
    const cpuUsages = this.metrics.map(m => m.cpu.usage);
    const avgCpu = cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length;
    const maxCpu = Math.max(...cpuUsages);
    const minCpu = Math.min(...cpuUsages);

    // Memory analysis
    const memoryUsages = this.metrics.map(m => m.memory.usagePercent);
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const maxMemory = Math.max(...memoryUsages);
    const minMemory = Math.min(...memoryUsages);

    // Process analysis (if available)
    let processAnalysis = null;
    const processMetrics = this.metrics.filter(m => m.processes && m.processes.length > 0);
    
    if (processMetrics.length > 0) {
      const allProcesses = processMetrics.flatMap(m => m.processes);
      const totalProcessMemory = allProcesses.reduce((sum, p) => sum + (p.memory || 0), 0);
      const avgProcessMemory = totalProcessMemory / allProcesses.length;
      
      processAnalysis = {
        totalProcesses: allProcesses.length,
        avgMemoryPerProcess: Math.round(avgProcessMemory / 1024 / 1024 * 100) / 100, // MB
        totalProcessMemory: Math.round(totalProcessMemory / 1024 / 1024 * 100) / 100 // MB
      };
    }

    // Duration analysis
    const startTime = this.metrics[0].timestamp;
    const endTime = this.metrics[this.metrics.length - 1].timestamp;
    const duration = (endTime - startTime) / 1000; // seconds

    const analysis = {
      duration,
      metricsCount: this.metrics.length,
      cpu: {
        average: Math.round(avgCpu * 100) / 100,
        maximum: maxCpu,
        minimum: minCpu,
        cores: this.metrics[0].cpu.cores
      },
      memory: {
        average: Math.round(avgMemory * 100) / 100,
        maximum: maxMemory,
        minimum: minMemory,
        totalGB: Math.round(this.metrics[0].memory.total / 1024 / 1024 / 1024 * 100) / 100
      },
      processes: processAnalysis,
      timestamp: new Date().toISOString()
    };

    console.log(`\n📊 PERFORMANCE ANALYSIS RESULTS:`);
    console.log(`Duration: ${duration}s`);
    console.log(`CPU Usage - Avg: ${analysis.cpu.average}%, Max: ${analysis.cpu.maximum}%, Min: ${analysis.cpu.minimum}%`);
    console.log(`Memory Usage - Avg: ${analysis.memory.average}%, Max: ${analysis.memory.maximum}%, Min: ${analysis.memory.minimum}%`);
    console.log(`Total Memory: ${analysis.memory.totalGB}GB`);
    console.log(`CPU Cores: ${analysis.cpu.cores}`);
    
    if (processAnalysis) {
      console.log(`Node.js Processes: ${processAnalysis.totalProcesses}`);
      console.log(`Avg Process Memory: ${processAnalysis.avgMemoryPerProcess}MB`);
    }

    return analysis;
  }

  // Monitor during test execution
  async monitorDuringTest(testFunction, testName = 'Test') {
    console.log(`\n🔍 Starting performance monitoring for: ${testName}`);
    
    this.startMonitoring(500); // Monitor every 500ms during test
    
    let testResult;
    let testError;
    
    try {
      testResult = await testFunction();
    } catch (error) {
      testError = error;
    }
    
    this.stopMonitoring();
    const performanceAnalysis = this.analyzeMetrics();
    
    const result = {
      testName,
      testResult,
      testError: testError ? testError.message : null,
      performance: performanceAnalysis,
      rawMetrics: this.metrics
    };
    
    if (testError) {
      throw testError;
    }
    
    return result;
  }

  // Save metrics to file
  saveMetrics(filename, includeRawData = false) {
    const analysis = this.analyzeMetrics();
    
    const data = {
      analysis,
      metricsCount: this.metrics.length,
      timestamp: new Date().toISOString()
    };
    
    if (includeRawData) {
      data.rawMetrics = this.metrics;
    }

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Performance metrics saved to ${filename}`);
  }

  // Clear collected metrics
  clearMetrics() {
    this.metrics = [];
    console.log('🧹 Metrics cleared');
  }
}

// Example usage function
async function monitorPerformanceExample() {
  const monitor = new PerformanceMonitor();
  
  // Monitor for 30 seconds
  monitor.startMonitoring(1000);
  
  console.log('🔍 Monitoring system performance for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  monitor.stopMonitoring();
  const analysis = monitor.analyzeMetrics();
  
  monitor.saveMetrics(`performance-monitor-${Date.now()}.json`, true);
  
  return analysis;
}

// Export for use in other scripts
module.exports = PerformanceMonitor;

// Run if called directly
if (require.main === module) {
  monitorPerformanceExample();
}