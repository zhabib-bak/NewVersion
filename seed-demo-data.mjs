import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import mysql from 'mysql2/promise';

const DEFAULT_PASSWORD = 'ChangeMe!2026';
const DEMO_JD_START = 7001001;
const DEMO_TICKET_COUNT = 56;

const USERS = [
  { name: 'Chandra', role: 'user' },
  { name: 'Nicoleta', role: 'user' },
  { name: 'Loan', role: 'user' },
  { name: 'Samuel', role: 'user' },
  { name: 'Mohamad', role: 'user' },
  { name: 'Ana', role: 'user' },
  { name: 'Andrea', role: 'user' },
  { name: 'Alexandra', role: 'user' },
  { name: 'Radulesco', role: 'user' },
  { name: 'Oliwia', role: 'user' },
  { name: 'Madalin', role: 'user' },
  { name: 'Adriano', role: 'manager' },
  { name: 'Zacarias', role: 'manager' },
  { name: 'Jawad', role: 'admin' }
];

const ASSIGNEES = USERS.filter((user) => user.role === 'user').map((user) => user.name);
const MANAGERS = USERS.filter((user) => user.role !== 'user').map((user) => user.name);
const CATEGORIES = ['administrative', 'change request', 'CR', 'Inbound', 'Outbound', 'Inventory', 'WMS', 'UCS', 'Scada', 'Skyfall', 'PIN', 'Toting', 'Shuttle'];
const PRIORITIES = ['P1 high', 'P2 medium', 'P3 low'];
const STATUSES = ['Open', 'In Progress', 'Blocked', 'Closed'];
const COMMENT_TYPES = ['Update', 'Investigation', 'Blocker', 'Resolution'];

const DESCRIPTIONS = {
  administrative: [
    'Access review required for temporary agency operators',
    'Supervisor approval matrix needs update after shift changes',
    'Monthly operational KPI extract is missing two warehouse areas',
    'Audit evidence pack requested for compliance review'
  ],
  'change request': [
    'Change request to add SLA colour coding to ticket dashboard',
    'Change request to automate weekly export for managers',
    'Change request to add bulk reassignment for support queues',
    'Change request to include reopened count in operational report'
  ],
  CR: [
    'CR for carrier exception workflow in outbound screen',
    'CR to adjust tote prioritisation rules for peak period',
    'CR to add approval step for emergency configuration changes',
    'CR for dashboard filter presets by team role'
  ],
  Inbound: [
    'Inbound ASN validation fails for supplier load with mixed pallets',
    'Receiving dock appointment overlap creating forklift congestion',
    'Inbound label scan not matching expected purchase order line',
    'Inbound temperature-controlled shipment requires exception handling'
  ],
  Outbound: [
    'Outbound manifest generation delayed during carrier cut-off',
    'Outbound label template misaligned after printer driver update',
    'Shipment weight tolerance check rejecting valid parcels',
    'Outbound staging lane capacity alert not triggering'
  ],
  Inventory: [
    'Inventory cycle count discrepancy in high-value SKU zone',
    'Negative stock appears after concurrent replenishment confirmation',
    'Inventory reservation is not released after cancelled wave',
    'Location status mismatch between physical aisle and WMS'
  ],
  WMS: [
    'WMS pick path recalculation timeout for large multi-order wave',
    'WMS location sync failure causing stock visibility gaps',
    'Putaway confirmation creates duplicate movement history',
    'Wave release screen freezes when more than 500 orders are selected'
  ],
  UCS: [
    'UCS sorter lane divert sends parcels to incorrect hub',
    'UCS conveyor speed inconsistency after maintenance window',
    'UCS label printer intermittently loses network connection',
    'UCS station heartbeat shows stale status in operations board'
  ],
  Scada: [
    'Scada alarm flooding operators after sensor calibration drift',
    'HMI disconnects intermittently from cooling system controller',
    'Scada historian missing readings after midnight rollover',
    'Pressure sensor trend line shows impossible values in zone B'
  ],
  Skyfall: [
    'Skyfall integration rejects payload when route code is lowercase',
    'Skyfall event queue backlog during peak outbound processing',
    'Skyfall dashboard widget displays stale exception count',
    'Skyfall webhook retry policy needs validation after outage'
  ],
  PIN: [
    'PIN reader on gate four intermittently rejects valid badges',
    'PIN password expiry notification not reaching new operators',
    'PIN biometric enrolment fails for recently hired staff',
    'PIN access group sync delayed for weekend shift'
  ],
  Toting: [
    'Toting bin assignment sends items to the wrong consolidation zone',
    'Toting buffer overflow during peak induction window',
    'Toting induction speed reduced after software patch',
    'Toting exception screen does not preserve operator notes'
  ],
  Shuttle: [
    'Shuttle emergency stop triggered by software fault on route three',
    'Shuttle route optimisation does not save updated configuration',
    'Shuttle firmware upgrade required before maintenance window',
    'Shuttle arm collision detection false positive halting line'
  ]
};

