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

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
});

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

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

  socket.on('send-message', ({ text, type, fileUrl, fileName }) => {
    if (!currentRoom || !currentUser) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const message = {
      id: crypto.randomBytes(8).toString('hex'),
      username: currentUser,
      text: type === 'text' ? (text || '').slice(0, 5000) : '',
      type: type || 'text',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      timestamp: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 500) {
      room.messages = room.messages.slice(-500);
    }

    io.to(currentRoom).emit('new-message', message);
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
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
