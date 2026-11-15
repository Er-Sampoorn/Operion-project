const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'operion.db');
const db = new DatabaseSync(DB_PATH);

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
  if (countRow.count === 0) {
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
