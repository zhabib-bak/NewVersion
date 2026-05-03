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

// Password hashing function (same as server.mjs)
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.startsWith('scrypt:')) return false;
  const [, salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(password, salt, 64).toString('hex');
  return derived === expectedHex;
}

async function debugLogin() {
  let connection;
  
  try {
    console.log('🔍 Debug Login Issues');
    console.log('======================\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. Test database connection
    console.log('1. 📡 Database Connection Test');
    try {
      await connection.execute('SELECT 1');
      console.log('   ✅ Database connection successful');
    } catch (error) {
      console.log('   ❌ Database connection failed:', error.message);
      return;
    }
    
    // 2. Check zacarias account details
    console.log('\n2. 👤 Zacarias Account Details');
    const [zacarias] = await connection.execute('SELECT * FROM user_accounts WHERE name = "zacarias"');
    
    if (zacarias.length === 0) {
      console.log('   ❌ zacarias account not found');
      return;
    }
    
    const user = zacarias[0];
    console.log('   ✅ Account found:');
    console.log(`      ID: ${user.id}`);
    console.log(`      Name: ${user.name}`);
    console.log(`      Role: ${user.role}`);
    console.log(`      Active: ${user.active ? 'Yes' : 'No'}`);
    console.log(`      Password Reset Required: ${user.password_reset_required ? 'Yes' : 'No'}`);
    console.log(`      Failed Attempts: ${user.failed_login_attempts}`);
    console.log(`      Locked Until: ${user.locked_until || 'Never'}`);
    console.log(`      Has Secret Hash: ${user.auth_secret_hash ? 'Yes' : 'No'}`);
    console.log(`      Has PIN Hash: ${user.auth_pin_hash ? 'Yes' : 'No'}`);
    
    // 3. Test password verification
    console.log('\n3. 🔐 Password Verification Test');
    const testPassword = 'admin123';
    console.log(`   Testing password: "${testPassword}"`);
    
    if (user.auth_secret_hash) {
      const isValid = verifyPassword(testPassword, user.auth_secret_hash);
      console.log(`   Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      if (!isValid) {
        console.log('   🔧 Attempting to fix password...');
        const newHash = hashPassword(testPassword);
        await connection.execute(
          'UPDATE user_accounts SET auth_secret_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE name = "zacarias"',
          [newHash]
        );
        console.log('   ✅ Password updated with new hash');
        
        // Test again
        const [updatedUser] = await connection.execute('SELECT auth_secret_hash FROM user_accounts WHERE name = "zacarias"');
        const isNowValid = verifyPassword(testPassword, updatedUser[0].auth_secret_hash);
        console.log(`   New password verification: ${isNowValid ? '✅ Valid' : '❌ Still Invalid'}`);
      }
    } else {
      console.log('   ❌ No password hash found, creating one...');
      const newHash = hashPassword(testPassword);
      await connection.execute(
        'UPDATE user_accounts SET auth_secret_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE name = "zacarias"',
        [newHash]
      );
      console.log('   ✅ Password hash created');
    }
    
    // 4. Test login endpoint simulation
    console.log('\n4. 🌐 Login Endpoint Simulation');
    console.log('   Simulating login request...');
    
    // Simulate the same logic as server.mjs login endpoint
    try {
      const [testUser] = await connection.execute('SELECT * FROM user_accounts WHERE name = "zacarias"');
      
      if (!testUser.length || testUser[0].active !== 1) {
        console.log('   ❌ User not found or inactive');
      } else {
        const testUserObj = testUser[0];
        const validModern = verifyPassword(testPassword, testUserObj.auth_secret_hash);
        const validLegacy = !validModern && !!testUserObj.auth_pin_hash && testUserObj.auth_pin_hash === createHash('sha256').update(testPassword).digest('hex');
        
        console.log(`   Modern password check: ${validModern ? '✅ Pass' : '❌ Fail'}`);
        console.log(`   Legacy password check: ${validLegacy ? '✅ Pass' : '❌ Fail'}`);
        console.log(`   Overall login result: ${validModern || validLegacy ? '✅ Success' : '❌ Failed'}`);
        
        if (validModern || validLegacy) {
          console.log('   🎉 Login should work!');
        } else {
          console.log('   ❌ Login will fail');
        }
      }
    } catch (error) {
      console.log('   ❌ Login simulation error:', error.message);
    }
    
    // 5. Check server configuration
    console.log('\n5. ⚙️ Server Configuration');
    console.log(`   Database Host: ${DB_CONFIG.host}`);
    console.log(`   Database Port: ${DB_CONFIG.port}`);
    console.log(`   Database Name: ${DB_CONFIG.database}`);
    console.log(`   Database User: ${DB_CONFIG.user}`);
    console.log('   Server should be running on: http://localhost:3000');
    
    // 6. Final recommendations
    console.log('\n6. 📋 Troubleshooting Steps');
    console.log('   If login still fails:');
    console.log('   1. Check browser console (F12) for JavaScript errors');
    console.log('   2. Check Network tab for failed requests');
    console.log('   3. Verify server is running: curl http://localhost:3000');
    console.log('   4. Test login endpoint: curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"name":"zacarias","password":"admin123"}\'');
    console.log('   5. Check if CORS is blocking requests');
    console.log('   6. Verify frontend is loading from http://localhost:3000');
    
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
  await debugLogin();
}

// Run main function
main().catch(console.error);
