#!/usr/bin/env node

import mysql from 'mysql2/promise';

// Database configuration (using the same as server.mjs)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'sql.freedb.tech',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'freedb_mohamad',
  password: process.env.DB_PASS || 'u2!h$fH$29QPQcY',
  database: process.env.DB_NAME || 'freedb_TicketTracker'
};

async function setupZacariasAsAdmin() {
  let connection;
  
  try {
    console.log('🔧 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. Check current users
    console.log('👥 Checking current users...');
    const [users] = await connection.execute('SELECT id, name, role, active FROM user_accounts ORDER BY role, name');
    
    console.log('Current users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - ${user.active ? 'Active' : 'Inactive'}`);
    });
    
    // 2. Make zacarias the only admin
    console.log('\n👑 Setting up zacarias as the only admin...');
    
    // First, demote all other admins to regular users
    await connection.execute(
      'UPDATE user_accounts SET role = "user", updated_at = CURRENT_TIMESTAMP WHERE role = "admin" AND name != "zacarias"'
    );
    
    // Promote zacarias to admin (or create if doesn't exist)
    const [zacariasCheck] = await connection.execute('SELECT id, name, role, active FROM user_accounts WHERE name = "zacarias"');
    
    if (zacariasCheck.length === 0) {
      console.log('📝 Creating zacarias account...');
      const crypto = await import('node:crypto');
      const defaultPassword = 'admin123'; // You should change this
      const hashedPassword = crypto.createHash('sha256').update(defaultPassword).digest('hex');
      
      await connection.execute(`
        INSERT INTO user_accounts (name, role, active, auth_secret_hash, password_reset_required, failed_login_attempts, locked_until, email, updated_at) 
        VALUES (?, 'admin', 1, ?, 1, 0, NULL, '', CURRENT_TIMESTAMP)
      `, ['zacarias', hashedPassword]);
      
      console.log('✅ zacarias account created with default password: "admin123"');
      console.log('⚠️  Please change this password immediately!');
    } else {
      await connection.execute(
        'UPDATE user_accounts SET role = "admin", active = 1, updated_at = CURRENT_TIMESTAMP WHERE name = "zacarias"'
      );
      console.log('✅ zacarias promoted to admin');
    }
    
    // 3. Remove all account blocking logic
    console.log('\n🔓 Removing account blocking logic...');
    await connection.execute(
      'UPDATE user_accounts SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP'
    );
    
    // 4. Verify final state
    console.log('\n📊 Final verification:');
    const [finalUsers] = await connection.execute('SELECT id, name, role, active, failed_login_attempts, locked_until FROM user_accounts ORDER BY role DESC, name');
    
    console.log('Final user configuration:');
    finalUsers.forEach(user => {
      const status = user.active ? '✅' : '❌';
      const lockStatus = user.locked_until ? '🔒' : '🔓';
      console.log(`  ${status} ${lockStatus} ${user.name} (${user.role}) - Attempts: ${user.failed_login_attempts}`);
    });
    
    // 5. Check admin count
    const [adminCount] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE role = "admin" AND active = 1');
    console.log(`\n🎯 Total active admins: ${adminCount[0].count}`);
    
    if (adminCount[0].count === 1) {
      console.log('✅ Perfect! zacarias is the only admin');
    } else {
      console.log('⚠️  Warning: There should be exactly 1 admin');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function
async function main() {
  console.log('🔧 Zacarias Admin Setup Tool');
  console.log('=============================\n');
  
  await setupZacariasAsAdmin();
  
  console.log('\n✅ Setup completed!');
  console.log('\nNext steps:');
  console.log('1. Restart the server');
  console.log('2. Login as zacarias');
  console.log('3. Change the default password immediately');
  console.log('4. Verify admin functionality');
}

// Run main function
main().catch(console.error);
