const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/dispatch - List recent dispatches
router.get('/', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM dispatch_logs ORDER BY id DESC LIMIT 50').all();
    res.json({
      success: true,
      total: logs.length,
      dispatches: logs
    });
  } catch (err) {
    console.error('Error fetching dispatch logs:', err);
    res.status(500).json({ success: false, error: 'Database query failed' });
  }
});

// POST /api/dispatch - Trigger Flying Squad or Patrol Ping
router.post('/', (req, res) => {
  try {
    const {
      type = 'flying_squad',
      hall = 'Room 501-LHS (Block E)',
      staff_id = 'SQ-02',
      staff_name,
      message,
      priority = 'CRITICAL'
    } = req.body;

    const timestamp = new Date().toISOString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dispatchId = `DSP-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const defaultMsg = type === 'flying_squad'
      ? `Emergency Flying Squad #02 deployed to ${hall}. Rapid response protocol active.`
      : `Tactical Patrol Beacon ping transmitted to ${staff_name || staff_id} at ${hall}.`;

    const finalMessage = message || defaultMsg;

    db.prepare(`
      INSERT INTO dispatch_logs (dispatch_id, type, hall, staff_id, message, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dispatchId, type, hall, staff_id, finalMessage, 'DISPATCHED_EN_ROUTE');

    const dispatchRecord = {
      dispatch_id: dispatchId,
      type,
      hall,
      staff_id,
      staff_name,
      message: finalMessage,
      priority,
      eta: '3 Minutes',
      timestamp
    };

    // Broadcast instant socket alarm with sound trigger payload
    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:alarm', {
        ...dispatchRecord,
        sound: 'siren_chime',
        alertLevel: 'HIGH_PRIORITY'
      });

      // Also emit to telemetry hub
      io.emit('telemetry:stats_update', {
        type: 'dispatch',
        dispatch_id: dispatchId,
        hall
      });
    }

    res.status(200).json({
      success: true,
      dispatch_id: dispatchId,
      eta: '3 Minutes',
      squad: 'Flying Squad #02 (Unit Alpha)',
      hall,
      message: finalMessage,
      timestamp
    });
  } catch (err) {
    console.error('Error handling dispatch:', err);
    res.status(500).json({ success: false, error: 'Dispatch broadcast failed' });
  }
});

module.exports = router;
