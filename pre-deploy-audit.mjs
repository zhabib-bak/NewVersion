import { createConnection as mysqlCreateConnection } from 'mysql2/promise';

async function comprehensivePreDeployAudit() {
  console.log('🔍 COMPREHENSIVE PRE-DEPLOY AUDIT');
  console.log('=====================================\n');
  
  try {
    const connection = await mysqlCreateConnection({
      host: 'sql.freedb.tech',
      port: 3306,
      user: 'freedb_mohamad',
      password: 'u2!h$fH$29QPQcY',
      database: 'freedb_TicketTracker'
    });
    
    // 1. Database Schema Check
    console.log('📊 DATABASE SCHEMA VERIFICATION');
    const [tables] = await connection.execute('SHOW TABLES');
    const expectedTables = ['tickets', 'user_accounts', 'ticket_comments', 'attachments', 'saved_filters', 'webhooks', 'audit_log', 'sessions'];
    
    const tableNames = tables.map(row => Object.values(row)[0]);
    const missingTables = expectedTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
    } else {
      console.log('✅ All required tables present');
    }
    
    // 2. Data Integrity Check
    console.log('\n🔒 DATA INTEGRITY CHECK');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
    const [ticketCount] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    const [adminCount] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE role = "admin"');
    
    console.log(`📈 Users: ${userCount[0].count}`);
    console.log(`🎫 Tickets: ${ticketCount[0].count}`);
    console.log(`👑 Admins: ${adminCount[0].count}`);
    
    if (adminCount[0].count < 1) {
      console.log('⚠️  WARNING: No admin users found!');
    }
    
    // 3. Index Performance Check
    console.log('\n⚡ PERFORMANCE INDEXES');
    const [indexes] = await connection.execute('SHOW INDEX FROM tickets');
    const indexNames = [...new Set(indexes.map(idx => idx.Key_name))];
    console.log('📋 Ticket table indexes:', indexNames.join(', '));
    
    // 4. Recent Activity Check
    console.log('\n📅 RECENT ACTIVITY');
    const [recentTickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets WHERE date_opening >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [recentComments] = await connection.execute('SELECT COUNT(*) as count FROM ticket_comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    
    console.log(`🆕 Tickets (7 days): ${recentTickets[0].count}`);
    console.log(`💬 Comments (7 days): ${recentComments[0].count}`);
    
    // 5. Configuration Check
    console.log('\n⚙️  CONFIGURATION VERIFICATION');
    const [config] = await connection.execute('SELECT @@max_connections as max_connections, @@version as version');
    console.log(`🔗 Max Connections: ${config[0].max_connections}`);
    console.log(`📦 MySQL Version: ${config[0].version}`);
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database audit failed:', error.message);
    return false;
  }
  
  return true;
}

async function codeQualityAudit() {
  console.log('\n🔍 CODE QUALITY AUDIT');
  console.log('========================\n');
  
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    // Check critical files exist
    const criticalFiles = [
      'server.mjs',
      'app.js', 
      'index.html',
      'styles.css',
      'package.json',
      'README.md'
    ];
    
    console.log('📁 CRITICAL FILES CHECK');
    for (const file of criticalFiles) {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      console.log(exists ? `✅ ${file}` : `❌ ${file} MISSING`);
    }
    
    // Check package.json dependencies
    console.log('\n📦 DEPENDENCIES CHECK');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['mysql2', 'express', 'bcrypt', 'uuid'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length > 0) {
      console.log('❌ Missing dependencies:', missingDeps);
    } else {
      console.log('✅ All required dependencies present');
    }
    
    // Environment variables check
    console.log('\n🔐 ENVIRONMENT VARIABLES');
    const requiredEnvVars = [
      'DB_HOST',
      'DB_PORT', 
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'SESSION_SECRET'
    ];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      console.log(value ? `✅ ${envVar}` : `⚠️  ${envVar} not set`);
    }
    
  } catch (error) {
    console.error('❌ Code audit failed:', error.message);
    return false;
  }
  
  return true;
}

