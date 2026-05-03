#!/usr/bin/env node

import mysql from 'mysql2/promise';

// Database configuration for Render (using environment variables)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'sql.freedb.tech',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'freedb_mohamad',
  password: process.env.DB_PASS || 'u2!h$fH$29QPQcY',
  database: process.env.DB_NAME || 'freedb_TicketTracker'
};

async function debugRenderDeployment() {
  let connection;
  
  try {
    console.log('🔍 RENDER DEPLOYMENT DEBUG');
    console.log('============================\n');
    
    // 1. Check environment variables
    console.log('1. 🌍 Environment Variables Check');
    const envVars = [
      'NODE_ENV',
      'PORT',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'DB_USER',
      'DB_PASS',
      'DATA_DIR',
      'SESSION_DURATION_HOURS',
      'TICKET_APP_DEFAULT_PASSWORD',
      'SEED_FORCE_RESET'
    ];
    
    console.log('   Environment variables:');
    envVars.forEach(varName => {
      const value = process.env[varName];
      const masked = varName.includes('PASS') || varName.includes('SECRET') ? '[MASKED]' : value;
      console.log(`      ${varName}: ${masked || 'NOT_SET'}`);
    });
    
    // 2. Test database connection
    console.log('\n2. 📡 Database Connection Test');
    try {
      connection = await mysql.createConnection(DB_CONFIG);
      await connection.execute('SELECT 1');
      console.log('   ✅ Database connection successful');
    } catch (error) {
      console.log('   ❌ Database connection failed:', error.message);
      console.log('   🔧 Check database credentials in Render dashboard');
      return;
    }
    
    // 3. Check database schema
    console.log('\n3. 🗄️ Database Schema Check');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const requiredTables = ['user_accounts', 'tickets', 'ticket_comments', 'session_tokens', 'ticket_audit_log'];
    console.log('   Required tables:');
    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`      ${exists ? '✅' : '❌'} ${table}`);
    });
    
    // 4. Check user accounts
    console.log('\n4. 👥 User Accounts Check');
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts');
    console.log(`   Total users: ${users[0].count}`);
    
    const [admins] = await connection.execute('SELECT name, role, active FROM user_accounts WHERE role = "admin" AND active = 1');
    console.log('   Active admins:');
    admins.forEach(admin => {
      console.log(`      - ${admin.name}`);
    });
    
    // 5. Check tickets
    console.log('\n5. 🎫 Tickets Check');
    const [tickets] = await connection.execute('SELECT COUNT(*) as count FROM tickets');
    console.log(`   Total tickets: ${tickets[0].count}`);
    
    // 6. Check for common Render issues
    console.log('\n6. 🐛 Common Render Issues Check');
    
    // Check data directory
    const dataDir = process.env.DATA_DIR || './data';
    console.log(`   Data directory: ${dataDir}`);
    
    // Check port binding
    const port = process.env.PORT || 3000;
    console.log(`   Server port: ${port}`);
    
    // Check node environment
    const nodeEnv = process.env.NODE_ENV || 'development';
    console.log(`   Node environment: ${nodeEnv}`);
    
    // 7. Production-specific checks
    console.log('\n7. 🏭 Production Environment Check');
    
    if (nodeEnv === 'production') {
      console.log('   ✅ Running in production mode');
      
      // Check if default password is set
      const defaultPassword = process.env.TICKET_APP_DEFAULT_PASSWORD;
      if (defaultPassword) {
        console.log('   ✅ Default password configured');
      } else {
        console.log('   ⚠️ Default password not configured');
      }
      
      // Check if seed force reset is disabled
      const seedForceReset = process.env.SEED_FORCE_RESET;
      if (seedForceReset === 'false') {
        console.log('   ✅ Seed force reset disabled');
      } else {
        console.log('   ⚠️ Seed force reset might be enabled');
      }
    } else {
      console.log('   ⚠️ Not running in production mode');
    }
    
    // 8. Recommendations
    console.log('\n8. 💡 Recommendations for Render');
    
    console.log('   Environment Variables to set in Render:');
    console.log('   - NODE_ENV=production');
    console.log('   - PORT=3000 (Render sets this automatically)');
    console.log('   - DB_HOST=your_database_host');
    console.log('   - DB_PORT=3306');
    console.log('   - DB_NAME=your_database_name');
    console.log('   - DB_USER=your_database_user');
    console.log('   - DB_PASS=your_database_password');
    console.log('   - DATA_DIR=/app/data');
    console.log('   - SESSION_DURATION_HOURS=12');
    console.log('   - SEED_FORCE_RESET=false');
    console.log('   - TICKET_APP_DEFAULT_PASSWORD=YourSecurePassword123');
    
    console.log('\n   Common fixes:');
    console.log('   1. Ensure database credentials are correct');
    console.log('   2. Set SEED_FORCE_RESET=false to avoid password resets');
    console.log('   3. Check Render logs for specific error messages');
    console.log('   4. Verify database is accessible from Render');
    console.log('   5. Ensure all required tables exist');
    
    console.log('\n   Debug steps:');
    console.log('   1. Check Render dashboard logs');
    console.log('   2. Test database connection manually');
    console.log('   3. Verify environment variables');
    console.log('   4. Check if server starts successfully');
    console.log('   5. Test API endpoints');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function
async function main() {
  await debugRenderDeployment();
}

// Run main function
main().catch(console.error);
