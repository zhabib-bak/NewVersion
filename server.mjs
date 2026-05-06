import { createServer } from 'node:http';
import { stat, copyFile, mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createConnection as mysqlCreateConnection } from 'mysql2/promise';
import { Pool as pgPool } from 'pg';
import { URL } from 'node:url';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { createConnection } from 'node:net';
import { connect as tlsConnect } from 'node:tls';

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR ? normalize(process.env.DATA_DIR) : join(ROOT, 'data');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const DB_PATH = join(DATA_DIR, 'tickets.db');
const LEGACY_DB_PATH = join(ROOT, 'tickets.db');
const SESSION_DURATION_MS = Number(process.env.SESSION_DURATION_HOURS || 12) * 60 * 60 * 1000;
const REMEMBER_ME_DAYS = Number(process.env.REMEMBER_ME_DAYS || 30);
const IS_PROD = process.env.NODE_ENV === 'production';
const DEFAULT_SEED_PASSWORD = process.env.TICKET_APP_DEFAULT_PASSWORD || 'ChangeMe!2026';
// Force reset when using the insecure default password; skip if operator set a real one
const SEED_FORCE_RESET = process.env.SEED_FORCE_RESET === 'true' ||
  (process.env.SEED_FORCE_RESET !== 'false' && DEFAULT_SEED_PASSWORD === 'ChangeMe!2026');
const WEBHOOK_TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS || 5000);
const WEBHOOK_ALLOWLIST = (process.env.WEBHOOK_ALLOWLIST || '')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_BULK_BODY_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENT_BODY_BYTES = Math.ceil(8 * 1024 * 1024 * 4 / 3) + 4096;
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'Ticket Tracker <no-reply@localhost>';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_REJECT_UNAUTHORIZED = process.env.SMTP_REJECT_UNAUTHORIZED !== 'false';

const CATEGORIES = [
  'administrative', 'change request', 'CR', 'Inbound', 'Outbound', 'Inventory', 'WMS', 'UCS', 'Scada', 'Skyfall', 'PIN', 'Toting', 'Shuttle'
];
const PRIORITIES = ['P1 high', 'P2 medium', 'P3 low'];
const STATUSES = ['Open', 'In Progress', 'Blocked', 'Closed'];
const COMMENT_TYPES = ['Update', 'Investigation', 'Blocker', 'Resolution', 'System'];
const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain','text/csv'];
const RE_ATTACHMENT_PATH = /^\/api\/tickets\/\d+\/attachments$/;
const RE_ATTACHMENT_ITEM_PATH = /^\/api\/tickets\/\d+\/attachments\/\d+$/;
const ROLE_ORDER = { user: 1, manager: 2, admin: 3 };
const USER_ROLES = Object.keys(ROLE_ORDER);
const DEFAULT_PASSWORD_MIN_LENGTH = 10;

const SEED_USERS = [
  { name: 'Chandra', role: 'user', active: 1 },
  { name: 'Nicoleta', role: 'user', active: 1 },
  { name: 'Loan', role: 'user', active: 1 },
  { name: 'Samuel', role: 'user', active: 1 },
  { name: 'Mohamad', role: 'user', active: 1 },
  { name: 'Ana', role: 'user', active: 1 },
  { name: 'Andrea', role: 'user', active: 1 },
  { name: 'Alexandra', role: 'user', active: 1 },
  { name: 'Radulesco', role: 'user', active: 1 },
  { name: 'Oliwia', role: 'user', active: 1 },
  { name: 'Madalin', role: 'user', active: 1 },
  { name: 'Adriano', role: 'manager', active: 1 },
  { name: 'Zacarias', role: 'manager', active: 1 },
  { name: 'Jawad', role: 'admin', active: 1 }
];

const STATUS_TRANSITIONS = {
  Open: ['In Progress', 'Blocked', 'Closed'],
  'In Progress': ['Blocked', 'Closed', 'Open'],
  Blocked: ['In Progress', 'Closed', 'Open'],
  Closed: ['Open']
};

const SLA_DAYS = {
  'P1 high': 1,
  'P2 medium': 3,
  'P3 low': 7
};

const rateLimits = new Map();
const RATE_LIMITS = {
  login: { windowMs: 15 * 60_000, max: 20 },
  mutation: { windowMs: 60_000, max: 180 },
  read: { windowMs: 60_000, max: 600 }
};

// Create data directories with error handling for Render
try {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(join(DATA_DIR, 'uploads'), { recursive: true });
} catch (error) {
  if (error.code === 'EACCES') {
    console.warn('[warning] Cannot create data directories, using fallback');
    // Use alternative directory for Render
    process.env.DATA_DIR = './tmp_data';
    const fallbackDataDir = './tmp_data';
    const fallbackBackupDir = './tmp_data/backups';
    mkdirSync(fallbackDataDir, { recursive: true });
    mkdirSync(fallbackBackupDir, { recursive: true });
    mkdirSync(join(fallbackDataDir, 'uploads'), { recursive: true });
    console.log('[info] Using fallback data directory:', fallbackDataDir);
  } else {
    throw error;
  }
}
await bootstrapDataStore();
const ENCRYPTION_KEY = await loadOrCreateEncryptionKey();

// Database configuration (supports both MySQL and PostgreSQL)
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_TYPE = process.env.DB_TYPE; // 'mysql' or 'postgres'

// Create database connection pool
let pool;

async function createPool() {
  if (DB_TYPE === 'postgres') {
    pool = new pgPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      max: 10,
      // Force IPv4 connection and SSL for Supabase
      family: 4,
      ssl: {
        rejectUnauthorized: false
      },
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  } else {
    pool = mysqlCreateConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      namedPlaceholders: true,
      multipleStatements: true
    });
  }
  await pool;
}

async function getConnection() {
  if (!pool) {
    await createPool();
  }
  return pool;
}

async function query(sql, params = []) {
  const connection = await getConnection();
  try {
    if (DB_TYPE === 'postgres') {
      const result = await connection.query(sql, params);
      return result.rows;
    } else {
      const [results] = await connection.execute(sql, params);
      return results;
    }
  } finally {
    // Connection is automatically returned to pool
  }
}

// Create database tables (supports both MySQL and PostgreSQL)
const userAccountsTable = DB_TYPE === 'postgres' 
  ? `CREATE TABLE IF NOT EXISTS user_accounts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL,
      active SMALLINT NOT NULL DEFAULT 1,
      auth_pin_hash VARCHAR(255),
      auth_secret_hash VARCHAR(255),
      password_reset_required SMALLINT NOT NULL DEFAULT 1,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  : `CREATE TABLE IF NOT EXISTS user_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL,
      active TINYINT NOT NULL DEFAULT 1,
      auth_pin_hash VARCHAR(255),
      auth_secret_hash VARCHAR(255),
      password_reset_required TINYINT NOT NULL DEFAULT 1,
      failed_login_attempts INT NOT NULL DEFAULT 0,
      locked_until DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT NULL
    )`;

await query(userAccountsTable);

const ticketsTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      description TEXT NOT NULL,
      jd_ticket_number VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      updates_comments TEXT,
      priority VARCHAR(20) NOT NULL,
      date_opening TIMESTAMP NOT NULL,
      date_closed TIMESTAMP,
      status VARCHAR(50) NOT NULL,
      assignee VARCHAR(255),
      manager VARCHAR(255),
      due_date TIMESTAMP,
      reopened_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  : `CREATE TABLE IF NOT EXISTS tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description TEXT NOT NULL,
      jd_ticket_number VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      updates_comments TEXT,
      priority VARCHAR(20) NOT NULL,
      date_opening DATETIME NOT NULL,
      date_closed DATETIME,
      status VARCHAR(50) NOT NULL,
      assignee VARCHAR(255),
      manager VARCHAR(255),
      due_date DATETIME,
      reopened_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT NULL
    )`;

await query(ticketsTable);

const ticketCommentsTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS ticket_comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      author VARCHAR(255) NOT NULL,
      comment_type VARCHAR(50) NOT NULL DEFAULT 'Update',
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`
  : `CREATE TABLE IF NOT EXISTS ticket_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      author VARCHAR(255) NOT NULL,
      comment_type VARCHAR(50) NOT NULL DEFAULT 'Update',
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`;

await query(ticketCommentsTable);

const sessionTokensTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS session_tokens (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER NOT NULL,
      csrf_token VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
    )`
  : `CREATE TABLE IF NOT EXISTS session_tokens (
      id VARCHAR(255) PRIMARY KEY,
      user_id INT NOT NULL,
      csrf_token VARCHAR(255) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
    )`;

await query(sessionTokensTable);

const ticketAuditLogTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS ticket_audit_log (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INTEGER,
      action VARCHAR(100) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      details_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  : `CREATE TABLE IF NOT EXISTS ticket_audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT,
      action VARCHAR(100) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      details_json TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

await query(ticketAuditLogTable);

const savedFiltersTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS saved_filters (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      filter_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
    )`
  : `CREATE TABLE IF NOT EXISTS saved_filters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      filter_json TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES user_accounts(id) ON DELETE CASCADE
    )`;

await query(savedFiltersTable);

const webhookSubscriptionsTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      secret_encrypted TEXT,
      active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  : `CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      secret_encrypted TEXT,
      active TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT NULL
    )`;

await query(webhookSubscriptionsTable);

const webhookDeliveriesTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id SERIAL PRIMARY KEY,
      webhook_id INTEGER NOT NULL,
      event_name VARCHAR(100) NOT NULL,
      response_status INTEGER,
      success SMALLINT NOT NULL DEFAULT 0,
      duration_ms INTEGER,
      request_id VARCHAR(255) NOT NULL,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
    )`
  : `CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      webhook_id INT NOT NULL,
      event_name VARCHAR(100) NOT NULL,
      response_status INT,
      success TINYINT NOT NULL DEFAULT 0,
      duration_ms INT,
      request_id VARCHAR(255) NOT NULL,
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webhook_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
    )`;

await query(webhookDeliveriesTable);

const importBatchesTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS import_batches (
      id SERIAL PRIMARY KEY,
      batch_name VARCHAR(255),
      imported_by VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      row_count INTEGER NOT NULL,
      created_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  : `CREATE TABLE IF NOT EXISTS import_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_name VARCHAR(255),
      imported_by VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      row_count INT NOT NULL,
      created_count INT NOT NULL DEFAULT 0,
      error_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

await query(importBatchesTable);

const ticketAttachmentsTable = DB_TYPE === 'postgres'
  ? `CREATE TABLE IF NOT EXISTS ticket_attachments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      filename VARCHAR(255) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      uploaded_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`
  : `CREATE TABLE IF NOT EXISTS ticket_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ticket_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      size_bytes INT NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      uploaded_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`;

await query(ticketAttachmentsTable);

// Database column additions (if needed)
async function ensureColumn(table, column, definition) {
  try {
    const alterSQL = DB_TYPE === 'postgres' 
      ? `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`
      : `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`;
    await query(alterSQL);
  } catch (error) {
    // Column might already exist, ignore error
  }
}

await ensureColumn('tickets', 'due_date', DB_TYPE === 'postgres' ? 'TIMESTAMP' : 'DATETIME');
await ensureColumn('tickets', 'reopened_count', DB_TYPE === 'postgres' ? 'INTEGER NOT NULL DEFAULT 0' : 'INT NOT NULL DEFAULT 0');
await ensureColumn('user_accounts', 'auth_pin_hash', 'VARCHAR(255)');
await ensureColumn('user_accounts', 'auth_secret_hash', 'VARCHAR(255)');
await ensureColumn('user_accounts', 'password_reset_required', DB_TYPE === 'postgres' ? 'SMALLINT NOT NULL DEFAULT 1' : 'TINYINT NOT NULL DEFAULT 1');
await ensureColumn('user_accounts', 'failed_login_attempts', DB_TYPE === 'postgres' ? 'INTEGER NOT NULL DEFAULT 0' : 'INT NOT NULL DEFAULT 0');
await ensureColumn('user_accounts', 'locked_until', DB_TYPE === 'postgres' ? 'TIMESTAMP' : 'DATETIME');
await ensureColumn('user_accounts', 'email', 'VARCHAR(255)');
await ensureColumn('ticket_comments', 'comment_type', "VARCHAR(50) NOT NULL DEFAULT 'Update'");
await ensureColumn('webhook_subscriptions', 'secret_encrypted', 'TEXT');
await ensureColumn('tickets', 'batch_id', DB_TYPE === 'postgres' ? 'INTEGER' : 'INT');

// Check for legacy secret column migration
let secretColumnInfo;
if (DB_TYPE === 'postgres') {
  secretColumnInfo = await query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'webhook_subscriptions'
  `);
} else {
  secretColumnInfo = await query('SHOW COLUMNS FROM webhook_subscriptions');
}
const hasLegacySecret = secretColumnInfo.some((column) => column.Field === 'secret' || column.column_name === 'secret');
if (hasLegacySecret) {
  const legacyHooks = await query("SELECT id, secret FROM webhook_subscriptions WHERE secret IS NOT NULL AND TRIM(secret) <> '' AND (secret_encrypted IS NULL OR TRIM(secret_encrypted) = '')");
  for (const hook of legacyHooks) {
    await query(DB_TYPE === 'postgres' 
    ? 'UPDATE webhook_subscriptions SET secret_encrypted = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2'
    : 'UPDATE webhook_subscriptions SET secret_encrypted = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
  [encryptSecret(hook.secret), hook.id]);
  }
}

// Database query functions
const stmtUsers = {
  list: async () => await query(`
    SELECT id, name, role, active, password_reset_required, failed_login_attempts, locked_until, created_at, updated_at
    FROM user_accounts
    ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END, name ASC
  `),
  byName: async (name) => {
    const result = await query(DB_TYPE === 'postgres' 
      ? 'SELECT * FROM user_accounts WHERE LOWER(name) = LOWER($1)' 
      : 'SELECT * FROM user_accounts WHERE LOWER(name) = LOWER(?)', 
      [name]);
    return result[0];
  },
  byId: async (id) => {
    const result = await query(DB_TYPE === 'postgres' 
      ? 'SELECT * FROM user_accounts WHERE id = $1' 
      : 'SELECT * FROM user_accounts WHERE id = ?', 
      [id]);
    return result[0];
  },
  insert: async (name, role, active, auth_secret_hash, password_reset_required, email) => {
    if (DB_TYPE === 'postgres') {
      await query('INSERT INTO user_accounts (name, role, active, auth_secret_hash, password_reset_required, failed_login_attempts, locked_until, email, updated_at) VALUES ($1, $2, $3, $4, $5, 0, NULL, $6, CURRENT_TIMESTAMP) ON CONFLICT (name) DO NOTHING', 
        [name, role, active, auth_secret_hash, password_reset_required, email]);
    } else {
      await query('INSERT IGNORE INTO user_accounts (name, role, active, auth_secret_hash, password_reset_required, failed_login_attempts, locked_until, email, updated_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, CURRENT_TIMESTAMP)', 
        [name, role, active, auth_secret_hash, password_reset_required, email]);
    }
  },
  update: async (name, role, active, auth_secret_hash, password_reset_required, email, id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'UPDATE user_accounts SET name = $1, role = $2, active = $3, auth_secret_hash = COALESCE($4, auth_secret_hash), password_reset_required = $5, email = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7'
      : 'UPDATE user_accounts SET name = ?, role = ?, active = ?, auth_secret_hash = COALESCE(?, auth_secret_hash), password_reset_required = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [name, role, active, auth_secret_hash, password_reset_required, email, id]);
  },
  setSecret: async (auth_secret_hash, password_reset_required, id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'UPDATE user_accounts SET auth_secret_hash = $1, auth_pin_hash = NULL, password_reset_required = $2, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $3'
      : 'UPDATE user_accounts SET auth_secret_hash = ?, auth_pin_hash = NULL, password_reset_required = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [auth_secret_hash, password_reset_required, id]);
  },
  loginFail: async (failed_login_attempts, locked_until, id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'UPDATE user_accounts SET failed_login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3'
      : 'UPDATE user_accounts SET failed_login_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [failed_login_attempts, locked_until, id]);
  },
  resetLoginFailures: async (id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'UPDATE user_accounts SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1'
      : 'UPDATE user_accounts SET failed_login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [id]);
  },
  delete: async (id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'DELETE FROM user_accounts WHERE id = $1'
      : 'DELETE FROM user_accounts WHERE id = ?', 
      [id]);
  }
};

const stmtTickets = {
  byId: async (id) => {
    const result = await query(DB_TYPE === 'postgres' 
      ? 'SELECT * FROM tickets WHERE id = $1' 
      : 'SELECT * FROM tickets WHERE id = ?', 
      [id]);
    return result[0];
  },
  listBase: async (where) => await query(`
    SELECT * FROM tickets
    ${where}
    ORDER BY
      CASE priority WHEN 'P1 high' THEN 1 WHEN 'P2 medium' THEN 2 ELSE 3 END,
      date_opening DESC,
      id DESC
  `),
  insert: async (description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date) => {
    await query(DB_TYPE === 'postgres' 
      ? 'INSERT INTO tickets (description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date, reopened_count, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, CURRENT_TIMESTAMP)'
      : 'INSERT INTO tickets (description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date, reopened_count, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)', 
      [description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date]);
  },
  update: async (description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date, reopened_count, id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'UPDATE tickets SET description = $1, jd_ticket_number = $2, category = $3, updates_comments = $4, priority = $5, date_opening = $6, date_closed = $7, status = $8, assignee = $9, manager = $10, due_date = $11, reopened_count = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13'
      : 'UPDATE tickets SET description = ?, jd_ticket_number = ?, category = ?, updates_comments = ?, priority = ?, date_opening = ?, date_closed = ?, status = ?, assignee = ?, manager = ?, due_date = ?, reopened_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date, reopened_count, id]);
  },
  delete: async (id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'DELETE FROM tickets WHERE id = $1'
      : 'DELETE FROM tickets WHERE id = ?', 
      [id]);
  }
};

const stmtComments = {
  listByTicket: async (ticket_id) => await query(`
    SELECT id, ticket_id, author, comment_type, body, created_at
    FROM ticket_comments
    WHERE ticket_id = ${DB_TYPE === 'postgres' ? '$1' : '?'}
    ORDER BY created_at ASC, id ASC
  `, [ticket_id]),
  insert: async (ticket_id, author, comment_type, body) => {
    await query(DB_TYPE === 'postgres' 
      ? 'INSERT INTO ticket_comments (ticket_id, author, comment_type, body, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)'
      : 'INSERT INTO ticket_comments (ticket_id, author, comment_type, body, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', 
      [ticket_id, author, comment_type, body]);
  }
};

const stmtSessions = {
  byId: async (id) => {
    const result = await query(`
    SELECT s.id, s.user_id, s.csrf_token, s.expires_at, u.name, u.role, u.active, u.password_reset_required
    FROM session_tokens s
    JOIN user_accounts u ON u.id = s.user_id
    WHERE s.id = ${DB_TYPE === 'postgres' ? '$1' : '?'}
  `, [id]);
    return result[0];
  },
  insert: async (id, user_id, csrf_token, expires_at) => {
    await query(DB_TYPE === 'postgres' 
      ? 'INSERT INTO session_tokens (id, user_id, csrf_token, expires_at, last_seen_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)'
      : 'INSERT INTO session_tokens (id, user_id, csrf_token, expires_at, last_seen_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', 
      [id, user_id, csrf_token, expires_at]);
  },
  touch: async (id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'UPDATE session_tokens SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1'
      : 'UPDATE session_tokens SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [id]);
  },
  delete: async (id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'DELETE FROM session_tokens WHERE id = $1'
      : 'DELETE FROM session_tokens WHERE id = ?', 
      [id]);
  },
  deleteByUser: async (user_id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'DELETE FROM session_tokens WHERE user_id = $1'
      : 'DELETE FROM session_tokens WHERE user_id = ?', 
      [user_id]);
  },
  purge: async () => await query('DELETE FROM session_tokens WHERE expires_at < CURRENT_TIMESTAMP')
};

const stmtFilters = {
  listByUser: async (user_id) => await query(DB_TYPE === 'postgres' 
    ? 'SELECT id, name, filter_json, created_at, updated_at FROM saved_filters WHERE user_id = $1 ORDER BY updated_at DESC'
    : 'SELECT id, name, filter_json, created_at, updated_at FROM saved_filters WHERE user_id = ? ORDER BY updated_at DESC', 
    [user_id]),
  insert: async (user_id, name, filter_json) => {
    await query(DB_TYPE === 'postgres' 
      ? 'INSERT INTO saved_filters (user_id, name, filter_json, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)'
      : 'INSERT INTO saved_filters (user_id, name, filter_json, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', 
      [user_id, name, filter_json]);
  },
  delete: async (id, user_id) => {
    await query(DB_TYPE === 'postgres' 
      ? 'DELETE FROM saved_filters WHERE id = $1 AND user_id = $2'
      : 'DELETE FROM saved_filters WHERE id = ? AND user_id = ?', 
      [id, user_id]);
  }
};

