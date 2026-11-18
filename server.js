const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const ufmRoutes = require('./routes/ufm');
const dispatchRoutes = require('./routes/dispatch');
const seatingRoutes = require('./routes/seating');
const operationalRoutes = require('./routes/operational');
const registerStreamHandler = require('./socket/streamHandler');
const registerIntercomHandler = require('./socket/intercomHandler');
const db = require('./database');

const app = express();
const server = http.createServer(app);

// Configure Socket.io with permissive CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  },
  maxHttpBufferSize: 1e8 // 100MB for video frame buffers
});

// Attach io instance to express app
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Mount REST APIs
app.use('/api/ufm', ufmRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/seating', seatingRoutes);
app.use('/api', operationalRoutes);

// OpenAPI Spec for Health Checks & Swagger
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.2',
    info: {
      title: 'OPERION Examination Operations API',
      version: '2.0.0',
      description: 'Full-stack exam surveillance, Form 7-UFM incident registry, WebRTC intercom, and zig-zag seating generation.'
    },
    paths: {
      '/api/ufm': {
        get: { summary: 'List Form 7-UFM incidents' },
        post: { summary: 'Lodge new Form 7-UFM incident' }
      },
      '/api/dispatch': {
        post: { summary: 'Dispatch Flying Squad or Patrol Beacon' }
      },
      '/api/seating/generate': {
        post: { summary: 'Generate anti-cheating zig-zag seating matrix' }
      },
      '/api/students': {
        get: { summary: 'Get candidate registry' }
      },
      '/api/faculty': {
        get: { summary: 'Get faculty proctor rosters' }
      }
    }
  });
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Register Modular Handlers
  registerStreamHandler(io, socket);
  registerIntercomHandler(io, socket);

  // General Telemetry Ping
  socket.on('telemetry:ping', () => {
    socket.emit('telemetry:pong', {
      timestamp: Date.now(),
      status: 'OPERATIONAL',
      connectedClients: io.engine.clientsCount
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
  });
});

if (require.main === module) {
  // Periodic Telemetry Heartbeat Broadcast
  setInterval(() => {
    try {
      const activeUfmCount = db.prepare(
        "SELECT COUNT(*) as count FROM ufm_incidents WHERE status NOT IN ('RESOLVED', 'DISMISSED')"
      ).get().count;

      io.emit('telemetry:heartbeat', {
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        activeUFM: activeUfmCount,
        clientsOnline: io.engine.clientsCount,
        systemStatus: 'NOMINAL'
      });
    } catch (e) {
      // ignore
    }
  }, 5000);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  OPERION Exam Operations System Online on Port ${PORT}`);
    console.log(`  Dashboard:  http://localhost:${PORT}`);
    console.log(`  Mobile Cam: http://localhost:${PORT}/stream.html`);
    console.log(`  REST APIs:  http://localhost:${PORT}/api/ufm`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.io = io;
