const path = require('path');
const fs = require('fs');

// Vercel / AWS Lambda environments provide a strictly read-only filesystem except for /tmp
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const DB_PATH = isServerless
  ? path.join('/tmp', 'operion.db')
  : (process.env.DB_PATH || path.join(__dirname, 'operion.db'));

let db;
let usingFallback = false;

try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
} catch (err) {
  console.warn(`[Operion DB] Failed to open SQLite at '${DB_PATH}' (${err.message}). Trying in-memory SQLite...`);
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(':memory:');
  } catch (memErr) {
    console.warn('[Operion DB] node:sqlite unavailable. Initializing in-memory fallback store:', memErr.message);
    usingFallback = true;
    db = createFallbackStore();
  }
}

// In-Memory Fallback Adapter for ultra-resilient serverless execution
function createFallbackStore() {
  const store = {
    ufm_incidents: [],
    dispatch_logs: [],
    seating_plans: []
  };
  let ufmIdSeq = 1;
  let dispatchIdSeq = 1;
  let seatingIdSeq = 1;

  return {
    exec(sql) {
      // No-op for schema creation in fallback
      return this;
    },
    prepare(sql) {
      const cleanSql = sql.trim().replace(/\s+/g, ' ');

      return {
        get(...params) {
          if (/SELECT COUNT\(\*\)/i.test(cleanSql)) {
            if (/ufm_incidents/i.test(cleanSql)) {
              if (/WHERE status NOT IN/i.test(cleanSql)) {
                const count = store.ufm_incidents.filter(i => !['RESOLVED', 'DISMISSED'].includes(i.status)).length;
                return { count };
              }
              return { count: store.ufm_incidents.length };
            }
            return { count: 0 };
          }
          if (/SELECT MAX\(id\)/i.test(cleanSql)) {
            const maxId = store.ufm_incidents.reduce((max, i) => Math.max(max, i.id || 0), 0);
            return { max_id: maxId };
          }
          if (/SELECT \* FROM ufm_incidents WHERE docket_no = \?/i.test(cleanSql)) {
            const docket = params[0];
            return store.ufm_incidents.find(i => i.docket_no === docket) || null;
          }
          if (/SELECT \* FROM ufm_incidents WHERE docket_no LIKE \?/i.test(cleanSql)) {
            const query = (params[0] || '').replace(/%/g, '');
            return store.ufm_incidents.find(i => i.docket_no.includes(query)) || null;
          }
          return null;
        },
        all(...params) {
          if (/FROM ufm_incidents/i.test(cleanSql)) {
            return [...store.ufm_incidents].sort((a, b) => b.id - a.id);
          }
          if (/FROM dispatch_logs/i.test(cleanSql)) {
            return [...store.dispatch_logs].sort((a, b) => b.id - a.id).slice(0, 50);
          }
          if (/FROM seating_plans/i.test(cleanSql)) {
            return [...store.seating_plans].sort((a, b) => b.id - a.id);
          }
          return [];
        },
        run(...params) {
          if (/INSERT INTO ufm_incidents/i.test(cleanSql)) {
            const id = ufmIdSeq++;
            const incident = {
              id,
              docket_no: params[0],
              roll_no: params[1],
              student_name: params[2],
              paper_code: params[3],
              evidence_notes: params[4],
              status: params[5] || 'UNDER_INVESTIGATION',
              hall: params[6] || 'Room 501-LHS (Block E)',
              desk: params[7] || 'Desk A-02',
              malpractice_type: params[8] || 'Printed Formula Chits',
              answer_booklet_no: params[9] || 'QB-4092',
              provisional_booklet_no: params[10] || 'QB-4122',
              invigilator: params[11] || 'Dr. A. Sharma (Sr. Faculty)',
              explanation: params[12] || 'Explanation recorded.',
              created_at: new Date().toISOString()
            };
            store.ufm_incidents.push(incident);
            return { changes: 1, lastInsertRowid: id };
          }
          if (/INSERT INTO dispatch_logs/i.test(cleanSql)) {
            const id = dispatchIdSeq++;
            const log = {
              id,
              dispatch_id: params[0],
              type: params[1],
              hall: params[2],
              staff_id: params[3],
              message: params[4],
              status: params[5],
              created_at: new Date().toISOString()
            };
            store.dispatch_logs.push(log);
            return { changes: 1, lastInsertRowid: id };
          }
          if (/INSERT INTO seating_plans/i.test(cleanSql)) {
            const id = seatingIdSeq++;
            const plan = {
              id,
              hall_name: params[0],
              rows: params[1],
              cols: params[2],
              plan_json: params[3],
              conflicts: params[4],
              created_at: new Date().toISOString()
            };
            store.seating_plans.push(plan);
            return { changes: 1, lastInsertRowid: id };
          }
          if (/UPDATE ufm_incidents SET/i.test(cleanSql)) {
            const newStatus = params[0];
            const newNotes = params[1];
            const newExpl = params[2];
            const newBooklet = params[3];
            const docket = params[4];
            const existing = store.ufm_incidents.find(i => i.docket_no === docket);
            if (existing) {
              existing.status = newStatus;
              existing.evidence_notes = newNotes;
              existing.explanation = newExpl;
              existing.provisional_booklet_no = newBooklet;
            }
            return { changes: existing ? 1 : 0 };
          }
          return { changes: 0 };
        }
      };
    }
  };
}

