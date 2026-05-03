#!/usr/bin/env node

import mysql from 'mysql2/promise';

// Database configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // Update with your MySQL password
  database: 'ticket_tracker'
};

async function unlockAllAccounts() {
  let connection;
  
  try {
    console.log('🔓 Connecting to database...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    // Check for locked accounts
    console.log('🔍 Checking for locked accounts...');
    const [lockedAccounts] = await connection.execute(
      'SELECT name, failed_login_attempts, locked_until, active FROM user_accounts WHERE failed_login_attempts > 0 OR locked_until IS NOT NULL'
    );
    
    if (lockedAccounts.length === 0) {
      console.log('✅ No locked accounts found.');
      return;
    }
    
    console.log(`📋 Found ${lockedAccounts.length} accounts with issues:`);
    lockedAccounts.forEach(account => {
      console.log(`  - ${account.name}: ${account.failed_login_attempts} failed attempts, locked until: ${account.locked_until || 'Never'}`);
    });
    
    // Unlock all accounts
    console.log('🔓 Unlocking all accounts...');
    await connection.execute(
      'UPDATE user_accounts SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE failed_login_attempts > 0 OR locked_until IS NOT NULL'
    );
    
    console.log('✅ All accounts have been unlocked successfully!');
    
    // Verify unlock
    const [remainingLocked] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_accounts WHERE failed_login_attempts > 0 OR locked_until IS NOT NULL'
    );
    
    console.log(`📊 Verification: ${remainingLocked[0].count} accounts still have issues`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Check specific account
async function checkAccount(username) {
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    const [accounts] = await connection.execute(
      'SELECT name, failed_login_attempts, locked_until, active FROM user_accounts WHERE name = ?',
      [username]
    );
    
    if (accounts.length === 0) {
      console.log(`❌ Account '${username}' not found.`);
      return;
    }
    
    const account = accounts[0];
    console.log(`📋 Account Status for '${username}':`);
    console.log(`  - Active: ${account.active ? 'Yes' : 'No'}`);
    console.log(`  - Failed attempts: ${account.failed_login_attempts}`);
    console.log(`  - Locked until: ${account.locked_until || 'Never'}`);
    console.log(`  - Status: ${account.locked_until && new Date(account.locked_until) > new Date() ? '🔒 LOCKED' : '✅ Unlocked'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Unlock specific account
async function unlockAccount(username) {
  let connection;
  
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    
    const [result] = await connection.execute(
      'UPDATE user_accounts SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [username]
    );
    
    if (result.affectedRows === 0) {
      console.log(`❌ Account '${username}' not found.`);
      return;
    }
    
    console.log(`✅ Account '${username}' has been unlocked successfully!`);
    
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
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔓 Ticket Tracker Account Unlock Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node unlock-accounts.mjs                    # Unlock all accounts');
    console.log('  node unlock-accounts.mjs check <username>   # Check specific account');
    console.log('  node unlock-accounts.mjs unlock <username>  # Unlock specific account');
    console.log('');
    console.log('Examples:');
    console.log('  node unlock-accounts.mjs check admin');
    console.log('  node unlock-accounts.mjs unlock admin');
    return;
  }
  
  const command = args[0];
  
  if (command === 'check' && args[1]) {
    await checkAccount(args[1]);
  } else if (command === 'unlock' && args[1]) {
    await unlockAccount(args[1]);
  } else if (command === 'unlock-all') {
    await unlockAllAccounts();
  } else {
    console.log('❌ Invalid command. Use "check <username>" or "unlock <username>" or "unlock-all"');
  }
}

// Run main function
main().catch(console.error);
