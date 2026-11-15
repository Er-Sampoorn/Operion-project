const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../database');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Robust CSV Line Parser handling quotes and commas
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const rawHeaders = splitCSVLine(lines[0]);
  const headers = rawHeaders.map(h => normalizeHeader(h));

  const rollIdx = headers.findIndex(h => ['roll_no', 'roll', 'rollno', 'registration_no'].includes(h));
  const nameIdx = headers.findIndex(h => ['name', 'student_name', 'candidate_name', 'fullname'].includes(h));
  const branchIdx = headers.findIndex(h => ['branch', 'dept', 'department', 'stream'].includes(h));
  const paperIdx = headers.findIndex(h => ['paper_code', 'paper', 'subject', 'subject_code', 'course_code'].includes(h));
  const yearIdx = headers.findIndex(h => ['year', 'batch', 'admission_year', 'academic_year'].includes(h));

  const students = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0 || cols.every(c => c === '')) continue;

    const roll_no = rollIdx !== -1 && cols[rollIdx] ? cols[rollIdx].trim() : `OP-2024-${String(i).padStart(4, '0')}`;
    const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].trim() : `Candidate ${i}`;
    const branch = branchIdx !== -1 && cols[branchIdx] ? cols[branchIdx].trim() : 'CSE';
    const paper_code = paperIdx !== -1 && cols[paperIdx] ? cols[paperIdx].trim() : `${branch}-101`;
    const explicitYear = yearIdx !== -1 && cols[yearIdx] ? cols[yearIdx].trim() : '';

    students.push({
      roll_no,
      name,
      branch: branch.toUpperCase(),
      paper_code: paper_code.toUpperCase(),
      year: explicitYear
    });
  }

  return students;
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Extracts and standardizes (Branch + Year) key from candidate attributes.
 * Examples:
 *   "22CSE001" -> Year: "2022", Branch: "CSE" -> "CSE - 2022"
 *   "23ECE015" -> Year: "2023", Branch: "ECE" -> "ECE - 2023"
 *   "OP-2024-8924" -> Year: "2024", Branch: "CSE" -> "CSE - 2024"
 */
function extractBranchAndYear(student) {
  let branch = (student.branch || 'CSE').trim().toUpperCase();
  let year = '';

  if (student.year) {
    year = String(student.year).trim();
    if (year.length === 2) year = '20' + year;
  } else if (student.roll_no) {
    const roll = student.roll_no.trim();
    const matchPrefixTwoDigit = roll.match(/^(\d{2})([A-Za-z]+)/);
    const matchYearInMiddle = roll.match(/^[A-Za-z]+(\d{4})/);
    const matchFullYearInHyphen = roll.match(/(?:19|20)\d{2}/);

    if (matchPrefixTwoDigit) {
      year = '20' + matchPrefixTwoDigit[1];
      if (!student.branch && matchPrefixTwoDigit[2]) {
        branch = matchPrefixTwoDigit[2].toUpperCase();
      }
    } else if (matchYearInMiddle) {
      year = matchYearInMiddle[1];
    } else if (matchFullYearInHyphen) {
      year = matchFullYearInHyphen[0];
    }
  }

  if (!year) year = '2024';
  const branchYearKey = `${branch} - ${year}`;
  return { branch, year, branchYearKey };
}

/**
 * STRICT 8-DIRECTIONAL CHEBYSHEV EXCLUSION SEATING ENGINE
 * Constraint Satisfaction (Greedy with Lookahead / Forward-Checking)
 *
 * Rule: Two students having the SAME (Branch + Year) (e.g. "CSE - 2022") CANNOT sit
 * within Chebyshev distance 1 (Left, Right, Top, Bottom, and all 4 Diagonals).
 *
 * Fallback Strategy: If no eligible candidate matches these constraints for a cell (r, c),
 * leave that desk EMPTY (rendered as distinct "EMPTY BUFFER SEAT").
 */
function generateStrict8WaySeating(students, rows = 5, cols = 6, hall_name = 'Hall A-101') {
  const totalCapacity = rows * cols;
  const groups = {};
  const branchYearCounts = {};

  // Group candidates by standardized (Branch + Year) key
  students.forEach(s => {
    const meta = extractBranchAndYear(s);
    const key = meta.branchYearKey;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...s, ...meta });
    branchYearCounts[key] = (branchYearCounts[key] || 0) + 1;
  });

  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 8-Directional Chebyshev Exclusion Set:
      // Check all 8 surrounding positions within distance 1
      const forbidden = new Set();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = grid[nr][nc];
            if (neighbor && !neighbor.empty && neighbor.branchYearKey) {
              forbidden.add(neighbor.branchYearKey);
            }
          }
        }
      }

      // Candidate Selection Heuristic (Most Constrained / Largest Remaining First):
      // Pick non-forbidden candidate group with the largest remaining pool
      let bestKey = null;
      let maxRemaining = -1;

      for (const k of Object.keys(groups)) {
        if (groups[k].length > 0 && !forbidden.has(k)) {
          if (groups[k].length > maxRemaining) {
            maxRemaining = groups[k].length;
            bestKey = k;
          }
        }
      }

      const rowChar = String.fromCharCode(65 + r);
      const colNum = String(c + 1).padStart(2, '0');
      const seat = `${rowChar}-${colNum}`;

      if (bestKey && groups[bestKey].length > 0) {
        const student = groups[bestKey].shift();
        grid[r][c] = {
          seat,
          row: r,
          col: c,
          empty: false,
          isBuffer: false,
          roll_no: student.roll_no,
          name: student.name,
          branch: student.branch,
          year: student.year,
          branchYearKey: student.branchYearKey,
          paper_code: student.paper_code
        };
      } else {
        // Fallback Strategy: STRICT EMPTY BUFFER SEAT (Air gap preventing cheat vectors)
        grid[r][c] = {
          seat,
          row: r,
          col: c,
          empty: true,
          isBuffer: true,
          status: 'EMPTY_BUFFER_SEAT',
          label: 'EMPTY BUFFER SEAT',
          reason: forbidden.size > 0 ? '8-Directional Air Gap Isolation' : 'Registry Capacity Exhausted'
        };
      }
    }
  }

  // Rigorous Verification Pass: Check all 8 Chebyshev neighbors for all placed desks
  let chebyshevConflicts = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cur = grid[r][c];
      if (!cur || cur.empty) continue;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const nb = grid[nr][nc];
            if (nb && !nb.empty && nb.branchYearKey === cur.branchYearKey) {
              chebyshevConflicts++;
            }
          }
        }
      }
    }
  }

  const allocatedCount = grid.flat().filter(cell => cell && !cell.empty).length;
  const bufferCount = grid.flat().filter(cell => cell && cell.empty).length;

  return {
    hall_name,
    rows,
    cols,
    total_seats: totalCapacity,
    allocated_students: allocatedCount,
    buffer_seats: bufferCount,
    conflicts: chebyshevConflicts, // Guaranteed 0
    branch_year_distribution: branchYearCounts,
    grid
  };
}

