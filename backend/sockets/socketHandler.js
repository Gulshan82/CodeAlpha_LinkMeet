module.exports = (io) => {
  // Store active polls in memory per meeting
  // Structure: { meetingId: [ { id, question, options: [{text, votes: []}], creatorSocketId } ] }
  const activePolls = {};

  // Store users waiting for admittance
  // Structure: { meetingId: [ { socketId, user } ] }
  const waitingRooms = {};

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a meeting room (direct entry or after host approves)
    socket.on('join-room', ({ meetingId, user }) => {
      socket.meetingId = meetingId;
      socket.user = user;
      socket.audioMuted = false;
      socket.videoMuted = false;
      socket.isRaised = false;

      // Join the socket.io room channel
      socket.join(meetingId);
      console.log(`User ${user.fullName} (${socket.id}) joined room: ${meetingId}`);

      // Retrieve all other sockets in this room to establish WebRTC peer mesh
      const clients = io.sockets.adapter.rooms.get(meetingId);
      const otherUsers = [];

      if (clients) {
        clients.forEach((clientSocketId) => {
          if (clientSocketId !== socket.id) {
            const clientSocket = io.sockets.sockets.get(clientSocketId);
            if (clientSocket && clientSocket.user) {
              otherUsers.push({
                socketId: clientSocketId,
                user: clientSocket.user,
                audioMuted: clientSocket.audioMuted || false,
                videoMuted: clientSocket.videoMuted || false,
                isRaised: clientSocket.isRaised || false,
              });
            }
          }
        });
      }

      // Send the list of existing participants back to the joiner
      socket.emit('room-users', otherUsers);

      // Broadcast join event to all existing peers in the meeting
      socket.to(meetingId).emit('user-joined', {
        socketId: socket.id,
        user: socket.user,
        audioMuted: socket.audioMuted || false,
        videoMuted: socket.videoMuted || false,
        isRaised: socket.isRaised || false,
      });

      // Synchronize existing polls for this room to the joining user
      if (activePolls[meetingId]) {
        socket.emit('sync-polls', activePolls[meetingId]);
      }
    });

    // WebRTC Signaling relays
    socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc-offer', {
        senderSocketId: socket.id,
        offer,
      });
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // Real-Time Chat Relays
    socket.on('send-message', (messageData) => {
      if (socket.meetingId) {
        socket.to(socket.meetingId).emit('message-received', messageData);
      }
    });

    // Interactive Whiteboard Draw sync
    socket.on('draw', (drawData) => {
      if (socket.meetingId) {
        socket.to(socket.meetingId).emit('draw', drawData);
      }
    });

    socket.on('clear-board', () => {
      if (socket.meetingId) {
        socket.to(socket.meetingId).emit('clear-board');
      }
    });

    socket.on('undo-board', () => {
      if (socket.meetingId) {
        socket.to(socket.meetingId).emit('undo-board');
      }
    });

    // File Upload sync notice
    socket.on('file-uploaded', (fileData) => {
      if (socket.meetingId) {
        socket.to(socket.meetingId).emit('file-received', fileData);
      }
    });

    // Hand Raising sync
    socket.on('toggle-hand-raise', (isRaised) => {
      if (socket.meetingId) {
        socket.isRaised = isRaised;
        socket.to(socket.meetingId).emit('hand-raised-status', {
          socketId: socket.id,
          isRaised,
        });
      }
    });

    // Mute/Camera toggle broadcast
    socket.on('toggle-mute', ({ trackType, isMuted }) => {
      if (socket.meetingId) {
        if (trackType === 'audio') {
          socket.audioMuted = isMuted;
        } else if (trackType === 'video') {
          socket.videoMuted = isMuted;
        }
        socket.to(socket.meetingId).emit('mute-status-changed', {
          socketId: socket.id,
          trackType,
          isMuted,
        });
      }
    });

    // Emoji reactions
    socket.on('send-emoji', (emoji) => {
      if (socket.meetingId) {
        io.to(socket.meetingId).emit('emoji-received', {
          socketId: socket.id,
          emoji,
        });
      }
    });

    // Polls controls
    socket.on('create-poll', (pollData) => {
      const meetingId = socket.meetingId;
      if (!meetingId) return;

      if (!activePolls[meetingId]) {
        activePolls[meetingId] = [];
      }

      const newPoll = {
        id: Date.now().toString(),
        question: pollData.question,
        options: pollData.options.map(opt => ({ text: opt, votes: [] })),
        creatorSocketId: socket.id,
      };

      activePolls[meetingId].push(newPoll);
      io.to(meetingId).emit('poll-created', newPoll);
    });

    socket.on('cast-vote', ({ pollId, optionIndex, userId }) => {
      const meetingId = socket.meetingId;
      if (!meetingId || !activePolls[meetingId]) return;

      const poll = activePolls[meetingId].find(p => p.id === pollId);
      if (poll) {
        // Remove vote from other options if user already voted (single choice poll)
        poll.options.forEach(opt => {
          opt.votes = opt.votes.filter(id => id !== userId);
        });
        // Add vote
        poll.options[optionIndex].votes.push(userId);
        io.to(meetingId).emit('poll-updated', poll);
      }
    });

    // Waiting Room requests
    socket.on('request-admittance', ({ meetingId, user, hostSocketId }) => {
      // Register socket details for approval phase
      socket.meetingId = meetingId;
      socket.user = user;

      console.log(`User ${user.fullName} requesting admittance to room ${meetingId}`);
      if (!waitingRooms[meetingId]) {
        waitingRooms[meetingId] = [];
      }
      waitingRooms[meetingId].push({ socketId: socket.id, user });

      // Notify host
      if (hostSocketId) {
        io.to(hostSocketId).emit('waiting-user-join-request', {
          socketId: socket.id,
          user,
        });
      }
    });

    socket.on('approve-user', ({ guestSocketId }) => {
      const meetingId = socket.meetingId;
      if (waitingRooms[meetingId]) {
        waitingRooms[meetingId] = waitingRooms[meetingId].filter(
          item => item.socketId !== guestSocketId
        );
      }
      io.to(guestSocketId).emit('admittance-approved');
    });

    socket.on('reject-user', ({ guestSocketId }) => {
      const meetingId = socket.meetingId;
      if (waitingRooms[meetingId]) {
        waitingRooms[meetingId] = waitingRooms[meetingId].filter(
          item => item.socketId !== guestSocketId
        );
      }
      io.to(guestSocketId).emit('admittance-rejected');
    });

    // Moderator Controls
    socket.on('mute-participant', ({ targetSocketId, trackType, muteState }) => {
      io.to(targetSocketId).emit('mute-command', { trackType, muteState });
    });

    socket.on('remove-participant', ({ targetSocketId }) => {
      io.to(targetSocketId).emit('kick-command');
    });

    // Client disconnection handler
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const meetingId = socket.meetingId;

      if (meetingId) {
        // Broadcast user departure to room peers
        socket.to(meetingId).emit('user-left', {
          socketId: socket.id,
          user: socket.user,
        });

        // Clean up waiting room entry
        if (waitingRooms[meetingId]) {
          waitingRooms[meetingId] = waitingRooms[meetingId].filter(
            item => item.socketId !== socket.id
          );
        }
      }
    });
  });
};
