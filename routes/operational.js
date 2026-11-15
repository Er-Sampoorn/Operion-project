const express = require('express');
const router = express.Router();

// Mock candidate database
const STUDENTS = [
  { roll_no: 'CS2026001', name: 'Aarav Sharma', hall: 'Hall 01', seat: 'A-01', branch: 'CSE', paper_code: 'CS-402' },
  { roll_no: 'CS2026002', name: 'Diya Kapoor', hall: 'Hall 01', seat: 'A-02', branch: 'ECE', paper_code: 'EC-301' },
  { roll_no: 'CS2026003', name: 'Kabir Mehta', hall: 'Hall 01', seat: 'A-03', branch: 'ME', paper_code: 'ME-304' },
  { roll_no: 'CS2026004', name: 'Meera Nair', hall: 'Hall 01', seat: 'A-04', branch: 'CE', paper_code: 'CE-202' },
  { roll_no: 'CS2026005', name: 'Rohan Gupta', hall: 'Hall 01', seat: 'A-05', branch: 'CSE', paper_code: 'CS-402' },
  { roll_no: 'CS2026006', name: 'Sana Khan', hall: 'Hall 01', seat: 'A-06', branch: 'ECE', paper_code: 'EC-301' },
  { roll_no: 'CS2026007', name: 'Vihaan Reddy', hall: 'Hall 01', seat: 'A-07', branch: 'ME', paper_code: 'ME-304' },
  { roll_no: 'CS2026008', name: 'Isha Bhatia', hall: 'Hall 01', seat: 'A-08', branch: 'CE', paper_code: 'CE-202' },
  { roll_no: 'CS2026009', name: 'Neha Verma', hall: 'Hall 01', seat: 'A-09', branch: 'CSE', paper_code: 'CS-402' },
  { roll_no: 'CS2026010', name: 'Arjun Malhotra', hall: 'Hall 01', seat: 'A-10', branch: 'ECE', paper_code: 'EC-301' },
  { roll_no: 'OP-2024-8924', name: 'Vikramaditya Rao', hall: 'Room 501-LHS (Block E)', seat: 'A-02', branch: 'CSE', paper_code: 'CS-402', status: 'UFM_FLAGGED' }
];

// Faculty roster
const FACULTY = [
  { faculty_id: 'FAC001', name: 'Dr. A. Sharma', duty: 'Invigilation', dept: 'Computer Science', hall: 'Room 501-LHS (Block E)', session: '13:30 - 16:30 IST' },
  { faculty_id: 'FAC002', name: 'Prof. H. R. Trivedi', duty: 'Observer', dept: 'Electronics', hall: 'Room 502-RHS (Block E)', session: '13:30 - 16:30 IST' },
  { faculty_id: 'FAC003', name: 'Dr. Arvind Malhotra', duty: 'Controller of Examinations', dept: 'Deanery', hall: 'Central Command', session: 'All Shifts' },
  { faculty_id: 'FAC004', name: 'Dr. Sunita Bansal', duty: 'Invigilation', dept: 'Mechanical Engg', hall: 'Room 503-LHS (Block E)', session: '13:30 - 16:30 IST' },
  { faculty_id: 'FAC005', name: 'Prof. Rajesh Singhania', duty: 'Invigilation', dept: 'Civil Engg', hall: 'Room 521-LHS (Block F)', session: '13:30 - 16:30 IST' }
];

// Authorities
const AUTHORITIES = [
  { auth_id: 'AUTH001', name: 'Dr. Arvind Malhotra', role: 'Controller of Examinations', dept: 'Apex Exam Secretariat', status: 'Active Duty' },
  { auth_id: 'AUTH002', name: 'Dr. Meenakshi Sundaram', role: 'Chief Proctor', dept: 'Discipline & Anti-Cheating Cell', status: 'Active Duty' },
  { auth_id: 'AUTH003', name: 'Prof. K. V. Raman', role: 'Flying Squad Chief', dept: 'Vigilance Operations', status: 'Mobile Patrol' }
];

// Staff
const STAFF = [
  { staff_id: 'STF001', name: 'Rakesh Dogra', role: 'Sector Officer', sector: 'Sector 1: Block E LHS Wings', channel: 'CH-04 Flying Squad Frequency' },
  { staff_id: 'STF002', name: 'Virender Pathak', role: 'Flying Squad Officer', sector: 'Sector 2: Block E RHS Wings', channel: 'CH-02 Control Center Frequency' },
  { staff_id: 'STF003', name: 'Kuldeep Singh', role: 'Hall Patroller', sector: 'Sector 3: Block F LHS & RHS Wings', channel: 'CH-06 Hall Patrollers Frequency' }
];

// GET /api/students
router.get('/students', (req, res) => {
  res.json(STUDENTS);
});

// GET /api/students/:roll_no
router.get('/students/:roll_no', (req, res) => {
  const roll = req.params.roll_no;
  const student = STUDENTS.find(s => s.roll_no.toLowerCase() === roll.toLowerCase()) || {
    roll_no: roll,
    name: 'Candidate Verification Verified',
    hall: 'Room 501-LHS (Block E)',
    seat: 'A-02',
    branch: 'CSE',
    paper_code: 'CS-402 Distributed Systems',
    status: 'Verified Present'
  };
  res.json(student);
});

// GET /api/faculty
router.get('/faculty', (req, res) => {
  res.json(FACULTY);
});

// GET /api/faculty/:faculty_id
router.get('/faculty/:faculty_id', (req, res) => {
  const id = req.params.faculty_id;
  const faculty = FACULTY.find(f => f.faculty_id.toLowerCase() === id.toLowerCase()) || {
    faculty_id: id,
    name: 'Dr. Faculty Member',
    duty: 'Invigilation',
    hall: 'Room 501-LHS (Block E)',
    dept: 'Engineering',
    session: '13:30 - 16:30 IST'
  };
  res.json(faculty);
});

// GET /api/authorities
router.get('/authorities', (req, res) => {
  res.json(AUTHORITIES);
});

// GET /api/staff
router.get('/staff', (req, res) => {
  res.json(STAFF);
});

// POST /api/predict-incident
router.post('/predict-incident', (req, res) => {
  const desc = (req.body.description || '').toLowerCase();
  
  if (desc.includes('chit') || desc.includes('cheat') || desc.includes('copy') || desc.includes('phone') || desc.includes('malpractice') || desc.includes('slip')) {
    return res.json({
      predicted_category: 'Malpractice/UFM',
      assigned_priority: 'Critical',
      action_routed_to: 'Flying Squad & Disciplinary Committee',
      confidence: 0.98,
      recommended_sop: 'Form 7-UFM Immediate Docketing & Material Seizure'
    });
  } else if (desc.includes('health') || desc.includes('faint') || desc.includes('sick') || desc.includes('dizzy') || desc.includes('vomit') || desc.includes('medical')) {
    return res.json({
      predicted_category: 'Medical Emergency',
      assigned_priority: 'Urgent',
      action_routed_to: 'Campus Paramedic & Ambulatory Squad',
      confidence: 0.95,
      recommended_sop: 'Station standby medic to desk; provide provisional extra time'
    });
  } else {
    return res.json({
      predicted_category: 'Logistical Discrepancy',
      assigned_priority: 'Medium',
      action_routed_to: 'Room Invigilator & Floor Custodian',
      confidence: 0.91,
      recommended_sop: 'Verify physical hall roll call attendance sheet'
    });
  }
});

module.exports = router;