const stmtWebhooks = {
  list: async () => await query('SELECT id, name, url, active, created_at, updated_at FROM webhook_subscriptions ORDER BY id DESC'),
  byId: async (id) => (await query('SELECT id, name, url, secret_encrypted, active, created_at, updated_at FROM webhook_subscriptions WHERE id = ?', [id]))[0],
  insert: async (name, url, secret_encrypted, active) =>
    await query('INSERT INTO webhook_subscriptions (name, url, secret_encrypted, active, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', [name, url, secret_encrypted, active]),
  update: async (name, url, secret_encrypted, active, id) =>
    await query('UPDATE webhook_subscriptions SET name = ?, url = ?, secret_encrypted = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, url, secret_encrypted, active, id]),
  delete: async (id) => await query('DELETE FROM webhook_subscriptions WHERE id = ?', [id]),
  active: async () => await query('SELECT id, name, url, secret_encrypted FROM webhook_subscriptions WHERE active = 1'),
  deliveries: async () => await query(`
    SELECT d.id, d.webhook_id, w.name AS webhook_name, d.event_name, d.response_status, d.success, d.duration_ms, d.request_id, d.error_message, d.created_at
    FROM webhook_deliveries d
    JOIN webhook_subscriptions w ON w.id = d.webhook_id
    ORDER BY d.id DESC
    LIMIT 150
  `),
  logDelivery: async (webhook_id, event_name, response_status, success, duration_ms, request_id, error_message) =>
    await query('INSERT INTO webhook_deliveries (webhook_id, event_name, response_status, success, duration_ms, request_id, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [webhook_id, event_name, response_status, success, duration_ms, request_id, error_message])
};

const stmtAudit = {
  insert: async (entity_type, entity_id, action, actor, details_json) =>
    await query('INSERT INTO ticket_audit_log (entity_type, entity_id, action, actor, details_json, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', [entity_type, entity_id, action, actor, details_json]),
  list: async (entity_type, entity_id) => await query(`
    SELECT id, entity_type, entity_id, action, actor, details_json, created_at
    FROM ticket_audit_log
    WHERE (? IS NULL OR entity_type = ?)
      AND (? IS NULL OR entity_id = ?)
    ORDER BY id DESC
    LIMIT 400
  `, [entity_type, entity_type, entity_id, entity_id])
};

const stmtImport = {
  insertBatch: async (batch_name, imported_by, file_name, row_count, created_count, error_count) =>
    await query('INSERT INTO import_batches (batch_name, imported_by, file_name, row_count, created_count, error_count) VALUES (?, ?, ?, ?, ?, ?)', [batch_name, imported_by, file_name, row_count, created_count, error_count]),
  updateBatch: async (created_count, error_count, id) =>
    await query('UPDATE import_batches SET created_count = ?, error_count = ? WHERE id = ?', [created_count, error_count, id]),
  listBatches: async () => await query(`
    SELECT id, batch_name, imported_by, file_name, row_count, created_count, error_count, created_at
    FROM import_batches ORDER BY id DESC LIMIT 50
  `),
  batchById: async (id) => (await query('SELECT * FROM import_batches WHERE id = ?', [id]))[0],
  deleteBatchTickets: async (batch_id) => await query('DELETE FROM tickets WHERE batch_id = ?', [batch_id]),
  deleteBatch: async (id) => await query('DELETE FROM import_batches WHERE id = ?', [id]),
  countByBatch: async (batch_id) => (await query('SELECT COUNT(*) AS count FROM tickets WHERE batch_id = ?', [batch_id]))[0]
};

const stmtAttachments = {
  listByTicket: async (ticket_id) => await query('SELECT id, ticket_id, filename, content_type, size_bytes, uploaded_by, created_at FROM ticket_attachments WHERE ticket_id = ? ORDER BY id ASC', [ticket_id]),
  insert: async (ticket_id, filename, content_type, size_bytes, storage_path, uploaded_by) =>
    await query('INSERT INTO ticket_attachments (ticket_id, filename, content_type, size_bytes, storage_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)', [ticket_id, filename, content_type, size_bytes, storage_path, uploaded_by]),
  byId: async (id, ticket_id) => (await query('SELECT * FROM ticket_attachments WHERE id = ? AND ticket_id = ?', [id, ticket_id]))[0],
  delete: async (id, ticket_id) => await query('DELETE FROM ticket_attachments WHERE id = ? AND ticket_id = ?', [id, ticket_id])
};

seedUsers();
seedTicketsAndComments();
createBackupSnapshot().catch((error) => console.error('[backup]', error));
ensurePerformanceIndexes();

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function ensurePerformanceIndexes() {
  try {
    // MySQL doesn't support IF NOT EXISTS for indexes, so we check first
    const indexes = [
      { name: 'idx_tickets_status', table: 'tickets', column: 'status' },
      { name: 'idx_tickets_priority', table: 'tickets', column: 'priority' },
      { name: 'idx_tickets_assignee', table: 'tickets', column: 'assignee' },
      { name: 'idx_tickets_manager', table: 'tickets', column: 'manager' },
      { name: 'idx_tickets_date_opening', table: 'tickets', column: 'date_opening' },
      { name: 'idx_tickets_batch_id', table: 'tickets', column: 'batch_id' },
      { name: 'idx_ticket_comments_ticket_id', table: 'ticket_comments', column: 'ticket_id' },
      { name: 'idx_saved_filters_user_id', table: 'saved_filters', column: 'user_id' }
    ];
    
    for (const index of indexes) {
      try {
        await query(`CREATE INDEX ${index.name} ON ${index.table}(${index.column})`);
      } catch (error) {
        // Index already exists, continue
        if (error.code !== 'ER_DUP_KEYNAME') {
          console.error(`[index-${index.name}]`, error);
        }
      }
    }
  } catch (error) {
    console.error('[indexes]', error);
  }
}

async function bootstrapDataStore() {
  const currentDataDir = process.env.DATA_DIR || DATA_DIR;
  if (!existsSync(currentDataDir)) {
    try {
      mkdirSync(currentDataDir, { recursive: true });
    } catch (error) {
      if (error.code === 'EACCES') {
        console.warn('[warning] Cannot create bootstrap data directory, using fallback');
        const fallbackDir = './tmp_data';
        if (!existsSync(fallbackDir)) {
          mkdirSync(fallbackDir, { recursive: true });
        }
      } else {
        throw error;
      }
    }
  }
  console.log(`[bootstrap] ${DB_TYPE.toUpperCase()} database initialized`);
}

async function loadOrCreateEncryptionKey() {
  const currentDataDir = process.env.DATA_DIR || DATA_DIR;
  const keyPath = join(currentDataDir, '.app-secrets.json');
  try {
    const raw = await readFile(keyPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Buffer.from(parsed.webhook_key, 'hex');
  } catch {
    const key = randomBytes(32);
    await writeFile(keyPath, JSON.stringify({ webhook_key: key.toString('hex') }, null, 2), { mode: 0o600 });
    return key;
  }
}

function hashLegacyPin(pin) {
  return createHash('sha256').update(pin).digest('hex');
}

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

function encryptSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(payload) {
  if (!payload) return null;
  const [ivHex, tagHex, encryptedHex] = String(payload).split(':');
  if (!ivHex || !tagHex || !encryptedHex) return null;
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

async function seedUsers() {
  const resetRequired = SEED_FORCE_RESET ? 1 : 0;
  for (const user of SEED_USERS) {
    await stmtUsers.insert(user.name, user.role, user.active, hashPassword(DEFAULT_SEED_PASSWORD), resetRequired, '');
  }
  const rows = await query('SELECT id, auth_secret_hash FROM user_accounts');
  for (const row of rows) {
    if (!row.auth_secret_hash) {
      await stmtUsers.setSecret(hashPassword(DEFAULT_SEED_PASSWORD), resetRequired, row.id);
    }
  }
  await query("UPDATE user_accounts SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE name = 'Jawad'");
}

async function seedTicketsAndComments() {
  const count = (await query('SELECT COUNT(*) AS count FROM tickets'))[0].count;
  if (count === 0) {
    const today = new Date();
    const format = (date) => date.toISOString().slice(0, 10);
    const daysAgo = (days) => {
      const value = new Date(today);
      value.setDate(value.getDate() - days);
      return format(value);
    };
    const seed = [
      ['WMS label printer issue in outbound lane', '6914450', 'WMS', 'Investigating printer queue and spooler resets.', 'P1 high', daysAgo(0), null, 'Open', 'Samuel', 'Zacarias'],
      ['Inbound ASN mismatch for supplier load', '6914451', 'Inbound', 'Validated supplier file. Waiting for warehouse confirmation.', 'P2 medium', daysAgo(2), null, 'In Progress', 'Ana', 'Adriano'],
      ['CR to update shuttle routing thresholds', '6914452', 'CR', 'Change request approved by operations.', 'P2 medium', daysAgo(5), daysAgo(1), 'Closed', 'Loan', 'Jawad'],
      ['Inventory discrepancy in zone C12', '6914453', 'Inventory', 'Cycle count requested. Potential location swap.', 'P3 low', daysAgo(4), null, 'Blocked', 'Oliwia', 'Adriano'],
      ['Scada alarm flooding operators', '6914454', 'Scada', 'Reviewed logs and escalated to controls vendor.', 'P1 high', daysAgo(7), null, 'In Progress', 'Mohamad', 'Jawad']
    ];
    for (const item of seed) {
      const dueDate = calculateDueDate(item[5], item[4]);
      await stmtTickets.insert(item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9], dueDate);
    }
  }

  const old = await query(`
    SELECT id, assignee, updates_comments FROM tickets
    WHERE TRIM(COALESCE(updates_comments, '')) <> ''
  `);
  for (const row of old) {
    const existing = (await query('SELECT COUNT(*) AS count FROM ticket_comments WHERE ticket_id = ?', [row.id]))[0].count;
    if (existing > 0) continue;
    await stmtComments.insert(row.id, row.assignee || 'System', 'Update', row.updates_comments.trim());
  }
}

async function createBackupSnapshot() {
  // For MySQL, we don't need to create file backups
  // The database is managed by the MySQL server
  console.log('[backup] MySQL backup handled by database server');
}

function securityHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    ...extra
  };
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', ...securityHeaders(headers) });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message, headers = {}) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8', ...securityHeaders(headers) });
  response.end(message);
}

async function readRequestBody(request, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limit) throw new HttpError(413, 'Request body too large.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON payload.');
  }
}

async function getUsers() {
  return await stmtUsers.list();
}

async function getActiveUsers() {
  const users = await getUsers();
  return users.filter((user) => user.active === 1);
}

async function getAllowedAssignees() {
  const users = await getActiveUsers();
  return users.map((user) => user.name);
}

async function getManagers() {
  const users = await getActiveUsers();
  return users.filter((u) => ROLE_ORDER[u.role] >= ROLE_ORDER.manager).map((u) => u.name);
}

async function getCommentAuthors() {
  return await getAllowedAssignees();
}

function parseCookies(request) {
  const cookieHeader = request.headers.cookie || '';
  const result = {};
  for (const part of cookieHeader.split(';')) {
    const [k, v] = part.trim().split('=');
    if (!k) continue;
    result[k] = decodeURIComponent(v || '');
  }
  return result;
}

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress || 'unknown';
}

function consumeRateLimit(ip, bucketName) {
  const config = RATE_LIMITS[bucketName];
  const key = `${bucketName}:${ip}`;
  const now = Date.now();
  const current = rateLimits.get(key);
  if (!current || now > current.reset) {
    rateLimits.set(key, { count: 1, reset: now + config.windowMs });
    return false;
  }
  current.count += 1;
  if (current.count > config.max) return true;
  return false;
}

function getRateBucket(method, pathname) {
  if (pathname === '/api/auth/login') return 'login';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '')) return 'mutation';
  return 'read';
}

async function authFromRequest(request) {
  await stmtSessions.purge();
  const cookies = parseCookies(request);
  const sid = cookies.session_id;
  if (!sid) return null;
  const session = await stmtSessions.byId(sid);
  if (!session) return null;
  if (session.active !== 1) {
    await stmtSessions.delete(sid);
    return null;
  }
  if (Date.parse(session.expires_at) < Date.now()) {
    await stmtSessions.delete(sid);
    return null;
  }
  await stmtSessions.touch(sid);
  return {
    sessionId: sid,
    userId: session.user_id,
    name: session.name,
    role: session.role,
    csrfToken: session.csrf_token,
    passwordResetRequired: !!session.password_reset_required
  };
}

function assertRole(auth, minRole) {
  if (!auth) throw new HttpError(401, 'Authentication required.');
  if (ROLE_ORDER[auth.role] < ROLE_ORDER[minRole]) {
    throw new HttpError(403, 'You do not have permission to perform this action.');
  }
}