function loadLocalEnv() {
  for (const candidate of ['.env.local', '.env']) {
    if (!existsSync(candidate)) continue;
    return readFile(candidate, 'utf8')
      .then((content) => {
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith('#') || !line.includes('=')) continue;
          const index = line.indexOf('=');
          const key = line.slice(0, index).trim();
          let value = line.slice(index + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (key && process.env[key] === undefined) process.env[key] = value;
        }
      });
  }
  return Promise.resolve();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function toMysqlDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function daysAgo(days, hour = 9) {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function addDays(date, days, hour = 17) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(hour, 0, 0, 0);
  return result;
}

function slaDays(priority) {
  if (priority === 'P1 high') return 1;
  if (priority === 'P2 medium') return 3;
  return 7;
}

function pick(array, index) {
  return array[index % array.length];
}

function buildTickets() {
  const tickets = [];
  for (let index = 0; index < DEMO_TICKET_COUNT; index += 1) {
    const category = pick(CATEGORIES, index);
    const priority = pick(PRIORITIES, index + Math.floor(index / 5));
    const status = pick(STATUSES, index + Math.floor(index / 7));
    const openedDaysAgo = Math.max(0, DEMO_TICKET_COUNT - index + (index % 6));
    const openedAt = daysAgo(openedDaysAgo, 7 + (index % 9));
    const isClosed = status === 'Closed';
    const closedAt = isClosed ? addDays(openedAt, Math.min(slaDays(priority) + (index % 3), openedDaysAgo || 1), 16) : null;
    const dueAt = addDays(openedAt, slaDays(priority), 17);
    const description = pick(DESCRIPTIONS[category], Math.floor(index / CATEGORIES.length));
    const assignee = pick(ASSIGNEES, index + 2);
    const manager = pick(MANAGERS, index + Math.floor(index / 4));
    const jdTicketNumber = String(DEMO_JD_START + index);
    const update = buildLatestUpdate(status, category, assignee, manager);
    tickets.push({
      jd_ticket_number: jdTicketNumber,
      description,
      category,
      updates_comments: update,
      priority,
      date_opening: toMysqlDate(openedAt),
      date_closed: closedAt ? toMysqlDate(closedAt) : null,
      status,
      assignee,
      manager,
      due_date: toMysqlDate(dueAt),
      reopened_count: index % 11 === 0 ? 1 : 0,
      comments: buildComments({ status, category, assignee, manager, openedAt, closedAt, priority }),
      audit: buildAudit({ status, assignee, manager, openedAt, closedAt, priority })
    });
  }
  return tickets;
}

function buildLatestUpdate(status, category, assignee, manager) {
  if (status === 'Open') return `${assignee} triaged the ${category} request and is collecting initial evidence for ${manager}.`;
  if (status === 'In Progress') return `${assignee} is actively working with operations; next update is expected after validation in ${category}.`;
  if (status === 'Blocked') return `${assignee} identified an external dependency and escalated the blocker to ${manager}.`;
  return `${manager} confirmed that the ${category} issue was resolved and no further action is pending.`;
}

