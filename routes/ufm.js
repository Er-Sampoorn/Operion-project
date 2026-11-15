const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/ufm - List all UFM incidents and summary statistics
router.get('/', (req, res) => {
  try {
    const incidents = db.prepare('SELECT * FROM ufm_incidents ORDER BY id DESC').all();
    const total = incidents.length;
    const active = incidents.filter(i => !['RESOLVED', 'DISMISSED'].includes(i.status)).length;
    const resolved = incidents.filter(i => ['RESOLVED', 'DISMISSED'].includes(i.status)).length;

    res.json({
      success: true,
      total,
      active,
      resolved,
      incidents
    });
  } catch (err) {
    console.error('Error fetching UFM incidents:', err);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// GET /api/ufm/:docket_no - Fetch specific Form 7-UFM incident details
router.get('/:docket_no', (req, res) => {
  try {
    const rawDocket = req.params.docket_no;
    // Normalize docket_no (handling both URL encodings and slashes/dashes)
    const docket = rawDocket.replace(/-/g, '/').toUpperCase();
    
    let incident = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no = ?').get(docket);
    if (!incident) {
      incident = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no = ?').get(rawDocket);
    }
    if (!incident) {
      // Try like match if needed
      incident = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no LIKE ?').get(`%${rawDocket}%`);
    }

    if (!incident) {
      return res.status(404).json({ success: false, error: `UFM Incident '${rawDocket}' not found` });
    }

    res.json({
      success: true,
      incident
    });
  } catch (err) {
    console.error('Error fetching UFM incident:', err);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// POST /api/ufm - Lodge a new Form 7-UFM incident
router.post('/', (req, res) => {
  try {
    const {
      docket_no,
      roll_no,
      student_name,
      paper_code,
      evidence_notes,
      status = 'UNDER_INVESTIGATION',
      hall = 'Room 501-LHS (Block E)',
      desk = 'Desk A-02',
      malpractice_type = 'Printed Formula Chits',
      answer_booklet_no = 'QB-4092',
      provisional_booklet_no = 'QB-4122',
      invigilator = 'Dr. A. Sharma (Sr. Faculty)',
      explanation = 'Explanation pending from candidate.'
    } = req.body;

    if (!roll_no || !student_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: roll_no and student_name are required'
      });
    }

    // Auto-generate docket_no if not provided
    let finalDocket = docket_no;
    if (!finalDocket) {
      const maxRow = db.prepare('SELECT MAX(id) AS max_id FROM ufm_incidents').get();
      const nextNum = (maxRow && maxRow.max_id ? maxRow.max_id : 0) + 14;
      finalDocket = `UFM/2024/${String(nextNum).padStart(3, '0')}`;
    }

    const insert = db.prepare(`
      INSERT INTO ufm_incidents (
        docket_no, roll_no, student_name, paper_code, evidence_notes, status,
        hall, desk, malpractice_type, answer_booklet_no, provisional_booklet_no,
        invigilator, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      finalDocket,
      roll_no,
      student_name,
      paper_code || 'CS-402 Distributed Systems',
      evidence_notes || 'Micro-chits or unauthorized materials confiscated during physical proctor inspection.',
      status,
      hall,
      desk,
      malpractice_type,
      answer_booklet_no,
      provisional_booklet_no,
      invigilator,
      explanation
    );

    const created = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no = ?').get(finalDocket);

    // Broadcast socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('ufm:created', created);
      io.emit('telemetry:stats_update', {
        type: 'ufm',
        action: 'new_incident',
        docket_no: finalDocket,
        student_name,
        hall
      });
    }

    res.status(201).json({
      success: true,
      message: `Form 7-UFM incident ${finalDocket} logged successfully`,
      incident: created
    });
  } catch (err) {
    console.error('Error lodging UFM incident:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, error: 'Docket number already exists' });
    }
    res.status(500).json({ success: false, error: err.message || 'Database insert failed' });
  }
});

// PATCH /api/ufm/:docket_no - Update status or incident details
router.patch('/:docket_no', (req, res) => {
  try {
    const rawDocket = req.params.docket_no.replace(/-/g, '/').toUpperCase();
    const existing = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no = ?').get(rawDocket);

    if (!existing) {
      return res.status(404).json({ success: false, error: `Incident ${rawDocket} not found` });
    }

    const { status, evidence_notes, explanation, provisional_booklet_no } = req.body;
    const newStatus = status !== undefined ? status : existing.status;
    const newNotes = evidence_notes !== undefined ? evidence_notes : existing.evidence_notes;
    const newExpl = explanation !== undefined ? explanation : existing.explanation;
    const newBooklet = provisional_booklet_no !== undefined ? provisional_booklet_no : existing.provisional_booklet_no;

    db.prepare(`
      UPDATE ufm_incidents
      SET status = ?, evidence_notes = ?, explanation = ?, provisional_booklet_no = ?
      WHERE docket_no = ?
    `).run(newStatus, newNotes, newExpl, newBooklet, rawDocket);

    const updated = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no = ?').get(rawDocket);

    const io = req.app.get('io');
    if (io) {
      io.emit('ufm:updated', updated);
    }

    res.json({
      success: true,
      message: `Incident ${rawDocket} updated successfully`,
      incident: updated
    });
  } catch (err) {
    console.error('Error updating UFM incident:', err);
    res.status(500).json({ success: false, error: 'Database update failed' });
  }
});

module.exports = router;