function assertCsrf(request, auth) {
  const token = request.headers['x-csrf-token'];
  if (!auth || typeof token !== 'string' || token !== auth.csrfToken) {
    throw new HttpError(403, 'Invalid CSRF token.');
  }
}

function buildSessionCookie(sessionId, maxAgeSeconds = null) {
  const parts = [`session_id=${encodeURIComponent(sessionId)}`, 'HttpOnly', 'Path=/', 'SameSite=Strict'];
  if (IS_PROD) parts.push('Secure');
  if (typeof maxAgeSeconds === 'number') parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join('; ');
}

function calculateDueDate(dateOpening, priority) {
  const sla = SLA_DAYS[priority] || 3;
  const date = new Date(`${dateOpening}T00:00:00`);
  date.setDate(date.getDate() + sla);
  return date.toISOString().slice(0, 10);
}

function parseToIsoDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY/MM/DD
  let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  // DD/MM/YYYY or D/M/YYYY (European / display format used by this app)
  m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) {
    const day = Number(m[1]), month = Number(m[2]);
    // If day <= 12, ambiguous — treat as DD/MM (European) since that's the app's display format
    // If day > 12, must be DD/MM
    // If month > 12, must be MM/DD (US)
    if (month > 12 && day <= 12) {
      // month and day are swapped — it's M/D/YYYY (US Excel)
      return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    }
    return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  return null;
}

function formatIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function validatePassword(password) {
  if (password.length < DEFAULT_PASSWORD_MIN_LENGTH) {
    throw new HttpError(400, `The password must contain at least ${DEFAULT_PASSWORD_MIN_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'The password must include uppercase, lowercase and at least one number.');
  }
}

function normalizeTicketInput(input) {
  const assignees = getAllowedAssignees();
  const managers = getManagers();
  const ticket = {
    description: String(input.description || '').trim(),
    jd_ticket_number: String(input.jd_ticket_number || '').trim(),
    category: String(input.category || '').trim(),
    updates_comments: String(input.updates_comments || '').trim(),
    priority: String(input.priority || '').trim(),
    date_opening: parseToIsoDate(String(input.date_opening || '').trim()) || String(input.date_opening || '').trim(),
    date_closed: input.date_closed ? (parseToIsoDate(String(input.date_closed).trim()) || String(input.date_closed).trim()) : null,
    status: String(input.status || '').trim(),
    assignee: String(input.assignee || '').trim(),
    manager: String(input.manager || '').trim()
  };

  if (!ticket.description) throw new HttpError(400, 'Description is required.');
  if (!ticket.jd_ticket_number) throw new HttpError(400, 'JD ticket number is required.');
  if (!CATEGORIES.includes(ticket.category)) throw new HttpError(400, 'Invalid category.');
  if (!PRIORITIES.includes(ticket.priority)) throw new HttpError(400, 'Invalid priority.');
  if (!STATUSES.includes(ticket.status)) throw new HttpError(400, 'Invalid status.');
  if (!assignees.includes(ticket.assignee)) throw new HttpError(400, 'Invalid assignee.');
  if (!managers.includes(ticket.manager)) throw new HttpError(400, 'Invalid manager.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ticket.date_opening)) throw new HttpError(400, 'Invalid opening date.');
  if (ticket.date_closed && !/^\d{4}-\d{2}-\d{2}$/.test(ticket.date_closed)) throw new HttpError(400, 'Invalid closed date.');
  if (ticket.status === 'Closed' && !ticket.date_closed) ticket.date_closed = formatIsoDate(Date.now());
  if (ticket.status !== 'Closed') ticket.date_closed = null;
  return ticket;
}

function normalizeCommentInput(input) {
  const author = String(input.author || '').trim();
  const commentType = String(input.comment_type || 'Update').trim();
  const body = String(input.body || '').trim();
  if (!getCommentAuthors().includes(author)) throw new HttpError(400, 'Invalid comment author.');
  if (!COMMENT_TYPES.includes(commentType)) throw new HttpError(400, 'Invalid comment type.');
  if (!body) throw new HttpError(400, 'Comment body is required.');
  return { author, comment_type: commentType, body };
}

async function normalizeUserInput(input, currentName = null) {
  const name = String(input.name || '').trim();
  const role = String(input.role || '').trim();
  const active = Number(input.active ? 1 : 0);
  const password = String(input.password || '').trim();
  const email = String(input.email || '').trim();
  if (!name) throw new HttpError(400, 'User name is required.');
  if (!USER_ROLES.includes(role)) throw new HttpError(400, 'Invalid role.');
  const existing = await stmtUsers.byName(name);
  if (existing && existing.name !== currentName) throw new HttpError(409, 'User name already exists.');
  let secretHash = null;
  let passwordResetRequired = 0;
  if (password) {
    validatePassword(password);
    secretHash = hashPassword(password);
    passwordResetRequired = Number(Boolean(input.password_reset_required));
  }
  return { name, role, active, secretHash, passwordResetRequired, email };
}

function normalizeWebhookInput(input) {
  const name = String(input.name || '').trim();
  const webhookUrl = String(input.url || '').trim();
  const secret = String(input.secret || '').trim();
  const active = Number(input.active ? 1 : 0);
  if (!name) throw new HttpError(400, 'Webhook name is required.');
  if (!webhookUrl) throw new HttpError(400, 'Webhook URL is required.');
  return { name, webhookUrl, secret, active };
}

function validateStatusTransition(previousStatus, nextStatus, role) {
  if (previousStatus === nextStatus) return;
  const allowed = STATUS_TRANSITIONS[previousStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(400, `Invalid status transition from ${previousStatus} to ${nextStatus}.`);
  }
  if (previousStatus === 'Closed' && nextStatus === 'Open' && ROLE_ORDER[role] < ROLE_ORDER.manager) {
    throw new HttpError(403, 'Only managers can reopen closed tickets.');
  }
}

function mapTicketRow(row) {
  const end = row.date_closed || formatIsoDate(Date.now());
  const msPerDay = 1000 * 60 * 60 * 24;
  const aging = Math.max(0, Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${row.date_opening}T00:00:00Z`)) / msPerDay));
  const dueDate = row.due_date || calculateDueDate(row.date_opening, row.priority);
  const isBreached = row.status !== 'Closed' && Date.parse(`${formatIsoDate(Date.now())}T00:00:00Z`) > Date.parse(`${dueDate}T00:00:00Z`);
  return {
    ...row,
    aging,
    due_date: dueDate,
    sla_days: SLA_DAYS[row.priority] || 3,
    is_sla_breached: isBreached
  };
}

async function getComments(ticketId) {
  return await stmtComments.listByTicket(ticketId);
}

async function hydrateTicket(row, { withAttachments = true } = {}) {
  const comments = await getComments(row.id);
  return {
    ...row,
    comments,
    comment_count: comments.length,
    last_comment_preview: comments.length ? comments.at(-1).body : '',
    ...(withAttachments ? { attachments: await stmtAttachments.listByTicket(row.id) } : {})
  };
}

async function listTickets(searchParams, { paginate = true } = {}) {
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const perPage = Math.min(200, Math.max(10, Number(searchParams.get('per_page') || 50)));

  const filters = [];
  const values = [];
  
  // Advanced search parameters
  const search = (searchParams.get('search') || '').trim();
  const q = (searchParams.get('q') || '').trim();
  const searchQuery = search || q;

  // Handle multiple select filters (comma-separated)
  const getArrayParam = (param) => {
    const value = searchParams.get(param);
    return value ? value.split(',').filter(v => v.trim()) : [];
  };

  const directFilters = {
    status: searchParams.get('status'),
    priority: searchParams.get('priority'),
    category: searchParams.get('category'),
    assignee: searchParams.get('assignee'),
    manager: searchParams.get('manager')
  };

  // Advanced search with full-text search
  if (searchQuery) {
    filters.push(`(
      description LIKE ? OR
      jd_ticket_number LIKE ? OR
      category LIKE ? OR
      updates_comments LIKE ? OR
      priority LIKE ? OR
      status LIKE ? OR
      assignee LIKE ? OR
      manager LIKE ? OR
      id IN (SELECT ticket_id FROM ticket_comments WHERE body LIKE ? OR author LIKE ?)
    )`);
    const pattern = `%${searchQuery}%`;
    values.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  }

  // Handle multiple values for advanced filters
  const multiFilters = ['status', 'priority', 'category', 'assignee', 'manager'];
  for (const filter of multiFilters) {
    const values = getArrayParam(filter);
    if (values.length > 0) {
      const placeholders = values.map(() => '?').join(',');
      filters.push(`${filter} IN (${placeholders})`);
      values.push(...values);
    }
  }

  // Legacy single value filters
  for (const [key, value] of Object.entries(directFilters)) {
    if (value && !getArrayParam(key).length) {
      filters.push(`${key} = ?`);
      values.push(value);
    }
  }

  // Date range filters (support both old and new parameter names)
  const dateFrom = (searchParams.get('date_start') || searchParams.get('date_from') || '').trim();
  const dateTo = (searchParams.get('date_end') || searchParams.get('date_to') || '').trim();
  if (dateFrom) {
    filters.push('date_opening >= ?');
    values.push(dateFrom);
  }
  if (dateTo) {
    filters.push('date_opening <= ?');
    values.push(dateTo);
  }

  // Tags filter (if implemented in future)
  const tags = getArrayParam('tags');
  if (tags.length > 0) {
    // For now, tags would be stored in a separate table or as JSON
    // This is a placeholder for future implementation
    const tagPatterns = tags.map(tag => `%${tag.trim()}%`);
    const tagPlaceholders = tagPatterns.map(() => 'description LIKE ?').join(' OR ');
    filters.push(`(${tagPlaceholders})`);
    values.push(...tagPatterns);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  let rows = (await stmtTickets.listBase(where)).map((row) => hydrateTicket(row, { withAttachments: false }));

  const slaOnly = (searchParams.get('sla_breached') || '').trim();
  if (slaOnly === 'true') rows = rows.filter((ticket) => ticket.is_sla_breached);

  const agingMinRaw = searchParams.get('aging_min');
  const agingMaxRaw = searchParams.get('aging_max');
  const agingMin = agingMinRaw === null || agingMinRaw === '' ? null : Number(agingMinRaw);
  const agingMax = agingMaxRaw === null || agingMaxRaw === '' ? null : Number(agingMaxRaw);
  if (agingMin !== null && Number.isFinite(agingMin)) rows = rows.filter((ticket) => ticket.aging >= agingMin);
  if (agingMax !== null && Number.isFinite(agingMax)) rows = rows.filter((ticket) => ticket.aging <= agingMax);

  const total = rows.length;
  if (!paginate) return { tickets: rows, total, page: 1, perPage: total, totalPages: 1 };
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);
  const tickets = rows.slice((safePage - 1) * perPage, safePage * perPage);
  return { tickets, total, page: safePage, perPage, totalPages };
}

function aggregateByPeriod(rows, field, mode) {
  const groups = new Map();
  for (const row of rows) {
    if (!row[field]) continue;
    const label = periodLabel(row[field], mode);
    groups.set(label, (groups.get(label) || 0) + 1);
  }
  return Array.from(groups.entries()).map(([label, value]) => ({ label, value }));
}