function buildComments({ status, category, assignee, manager, openedAt, closedAt, priority }) {
  const comments = [
    {
      author: assignee,
      comment_type: 'Update',
      body: `Initial triage completed for ${category}. Priority confirmed as ${priority} and operational impact has been documented.`,
      created_at: toMysqlDate(addDays(openedAt, 0, 10))
    },
    {
      author: manager,
      comment_type: 'Investigation',
      body: 'Reviewed logs, shift notes, and recent configuration changes. Next step is validation with the affected process owner.',
      created_at: toMysqlDate(addDays(openedAt, 1, 12))
    }
  ];

  if (status === 'Blocked') {
    comments.push({
      author: assignee,
      comment_type: 'Blocker',
      body: 'Progress is blocked by a dependency outside the local support queue. Escalation has been raised and the ticket remains visible for daily review.',
      created_at: toMysqlDate(addDays(openedAt, 2, 15))
    });
  }

  if (status === 'In Progress') {
    comments.push({
      author: assignee,
      comment_type: 'Update',
      body: 'Mitigation is in place while the permanent fix is being tested with representative operational data.',
      created_at: toMysqlDate(addDays(openedAt, 2, 14))
    });
  }

  if (status === 'Closed') {
    comments.push({
      author: manager,
      comment_type: 'Resolution',
      body: 'Resolution accepted by operations. Monitoring will continue through the next reporting cycle.',
      created_at: toMysqlDate(closedAt ?? addDays(openedAt, 3, 16))
    });
  }

  return comments;
}

function buildAudit({ status, assignee, manager, openedAt, closedAt, priority }) {
  const events = [
    {
      action: 'create',
      actor: 'Jawad',
      details_json: JSON.stringify({ seeded: true, priority, source: 'seed-demo-data.mjs' }),
      created_at: toMysqlDate(addDays(openedAt, 0, 9))
    },
    {
      action: 'assign',
      actor: manager,
      details_json: JSON.stringify({ assignee, manager }),
      created_at: toMysqlDate(addDays(openedAt, 0, 11))
    }
  ];

  if (status !== 'Open') {
    events.push({
      action: 'status_change',
      actor: assignee,
      details_json: JSON.stringify({ from: 'Open', to: status }),
      created_at: toMysqlDate(addDays(openedAt, 1, 13))
    });
  }

  if (status === 'Closed') {
    events.push({
      action: 'close',
      actor: manager,
      details_json: JSON.stringify({ resolution: 'Demo resolution confirmed by operations' }),
      created_at: toMysqlDate(closedAt ?? addDays(openedAt, 3, 16))
    });
  }

  return events;
}

async function connect() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está definida. Configura la BD de Manus antes de ejecutar npm run seed.');
  }
  if (!/^mysql(s)?:\/\//i.test(databaseUrl)) {
    throw new Error('DATABASE_URL debe usar un esquema MySQL compatible, por ejemplo mysql://user:pass@host:3306/database.');
  }
  return mysql.createConnection({ uri: databaseUrl, multipleStatements: true });
}