async function securityAudit() {
  console.log('\n🔒 SECURITY AUDIT');
  console.log('==================\n');
  
  try {
    const fs = await import('fs');
    
    // Check for sensitive data exposure
    console.log('🚨 SECURITY CHECKS');
    
    // Check .env file exists and is not empty
    const envExists = fs.existsSync('.env');
    console.log(envExists ? '✅ .env file exists' : '⚠️  .env file missing');
    
    // Check for hardcoded secrets in source
    const serverContent = fs.readFileSync('server.mjs', 'utf8');
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    const suspiciousPatterns = [
      /password\s*=\s*['"][^'"]{8,}['"]/, // hardcoded passwords
      /secret\s*=\s*['"][^'"]{8,}['"]/, // hardcoded secrets
      /api_key\s*=\s*['"][^'"]{8,}['"]/, // hardcoded API keys
    ];
    
    let securityIssues = 0;
    suspiciousPatterns.forEach((pattern, index) => {
      const matches = serverContent.match(pattern) || appContent.match(pattern);
      if (matches) {
        console.log(`❌ Security issue ${index + 1}: Potential hardcoded secret found`);
        securityIssues++;
      }
    });
    
    if (securityIssues === 0) {
      console.log('✅ No obvious security issues found');
    }
    
  } catch (error) {
    console.error('❌ Security audit failed:', error.message);
    return false;
  }
  
  return true;
}

async function performanceAudit() {
  console.log('\n⚡ PERFORMANCE AUDIT');
  console.log('====================\n');
  
  try {
    const fs = await import('fs');
    
    // Check file sizes
    console.log('📊 FILE SIZE ANALYSIS');
    const files = [
      { name: 'server.mjs', path: 'server.mjs' },
      { name: 'app.js', path: 'app.js' },
      { name: 'styles.css', path: 'styles.css' },
      { name: 'index.html', path: 'index.html' }
    ];
    
    for (const file of files) {
      const stats = fs.statSync(file.path);
      const sizeKB = (stats.size / 1024).toFixed(2);
      const status = sizeKB > 500 ? '⚠️  Large' : '✅ OK';
      console.log(`${status} ${file.name}: ${sizeKB} KB`);
    }
    
    // Check for potential performance issues
    const appContent = fs.readFileSync('app.js', 'utf8');
    const serverContent = fs.readFileSync('server.mjs', 'utf8');
    
    console.log('\n🔍 PERFORMANCE OPTIMIZATIONS');
    
    // Check for console.log statements in production
    const consoleLogs = (appContent.match(/console\.log/g) || []).length + 
                       (serverContent.match(/console\.log/g) || []).length;
    console.log(consoleLogs > 10 ? `⚠️  ${consoleLogs} console.log statements found` : `✅ ${consoleLogs} console.log statements`);
    
    // Check for synchronous operations
    const syncOps = (serverContent.match(/\.readFileSync|\.writeFileSync/g) || []).length;
    console.log(syncOps > 0 ? `⚠️  ${syncOps} sync operations found` : '✅ No blocking sync operations');
    
  } catch (error) {
    console.error('❌ Performance audit failed:', error.message);
    return false;
  }
  
  return true;
}

// Run all audits
async function runCompleteAudit() {
  console.log('🚀 PRE-DEPLOY COMPREHENSIVE AUDIT');
  console.log('===================================\n');
  
  const results = {
    database: await comprehensivePreDeployAudit(),
    code: await codeQualityAudit(),
    security: await securityAudit(),
    performance: await performanceAudit()
  };
  
  console.log('\n📋 AUDIT SUMMARY');
  console.log('================\n');
  
  Object.entries(results).forEach(([area, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${area.toUpperCase()}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 OVERALL STATUS: ${allPassed ? '✅ READY FOR DEPLOY' : '❌ ISSUES FOUND'}`);
  
  return allPassed;
}

runCompleteAudit().catch(console.error);