// GET /api/seating/sample - Return ready-to-test multi-branch/year CSV
router.get('/sample', (req, res) => {
  const sampleCSV = `roll_no,name,branch,paper_code,year
22CSE001,Aarav Sharma,CSE,CS-402,2022
22ECE001,Diya Kapoor,ECE,EC-301,2022
22ME001,Kabir Mehta,ME,ME-304,2022
22CE001,Meera Nair,CE,CE-202,2022
22CSE002,Rohan Gupta,CSE,CS-402,2022
22ECE002,Sana Khan,ECE,EC-301,2022
22ME002,Vihaan Reddy,ME,ME-304,2022
22CE002,Isha Bhatia,CE,CE-202,2022
22CSE003,Neha Verma,CSE,CS-402,2022
22ECE003,Arjun Malhotra,ECE,EC-301,2022
22ME003,Pooja Saxena,ME,ME-304,2022
22CE003,Karan Gill,CE,CE-202,2022
22CSE004,Devika Joshi,CSE,CS-402,2022
22ECE004,Aryan Chopra,ECE,EC-301,2022
22ME004,Tara Sengupta,ME,ME-304,2022
22CE004,Varun Pillai,CE,CE-202,2022
22CSE005,Ananya Deshmukh,CSE,CS-402,2022
22ECE005,Pranav Iyer,ECE,EC-301,2022
22ME005,Rhea Chawla,ME,ME-304,2022
22CE005,Tanmay Bose,CE,CE-202,2022
22CSE006,Siddharth Rao,CSE,CS-402,2022
22ECE006,Simran Kaur,ECE,EC-301,2022
22ME006,Aditya Trivedi,ME,ME-304,2022
22CE006,Kavya Menon,CE,CE-202,2022
22CSE007,Nikhil Anand,CSE,CS-402,2022
22ECE007,Priya Singhal,ECE,EC-301,2022
22ME007,Gaurav Das,ME,ME-304,2022
22CE007,Shreya Sethi,CE,CE-202,2022
22CSE008,Ritika Jain,CSE,CS-402,2022
22ECE008,Manish Pandey,ECE,EC-301,2022`;

  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="operion_strict_seating_candidates.csv"');
    return res.send(sampleCSV);
  }

  res.json({
    success: true,
    sample_csv: sampleCSV,
    total_candidates: 30,
    rule: '8-directional Chebyshev exclusion (Same Branch + Year cannot be adjacent or diagonal)'
  });
});

// POST /api/seating/generate - Strict 8-Directional Constraint Seating Engine
router.post('/generate', upload.single('file'), (req, res) => {
  try {
    let csvContent = '';
    const rows = parseInt(req.body.rows || req.query.rows || 5, 10);
    const cols = parseInt(req.body.cols || req.query.cols || 6, 10);
    const hall_name = req.body.hall_name || req.query.hall_name || 'Room 501-LHS (Block E)';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csv) {
      csvContent = req.body.csv;
    } else if (Array.isArray(req.body.students)) {
      const seatingResult = generateStrict8WaySeating(req.body.students, rows, cols, hall_name);
      return res.json({
        success: true,
        algorithm: 'csp_8directional_chebyshev_exclusion',
        rule: 'Chebyshev distance 1 exclusion for same (Branch + Year)',
        ...seatingResult
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No CSV file or data provided. Upload via multipart "file", or send body.csv string'
      });
    }

    const students = parseCSV(csvContent);
    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to parse candidates from CSV. Please check headers: roll_no, name, branch, paper_code'
      });
    }

    const seatingResult = generateStrict8WaySeating(students, rows, cols, hall_name);

    // Persist generated seating plan in SQLite
    try {
      db.prepare(`
        INSERT INTO seating_plans (hall_name, rows, cols, plan_json, conflicts)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        hall_name,
        rows,
        cols,
        JSON.stringify(seatingResult.grid),
        seatingResult.conflicts
      );
    } catch (dbErr) {
      console.warn('Could not persist seating plan to DB:', dbErr.message);
    }

    res.json({
      success: true,
      algorithm: 'csp_8directional_chebyshev_exclusion',
      rule: 'Chebyshev distance 1 exclusion for same (Branch + Year)',
      ...seatingResult
    });
  } catch (err) {
    console.error('Error in seating generator:', err);
    res.status(500).json({ success: false, error: 'Internal seating plan error' });
  }
});

module.exports = router;
