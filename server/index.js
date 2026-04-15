const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const defaultClientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = [
  defaultClientUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://variyaparth.github.io',
  'https://variyaparth.github.io/message',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use((req, _res, next) => {
  console.info('[http]', req.method, req.originalUrl, {
    origin: req.headers.origin,
    ip: req.ip,
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'quickchat-server',
    now: Date.now(),
  });
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many uploads, please try again later.' },
});

// Uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// File validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES];

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const roomDir = path.join(uploadsDir, req.params.roomId);
    if (!fs.existsSync(roomDir)) fs.mkdirSync(roomDir, { recursive: true });
    cb(null, roomDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// In-memory room store
const rooms = new Map();
const directMessages = new Map(); // Store: "user1:user2" => messages array
const userSockets = new Map(); // Store: username => socketId for DMs

function generateRoomId() {
  return crypto.randomBytes(6).toString('hex');
}

function validateRoomExists(req, res, next) {
  if (!rooms.has(req.params.roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  next();
}

// API Routes
app.get('/api/rooms/:roomId', validateRoomExists, (req, res) => {
  const room = rooms.get(req.params.roomId);
  res.json({
    id: room.id,
    name: room.name,
    theme: room.theme,
    createdBy: room.createdBy,
    users: Array.from(room.users.values()),
    createdAt: room.createdAt,
  });
});

app.post('/api/rooms/:roomId/upload', uploadLimiter, validateRoomExists, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.params.roomId}/${req.file.filename}`;
  const fileType = ALLOWED_IMAGE_TYPES.includes(req.file.mimetype) ? 'image' : 'audio';
  res.json({ url: fileUrl, type: fileType, originalName: req.file.originalname });
});

// Production static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

// Socket.io
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on('create-room', ({ username, roomName, theme }, callback) => {
    if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 30) {
      return callback({ error: 'Invalid username' });
    }
    const roomId = generateRoomId();
    const sanitizedName = (roomName || 'Chat Room').slice(0, 50);
    const room = {
      id: roomId,
      name: sanitizedName,
      theme: theme || 'dark',
      createdBy: username.trim(),
      users: new Map(),
      messages: [],
      createdAt: Date.now(),
    };
    rooms.set(roomId, room);
    callback({ roomId, roomName: room.name });
  });

  socket.on('join-room', ({ roomId, username }, callback) => {
    if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 30) {
      return callback({ error: 'Invalid username' });
    }
    if (!rooms.has(roomId)) {
      return callback({ error: 'Room not found' });
    }

    const room = rooms.get(roomId);
    const trimmedName = username.trim();

    if (currentRoom) {
      socket.leave(currentRoom);
      const prevRoom = rooms.get(currentRoom);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        io.to(currentRoom).emit('user-left', { username: currentUser, users: Array.from(prevRoom.users.values()) });
      }
    }

    currentRoom = roomId;
    currentUser = trimmedName;
    room.users.set(socket.id, trimmedName);
    userSockets.set(trimmedName, socket.id); // Track for DMs
    socket.join(roomId);

    const recentMessages = room.messages.slice(-100);

    callback({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        theme: room.theme,
        createdBy: room.createdBy,
        users: Array.from(room.users.values()),
        messages: recentMessages,
      },
    });

    socket.to(roomId).emit('user-joined', {
      username: trimmedName,
      users: Array.from(room.users.values()),
    });
  });

  socket.on('send-message', ({ text, type, fileUrl, fileName, replyTo, reactions, isPin, pinned }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Detect mentions in text
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    const messageText = type === 'text' ? (text || '').slice(0, 5000) : '';
    while ((match = mentionRegex.exec(messageText)) !== null) {
      mentions.push(match[1]);
    }

    const message = {
      id: crypto.randomBytes(8).toString('hex'),
      username: currentUser,
      text: messageText,
      type: type || 'text',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      replyTo: replyTo || null,
      timestamp: Date.now(),
      reactions: reactions || {},
      mentions: mentions,
      isPinned: isPin || pinned || false,
      read: {},
    };

    room.messages.push(message);
    if (room.messages.length > 500) {
      room.messages = room.messages.slice(-500);
    }

    io.to(currentRoom).emit('new-message', message);

    // Notify mentioned users
    if (mentions.length > 0) {
      const connectedUsers = Array.from(room.users.values());
      mentions.forEach((mention) => {
        if (connectedUsers.includes(mention) && mention !== currentUser) {
          io.to(currentRoom).emit('user-mentioned', {
            mentionedUser: mention,
            mentionedBy: currentUser,
            messageId: message.id,
            preview: messageText.slice(0, 50),
          });
        }
      });
    }
  });

  socket.on('unsend-message', ({ messageId }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const msgIndex = room.messages.findIndex((m) => m.id === messageId && m.username === currentUser);
    if (msgIndex === -1) return;

    room.messages.splice(msgIndex, 1);
    io.to(currentRoom).emit('message-unsent', { messageId });
  });

  socket.on('edit-message', ({ messageId, text }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    if (!messageId || typeof text !== 'string') return;

    const msg = room.messages.find((m) => m.id === messageId);
    if (!msg) return;
    if (msg.username !== currentUser) return;
    if (msg.type !== 'text') return;

    const nextText = text.slice(0, 5000).trim();
    if (!nextText) return;

    msg.text = nextText;
    msg.editedAt = Date.now();
    msg.isEdited = true;

    io.to(currentRoom).emit('message-edited', {
      messageId: msg.id,
      text: msg.text,
      editedAt: msg.editedAt,
      isEdited: true,
    });
  });

  socket.on('set-reaction', ({ messageId, emoji }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return;

    if (!message.reactions) message.reactions = {};
    if (!message.reactions[emoji]) message.reactions[emoji] = [];

    if (message.reactions[emoji].includes(currentUser)) {
      message.reactions[emoji] = message.reactions[emoji].filter((u) => u !== currentUser);
      if (message.reactions[emoji].length === 0) delete message.reactions[emoji];
    } else {
      message.reactions[emoji].push(currentUser);
    }

    io.to(currentRoom).emit('reaction-updated', { messageId, reactions: message.reactions });
  });

  socket.on('pin-message', ({ messageId }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room || room.createdBy !== currentUser) return;

    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return;

    message.isPinned = !message.isPinned;
    room.pinnedMessages = room.pinnedMessages || [];
    if (message.isPinned && !room.pinnedMessages.includes(messageId)) {
      room.pinnedMessages.push(messageId);
    } else {
      room.pinnedMessages = room.pinnedMessages.filter((id) => id !== messageId);
    }

    io.to(currentRoom).emit('message-pinned', { messageId, isPinned: message.isPinned, pinnedMessages: room.pinnedMessages });
  });

  socket.on('mark-as-read', ({ messageId }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const message = room.messages.find((m) => m.id === messageId);
    if (!message) return;

    if (!message.read) message.read = {};
    message.read[currentUser] = Date.now();

    io.to(currentRoom).emit('message-read-updated', { messageId, read: message.read });
  });

  socket.on('get-user-status', (callback) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const statuses = {};
    Array.from(room.users.entries()).forEach(([socketId, username]) => {
      statuses[username] = 'online';
    });

    callback(statuses);
  });

  socket.on('send-dm', ({ recipientUsername, text }) => {
    if (!currentUser) return;
    const dmKey = [currentUser, recipientUsername].sort().join(':');
    
    if (!directMessages.has(dmKey)) {
      directMessages.set(dmKey, []);
    }

    const dmMessage = {
      id: crypto.randomBytes(8).toString('hex'),
      from: currentUser,
      to: recipientUsername,
      text: text.slice(0, 5000),
      timestamp: Date.now(),
      read: false,
    };

    directMessages.get(dmKey).push(dmMessage);
    if (directMessages.get(dmKey).length > 100) {
      directMessages.set(dmKey, directMessages.get(dmKey).slice(-100));
    }

    // Find recipient socket and send message
    const recipientSocketId = userSockets.get(recipientUsername);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('dm-received', dmMessage);
    }

    // Also emit to sender for confirmation
    socket.emit('dm-sent', dmMessage);
  });

  socket.on('get-dms', ({ otherUser }, callback) => {
    if (!currentUser) return;
    const dmKey = [currentUser, otherUser].sort().join(':');
    const messages = directMessages.get(dmKey) || [];
    callback(messages);
  });

  socket.on('mark-dm-read', ({ from }) => {
    if (!currentUser) return;
    const dmKey = [currentUser, from].sort().join(':');
    const messages = directMessages.get(dmKey);
    if (!messages) return;

    messages.forEach((message) => {
      if (message.from === from && message.to === currentUser) {
        message.read = true;
      }
    });
  });

  socket.on('get-dm-list', (callback) => {
    if (!currentUser) return;
    const dmList = [];
    directMessages.forEach((messages, key) => {
      const users = key.split(':');
      if (users.includes(currentUser)) {
        const otherUser = users[0] === currentUser ? users[1] : users[0];
        const lastMsg = messages[messages.length - 1];
        dmList.push({
          username: otherUser,
          lastMessage: lastMsg.text,
          timestamp: lastMsg.timestamp,
          unread: messages.filter((m) => m.to === currentUser && !m.read).length,
        });
      }
    });
    callback(dmList.sort((a, b) => b.timestamp - a.timestamp));
  });

  socket.on('typing', (isTyping) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('user-typing', { username: currentUser, isTyping });
  });

  socket.on('update-room', ({ name, theme }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room || room.createdBy !== currentUser) return;

    if (name && typeof name === 'string') room.name = name.slice(0, 50);
    if (theme && typeof theme === 'string') room.theme = theme.slice(0, 20);

    io.to(currentRoom).emit('room-updated', { name: room.name, theme: room.theme });
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        io.to(currentRoom).emit('user-left', {
          username: currentUser,
          users: Array.from(room.users.values()),
        });

        if (room.users.size === 0) {
          const roomToClean = currentRoom;
          setTimeout(() => {
            const r = rooms.get(roomToClean);
            if (r && r.users.size === 0) {
              rooms.delete(roomToClean);
              const roomDir = path.join(uploadsDir, roomToClean);
              if (fs.existsSync(roomDir)) {
                fs.rmSync(roomDir, { recursive: true, force: true });
              }
            }
          }, 5 * 60 * 1000);
        }
      }
      userSockets.delete(currentUser);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Server running', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    clientUrl: defaultClientUrl,
    allowedOrigins,
  });
});
