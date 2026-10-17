const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const dictionary = require('./src/dictionary');
const RoomManager = require('./src/roomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// Prevent aggressive client-side caching of HTML, JS, and CSS files
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));

const os = require('os');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const roomManager = new RoomManager(io);

// Health check endpoint for uptime monitoring & keep-alive
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API route to get dictionary status and stats
app.get('/api/stats', (req, res) => {
  const localIp = getLocalIp();
  res.json({
    dictionarySize: dictionary.wordSet.size,
    headSyllablesCount: dictionary.graph.size,
    activeRooms: roomManager.rooms.size,
    localIp,
    port: process.env.PORT || 3000
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  // Create new room
  socket.on('create_room', (data) => {
    try {
      roomManager.createRoom(socket, data || {});
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('error_message', 'Có lỗi khi tạo phòng!');
    }
  });

  // Join existing room
  socket.on('join_room', (data) => {
    try {
      if (!data || !data.roomId) {
        socket.emit('error_message', 'Mã phòng không được để trống!');
        return;
      }
      roomManager.joinRoom(socket, data.roomId, data);
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error_message', 'Có lỗi khi vào phòng!');
    }
  });

  // Toggle ready status
  socket.on('toggle_ready', () => {
    roomManager.toggleReady(socket);
  });

  // Add AI bot opponent
  socket.on('add_bot', () => {
    roomManager.addBot(socket);
  });

  // Remove AI bot opponent
  socket.on('remove_bot', (botId) => {
    roomManager.removeBot(socket, botId);
  });

  // Start game
  socket.on('start_game', () => {
    roomManager.startGame(socket);
  });

  // Restart match from beginning
  socket.on('restart_game', () => {
    roomManager.restartGame(socket);
  });

  // Return to waiting lobby without leaving room
  socket.on('return_to_lobby', () => {
    roomManager.returnToLobby(socket);
  });

  // Request rematch notification
  socket.on('request_rematch', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      roomManager.sendRefereeMessage(roomId, `🙋 @${player.nickname} muốn chơi lại ván mới!`);
    }
  });

  // Submit word during game
  socket.on('submit_word', (data) => {
    const word = typeof data === 'string' ? data : data?.word;
    roomManager.submitWord(socket, word);
  });

  // Request word hint (1 per round per player)
  socket.on('request_hint', () => {
    roomManager.requestHint(socket);
  });

  // Synchronize room session on tab focus / visibility
  socket.on('sync_session', (data) => {
    try {
      if (data && data.roomId) {
        roomManager.syncSession(socket, data);
      }
    } catch (err) {
      console.error('Error syncing session:', err);
    }
  });

  // General chat / banter message
  socket.on('send_chat', (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const text = (typeof data === 'string' ? data : data?.text || '').trim();
    if (!text) return;

    const bubblePayload = {
      senderId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
    roomManager.addHistory(room, 'chat_bubble', bubblePayload);
    io.to(roomId).emit('chat_bubble', bubblePayload);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`===============================================`);
  console.log(`🎮 Game Nối Từ Tiếng Việt Multiplayer Server 🎮`);
  console.log(`💻 Trình duyệt máy tính: http://localhost:${PORT}`);
  console.log(`📱 Chơi trên điện thoại (cùng Wi-Fi): http://${localIp}:${PORT}`);
  console.log(`📚 Từ điển đã nạp: ${dictionary.wordSet.size} từ ghép tiếng Việt`);
  console.log(`===============================================`);

  // Render Free Tier Keep-Alive: Ping itself every 10 minutes to prevent cold sleep
  const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://game-noi-tu-a6ja.onrender.com';
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes (Render spins down after 15 min idle)
    setInterval(async () => {
      try {
        const res = await fetch(`${RENDER_EXTERNAL_URL}/health`);
        console.log(`[Keep-Alive] Pinged ${RENDER_EXTERNAL_URL}/health - Status: ${res.status}`);
      } catch (err) {
        console.warn(`[Keep-Alive] Ping warning: ${err.message}`);
      }
    }, PING_INTERVAL);
    console.log(`[Keep-Alive] Auto-ping active for ${RENDER_EXTERNAL_URL} every 10 minutes.`);
  }
});
