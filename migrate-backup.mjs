#!/usr/bin/env node

// MySQL Migration Script for freesqldatabase.com
// Migrates backup data from freedb.tech to sql7825288 database

// Use existing mysql2 from node_modules
import { createConnection } from './node_modules/mysql2/promise.js';

// Source database (freedb.tech - read-only backup)
const sourceConfig = {
  host: 'sql.freedb.tech',
  port: 3306,
  user: 'freedb_mohamad',
  password: 'u2!h$fH$29QPQcY',
  database: 'freedb_TicketTracker',
  namedPlaceholders: true,
  multipleStatements: true
};

// Target database (freesqldatabase.com - new database)
const targetConfig = {
  host: 'sql7.freesqldatabase.com',
  port: 3306,
  user: 'sql7825288',
  password: 'qS3KmP6hR1',
  database: 'sql7825288',
  namedPlaceholders: true,
  multipleStatements: true
};

async function migrateData() {
  let sourceConnection;
  let targetConnection;
  
  try {
    console.log('🔄 Starting migration from freedb.tech to freesqldatabase.com...');
    
    // Connect to both databases
    sourceConnection = await createConnection(sourceConfig);
    targetConnection = await createConnection(targetConfig);
    
    console.log('✅ Connected to both databases');
    
    // Get all data from source
    console.log('📥 Extracting data from source database...');
    
    const [users] = await sourceConnection.execute('SELECT * FROM user_accounts');
    const [tickets] = await sourceConnection.execute('SELECT * FROM tickets');
    const [comments] = await sourceConnection.execute('SELECT * FROM ticket_comments');
    const [sessions] = await sourceConnection.execute('SELECT * FROM session_tokens');
    const [auditLog] = await sourceConnection.execute('SELECT * FROM ticket_audit_log');
    const [filters] = await sourceConnection.execute('SELECT * FROM saved_filters');
    
    console.log(`📊 Found: ${users.length} users, ${tickets.length} tickets, ${comments.length} comments`);
    
    // Clear target tables (preserve structure)
    console.log('🧹 Cleaning target database...');
    await targetConnection.execute('DELETE FROM ticket_comments');
    await targetConnection.execute('DELETE FROM session_tokens');
    await targetConnection.execute('DELETE FROM ticket_audit_log');
    await targetConnection.execute('DELETE FROM saved_filters');
    await targetConnection.execute('DELETE FROM tickets');
    await targetConnection.execute('DELETE FROM user_accounts');
    
    // Migrate users
    console.log('👥 Migrating users...');
    for (const user of users) {
      await targetConnection.execute(`
        INSERT INTO user_accounts (
          id, name, role, active, auth_pin_hash, auth_secret_hash, 
          password_reset_required, failed_login_attempts, locked_until, 
          email, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id, user.name, user.role, user.active, user.auth_pin_hash, 
        user.auth_secret_hash, user.password_reset_required, user.failed_login_attempts,
        user.locked_until, user.email, user.created_at, user.updated_at
      ]);
    }
    
    // Migrate tickets
    console.log('🎫 Migrating tickets...');
    for (const ticket of tickets) {
      await targetConnection.execute(`
        INSERT INTO tickets (
          id, description, jd_ticket_number, category, updates_comments, 
          priority, date_opening, date_closed, status, assignee, manager, 
          due_date, reopened_count, batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ticket.id, ticket.description, ticket.jd_ticket_number, ticket.category,
        ticket.updates_comments, ticket.priority, ticket.date_opening, 
        ticket.date_closed, ticket.status, ticket.assignee, ticket.manager,
        ticket.due_date, ticket.reopened_count, ticket.batch_id, 
        ticket.created_at, ticket.updated_at
      ]);
    }
    
    // Migrate comments
    console.log('💬 Migrating comments...');
    for (const comment of comments) {
      await targetConnection.execute(`
        INSERT INTO ticket_comments (
          id, ticket_id, author, comment_type, body, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [comment.id, comment.ticket_id, comment.author, comment.comment_type, comment.body, comment.created_at]);
    }
    
    // Migrate sessions
    console.log('🔐 Migrating sessions...');
    for (const session of sessions) {
      await targetConnection.execute(`
        INSERT INTO session_tokens (
          id, user_id, csrf_token, expires_at, created_at, last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [session.id, session.user_id, session.csrf_token, session.expires_at, session.created_at, session.last_seen_at]);
    }
    
    // Migrate audit log
    console.log('📋 Migrating audit log...');
    for (const log of auditLog) {
      await targetConnection.execute(`
        INSERT INTO ticket_audit_log (
          id, entity_type, entity_id, action, actor, details_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [log.id, log.entity_type, log.entity_id, log.action, log.actor, log.details_json, log.created_at]);
    }
    
    // Migrate saved filters
    console.log('🔍 Migrating saved filters...');
    for (const filter of filters) {
      await targetConnection.execute(`
        INSERT INTO saved_filters (
          id, user_id, name, filter_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [filter.id, filter.user_id, filter.name, filter.filter_json, filter.created_at, filter.updated_at]);
    }
    
    // Reset auto-increment counters
    console.log('🔧 Resetting auto-increment counters...');
    await targetConnection.execute('ALTER TABLE user_accounts AUTO_INCREMENT = 569');
    await targetConnection.execute('ALTER TABLE tickets AUTO_INCREMENT = 9');
    await targetConnection.execute('ALTER TABLE ticket_comments AUTO_INCREMENT = 7');
    await targetConnection.execute('ALTER TABLE ticket_audit_log AUTO_INCREMENT = 2');
    
    console.log('✅ Migration completed successfully!');
    console.log(`📈 Migrated: ${users.length} users, ${tickets.length} tickets, ${comments.length} comments`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (sourceConnection) await sourceConnection.end();
    if (targetConnection) await targetConnection.end();
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData().catch(console.error);
}

export { migrateData };
