import { DatabaseSync } from 'node:sqlite';
import { join, normalize } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ? normalize(process.env.DATA_DIR) : join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'tickets.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;');

const assignees = ['Chandra', 'Nicoleta', 'Loan', 'Samuel', 'Mohamad', 'Ana', 'Andrea', 'Alexandra', 'Radulesco', 'Oliwia', 'Madalin'];
const managers  = ['Adriano', 'Zacarias'];
const categories = ['WMS', 'Inbound', 'Outbound', 'Inventory', 'Shuttle', 'Scada', 'PIN', 'UCS', 'Toting', 'change request'];
const priorities = ['P1 high', 'P2 medium', 'P3 low'];
const statuses   = ['Open', 'In Progress', 'Blocked', 'Closed'];

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

// 35 tickets: varied spread across last 8 weeks, mix of all statuses
// Some P1 + Blocked + aged ≥10d to populate the At-Risk panel
const tickets = [
  // ── Week -8 (oldest) ────────────────────────────────────────────────────────
  { jd_ticket_number:'6914001', description:'WMS location sync failure causing stock discrepancies',          category:'WMS',           priority:'P1 high',   status:'Closed',      assignee:'Chandra',    manager:'Adriano', date_opening: daysAgo(54), date_closed: daysAgo(50) },
  { jd_ticket_number:'6914002', description:'Inbound shipment missing pallet labels on receiving dock',      category:'Inbound',       priority:'P2 medium', status:'Closed',      assignee:'Nicoleta',   manager:'Adriano', date_opening: daysAgo(52), date_closed: daysAgo(48) },

  // ── Week -7 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914003', description:'Shuttle route optimisation not saving configuration',           category:'Shuttle',       priority:'P2 medium', status:'Closed',      assignee:'Loan',       manager:'Zacarias',date_opening: daysAgo(47), date_closed: daysAgo(43) },
  { jd_ticket_number:'6914004', description:'PIN reader on gate 4 intermittently rejecting valid badges',   category:'PIN',           priority:'P1 high',   status:'Closed',      assignee:'Samuel',     manager:'Adriano', date_opening: daysAgo(46), date_closed: daysAgo(41) },
  { jd_ticket_number:'6914005', description:'Outbound manifest export producing empty CSV files',           category:'Outbound',      priority:'P2 medium', status:'Closed',      assignee:'Mohamad',    manager:'Zacarias',date_opening: daysAgo(45), date_closed: daysAgo(40) },

  // ── Week -6 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914006', description:'SCADA alarm panel showing incorrect sensor readings zone B',   category:'Scada',         priority:'P1 high',   status:'Closed',      assignee:'Ana',        manager:'Adriano', date_opening: daysAgo(40), date_closed: daysAgo(36) },
  { jd_ticket_number:'6914007', description:'Inventory cycle count report missing items from aisle 7',     category:'Inventory',     priority:'P2 medium', status:'Closed',      assignee:'Andrea',     manager:'Zacarias',date_opening: daysAgo(39), date_closed: daysAgo(34) },
  { jd_ticket_number:'6914008', description:'UCS conveyor belt speed inconsistency after maintenance',      category:'UCS',           priority:'P3 low',    status:'Closed',      assignee:'Alexandra',  manager:'Adriano', date_opening: daysAgo(38), date_closed: daysAgo(33) },

  // ── Week -5 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914009', description:'Toting bin assignment algorithm sending to wrong zone',        category:'Toting',        priority:'P2 medium', status:'Closed',      assignee:'Radulesco',  manager:'Zacarias',date_opening: daysAgo(34), date_closed: daysAgo(29) },
  { jd_ticket_number:'6914010', description:'Change request: add bulk status update to backoffice panel',   category:'change request',priority:'P3 low',    status:'Closed',      assignee:'Oliwia',     manager:'Adriano', date_opening: daysAgo(33), date_closed: daysAgo(27) },
  { jd_ticket_number:'6914011', description:'WMS pick path recalculation timeout on large orders',          category:'WMS',           priority:'P1 high',   status:'Closed',      assignee:'Madalin',    manager:'Zacarias',date_opening: daysAgo(32), date_closed: daysAgo(26) },
  { jd_ticket_number:'6914012', description:'Inbound EDI message parsing error for supplier 8821',         category:'Inbound',       priority:'P2 medium', status:'Closed',      assignee:'Chandra',    manager:'Adriano', date_opening: daysAgo(31), date_closed: daysAgo(25) },

  // ── Week -4 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914013', description:'Shuttle arm collision detection false positive halting line',  category:'Shuttle',       priority:'P1 high',   status:'Closed',      assignee:'Nicoleta',   manager:'Zacarias',date_opening: daysAgo(27), date_closed: daysAgo(22) },
  { jd_ticket_number:'6914014', description:'Outbound loading bay door sensor not triggering dock alert',   category:'Outbound',      priority:'P2 medium', status:'Closed',      assignee:'Loan',       manager:'Adriano', date_opening: daysAgo(26), date_closed: daysAgo(20) },
  { jd_ticket_number:'6914015', description:'PIN system password expiry not sending email notification',    category:'PIN',           priority:'P3 low',    status:'Closed',      assignee:'Samuel',     manager:'Zacarias',date_opening: daysAgo(25), date_closed: daysAgo(19) },

  // ── Week -3 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914016', description:'Inventory replenishment trigger firing twice for same SKU',    category:'Inventory',     priority:'P2 medium', status:'Closed',      assignee:'Mohamad',    manager:'Adriano', date_opening: daysAgo(20), date_closed: daysAgo(15) },
  { jd_ticket_number:'6914017', description:'SCADA data historian not archiving readings after midnight',   category:'Scada',         priority:'P2 medium', status:'Closed',      assignee:'Ana',        manager:'Zacarias',date_opening: daysAgo(19), date_closed: daysAgo(13) },
  { jd_ticket_number:'6914018', description:'UCS label printer jam on station 3 — firmware version issue', category:'UCS',           priority:'P3 low',    status:'Closed',      assignee:'Andrea',     manager:'Adriano', date_opening: daysAgo(18), date_closed: daysAgo(12) },

  // ── Week -2 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914019', description:'Toting zone overflow — buffer capacity exceeded during peak',  category:'Toting',        priority:'P1 high',   status:'Blocked',     assignee:'Alexandra',  manager:'Zacarias',date_opening: daysAgo(13), date_closed: null },
  { jd_ticket_number:'6914020', description:'WMS negative stock level appearing on putaway confirmation',   category:'WMS',           priority:'P2 medium', status:'In Progress', assignee:'Radulesco',  manager:'Adriano', date_opening: daysAgo(12), date_closed: null },
  { jd_ticket_number:'6914021', description:'Inbound dock scheduling overlap causing forklift conflicts',   category:'Inbound',       priority:'P2 medium', status:'In Progress', assignee:'Oliwia',     manager:'Zacarias',date_opening: daysAgo(11), date_closed: null },
  { jd_ticket_number:'6914022', description:'Change request: integrate carrier tracking API into portal',   category:'change request',priority:'P3 low',    status:'Open',        assignee:'Madalin',    manager:'Adriano', date_opening: daysAgo(11), date_closed: null },

  // ── Week -1 ──────────────────────────────────────────────────────────────────
  { jd_ticket_number:'6914023', description:'Shuttle E-stop triggered by software fault — production down', category:'Shuttle',       priority:'P1 high',   status:'In Progress', assignee:'Chandra',    manager:'Zacarias',date_opening: daysAgo(6), date_closed: null },
  { jd_ticket_number:'6914024', description:'Outbound shipment weight tolerance exceeded on carrier check', category:'Outbound',      priority:'P2 medium', status:'Open',        assignee:'Nicoleta',   manager:'Adriano', date_opening: daysAgo(6), date_closed: null },
  { jd_ticket_number:'6914025', description:'PIN biometric enrolment failing for 3 new operators',         category:'PIN',           priority:'P2 medium', status:'Blocked',     assignee:'Loan',       manager:'Zacarias',date_opening: daysAgo(5), date_closed: null },
  { jd_ticket_number:'6914026', description:'Inventory audit discrepancy of 14 units in Zone C row 12',    category:'Inventory',     priority:'P1 high',   status:'Open',        assignee:'Samuel',     manager:'Adriano', date_opening: daysAgo(5), date_closed: null },
  { jd_ticket_number:'6914027', description:'SCADA pressure sensor calibration drift in cooling system',    category:'Scada',         priority:'P2 medium', status:'Open',        assignee:'Mohamad',    manager:'Zacarias',date_opening: daysAgo(4), date_closed: null },

  // ── This week (recent) ───────────────────────────────────────────────────────
  { jd_ticket_number:'6914028', description:'UCS sortation lane divert error — parcels going to wrong hub', category:'UCS',           priority:'P1 high',   status:'In Progress', assignee:'Ana',        manager:'Adriano', date_opening: daysAgo(3), date_closed: null },
  { jd_ticket_number:'6914029', description:'Toting induction speed reduced after software patch v4.2',    category:'Toting',        priority:'P2 medium', status:'Open',        assignee:'Andrea',     manager:'Zacarias',date_opening: daysAgo(3), date_closed: null },
  { jd_ticket_number:'6914030', description:'WMS reservation deadlock on concurrent multi-order pick',     category:'WMS',           priority:'P1 high',   status:'Blocked',     assignee:'Alexandra',  manager:'Adriano', date_opening: daysAgo(2), date_closed: null },
  { jd_ticket_number:'6914031', description:'Inbound ASN file format change breaking automated parser',    category:'Inbound',       priority:'P2 medium', status:'Open',        assignee:'Radulesco',  manager:'Zacarias',date_opening: daysAgo(2), date_closed: null },
  { jd_ticket_number:'6914032', description:'Change request: export dashboard KPIs to PDF',               category:'change request',priority:'P3 low',    status:'Open',        assignee:'Oliwia',     manager:'Adriano', date_opening: daysAgo(1), date_closed: null },
  { jd_ticket_number:'6914033', description:'Shuttle maintenance window: firmware upgrade required',       category:'Shuttle',       priority:'P2 medium', status:'Open',        assignee:'Madalin',    manager:'Zacarias',date_opening: daysAgo(1), date_closed: null },
  { jd_ticket_number:'6914034', description:'Outbound label template misaligned after printer driver update',category:'Outbound',    priority:'P3 low',    status:'Open',        assignee:'Chandra',    manager:'Adriano', date_opening: daysAgo(1), date_closed: null },
  { jd_ticket_number:'6914035', description:'SCADA network timeout causing HMI disconnects on floor 2',   category:'Scada',         priority:'P1 high',   status:'Open',        assignee:'Nicoleta',   manager:'Zacarias',date_opening: daysAgo(0), date_closed: null },
];

const insert = db.prepare(`
  INSERT INTO tickets (description, jd_ticket_number, category, updates_comments, priority,
    date_opening, date_closed, status, assignee, manager, due_date, reopened_count, updated_at)
  VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, null, 0, CURRENT_TIMESTAMP)
`);

db.exec('BEGIN');
for (const t of tickets) {
  insert.run(t.description, t.jd_ticket_number, t.category, t.priority,
    t.date_opening, t.date_closed, t.status, t.assignee, t.manager);
}
db.exec('COMMIT');
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
db.close();

console.log(`✓ Inserted ${tickets.length} demo tickets.`);
