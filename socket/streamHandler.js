// Mobile Camera Stream Socket Handler & AI Detection Sentinel
const db = require('../database');

function registerStreamHandler(io, socket) {
  // Mobile stream status announce
  socket.on('cctv:stream_status', (data) => {
    socket.broadcast.emit('cctv:status_change', {
      ...data,
      senderId: socket.id,
      timestamp: Date.now()
    });
  });

  // High-performance canvas frame relay from mobile client to dashboard inspection modal
  socket.on('cctv:frame', (data) => {
    socket.broadcast.emit('cctv:remote_frame', {
      room: data.room || 'Room 501-LHS (Block E)',
      corner: data.corner || 'Corner A',
      frame: data.frame,
      fps: data.fps || 20,
      timestamp: data.timestamp || Date.now(),
      senderId: socket.id
    });
  });

  // WebRTC Signaling for CCTV Camera Node
  socket.on('webrtc:cctv_offer', (data) => {
    socket.broadcast.emit('webrtc:cctv_offer', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('webrtc:cctv_answer', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('webrtc:cctv_answer', {
        ...data,
        senderId: socket.id
      });
    } else {
      socket.broadcast.emit('webrtc:cctv_answer', {
        ...data,
        senderId: socket.id
      });
    }
  });

  socket.on('webrtc:cctv_ice', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('webrtc:cctv_ice', {
        ...data,
        senderId: socket.id
      });
    } else {
      socket.broadcast.emit('webrtc:cctv_ice', {
        ...data,
        senderId: socket.id
      });
    }
  });

  // ========================================================
  // REAL-TIME AI MOBILE PHONE DETECTION: UFM ALERT HANDLER
  // ========================================================
  socket.on('ufm_alert', (payload) => {
    try {
      const {
        room_id = 'Room 501-LHS (Block E)',
        detected_object = 'cell phone',
        confidence = 88,
        timestamp = new Date().toISOString(),
        snapshot_url = '',
        roll_no = 'OP-2024-8924',
        student_name = 'Vikramaditya Rao',
        desk = 'Desk A-02'
      } = payload;

      console.log(`[AI Detection Alert] Object: "${detected_object}" (${confidence}%) in ${room_id}`);

      // Auto-generate statutory docket number
      const maxRow = db.prepare('SELECT MAX(id) AS max_id FROM ufm_incidents').get();
      const nextNum = (maxRow && maxRow.max_id ? maxRow.max_id : 0) + 14;
      const autoDocket = `UFM/2024/${String(nextNum).padStart(3, '0')}`;

      // Insert auto-drafted Form 7-UFM incident into SQLite
      const insert = db.prepare(`
        INSERT INTO ufm_incidents (
          docket_no, roll_no, student_name, paper_code, evidence_notes, status,
          hall, desk, malpractice_type, answer_booklet_no, provisional_booklet_no,
          invigilator, explanation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const evidenceNotes = `Real-time AI Optical Sentinel detected active "${detected_object}" in camera stream with ${confidence}% confidence score. Optical evidence frame cataloged into statutory dossier.`;

      insert.run(
        autoDocket,
        roll_no,
        student_name,
        'CS-402 Distributed Systems',
        evidenceNotes,
        'CONFISCATED_HEARING_PENDING',
        room_id,
        desk,
        'Smart Device / Mobile Confiscated',
        'QB-4092',
        'QB-4122',
        'Dr. A. Sharma (Sr. Faculty)',
        'Smart device / mobile phone confiscated during examination optical sentinel monitoring.'
      );

      const createdIncident = db.prepare('SELECT * FROM ufm_incidents WHERE docket_no = ?').get(autoDocket);

      const alertBroadcast = {
        room_id,
        detected_object,
        confidence,
        timestamp,
        snapshot_url,
        docket_no: autoDocket,
        incident: createdIncident,
        senderId: socket.id
      };

      // Broadcast alert and created incident to all connected dashboards
      io.emit('ufm_alert', alertBroadcast);
      io.emit('ufm:created', createdIncident);
      io.emit('telemetry:stats_update', {
        type: 'ufm',
        action: 'mobile_detected',
        docket_no: autoDocket,
        room_id
      });
    } catch (err) {
      console.error('[UFM Alert Handler Error]', err);
      // Fallback broadcast so UI still reflects alert
      io.emit('ufm_alert', {
        ...payload,
        docket_no: 'UFM/2024/018',
        senderId: socket.id
      });
    }
  });
}

module.exports = registerStreamHandler;
