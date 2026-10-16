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
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

  // Submit word during game
  socket.on('submit_word', (data) => {
    const word = typeof data === 'string' ? data : data?.word;
    roomManager.submitWord(socket, word);
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

    io.to(roomId).emit('chat_bubble', {
      senderId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const localIp = getLocalIp();
  console.log(`===============================================`);
  console.log(`🎮 Game Nối Từ Tiếng Việt Multiplayer Server 🎮`);
  console.log(`💻 Trình duyệt máy tính: http://localhost:${PORT}`);
  console.log(`📱 Chơi trên điện thoại (cùng Wi-Fi): http://${localIp}:${PORT}`);
  console.log(`📚 Từ điển đã nạp: ${dictionary.wordSet.size} từ ghép tiếng Việt`);
  console.log(`===============================================`);
});
