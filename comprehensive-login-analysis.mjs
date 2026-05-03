#!/usr/bin/env node

import mysql from 'mysql2/promise';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Database configuration (using the same as server.mjs)
const DB_CONFIG = {
  host: process.env.DB_HOST || 'sql.freedb.tech',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'freedb_mohamad',
  password: process.env.DB_PASS || 'u2!h$fH$29QPQcY',
  database: process.env.DB_NAME || 'freedb_TicketTracker'
};

// Password hashing functions (exact copy from server.mjs)
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.startsWith('scrypt:')) return false;
  const [, salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function hashLegacyPin(pin) {
  return createHash('sha256').update(pin).digest('hex');
}

async function comprehensiveAnalysis() {
  let connection;
  
  try {
    console.log('🔍 COMPREHENSIVE LOGIN & DATABASE ANALYSIS');
    console.log('==========================================\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    
    // 1. DATABASE CONNECTION ANALYSIS
    console.log('1. 📡 DATABASE CONNECTION ANALYSIS');
    console.log('   Configuration:');
    console.log(`      Host: ${DB_CONFIG.host}`);
    console.log(`      Port: ${DB_CONFIG.port}`);
    console.log(`      Database: ${DB_CONFIG.database}`);
    console.log(`      User: ${DB_CONFIG.user}`);
    
    try {
      await connection.execute('SELECT 1');
      console.log('   ✅ Connection successful');
    } catch (error) {
      console.log('   ❌ Connection failed:', error.message);
      return;
    }
    
    // 2. DATABASE SCHEMA ANALYSIS
    console.log('\n2. 🗄️ DATABASE SCHEMA ANALYSIS');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    console.log('   Tables found:');
    const requiredTables = ['user_accounts', 'tickets', 'ticket_comments', 'session_tokens', 'ticket_audit_log'];
    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`      ${exists ? '✅' : '❌'} ${table}`);
    });
    
    // 3. USER_ACCOUNTS TABLE ANALYSIS
    console.log('\n3. 👥 USER_ACCOUNTS TABLE ANALYSIS');
    const [columns] = await connection.execute('DESCRIBE user_accounts');
    console.log('   Columns:');
    columns.forEach(col => {
      console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? '(' + col.Key + ')' : ''}`);
    });
    
    // 4. USER DATA ANALYSIS
    console.log('\n4. 👤 USER DATA ANALYSIS');
    const [users] = await connection.execute(`
      SELECT id, name, role, active, password_reset_required, 
             failed_login_attempts, locked_until,
             CASE WHEN auth_secret_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_modern_hash,
             CASE WHEN auth_pin_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_legacy_hash,
             LENGTH(auth_secret_hash) as hash_length
      FROM user_accounts 
      ORDER BY role DESC, name
    `);
    
    console.log('   All users:');
    users.forEach(user => {
      const status = user.active ? '✅' : '❌';
      const reset = user.password_reset_required ? '🔄' : '✓';
      const lock = user.locked_until ? '🔒' : '🔓';
      console.log(`      ${status} ${reset} ${lock} ${user.name} (${user.role})`);
      console.log(`         Hash: ${user.has_modern_hash} (${user.hash_length} chars), Legacy: ${user.has_legacy_hash}`);
      console.log(`         Failed attempts: ${user.failed_login_attempts}`);
    });
    
    // 5. ZACARIAS ACCOUNT DEEP DIVE
    console.log('\n5. 🎯 ZACARIAS ACCOUNT DEEP DIVE');
    const [zacarias] = await connection.execute('SELECT * FROM user_accounts WHERE name = "zacarias"');
    
    if (zacarias.length === 0) {
      console.log('   ❌ zacarias account not found');
    } else {
      const user = zacarias[0];
      console.log('   ✅ zacarias account found:');
      console.log(`      ID: ${user.id}`);
      console.log(`      Name: "${user.name}"`);
      console.log(`      Role: "${user.role}"`);
      console.log(`      Active: ${user.active === 1 ? 'Yes' : 'No'}`);
      console.log(`      Password Reset Required: ${user.password_reset_required === 1 ? 'Yes' : 'No'}`);
      console.log(`      Failed Attempts: ${user.failed_login_attempts}`);
      console.log(`      Locked Until: ${user.locked_until || 'Never'}`);
      console.log(`      Modern Hash Present: ${user.auth_secret_hash ? 'Yes' : 'No'}`);
      console.log(`      Legacy Hash Present: ${user.auth_pin_hash ? 'Yes' : 'No'}`);
      console.log(`      Modern Hash: ${user.auth_secret_hash || 'NULL'}`);
      console.log(`      Legacy Hash: ${user.auth_pin_hash || 'NULL'}`);
      
      // 6. PASSWORD VERIFICATION TESTING
      console.log('\n6. 🔐 PASSWORD VERIFICATION TESTING');
      const testPasswords = ['admin123', 'Admin123', 'ADMIN123', 'password', '123456'];
      
      testPasswords.forEach(testPwd => {
        console.log(`   Testing password: "${testPwd}"`);
        
        // Test modern hash
        let modernValid = false;
        if (user.auth_secret_hash) {
          modernValid = verifyPassword(testPwd, user.auth_secret_hash);
          console.log(`      Modern hash: ${modernValid ? '✅ Valid' : '❌ Invalid'}`);
        } else {
          console.log(`      Modern hash: ❌ No hash found`);
        }
        
        // Test legacy hash
        let legacyValid = false;
        if (user.auth_pin_hash) {
          legacyValid = user.auth_pin_hash === hashLegacyPin(testPwd);
          console.log(`      Legacy hash: ${legacyValid ? '✅ Valid' : '❌ Invalid'}`);
        } else {
          console.log(`      Legacy hash: ❌ No hash found`);
        }
        
        // Overall result
        const overallValid = modernValid || legacyValid;
        console.log(`      Overall: ${overallValid ? '✅ LOGIN WOULD SUCCEED' : '❌ LOGIN WOULD FAIL'}`);
        
        if (overallValid) {
          console.log(`      🎉 THIS PASSWORD WORKS!`);
        }
        console.log('');
      });
      
      // 7. LOGIN FLOW SIMULATION
      console.log('7. 🌐 LOGIN FLOW SIMULATION');
      console.log('   Simulating exact server login logic...');
      
      const loginPayload = {
        name: 'zacarias',
        password: 'admin123',
        remember: false
      };
      
      console.log(`   Payload: ${JSON.stringify(loginPayload)}`);
      
      // Step 1: Validate input
      if (!loginPayload.name || !loginPayload.password) {
        console.log('   ❌ Step 1 FAIL: Missing name or password');
      } else {
        console.log('   ✅ Step 1 PASS: Input validation');
        
        // Step 2: Find user
        const foundUser = await connection.execute('SELECT * FROM user_accounts WHERE name = ?', [loginPayload.name]);
        if (!foundUser.length || foundUser[0].active !== 1) {
          console.log('   ❌ Step 2 FAIL: User not found or inactive');
        } else {
          console.log('   ✅ Step 2 PASS: User found and active');
          
          const testUser = foundUser[0];
          
          // Step 3: Verify password
          const validModern = verifyPassword(loginPayload.password, testUser.auth_secret_hash);
          const validLegacy = !validModern && !!testUser.auth_pin_hash && testUser.auth_pin_hash === hashLegacyPin(loginPayload.password);
          
          console.log(`      Modern verification: ${validModern ? '✅ PASS' : '❌ FAIL'}`);
          console.log(`      Legacy verification: ${validLegacy ? '✅ PASS' : '❌ FAIL'}`);
          
          if (!validModern && !validLegacy) {
            console.log('   ❌ Step 3 FAIL: Invalid credentials');
          } else {
            console.log('   ✅ Step 3 PASS: Password verified');
            
            // Step 4: Check if upgrade needed
            if (validLegacy) {
              console.log('   🔄 Step 4: Would upgrade legacy hash');
            } else {
              console.log('   ✅ Step 4 PASS: Modern hash, no upgrade needed');
            }
            
            console.log('   🎉 LOGIN SIMULATION: ✅ SUCCESS');
            console.log('   📋 Response would include:');
            console.log(`      user: { id: ${testUser.id}, name: "${testUser.name}", role: "${testUser.role}" }`);
            console.log(`      csrf_token: [generated]`);
            console.log(`      password_reset_required: ${Boolean(testUser.password_reset_required)}`);
          }
        }
      }
    }
    
    // 8. SESSION TOKENS ANALYSIS
    console.log('\n8. 🎫 SESSION TOKENS ANALYSIS');
    const [sessions] = await connection.execute('SELECT COUNT(*) as count FROM session_tokens WHERE expires_at > CURRENT_TIMESTAMP');
    console.log(`   Active sessions: ${sessions[0].count}`);
    
    // 9. POTENTIAL ISSUES IDENTIFICATION
    console.log('\n9. ⚠️ POTENTIAL ISSUES IDENTIFICATION');
    
    const issues = [];
    
    // Check for inactive users
    const [inactiveUsers] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE active != 1');
    if (inactiveUsers[0].count > 0) {
      issues.push(`${inactiveUsers[0].count} inactive users found`);
    }
    
    // Check for users without modern hashes
    const [noModernHash] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE auth_secret_hash IS NULL');
    if (noModernHash[0].count > 0) {
      issues.push(`${noModernHash[0].count} users without modern password hashes`);
    }
    
    // Check for users with failed attempts
    const [failedAttempts] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE failed_login_attempts > 0');
    if (failedAttempts[0].count > 0) {
      issues.push(`${failedAttempts[0].count} users with failed login attempts`);
    }
    
    // Check for locked accounts
    const [lockedAccounts] = await connection.execute('SELECT COUNT(*) as count FROM user_accounts WHERE locked_until IS NOT NULL AND locked_until > CURRENT_TIMESTAMP');
    if (lockedAccounts[0].count > 0) {
      issues.push(`${lockedAccounts[0].count} accounts currently locked`);
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No critical issues found');
    } else {
      console.log('   ⚠️ Issues found:');
      issues.forEach(issue => console.log(`      - ${issue}`));
    }
    
    // 10. RECOMMENDATIONS
    console.log('\n10. 💡 RECOMMENDATIONS');
    console.log('   Based on analysis:');
    
    if (zacarias.length > 0) {
      const user = zacarias[0];
      if (!user.auth_secret_hash) {
        console.log('   ⚠️ zacarias has no modern password hash - run fix-password.mjs');
      } else {
        const testValid = verifyPassword('admin123', user.auth_secret_hash);
        if (!testValid) {
          console.log('   ⚠️ zacarias password hash is invalid - run fix-password.mjs');
        } else {
          console.log('   ✅ zacarias account appears correctly configured');
        }
      }
    } else {
      console.log('   ⚠️ zacarias account not found - run setup-zacarias-admin.mjs');
    }
    
    console.log('   📋 Manual testing steps:');
    console.log('      1. Open browser to http://localhost:3000');
    console.log('      2. Press F12 to open developer tools');
    console.log('      3. Go to Network tab');
    console.log('      4. Attempt login with zacarias/admin123');
    console.log('      5. Check the POST request to /api/auth/login');
    console.log('      6. Verify response status and body');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Main function
async function main() {
  await comprehensiveAnalysis();
}

// Run main function
main().catch(console.error);