async function ensureSchema(connection) {
  await connection.query(`CREATE TABLE IF NOT EXISTS user_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    active TINYINT NOT NULL DEFAULT 1,
    auth_pin_hash VARCHAR(255),
    auth_secret_hash VARCHAR(255),
    password_reset_required TINYINT NOT NULL DEFAULT 1,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS tickets (
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
    batch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS ticket_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    author VARCHAR(255) NOT NULL,
    comment_type VARCHAR(50) NOT NULL DEFAULT 'Update',
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS ticket_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    details_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureColumn(connection, 'user_accounts', 'email', 'VARCHAR(255)');
  await ensureColumn(connection, 'tickets', 'due_date', 'DATETIME');
  await ensureColumn(connection, 'tickets', 'reopened_count', 'INT NOT NULL DEFAULT 0');
  await ensureColumn(connection, 'tickets', 'batch_id', 'INT');
  await ensureColumn(connection, 'ticket_comments', 'comment_type', "VARCHAR(50) NOT NULL DEFAULT 'Update'");
}

async function ensureColumn(connection, tableName, columnName, definition) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  if (Number(rows[0]?.count ?? 0) === 0) {
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function seedUsers(connection) {
  for (const user of USERS) {
    await connection.execute(
      `INSERT INTO user_accounts
        (name, role, active, auth_secret_hash, auth_pin_hash, password_reset_required, failed_login_attempts, locked_until, email, updated_at)
       VALUES (?, ?, 1, ?, NULL, 1, 0, NULL, '', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
        role = VALUES(role),
        active = 1,
        auth_secret_hash = VALUES(auth_secret_hash),
        auth_pin_hash = NULL,
        password_reset_required = 1,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP`,
      [user.name, user.role, hashPassword(DEFAULT_PASSWORD)]
    );
  }
}

async function clearDemoTickets(connection, tickets) {
  const jdNumbers = tickets.map((ticket) => ticket.jd_ticket_number);
  const placeholders = jdNumbers.map(() => '?').join(', ');
  const [rows] = await connection.execute(`SELECT id FROM tickets WHERE jd_ticket_number IN (${placeholders})`, jdNumbers);
  if (rows.length === 0) return;

  const ids = rows.map((row) => row.id);
  const idPlaceholders = ids.map(() => '?').join(', ');
  await connection.execute(`DELETE FROM ticket_audit_log WHERE entity_type = 'ticket' AND entity_id IN (${idPlaceholders})`, ids);
  await connection.execute(`DELETE FROM ticket_comments WHERE ticket_id IN (${idPlaceholders})`, ids);
  await connection.execute(`DELETE FROM tickets WHERE id IN (${idPlaceholders})`, ids);
}

async function seedTickets(connection) {
  const tickets = buildTickets();
  await clearDemoTickets(connection, tickets);

  for (const ticket of tickets) {
    const [result] = await connection.execute(
      `INSERT INTO tickets
        (description, jd_ticket_number, category, updates_comments, priority, date_opening, date_closed, status, assignee, manager, due_date, reopened_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        ticket.description,
        ticket.jd_ticket_number,
        ticket.category,
        ticket.updates_comments,
        ticket.priority,
        ticket.date_opening,
        ticket.date_closed,
        ticket.status,
        ticket.assignee,
        ticket.manager,
        ticket.due_date,
        ticket.reopened_count
      ]
    );

    const ticketId = result.insertId;

    for (const comment of ticket.comments) {
      await connection.execute(
        `INSERT INTO ticket_comments (ticket_id, author, comment_type, body, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketId, comment.author, comment.comment_type, comment.body, comment.created_at]
      );
    }

    for (const event of ticket.audit) {
      await connection.execute(
        `INSERT INTO ticket_audit_log (entity_type, entity_id, action, actor, details_json, created_at)
         VALUES ('ticket', ?, ?, ?, ?, ?)`,
        [ticketId, event.action, event.actor, event.details_json, event.created_at]
      );
    }
  }

  return tickets.length;
}

async function main() {
  await loadLocalEnv();
  const connection = await connect();
  try {
    await ensureSchema(connection);
    await connection.beginTransaction();
    await seedUsers(connection);
    const ticketCount = await seedTickets(connection);
    await connection.commit();
    console.log(`✓ Seed completado: ${USERS.length} usuarios y ${ticketCount} tickets demo insertados.`);
    console.log(`✓ Contraseña por defecto para usuarios seed: ${DEFAULT_PASSWORD}`);
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('✗ Error ejecutando seed-demo-data.mjs');
  console.error(error);
  process.exit(1);
});
