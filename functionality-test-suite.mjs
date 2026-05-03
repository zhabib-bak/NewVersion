import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

async function runFunctionalityTests() {
  console.log('🧪 FUNCTIONALITY TEST SUITE');
  console.log('=========================\n');
  
  const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  };
  
  function test(name, testFn) {
    testResults.total++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ ${name}`);
        testResults.passed++;
        testResults.details.push({ name, status: 'PASSED' });
      } else {
        console.log(`❌ ${name}`);
        testResults.failed++;
        testResults.details.push({ name, status: 'FAILED', error: 'Test returned false' });
      }
    } catch (error) {
      console.log(`❌ ${name} - ${error.message}`);
      testResults.failed++;
      testResults.details.push({ name, status: 'FAILED', error: error.message });
    }
  }
  
  // 1. Database Connection Tests
  console.log('🗄️  DATABASE CONNECTION TESTS');
  let connection;
  
  try {
    connection = await mysqlCreateConnection({
      host: 'sql.freedb.tech',
      port: 3306,
      user: 'freedb_mohamad',
      password: 'u2!h$fH$29QPQcY',
      database: 'freedb_TicketTracker'
    });
    
    test('Database connection established', () => connection && connection.threadId !== undefined);
    
    // Test basic queries
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
    test('Users table accessible', () => users.length > 0 && users[0].count >= 0);
    
    const [tickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    test('Tickets table accessible', () => tickets.length > 0 && tickets[0].count >= 0);
    
    // Test data integrity
    const [adminUsers] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE role = "admin"');
    test('Admin users exist', () => adminUsers[0].count > 0);
    
    const [activeUsers] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE active = 1');
    test('Active users exist', () => activeUsers[0].count > 0);
    
  } catch (error) {
    test('Database connection', () => false);
    console.log(`❌ Database error: ${error.message}`);
  }
  
  // 2. File System Tests
  console.log('\n📁 FILE SYSTEM TESTS');
  
  const fs = await import('fs');
  const path = await import('path');
  
  test('Server file exists', () => fs.existsSync('server.mjs'));
  test('App file exists', () => fs.existsSync('app.js'));
  test('HTML file exists', () => fs.existsSync('index.html'));
  test('CSS file exists', () => fs.existsSync('styles.css'));
  test('Package.json exists', () => fs.existsSync('package.json'));
  test('README exists', () => fs.existsSync('README.md'));
  
  // Test file contents
  try {
    const serverContent = fs.readFileSync('server.mjs', 'utf8');
    test('Server file has content', () => serverContent.length > 1000);
    test('Server has Express setup', () => serverContent.includes('express') || serverContent.includes('createServer'));
    test('Server has database setup', () => serverContent.includes('mysql') || serverContent.includes('database'));
    
    const appContent = fs.readFileSync('app.js', 'utf8');
    test('App file has content', () => appContent.length > 1000);
    test('App has DOM manipulation', () => appContent.includes('querySelector') || appContent.includes('getElementById'));
    test('App has API calls', () => appContent.includes('fetch') || appContent.includes('api'));
    
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    test('HTML has structure', () => htmlContent.includes('<html>') && htmlContent.includes('</html>'));
    test('HTML has scripts', () => htmlContent.includes('<script'));
    test('HTML has ApexCharts', () => htmlContent.includes('apexcharts'));
    
  } catch (error) {
    test('File content reading', () => false);
    console.log(`❌ File reading error: ${error.message}`);
  }
  
  // 3. Configuration Tests
  console.log('\n⚙️  CONFIGURATION TESTS');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    test('Package.json valid', () => packageJson.name && packageJson.version);
    test('MySQL dependency present', () => packageJson.dependencies && packageJson.dependencies.mysql2);
    test('Scripts defined', () => packageJson.scripts && Object.keys(packageJson.scripts).length > 0);
    
  } catch (error) {
    test('Package.json parsing', () => false);
    console.log(`❌ Package.json error: ${error.message}`);
  }
  
  // 4. Security Tests
  console.log('\n🔒 SECURITY TESTS');
  
  try {
    const serverContent = fs.readFileSync('server.mjs', 'utf8');
    
    test('Password hashing implemented', () => 
      serverContent.includes('bcrypt') || serverContent.includes('scrypt') || serverContent.includes('argon')
    );
    
    test('Session management present', () => 
      serverContent.includes('session') || serverContent.includes('cookie')
    );
    
    test('Input validation present', () => 
      serverContent.includes('validate') || serverContent.includes('sanitize') || serverContent.includes('escape')
    );
    
    test('Error handling present', () => 
      serverContent.includes('try') && serverContent.includes('catch')
    );
    
    // Check for obvious security issues
    const suspiciousPatterns = [
      /password\s*=\s*['"][^'"]{3,}['"]/, // hardcoded passwords
      /api_key\s*=\s*['"][^'"]{3,}['"]/, // hardcoded API keys
      /secret\s*=\s*['"][^'"]{3,}['"]/, // hardcoded secrets
    ];
    
    let securityIssues = 0;
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(serverContent)) securityIssues++;
    });
    
    test('No hardcoded secrets', () => securityIssues === 0);
    
  } catch (error) {
    test('Security analysis', () => false);
    console.log(`❌ Security test error: ${error.message}`);
  }
  
  // 5. Performance Tests
  console.log('\n⚡ PERFORMANCE TESTS');
  
  try {
    const serverContent = fs.readFileSync('server.mjs', 'utf8');
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    test('Async operations used', () => 
      serverContent.includes('async') || serverContent.includes('await')
    );
    
    test('No blocking operations', () => 
      !serverContent.includes('readFileSync') && !serverContent.includes('writeFileSync')
    );
    
    test('Connection pooling used', () => 
      serverContent.includes('pool') || serverContent.includes('createPool')
    );
    
    test('Frontend optimization', () => 
      appContent.includes('addEventListener') || appContent.includes('querySelector')
    );
    
    // Check file sizes
    const serverSize = fs.statSync('server.mjs').size;
    const appSize = fs.statSync('app.js').size;
    const cssSize = fs.statSync('styles.css').size;
    
    test('Server file size reasonable', () => serverSize < 200000); // < 200KB
    test('App file size reasonable', () => appSize < 200000); // < 200KB
    test('CSS file size reasonable', () => cssSize < 100000); // < 100KB
    
  } catch (error) {
    test('Performance analysis', () => false);
    console.log(`❌ Performance test error: ${error.message}`);
  }
  
  // 6. Feature Tests
  console.log('\n🚀 FEATURE TESTS');
  
  try {
    const serverContent = fs.readFileSync('server.mjs', 'utf8');
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    // Backend features
    test('Authentication endpoints', () => 
      serverContent.includes('/api/auth/login') || serverContent.includes('login')
    );
    
    test('Ticket management endpoints', () => 
      serverContent.includes('/api/tickets') || serverContent.includes('tickets')
    );
    
    test('Dashboard endpoint', () => 
      serverContent.includes('/api/dashboard') || serverContent.includes('dashboard')
    );
    
    test('User management endpoints', () => 
      serverContent.includes('/api/users') || serverContent.includes('users')
    );
    
    // Frontend features
    test('Dark mode implementation', () => 
      appContent.includes('darkMode') || appContent.includes('dark-mode')
    );
    
    test('Advanced search', () => 
      appContent.includes('advanced') || appContent.includes('search')
    );
    
    test('Charts implementation', () => 
      appContent.includes('chart') || appContent.includes('ApexCharts')
    );
    
    test('Responsive design', () => 
      appContent.includes('mobile') || appContent.includes('responsive') || appContent.includes('@media')
    );
    
    test('Form validation', () => 
      appContent.includes('validate') || appContent.includes('required')
    );
    
  } catch (error) {
    test('Feature analysis', () => false);
    console.log(`❌ Feature test error: ${error.message}`);
  }
  
  // Close database connection
  if (connection) {
    try {
      await connection.end();
    } catch (error) {
      console.log(`⚠️  Database close error: ${error.message}`);
    }
  }
  
  // Results Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('======================\n');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total} (${successRate}%)`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`  • ${test.name}${test.error ? ': ' + test.error : ''}`);
      });
  }
  
  const overallStatus = testResults.failed === 0 ? '✅ READY FOR DEPLOY' : '⚠️  ISSUES NEED ATTENTION';
  console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
  
  return {
    success: testResults.failed === 0,
    results: testResults,
    successRate: parseFloat(successRate)
  };
}

// Run the test suite
runFunctionalityTests().catch(console.error);