function periodLabel(dateString, mode) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (mode === 'day') return date.toISOString().slice(5, 10);
  if (mode === 'month') return date.toISOString().slice(0, 7);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function countBy(rows, field, filterFn = null) {
  const counts = new Map();
  for (const row of rows) {
    if (filterFn && !filterFn(row)) continue;
    counts.set(row[field], (counts.get(row[field]) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

async function getDashboardData() {
  const all = (await query('SELECT * FROM tickets ORDER BY date_opening ASC')).map(mapTicketRow);
  const open = all.filter((ticket) => ticket.status !== 'Closed');
  const closed = all.filter((ticket) => ticket.status === 'Closed' && ticket.date_closed);

  const avgAging = open.length ? Math.round(open.reduce((sum, t) => sum + t.aging, 0) / open.length) : 0;
  const leadTimes = closed.map((ticket) => {
    const days = Math.max(0, Math.floor((Date.parse(`${ticket.date_closed}T00:00:00Z`) - Date.parse(`${ticket.date_opening}T00:00:00Z`)) / 86400000));
    return days;
  });
  const avgLeadTime = leadTimes.length ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10 : 0;
  const reopened = all.filter((t) => t.reopened_count > 0).length;
  const reopenRate = all.length ? Math.round((reopened / all.length) * 1000) / 10 : 0;
  const breachedOpen = open.filter((t) => t.is_sla_breached).length;

  return {
    totals: {
      total: all.length,
      open: open.length,
      closed: closed.length,
      avgAging,
      avgLeadTime,
      reopenRate,
      breachedOpen,
      inProgress: open.filter(t => t.status === 'In Progress').length,
      blocked: open.filter(t => t.status === 'Blocked').length,
      p1Open: open.filter(t => t.priority === 'P1 high').length,
      openedThisWeek: all.filter(t => t.date_opening && Date.parse(`${t.date_opening}T00:00:00Z`) >= Date.now() - 7 * 86400000).length,
      closedThisWeek: closed.filter(t => t.date_closed && Date.parse(`${t.date_closed}T00:00:00Z`) >= Date.now() - 7 * 86400000).length,
      resolutionRate: all.length ? Math.round(closed.length / all.length * 100) : 0,
    },
    openedByDay: aggregateByPeriod(all, 'date_opening', 'day'),
    openedByWeek: aggregateByPeriod(all, 'date_opening', 'week'),
    openedByMonth: aggregateByPeriod(all, 'date_opening', 'month'),
    closedByDay: aggregateByPeriod(closed, 'date_closed', 'day'),
    closedByWeek: aggregateByPeriod(closed, 'date_closed', 'week'),
    closedByMonth: aggregateByPeriod(closed, 'date_closed', 'month'),
    throughputWeekly: aggregateByPeriod(closed, 'date_closed', 'week').slice(-12),
    openByPriority: countBy(open, 'priority'),
    openByAssignee: countBy(open, 'assignee'),
    openByCategory: countBy(open, 'category'),
    openByManager: countBy(open, 'manager'),
    backlogAgingBuckets: [
      { label: '0-2 days', value: open.filter((t) => t.aging <= 2).length },
      { label: '3-7 days', value: open.filter((t) => t.aging >= 3 && t.aging <= 7).length },
      { label: '8-14 days', value: open.filter((t) => t.aging >= 8 && t.aging <= 14).length },
      { label: '15+ days', value: open.filter((t) => t.aging >= 15).length }
    ],
    statusBreakdown: [
      { label: 'Open', value: all.filter(t => t.status === 'Open').length },
      { label: 'In Progress', value: all.filter(t => t.status === 'In Progress').length },
      { label: 'Blocked', value: all.filter(t => t.status === 'Blocked').length },
      { label: 'Closed', value: closed.length }
    ],
    weeklyFlow: (() => {
      const weeks = 8;
      const result = [];
      for (let i = weeks - 1; i >= 0; i--) {
        const weekStart = Date.now() - (i + 1) * 7 * 86400000;
        const weekEnd = Date.now() - i * 7 * 86400000;
        const label = new Date(weekStart).toISOString().slice(5, 10);
        result.push({
          label,
          opened: all.filter(t => t.date_opening && Date.parse(`${t.date_opening}T00:00:00Z`) >= weekStart && Date.parse(`${t.date_opening}T00:00:00Z`) < weekEnd).length,
          closed: closed.filter(t => t.date_closed && Date.parse(`${t.date_closed}T00:00:00Z`) >= weekStart && Date.parse(`${t.date_closed}T00:00:00Z`) < weekEnd).length
        });
      }
      return result;
    })(),
    prevWeek: (() => {
      const now = Date.now();
      const thisStart = now - 7 * 86400000;
      const prevStart = now - 14 * 86400000;
      return {
        openedThisWeek: all.filter(t => t.date_opening && Date.parse(`${t.date_opening}T00:00:00Z`) >= prevStart && Date.parse(`${t.date_opening}T00:00:00Z`) < thisStart).length,
        closedThisWeek: closed.filter(t => t.date_closed && Date.parse(`${t.date_closed}T00:00:00Z`) >= prevStart && Date.parse(`${t.date_closed}T00:00:00Z`) < thisStart).length,
      };
    })(),
    atRisk: open
      .filter(t => t.priority === 'P1 high' || t.status === 'Blocked' || t.aging >= 10)
      .sort((a, b) => b.aging - a.aging)
      .slice(0, 6)
      .map(t => ({
        id: t.id,
        jd_ticket_number: t.jd_ticket_number || '',
        description: t.description || '',
        priority: t.priority || '',
        status: t.status || '',
        aging: t.aging || 0,
        assignee: t.assignee || ''
      })),
    sparklines: (() => {
      const now = Date.now();
      const opened = Array.from({ length: 7 }, (_, i) => {
        const dayStart = now - (6 - i) * 86400000;
        const dayEnd = dayStart + 86400000;
        return all.filter(t => t.date_opening && Date.parse(`${t.date_opening}T00:00:00Z`) >= dayStart && Date.parse(`${t.date_opening}T00:00:00Z`) < dayEnd).length;
      });
      const closedArr = Array.from({ length: 7 }, (_, i) => {
        const dayStart = now - (6 - i) * 86400000;
        const dayEnd = dayStart + 86400000;
        return closed.filter(t => t.date_closed && Date.parse(`${t.date_closed}T00:00:00Z`) >= dayStart && Date.parse(`${t.date_closed}T00:00:00Z`) < dayEnd).length;
      });
      return { opened, closed: closedArr };
    })(),
    workload: (() => {
      return [...new Set(open.map(t => t.assignee))]
        .map(a => ({
          assignee:   a,
          open:       open.filter(t => t.assignee === a && t.status === 'Open').length,
          inProgress: open.filter(t => t.assignee === a && t.status === 'In Progress').length,
          blocked:    open.filter(t => t.assignee === a && t.status === 'Blocked').length,
          total:      open.filter(t => t.assignee === a).length,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    })(),
    recentActivity: (() => {
      try {
        return db.prepare(`
          SELECT tc.id, tc.created_at, tc.author, tc.comment_type, tc.body,
                 t.jd_ticket_number, t.description, t.status, t.priority, t.id AS ticket_id
          FROM ticket_comments tc
          JOIN tickets t ON t.id = tc.ticket_id
          ORDER BY tc.created_at DESC
          LIMIT 8
        `).all();
      } catch { return []; }
    })(),
    leadTimeDistribution: [
      { label: '<1d',   value: leadTimes.filter(d => d < 1).length },
      { label: '1–3d',  value: leadTimes.filter(d => d >= 1 && d < 3).length },
      { label: '3–7d',  value: leadTimes.filter(d => d >= 3 && d < 7).length },
      { label: '7–14d', value: leadTimes.filter(d => d >= 7 && d < 14).length },
      { label: '14+d',  value: leadTimes.filter(d => d >= 14).length },
    ],
    closedByAssignee: countBy(closed, 'assignee').slice(0, 10),
    categoryTrend: (() => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const cats = [...new Set(all.map(t => t.category).filter(Boolean))];
      return cats.map(cat => {
        const catAll = all.filter(t => t.category === cat);
        const thisMonth = catAll.filter(t => t.date_opening && Date.parse(`${t.date_opening}T00:00:00Z`) >= thisMonthStart).length;
        const prevMonth = catAll.filter(t => t.date_opening && Date.parse(`${t.date_opening}T00:00:00Z`) >= prevMonthStart && Date.parse(`${t.date_opening}T00:00:00Z`) < thisMonthStart).length;
        return { label: cat, thisMonth, prevMonth };
      }).filter(r => r.thisMonth > 0 || r.prevMonth > 0).sort((a, b) => (b.thisMonth + b.prevMonth) - (a.thisMonth + a.prevMonth)).slice(0, 8);
    })(),
  };
}

const DATE_HEADERS = new Set(['date_opening', 'date_closed', 'due_date']);

function isoToDmy(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(value);
}

function toCsv(rows) {
  const headers = ['id', 'jd_ticket_number', 'description', 'category', 'priority', 'status', 'assignee', 'manager', 'date_opening', 'date_closed', 'due_date', 'aging', 'is_sla_breached'];
  const lines = ['﻿' + headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(DATE_HEADERS.has(header) ? isoToDmy(row[header]) : row[header])).join(','));
  }
  return lines.join('\n');
}

function csvCell(value) {
  const raw = value == null ? '' : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

async function logAudit(entityType, entityId, action, actor, details) {
  await stmtAudit.insert(entityType, entityId ?? null, action, actor, JSON.stringify(details || {}));
}

function redactWebhook(hook) {
  return {
    id: hook.id,
    name: hook.name,
    url: hook.url,
    active: hook.active,
    has_secret: Boolean(hook.secret_encrypted),
    created_at: hook.created_at,
    updated_at: hook.updated_at
  };
}

async function validateWebhookUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpError(400, 'Webhook URL is invalid.');
  }
  if (parsed.protocol !== 'https:') {
    throw new HttpError(400, 'Webhook URL must use HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new HttpError(400, 'Webhook URL cannot contain embedded credentials.');
  }
  const hostname = parsed.hostname.toLowerCase();
  if (WEBHOOK_ALLOWLIST.length && !WEBHOOK_ALLOWLIST.includes(hostname)) {
    throw new HttpError(400, 'Webhook host is not included in the allowlist.');
  }
  const { address } = await lookup(hostname);
  if (isPrivateAddress(address)) {
    throw new HttpError(400, 'Webhook host resolves to a private or restricted network address.');
  }
  return parsed.toString();
}

function isPrivateAddress(address) {
  if (address === '127.0.0.1' || address === '0.0.0.0' || address === '::1') return true;
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true;
  if (/^169\.254\./.test(address) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return true;
  if (/^(fc|fd|fe80)/i.test(address)) return true;
  return false;
}

async function emitWebhooks(eventName, payload) {
  const webhooks = await stmtWebhooks.active();
  if (!webhooks.length) return;

  for (const hook of webhooks) {
    const requestId = randomUUID();
    const startedAt = Date.now();
    let responseStatus = null;
    let errorMessage = null;
    let success = 0;
    try {
      const secret = decryptSecret(hook.secret_encrypted);
      const body = JSON.stringify({ event: eventName, request_id: requestId, sent_at: new Date().toISOString(), payload });
      const headers = { 'Content-Type': 'application/json' };
      if (secret) {
        headers['X-Ticket-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
      }
      const timeout = AbortSignal.timeout(WEBHOOK_TIMEOUT_MS);
      const response = await fetch(hook.url, { method: 'POST', headers, body, signal: timeout });
      responseStatus = response.status;
      success = response.ok ? 1 : 0;
      if (!response.ok) errorMessage = `HTTP ${response.status}`;
    } catch (error) {
      errorMessage = error?.message || 'Delivery failed.';
    }
    await stmtWebhooks.logDelivery(hook.id, eventName, responseStatus, success, Date.now() - startedAt, requestId, errorMessage);
  }
}

async function sendEmail(to, subject, body) {
  if (!SMTP_HOST || !to) return;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('SMTP timeout')), 15000);
    const lines = [];
    let socket;
    let tlsSocket;
    let step = 0;

    const send = (line) => {
      const s = tlsSocket || socket;
      if (s) s.write(line + '\r\n');
    };

    const message = [
      `From: ${SMTP_FROM}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body
    ].join('\r\n');

    const handleData = (data) => {
      const response = data.toString();
      const code = parseInt(response.slice(0, 3), 10);
      if (SMTP_SECURE) {
        // Direct TLS flow
        if (step === 0 && code === 220) { step = 1; send(`EHLO localhost`); }
        else if (step === 1 && code === 250) { step = 2; send(`AUTH LOGIN`); }
        else if (step === 2 && code === 334) { step = 3; send(Buffer.from(SMTP_USER).toString('base64')); }
        else if (step === 3 && code === 334) { step = 4; send(Buffer.from(SMTP_PASS).toString('base64')); }
        else if (step === 4 && code === 235) { step = 5; send(`MAIL FROM:<${SMTP_FROM.match(/<(.+)>/)?.[1] || SMTP_FROM}>`); }
        else if (step === 5 && code === 250) { step = 6; send(`RCPT TO:<${to}>`); }
        else if (step === 6 && code === 250) { step = 7; send(`DATA`); }
        else if (step === 7 && code === 354) { step = 8; send(message + '\r\n.'); }
        else if (step === 8 && code === 250) { step = 9; send(`QUIT`); clearTimeout(timeout); resolve(); }
        else if (code >= 400) { clearTimeout(timeout); reject(new Error(`SMTP error ${code}: ${response.slice(4).trim()}`)); }
      } else {
        // STARTTLS flow
        if (step === 0 && code === 220) { step = 1; send(`EHLO localhost`); }
        else if (step === 1 && code === 250) { step = 2; send(`STARTTLS`); }
        else if (step === 2 && code === 220) {
          step = 3;
          tlsSocket = tlsConnect({ socket, servername: SMTP_HOST, rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED });
          tlsSocket.on('data', handleData);
          tlsSocket.on('error', (e) => { clearTimeout(timeout); reject(e); });
          send(`EHLO localhost`);
        }
        else if (step === 3 && code === 250) { step = 4; send(`AUTH LOGIN`); }
        else if (step === 4 && code === 334) { step = 5; send(Buffer.from(SMTP_USER).toString('base64')); }
        else if (step === 5 && code === 334) { step = 6; send(Buffer.from(SMTP_PASS).toString('base64')); }
        else if (step === 6 && code === 235) { step = 7; send(`MAIL FROM:<${SMTP_FROM.match(/<(.+)>/)?.[1] || SMTP_FROM}>`); }
        else if (step === 7 && code === 250) { step = 8; send(`RCPT TO:<${to}>`); }
        else if (step === 8 && code === 250) { step = 9; send(`DATA`); }
        else if (step === 9 && code === 354) { step = 10; send(message + '\r\n.'); }
        else if (step === 10 && code === 250) { step = 11; send(`QUIT`); clearTimeout(timeout); resolve(); }
        else if (code >= 400) { clearTimeout(timeout); reject(new Error(`SMTP error ${code}: ${response.slice(4).trim()}`)); }
      }
    };

    if (SMTP_SECURE) {
      tlsSocket = tlsConnect(SMTP_PORT, SMTP_HOST, { rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED });
      tlsSocket.on('data', handleData);
      tlsSocket.on('error', (e) => { clearTimeout(timeout); reject(e); });
    } else {
      socket = createConnection(SMTP_PORT, SMTP_HOST);
      socket.on('data', handleData);
      socket.on('error', (e) => { clearTimeout(timeout); reject(e); });
    }
  });
}

async function getUserEmail(name) {
  const user = await stmtUsers.byName(name);
  return user?.email || null;
}

function buildTicketEmailBody(ticket) {
  return [
    `Ticket #${ticket.id} — ${ticket.jd_ticket_number}`,
    ``,
    `Description: ${ticket.description}`,
    `Category:    ${ticket.category}`,
    `Priority:    ${ticket.priority}`,
    `Status:      ${ticket.status}`,
    `Assignee:    ${ticket.assignee}`,
    `Manager:     ${ticket.manager}`,
    `Due date:    ${ticket.due_date || 'N/A'}`,
    ``,
    `Open in your ticket tracker to view details and add comments.`
  ].join('\n');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

async function serveStatic(requestPath, response) {
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const normalized = normalize(safePath).replace(/^([.][.][/\\])+/, '');
  const candidates = [join(ROOT, normalized), join(ROOT, 'public', normalized)];

  for (const filePath of candidates) {
    if (!filePath.startsWith(ROOT)) continue;
    try {
      const fileInfo = await stat(filePath);
      if (!fileInfo.isFile()) continue;
      response.writeHead(200, securityHeaders({ 'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' }));
      createReadStream(filePath).pipe(response);
      return;
    } catch {
      // try next candidate
    }
  }
  sendText(response, 404, 'Not found');
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const ip = getClientIp(request);
  const bucket = getRateBucket(request.method, url.pathname);
  if (consumeRateLimit(ip, bucket)) {
    sendJson(response, 429, { error: 'Too many requests. Try again shortly.' });
    return;
  }

  const auth = authFromRequest(request);
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method || '');

  try {
    if (isMutation && url.pathname && !url.pathname.startsWith('/api/auth/login')) {
      assertCsrf(request, auth);
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const payload = await readRequestBody(request);
      const name = String(payload.name || '').trim();
      const password = String(payload.password || '').trim();
      
      if (!name || !password) {
        throw new HttpError(400, 'User name and password are required.');
      }
      
      const user = await stmtUsers.byName(name);
      if (!user || user.active !== 1) {
        throw new HttpError(401, 'Invalid credentials.');
      }
      
      // NO ACCOUNT LOCKING - Simple login validation
      const validModern = verifyPassword(password, user.auth_secret_hash);
      const validLegacy = !validModern && !!user.auth_pin_hash && user.auth_pin_hash === hashLegacyPin(password);
      
      if (!validModern && !validLegacy) {
        // Just log the failed attempt without blocking
        console.log(`[login-failed] User: ${name}, IP: ${ip}`);
        throw new HttpError(401, 'Invalid credentials.');
      }
      
      // Upgrade legacy password hash if needed
      if (validLegacy) {
        try {
          await stmtUsers.setSecret(hashPassword(password), 1, user.id);
        } catch (error) {
          console.error('[password-upgrade]', error);
          // Continue with login even if upgrade fails
        }
      }
      
      const refreshedUser = await stmtUsers.byId(user.id);
      const remember = !!payload.remember;
      const sessionId = randomUUID();
      const csrf = randomBytes(24).toString('hex');
      const durationMs = remember ? REMEMBER_ME_DAYS * 24 * 3600 * 1000 : SESSION_DURATION_MS;
      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      
      await stmtSessions.insert(sessionId, refreshedUser.id, csrf, expiresAt);
      await logAudit('session', refreshedUser.id, 'login', refreshedUser.name, { ip });
      
      const cookieMaxAge = remember ? REMEMBER_ME_DAYS * 24 * 3600 : null;
      sendJson(
        response,
        200,
        {
          user: { id: refreshedUser.id, name: refreshedUser.name, role: refreshedUser.role },
          csrf_token: csrf,
          password_reset_required: Boolean(refreshedUser.password_reset_required)
        },
        { 'Set-Cookie': buildSessionCookie(sessionId, cookieMaxAge) }
      );
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/change-password') {
      assertRole(auth, 'user');
      const payload = await readRequestBody(request);
      const currentPassword = String(payload.current_password || '').trim();
      const newPassword = String(payload.new_password || '').trim();
      validatePassword(newPassword);
      const user = await stmtUsers.byId(auth.userId);
      const validModern = verifyPassword(currentPassword, user.auth_secret_hash);
      const validLegacy = !validModern && !!user.auth_pin_hash && user.auth_pin_hash === hashLegacyPin(currentPassword);
      if (!validModern && !validLegacy) throw new HttpError(401, 'Current password is incorrect.');
      if (currentPassword === newPassword) throw new HttpError(400, 'The new password must be different from the current password.');
      await stmtUsers.setSecret(hashPassword(newPassword), 0, auth.userId);
      await stmtSessions.deleteByUser(auth.userId);
      await logAudit('user', auth.userId, 'password_changed', auth.name, {});
      sendJson(response, 200, { success: true, message: 'Password updated. Please sign in again.' }, { 'Set-Cookie': buildSessionCookie('', 0) });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      if (auth) {
        await stmtSessions.delete(auth.sessionId);
        await logAudit('session', auth.userId, 'logout', auth.name, { ip });
      }
      sendJson(response, 200, { success: true }, { 'Set-Cookie': buildSessionCookie('', 0) });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/auth/me') {
      if (!auth) {
        throw new HttpError(401, 'Not authenticated.');
      }
      sendJson(response, 200, {
        user: { id: auth.userId, name: auth.name, role: auth.role },
        csrf_token: auth.csrfToken,
        password_reset_required: auth.passwordResetRequired
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, {
        status: 'ok',
        now: new Date().toISOString(),
        uptime_seconds: Math.round(process.uptime()),
        db: {
          users: (await getUsers()).length,
          tickets: (await query('SELECT COUNT(*) AS count FROM tickets'))[0].count
        }
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/metrics') {
      assertRole(auth, 'manager');
      sendJson(response, 200, {
        process_uptime_seconds: Math.round(process.uptime()),
        memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        rate_limit_buckets: rateLimits.size,
        sessions_active: (await query('SELECT COUNT(*) AS count FROM session_tokens'))[0].count
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/meta') {
      assertRole(auth, 'user');
      sendJson(response, 200, {
        categories: CATEGORIES,
        priorities: PRIORITIES,
        statuses: STATUSES,
        commentTypes: COMMENT_TYPES,
        users: await getAllowedAssignees(),
        managers: await getManagers(),
        commentAuthors: await getCommentAuthors(),
        roles: USER_ROLES,
        password_policy: {
          min_length: DEFAULT_PASSWORD_MIN_LENGTH,
          requires_uppercase: true,
          requires_lowercase: true,
          requires_number: true
        },
        current_user: { name: auth.name, role: auth.role }
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/users') {
      assertRole(auth, 'manager');
      sendJson(response, 200, { users: await getUsers() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/users') {
      assertRole(auth, 'admin');
      const payload = await normalizeUserInput(await readRequestBody(request));
      const secretHash = payload.secretHash || hashPassword(DEFAULT_SEED_PASSWORD);
      const passwordResetRequired = payload.secretHash ? payload.passwordResetRequired : 1;
      await stmtUsers.insert(payload.name, payload.role, payload.active, secretHash, passwordResetRequired, payload.email || '');
      const user = await stmtUsers.byName(payload.name);
      if (!user) throw new HttpError(409, 'User creation failed.');
      await logAudit('user', user.id, 'create', auth.name, { name: user.name, role: user.role, active: user.active });
      sendJson(response, 201, { user: { id: user.id, name: user.name, role: user.role, active: user.active, password_reset_required: !!user.password_reset_required } });
      return;
    }

    if (request.method === 'PUT' && url.pathname && url.pathname.startsWith('/api/users/')) {
      assertRole(auth, 'admin');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid user id.');
      const current = await stmtUsers.byId(id);
      if (!current) throw new HttpError(404, 'User not found.');
      const payload = await normalizeUserInput(await readRequestBody(request), current.name);
      const nextResetRequired = payload.secretHash ? payload.passwordResetRequired : current.password_reset_required;
      await stmtUsers.update(payload.name, payload.role, payload.active, payload.secretHash, nextResetRequired, payload.email || '', id);
      if (payload.secretHash) await stmtSessions.deleteByUser(id);
      await logAudit('user', id, 'update', auth.name, { before: { name: current.name, role: current.role, active: current.active }, after: { name: payload.name, role: payload.role, active: payload.active, password_reset_required: nextResetRequired } });
      const user = await stmtUsers.byId(id);
      sendJson(response, 200, { user: { id: user.id, name: user.name, role: user.role, active: user.active, password_reset_required: !!user.password_reset_required } });
      return;
    }

    if (request.method === 'DELETE' && url.pathname && url.pathname.startsWith('/api/users/')) {
      assertRole(auth, 'admin');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid user id.');
      const current = await stmtUsers.byId(id);
      if (!current) throw new HttpError(404, 'User not found.');
      const used = (await query('SELECT id FROM tickets WHERE assignee = ? OR manager = ? LIMIT 1', [current.name, current.name])).length > 0;
      if (used) throw new HttpError(409, 'Cannot delete a user assigned to existing tickets.');
      await stmtUsers.delete(id);
      await stmtSessions.deleteByUser(id);
      await logAudit('user', id, 'delete', auth.name, { name: current.name });
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/views') {
      assertRole(auth, 'user');
      const views = (await stmtFilters.listByUser(auth.userId)).map((view) => ({ ...view, filter_json: JSON.parse(view.filter_json) }));
      sendJson(response, 200, { views });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/views') {
      assertRole(auth, 'user');
      const payload = await readRequestBody(request);
      const name = String(payload.name || '').trim();
      if (!name) throw new HttpError(400, 'View name is required.');
      const filter = payload.filter || {};
      await stmtFilters.insert(auth.userId, name, JSON.stringify(filter));
      const views = await stmtFilters.listByUser(auth.userId);
      const newView = views.find(v => v.name === name);
      if (!newView) throw new HttpError(500, 'View creation failed.');
      sendJson(response, 201, { id: newView.id });
      return;
    }

    if (request.method === 'DELETE' && url.pathname && url.pathname.startsWith('/api/views/')) {
      assertRole(auth, 'user');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid view id.');
      await stmtFilters.delete(id, auth.userId);
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/audit') {
      assertRole(auth, 'manager');
      const entityType = (url.searchParams.get('entity_type') || '').trim() || null;
      const entityIdValue = (url.searchParams.get('entity_id') || '').trim();
      const entityId = entityIdValue ? Number(entityIdValue) : null;
      const rows = (await stmtAudit.list(entityType, entityId)).map((row) => ({ ...row, details_json: JSON.parse(row.details_json) }));
      sendJson(response, 200, { events: rows });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/import-history') {
      assertRole(auth, 'manager');
      const batches = await query('SELECT id, batch_name, imported_by, file_name, row_count, created_count, error_count, rolled_back, rolled_back_at, created_at FROM import_batches ORDER BY id DESC LIMIT 100');
      sendJson(response, 200, { batches });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/webhooks') {
      assertRole(auth, 'admin');
      sendJson(response, 200, { webhooks: (await stmtWebhooks.list()).map(redactWebhook) });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/webhooks/deliveries') {
      assertRole(auth, 'admin');
      sendJson(response, 200, { deliveries: await stmtWebhooks.deliveries() });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/webhooks') {
      assertRole(auth, 'admin');
      const payload = normalizeWebhookInput(await readRequestBody(request));
      const webhookUrl = await validateWebhookUrl(payload.webhookUrl);
      const secretEncrypted = payload.secret ? encryptSecret(payload.secret) : null;
      await stmtWebhooks.insert(payload.name, webhookUrl, secretEncrypted, payload.active);
      const webhooks = await stmtWebhooks.list();
      const newWebhook = webhooks.find(w => w.name === payload.name);
      if (!newWebhook) throw new HttpError(500, 'Webhook creation failed.');
      await logAudit('webhook', newWebhook.id, 'create', auth.name, { name: payload.name, url: webhookUrl, active: payload.active });
      sendJson(response, 201, { id: newWebhook.id });
      return;
    }

    if (request.method === 'PUT' && url.pathname && url.pathname.startsWith('/api/webhooks/')) {
      assertRole(auth, 'admin');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid webhook id.');
      const current = await stmtWebhooks.byId(id);
      if (!current) throw new HttpError(404, 'Webhook not found.');
      const payload = normalizeWebhookInput(await readRequestBody(request));
      const webhookUrl = await validateWebhookUrl(payload.webhookUrl);
      const secretEncrypted = payload.secret ? encryptSecret(payload.secret) : current.secret_encrypted;
      await stmtWebhooks.update(payload.name, webhookUrl, secretEncrypted, payload.active, id);
      await logAudit('webhook', id, 'update', auth.name, { before: { name: current.name, url: current.url, active: current.active }, after: { name: payload.name, url: webhookUrl, active: payload.active } });
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'POST' && url.pathname.match(/^\/api\/webhooks\/\d+\/test$/)) {
      assertRole(auth, 'admin');
      const id = Number(url.pathname.split('/')[3]);
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid webhook id.');
      const hook = await stmtWebhooks.byId(id);
      if (!hook) throw new HttpError(404, 'Webhook not found.');
      await emitWebhooks('webhook.test', { webhook_id: id, initiated_by: auth.name, note: 'Manual test event.' });
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'DELETE' && url.pathname && url.pathname.startsWith('/api/webhooks/')) {
      assertRole(auth, 'admin');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid webhook id.');
      const current = await stmtWebhooks.byId(id);
      if (!current) throw new HttpError(404, 'Webhook not found.');
      await stmtWebhooks.delete(id);
      await logAudit('webhook', id, 'delete', auth.name, { name: current.name, url: current.url });
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/tickets') {
      assertRole(auth, 'user');
      sendJson(response, 200, await listTickets(url.searchParams));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/tickets/export') {
      assertRole(auth, 'user');
      const result = await listTickets(url.searchParams, { paginate: false });
      sendText(response, 200, toCsv(result.tickets), {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tickets-${formatIsoDate(Date.now())}.csv"`
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/tickets/import-template') {
      assertRole(auth, 'manager');
      const headers = ['description', 'jd_ticket_number', 'category', 'priority', 'status', 'assignee', 'manager', 'date_opening', 'date_closed', 'updates_comments'];
      const exampleRow = [
        'Example issue description',
        '6914999',
        CATEGORIES[0],
        'P2 medium',
        'Open',
        (await getAllowedAssignees())[0] || 'Samuel',
        (await getManagers())[0] || 'Adriano',
        formatIsoDate(Date.now()),
        '',
        'Opening context for the ticket.'
      ];
      const csv = [headers.join(','), exampleRow.map(csvCell).join(',')].join('\n');
      sendText(response, 200, csv, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ticket-import-template.csv"'
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/tickets/bulk') {
      assertRole(auth, 'manager');
      const payload = await readRequestBody(request, MAX_BULK_BODY_BYTES);
      const rows = Array.isArray(payload.tickets) ? payload.tickets : [];
      if (!rows.length) throw new HttpError(400, 'No tickets provided.');
      if (rows.length > 500) throw new HttpError(400, 'Maximum 500 tickets per import.');
      const batchName = String(payload.batch_name || `Import ${formatIsoDate(Date.now())}`).trim().slice(0, 200);
      const fileName = String(payload.file_name || '').trim().slice(0, 255);

      await stmtImport.insertBatch(batchName, auth.name, fileName, rows.length, 0, 0);
      const batches = await stmtImport.listBatches();
      const batch = batches.find(b => b.batch_name === batchName);
      const batchId = batch.id;
      const createdIds = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const allAssignees = await getAllowedAssignees();
          const allManagers = await getManagers();
          const preprocessed = {
            ...row,
            status:   STATUSES.includes(String(row.status || '').trim())   ? String(row.status).trim()   : 'Open',
            priority: PRIORITIES.includes(String(row.priority || '').trim()) ? String(row.priority).trim() : 'P3 low',
            category: CATEGORIES.includes(String(row.category || '').trim()) ? String(row.category).trim() : CATEGORIES[0],
            assignee: allAssignees.includes(String(row.assignee || '').trim()) ? String(row.assignee).trim() : (allAssignees[0] || ''),
            manager:  allManagers.includes(String(row.manager || '').trim())  ? String(row.manager).trim()  : (allManagers[0] || ''),
          };
          const ticket = normalizeTicketInput(preprocessed);
          const existing = (await query('SELECT id FROM tickets WHERE jd_ticket_number = ?', [ticket.jd_ticket_number])).length > 0;
          if (existing) {
            errors.push({ row: i + 1, jd_ticket_number: ticket.jd_ticket_number, message: `Duplicate: JD ${ticket.jd_ticket_number} already exists.` });
            continue;
          }
          const due = calculateDueDate(ticket.date_opening, ticket.priority);
          await stmtTickets.insert(
            ticket.description, ticket.jd_ticket_number, ticket.category, ticket.updates_comments,
            ticket.priority, ticket.date_opening, ticket.date_closed, ticket.status,
            ticket.assignee, ticket.manager, due
          );
          const newTicket = await stmtTickets.listBase(`WHERE jd_ticket_number = '${ticket.jd_ticket_number}'`);
          const newId = newTicket[0].id;
          if (ticket.updates_comments) await stmtComments.insert(newId, ticket.assignee, 'Update', ticket.updates_comments);
          createdIds.push(newId);
        } catch (error) {
          errors.push({ row: i + 1, jd_ticket_number: String(row.jd_ticket_number || ''), message: error instanceof HttpError ? error.message : 'Validation error.' });
        }
      }

      if (createdIds.length) {
        const placeholders = createdIds.map(() => '?').join(',');
        await query(`UPDATE tickets SET batch_id = ? WHERE id IN (${placeholders})`, [batchId, ...createdIds]);
      }
      await stmtImport.updateBatch(createdIds.length, errors.length, batchId);
      await logAudit('import_batch', batchId, 'bulk_import', auth.name, {
        batch_name: batchName, file_name: fileName, row_count: rows.length,
        created: createdIds.length, errors: errors.length
      });
      for (const id of createdIds) {
        const row = await stmtTickets.byId(id);
        if (row) emitWebhooks('ticket.created', await hydrateTicket(row)).catch(() => {});
      }
      sendJson(response, 201, { batch_id: batchId, created: createdIds.length, skipped: errors.length, errors, total: rows.length });
      return;
    }

    // GET /api/tickets/:id/attachments/:attachmentId — download (must be before the generic GET /api/tickets/:id route)
    if (request.method === 'GET' && RE_ATTACHMENT_ITEM_PATH.test(url.pathname)) {
      assertRole(auth, 'user');
      const parts = url.pathname.split('/');
      const ticketId = Number(parts[3]);
      const attachmentId = Number(parts[5]);
      const attachment = await stmtAttachments.byId(attachmentId, ticketId);
      if (!attachment) throw new HttpError(404, 'Attachment not found.');
      response.writeHead(200, securityHeaders({
        'Content-Type': attachment.mimetype,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': String(attachment.size_bytes),
        'Cache-Control': 'private, max-age=3600'
      }));
      createReadStream(attachment.storage_path).pipe(response);
      return;
    }

    if (request.method === 'GET' && url.pathname && url.pathname.startsWith('/api/tickets/') && !url.pathname.endsWith('/comments')) {
      assertRole(auth, 'user');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid ticket id.');
      const row = await stmtTickets.byId(id);
      if (!row) throw new HttpError(404, 'Ticket not found.');
      sendJson(response, 200, { ticket: await hydrateTicket(row) });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/tickets') {
      assertRole(auth, 'user'); // Allow all users to create tickets
      const payload = await normalizeTicketInput(await readRequestBody(request));
      const due = calculateDueDate(payload.date_opening, payload.priority);
      
      // Check for duplicate ticket number first
      const existing = await stmtTickets.listBase(`WHERE jd_ticket_number = ?`, [payload.jd_ticket_number]);
      if (existing.length > 0) {
        throw new HttpError(409, `Ticket with number ${payload.jd_ticket_number} already exists.`);
      }
      
      // Insert the ticket with proper error handling
      try {
        await stmtTickets.insert(
          payload.description,
          payload.jd_ticket_number,
          payload.category,
          payload.updates_comments,
          payload.priority,
          payload.date_opening,
          payload.date_closed,
          payload.status,
          payload.assignee,
          payload.manager,
          due
        );
        
        // Get the newly created ticket
        const newTicket = await stmtTickets.listBase(`WHERE jd_ticket_number = ?`, [payload.jd_ticket_number]);
        if (!newTicket.length) {
          throw new HttpError(500, 'Failed to retrieve created ticket.');
        }
        
        const row = newTicket[0];
        if (payload.updates_comments) {
          await stmtComments.insert(row.id, payload.assignee, 'Update', payload.updates_comments);
        }
        
        const ticket = await hydrateTicket(row);
        await logAudit('ticket', ticket.id, 'create', auth.name, { description: ticket.description, status: ticket.status, priority: ticket.priority });
        await emitWebhooks('ticket.created', ticket);
        
        const assigneeEmail = await getUserEmail(ticket.assignee);
        if (assigneeEmail) {
          sendEmail(assigneeEmail, `[New Ticket #${ticket.id}] ${ticket.description.slice(0, 60)}`, buildTicketEmailBody(ticket)).catch(e => console.error('[email]', e.message));
        }
        
        sendJson(response, 201, { ticket });
        return;
      } catch (error) {
        console.error('[ticket-creation]', error);
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError(500, 'Failed to create ticket. Please try again.');
      }
    }

    if (request.method === 'PUT' && url.pathname && url.pathname.startsWith('/api/tickets/') && !url.pathname.endsWith('/comments')) {
      assertRole(auth, 'user'); // Allow all users to update tickets
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid ticket id.');
      const current = await stmtTickets.byId(id);
      if (!current) throw new HttpError(404, 'Ticket not found.');
      
      // Users can only update tickets they are assigned to, managers can update any
      if (auth.role !== 'manager' && auth.role !== 'admin' && current.assignee !== auth.name) {
        throw new HttpError(403, 'You can only update tickets assigned to you.');
      }
      
      const payload = await normalizeTicketInput(await readRequestBody(request));
      validateStatusTransition(current.status, payload.status, auth.role);
      const dueDate = calculateDueDate(payload.date_opening, payload.priority);
      const reopened = payload.status === 'Open' && current.status === 'Closed' ? Number(current.reopened_count || 0) + 1 : Number(current.reopened_count || 0);
      await stmtTickets.update(
        payload.description,
        payload.jd_ticket_number,
        payload.category,
        payload.updates_comments,
        payload.priority,
        payload.date_opening,
        payload.date_closed,
        payload.status,
        payload.assignee,
        payload.manager,
        dueDate,
        reopened,
        id
      );
      const row = await stmtTickets.byId(id);
      const ticket = await hydrateTicket(row);
      await logAudit('ticket', ticket.id, 'update', auth.name, { before: { status: current.status, assignee: current.assignee, manager: current.manager }, after: { status: payload.status, assignee: payload.assignee, manager: payload.manager } });
      await emitWebhooks('ticket.updated', ticket);
      if (current.status !== payload.status) await stmtComments.insert(id, auth.name, 'System', `Status changed: ${current.status} -> ${payload.status}`);
      if (current.priority !== payload.priority) await stmtComments.insert(id, auth.name, 'System', `Priority changed: ${current.priority} -> ${payload.priority}`);
      if (current.assignee !== payload.assignee) await stmtComments.insert(id, auth.name, 'System', `Assignee changed: ${current.assignee} -> ${payload.assignee}`);
      if (current.assignee !== payload.assignee) {
        const newAssigneeEmail = await getUserEmail(ticket.assignee);
        if (newAssigneeEmail) sendEmail(newAssigneeEmail, `[Assigned to you #${ticket.id}] ${ticket.description.slice(0, 60)}`, buildTicketEmailBody(ticket)).catch(e => console.error('[email]', e.message));
      }
      if (current.status !== payload.status) {
        const managerEmail = await getUserEmail(ticket.manager);
        if (managerEmail) sendEmail(managerEmail, `[Status changed #${ticket.id}] ${current.status} → ${ticket.status}`, buildTicketEmailBody(ticket)).catch(e => console.error('[email]', e.message));
      }
      sendJson(response, 200, { ticket });
      return;
    }

    if (request.method === 'DELETE' && url.pathname && url.pathname.startsWith('/api/tickets/')) {
      assertRole(auth, 'manager'); // Only managers and admins can delete tickets
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid ticket id.');
      const exists = await stmtTickets.byId(id);
      if (!exists) throw new HttpError(404, 'Ticket not found.');
      await stmtTickets.delete(id);
      await logAudit('ticket', id, 'delete', auth.name, { jd_ticket_number: exists.jd_ticket_number });
      await emitWebhooks('ticket.deleted', { id, jd_ticket_number: exists.jd_ticket_number });
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'POST' && url.pathname.match(/^\/api\/tickets\/\d+\/comments$/)) {
      assertRole(auth, 'user');
      const id = Number(url.pathname.split('/')[3]);
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid ticket id.');
      const exists = await stmtTickets.byId(id);
      if (!exists) throw new HttpError(404, 'Ticket not found.');
      const payload = await normalizeCommentInput(await readRequestBody(request));
      await stmtComments.insert(id, payload.author, payload.comment_type, payload.body);
      await query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      const comments = await query('SELECT id, ticket_id, author, comment_type, body, created_at FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
      const comment = comments[0];
      await logAudit('ticket_comment', id, 'create', auth.name, { comment_id: comment.id, author: comment.author, comment_type: comment.comment_type });
      await emitWebhooks('ticket.comment.created', comment);
      sendJson(response, 201, { comment });
      return;
    }

    if (request.method === 'DELETE' && url.pathname.match(/^\/api\/import-history\/\d+$/)) {
      assertRole(auth, 'admin');
      const id = Number(url.pathname.split('/').pop());
      if (!Number.isInteger(id)) throw new HttpError(400, 'Invalid batch id.');
      const batch = await stmtImport.batchById(id);
      if (!batch) throw new HttpError(404, 'Import batch not found.');
      const { count } = await stmtImport.countByBatch(id);
      await stmtImport.deleteBatchTickets(id);
      await stmtImport.deleteBatch(id);
      await logAudit('import_batch', id, 'rollback', auth.name, { batch_name: batch.batch_name, tickets_deleted: count });
      sendJson(response, 200, { success: true, tickets_deleted: count });
      return;
    }

    // POST /api/tickets/:id/attachments — upload (base64 JSON body)
    if (request.method === 'POST' && RE_ATTACHMENT_PATH.test(url.pathname)) {
      assertRole(auth, 'user');
      const ticketId = Number(url.pathname.split('/')[3]);
      const exists = await stmtTickets.byId(ticketId);
      if (!exists) throw new HttpError(404, 'Ticket not found.');
      const payload = await readRequestBody(request, MAX_ATTACHMENT_BODY_BYTES);
      const filename = String(payload.filename || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
      const mimetype = String(payload.mimetype || '').trim();
      const data = String(payload.data || '');
      if (!filename) throw new HttpError(400, 'Filename is required.');
      if (!ALLOWED_ATTACHMENT_TYPES.includes(mimetype)) throw new HttpError(400, `File type not allowed: ${mimetype}`);
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > 8 * 1024 * 1024) throw new HttpError(400, 'File too large (max 8 MB).');
      const storageName = `${randomUUID()}-${filename}`;
      const storagePath = join(DATA_DIR, 'uploads', storageName);
      await writeFile(storagePath, buffer);
      await stmtAttachments.insert(ticketId, filename, mimetype, buffer.length, storagePath, auth.name);
      const attachments = await stmtAttachments.listByTicket(ticketId);
      const newAttachment = attachments.find(a => a.filename === filename);
      await logAudit('ticket_attachment', ticketId, 'upload', auth.name, { filename, mimetype, size_bytes: buffer.length });
      sendJson(response, 201, { id: newAttachment.id, ticket_id: ticketId, filename, mimetype, size_bytes: buffer.length, uploaded_by: auth.name });
      return;
    }

    // DELETE /api/tickets/:id/attachments/:attachmentId
    if (request.method === 'DELETE' && RE_ATTACHMENT_ITEM_PATH.test(url.pathname)) {
      assertRole(auth, 'manager'); // Only managers and admins can delete attachments
      const parts = url.pathname.split('/');
      const ticketId = Number(parts[3]);
      const attachmentId = Number(parts[5]);
      const attachment = await stmtAttachments.byId(attachmentId, ticketId);
      if (!attachment) throw new HttpError(404, 'Attachment not found.');
      await unlink(attachment.storage_path).catch((e) => { if (e.code !== 'ENOENT') console.error('[attachment:delete]', e.message); });
      await stmtAttachments.delete(attachmentId, ticketId);
      await logAudit('ticket_attachment', ticketId, 'delete', auth.name, { filename: attachment.filename });
      sendJson(response, 200, { success: true });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/dashboard') {
      assertRole(auth, 'user');
      sendJson(response, 200, await getDashboardData());
      return;
    }

    if (request.method === 'GET') {
      await serveStatic(url.pathname, response);
      return;
    }

    sendText(response, 405, 'Method not allowed');
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    if (!(error instanceof HttpError)) {
      console.error('[server-error]', error);
    }
    sendJson(response, statusCode, { error: error.message || 'Unexpected error' });
  }
});

server.listen(PORT, () => {
  console.log(`Ticket app running on http://localhost:${PORT}`);
});

async function gracefulShutdown(signal) {
  console.log(`${signal} received — closing MySQL connection`);
  try {
    if (pool) {
      await pool.end();
    }
  } catch (err) {
    console.error('Error during DB shutdown:', err.message);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
