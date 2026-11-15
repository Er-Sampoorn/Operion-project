// Intercom Push-to-Talk Two-Way Audio Socket Handler
const activeIntercomPeers = new Map();

function registerIntercomHandler(io, socket) {
  // Join Intercom Line
  socket.on('intercom:join', (data) => {
    const peerInfo = {
      socketId: socket.id,
      name: data.name || `Operator-${socket.id.slice(0, 4)}`,
      role: data.role || 'Apex Command Desk',
      joinedAt: Date.now()
    };
    activeIntercomPeers.set(socket.id, peerInfo);

    // Send current peer list to the new joiner
    socket.emit('intercom:peer_list', Array.from(activeIntercomPeers.values()));

    // Broadcast new peer to existing operators
    socket.broadcast.emit('intercom:peer_joined', peerInfo);
  });

  // WebRTC Audio Signaling: Offer
  socket.on('intercom:offer', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('intercom:offer', {
        sdp: data.sdp,
        senderId: socket.id,
        senderName: data.senderName
      });
    } else {
      socket.broadcast.emit('intercom:offer', {
        sdp: data.sdp,
        senderId: socket.id,
        senderName: data.senderName
      });
    }
  });

  // WebRTC Audio Signaling: Answer
  socket.on('intercom:answer', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('intercom:answer', {
        sdp: data.sdp,
        senderId: socket.id
      });
    } else {
      socket.broadcast.emit('intercom:answer', {
        sdp: data.sdp,
        senderId: socket.id
      });
    }
  });

  // WebRTC Audio Signaling: ICE Candidate
  socket.on('intercom:ice', (data) => {
    if (data.targetId) {
      io.to(data.targetId).emit('intercom:ice', {
        candidate: data.candidate,
        senderId: socket.id
      });
    } else {
      socket.broadcast.emit('intercom:ice', {
        candidate: data.candidate,
        senderId: socket.id
      });
    }
  });

  // Push-To-Talk (PTT) State Synchronization
  socket.on('intercom:ptt', (data) => {
    socket.broadcast.emit('intercom:ptt_state', {
      talking: data.talking,
      name: data.name || (activeIntercomPeers.get(socket.id) || {}).name || 'Operator',
      senderId: socket.id
    });
  });

  // Direct Audio Streaming fallback (via Socket.io audio chunk broadcast for guaranteed 0-NAT failure)
  socket.on('intercom:audio_chunk', (data) => {
    socket.broadcast.emit('intercom:remote_audio', {
      audio: data.audio, // base64 / ArrayBuffer audio blob
      senderId: socket.id,
      senderName: data.senderName
    });
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    if (activeIntercomPeers.has(socket.id)) {
      activeIntercomPeers.delete(socket.id);
      io.emit('intercom:peer_left', { socketId: socket.id });
    }
  });
}

module.exports = registerIntercomHandler;
