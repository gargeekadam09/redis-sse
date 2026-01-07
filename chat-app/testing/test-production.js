const MasterTestRunner = require('./run-all-tests');

// Test production deployment
async function testProduction() {
  const PRODUCTION_URL = 'https://your-backend-url.onrender.com'; // Update this
  
  console.log(`🚀 Testing production deployment: ${PRODUCTION_URL}`);
  
  const runner = new MasterTestRunner(PRODUCTION_URL);
  
  try {
    await runner.runAllTests();
    console.log('\n✅ Production tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Production tests failed:', error.message);
  }
}

testProduction();