// Initialize Tables
function initDatabase() {
  // 1. Form 7-UFM Incidents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ufm_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      docket_no TEXT UNIQUE NOT NULL,
      roll_no TEXT NOT NULL,
      student_name TEXT NOT NULL,
      paper_code TEXT NOT NULL,
      evidence_notes TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      hall TEXT DEFAULT 'Room 501-LHS (Block E)',
      desk TEXT DEFAULT 'Desk A-02',
      malpractice_type TEXT DEFAULT 'Printed Formula Chits',
      answer_booklet_no TEXT DEFAULT 'QB-4092',
      provisional_booklet_no TEXT DEFAULT 'QB-4122',
      invigilator TEXT DEFAULT 'Dr. A. Sharma (Sr. Faculty)',
      explanation TEXT DEFAULT 'Candidate written explanation recorded on paper docket.',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Dispatch Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispatch_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      hall TEXT NOT NULL,
      staff_id TEXT,
      message TEXT,
      status TEXT DEFAULT 'DISPATCHED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Seating Plans Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS seating_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hall_name TEXT NOT NULL,
      rows INTEGER NOT NULL,
      cols INTEGER NOT NULL,
      plan_json TEXT NOT NULL,
      conflicts INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed initial Form 7-UFM incidents if empty
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM ufm_incidents').get();
  if (!countRow || countRow.count === 0) {
    const insert = db.prepare(`
      INSERT INTO ufm_incidents (
        docket_no, roll_no, student_name, paper_code, evidence_notes, status,
        hall, desk, malpractice_type, answer_booklet_no, provisional_booklet_no,
        invigilator, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      'UFM/2024/014',
      'OP-2024-8924',
      'Vikramaditya Rao',
      'CS-402 Distributed Systems',
      'Candidate was observed frequently looking inside an open plastic pencil pouch placed on the left side of Desk A-02. Three handwritten micro-slips containing mathematical formulas and consensus algorithm theorems were recovered by Room Invigilator and Flying Squad.',
      'CONFISCATED_HEARING_PENDING',
      'Room 501-LHS (Block E)',
      'Desk A-02',
      'Printed Formula Chits',
      'QB-4092',
      'QB-4122',
      'Dr. A. Sharma (Sr. Faculty)',
      'The chits were in my pouch from morning revision. I forgot to take them out before entering the hall.'
    );

    insert.run(
      'UFM/2024/015',
      'OP-2024-3310',
      'Rohan Verma',
      'EC-301 Digital Signal Processing',
      'Programmable graphing calculator detected with unauthorized formula text files stored in user flash memory bank. Device seized and sealed under custody.',
      'UNDER_INVESTIGATION',
      'Room 502-RHS (Block E)',
      'Desk B-14',
      'Programmable Device',
      'QB-3301',
      'QB-3344',
      'Prof. H. R. Trivedi',
      'Calculator was borrowed from a friend; I was unaware of stored files.'
    );

    insert.run(
      'UFM/2024/016',
      'OP-2024-1109',
      'Sanya Malhotra',
      'ME-304 Thermodynamics',
      'Concealed handwritten formulas inscribed on the reverse of official Examination Admit Pass. Detected during 2nd verification round.',
      'PROVISIONAL_BOOKLET_ISSUED',
      'Room 521-LHS (Block F)',
      'Desk C-07',
      'Admit Card Inscription',
      'QB-1190',
      'QB-1205',
      'Dr. Arvind Malhotra (COE)',
      'Pencil formulas were written for rough calculation before test began.'
    );
  }
}

initDatabase();

module.exports = db;
