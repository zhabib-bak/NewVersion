#!/usr/bin/env node

import mysql from 'mysql2/promise';
import { createHash, randomBytes, scryptSync } from 'node:crypto';

// Database configuration (using the same as server.mjs)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'sql.freedb.tech',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'freedb_mohamad',
  password: process.env.DB_PASS || 'u2!h$fH$29QPQcY',
  database: process.env.DB_NAME || 'freedb_TicketTracker'
};

async function fixPassword() {
  let connection;
  
  try {
    console.log('🔧 Fixing Password Authentication');
    console.log('=================================\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. Check zacarias account
    console.log('👤 Checking zacarias account...');
    const [zacarias] = await connection.execute('SELECT * FROM user_accounts WHERE name = "zacarias"');
    
    if (zacarias.length === 0) {
      console.log('❌ zacarias account not found. Creating...');
      
      // Create zacarias account with proper password hash (using scrypt like server)
      const defaultPassword = 'admin123';
      const hashedPassword = hashPassword(defaultPassword);
      
      await connection.execute(`
        INSERT INTO user_accounts (
          name, role, active, auth_secret_hash, password_reset_required, 
          failed_login_attempts, locked_until, email, updated_at
        ) VALUES (?, 'admin', 1, ?, 1, 0, NULL, '', CURRENT_TIMESTAMP)
      `, ['zacarias', hashedPassword]);
      
      console.log('✅ zacarias account created');
      console.log('🔑 Default password: admin123');
    } else {
      console.log('✅ zacarias account found');
      const user = zacarias[0];
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.active ? 'Yes' : 'No'}`);
      console.log(`   Has password hash: ${user.auth_secret_hash ? 'Yes' : 'No'}`);
      console.log(`   Has PIN hash: ${user.auth_pin_hash ? 'Yes' : 'No'}`);
      
      // Reset password to known value (using scrypt like server)
      const defaultPassword = 'admin123';
      const hashedPassword = hashPassword(defaultPassword);
      
      await connection.execute(`
        UPDATE user_accounts 
        SET auth_secret_hash = ?, auth_pin_hash = NULL, password_reset_required = 1, updated_at = CURRENT_TIMESTAMP
        WHERE name = 'zacarias'
      `, [hashedPassword]);
      
      console.log('🔄 Password reset to: admin123');
    }
    
    // 2. Check password hashing function in server
    console.log('\n🔐 Verifying password hashing...');
    
    // Test the same hashing method as server (scrypt)
    const testPassword = 'admin123';
    const testHash = hashPassword(testPassword);
    console.log(`   Test password: ${testPassword}`);
    console.log(`   Test hash: ${testHash}`);
    
    // Verify the hash in database
    const [verifyHash] = await connection.execute(
      'SELECT auth_secret_hash FROM user_accounts WHERE name = "zacarias"'
    );
    
    if (verifyHash.length > 0) {
      const storedHash = verifyHash[0].auth_secret_hash;
      console.log(`   Stored hash: ${storedHash}`);
      console.log(`   Hashes match: ${testHash === storedHash ? '✅ Yes' : '❌ No'}`);
    }
    
    // 3. Check all users
    console.log('\n👥 All user accounts:');
    const [users] = await connection.execute(`
      SELECT name, role, active, 
             CASE WHEN auth_secret_hash IS NOT NULL THEN 'Hashed' ELSE 'Missing' END as password_status
      FROM user_accounts 
      ORDER BY role DESC, name
    `);
    
    users.forEach(user => {
      const status = user.active ? '✅' : '❌';
      const pwdStatus = user.password_status === 'Hashed' ? '🔒' : '⚠️';
      console.log(`   ${status} ${pwdStatus} ${user.name} (${user.role})`);
    });
    
    // 4. Test login credentials
    console.log('\n🔑 Login Credentials:');
    console.log('   Username: zacarias');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('   Status: Active');
    
    console.log('\n✅ Password fix completed!');
    console.log('\nNext steps:');
    console.log('1. Try logging in with: zacarias / admin123');
    console.log('2. If it works, change the password immediately');
    console.log('3. The system will prompt for password change on first login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Password hashing function (same as server.mjs)
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

// Main function
async function main() {
  await fixPassword();
}

// Run main function
main().catch(console.error);
