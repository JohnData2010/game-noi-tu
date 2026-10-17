const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');

async function testTabSwitchAndHistory() {
  console.log('--- STARTING TAB-SWITCH & CHAT HISTORY TEST ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('submit_word', (word) => roomManager.submitWord(socket, word));
    socket.on('sync_session', (data) => roomManager.syncSession(socket, data));
    socket.on('disconnect', () => roomManager.handleDisconnect(socket));
  });

  const PORT = 3337;
  await new Promise(res => server.listen(PORT, res));

  // 1. Client 1 creates timed room
  const c1 = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => c1.on('connect', res));

  let roomId = null;
  let token1 = null;
  c1.on('session_created', data => {
    token1 = data.sessionToken;
    roomId = data.roomId;
  });

  c1.emit('create_room', {
    nickname: 'Alice',
    avatar: '🐰',
    turnDuration: 15,
    maxRounds: 3
  });

  await new Promise(r => setTimeout(r, 200));
  assert.ok(roomId);

  // 2. Client 2 joins
  const c2 = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => c2.on('connect', res));
  let token2 = null;
  c2.on('session_created', data => {
    token2 = data.sessionToken;
  });
  c2.emit('join_room', { roomId, nickname: 'Bob', avatar: '🦊' });
  await new Promise(r => setTimeout(r, 200));

  // 3. Start game
  c1.emit('start_game');
  await new Promise(r => setTimeout(r, 300));

  const room = roomManager.getRoom(roomId);
  assert.strictEqual(room.status, 'playing');
  assert.ok(room.chatHistory.length > 0, 'Room must have recorded opening turn in chatHistory');
  console.log('✓ Game started and recorded initial turn in chatHistory');

  // Active player submits a valid move
  const activePlayer = room.players[room.turnIndex];
  const activeClient = activePlayer.nickname === 'Alice' ? c1 : c2;
  const options = require('../src/dictionary').getNextOptions(room.expectedSyllable, room.usedWords);
  assert.ok(options.length > 0, 'Must have next options');
  const moveWord = options[0];

  activeClient.emit('submit_word', moveWord);
  await new Promise(r => setTimeout(r, 300));
  assert.ok(room.chatHistory.some(item => item.type === 'player_message' && item.data.word === moveWord));
  console.log(`✓ Player submitted "${moveWord}" and saved to chatHistory`);

  // 4. Test active player disconnecting -> timer should pause
  const currentActive = room.players[room.turnIndex];
  const currentClient = currentActive.nickname === 'Alice' ? c1 : c2;
  console.log(`Active player is @${currentActive.nickname}. Disconnecting socket (simulating mobile tab switch)...`);
  
  currentClient.disconnect();
  await new Promise(r => setTimeout(r, 500));

  assert.strictEqual(currentActive.isDisconnected, true);
  assert.strictEqual(room.isTimerPaused, true, 'Timer must be paused when active player disconnects');
  console.log('✓ Turn timer successfully paused while active player is tabbed out');

  // 5. Active player switches back to tab (reconnects)
  console.log(`@${currentActive.nickname} reconnects with sessionToken...`);
  const activeReconnected = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => activeReconnected.on('connect', res));

  let receivedHistory = null;
  activeReconnected.on('chat_history', (hist) => {
    receivedHistory = hist;
  });

  activeReconnected.emit('join_room', {
    roomId,
    sessionToken: currentActive.sessionToken,
    nickname: currentActive.nickname
  });
  await new Promise(r => setTimeout(r, 500));

  assert.strictEqual(currentActive.isDisconnected, false);
  assert.strictEqual(room.isTimerPaused, false, 'Timer must be resumed after active player reconnects');
  assert.ok(receivedHistory && receivedHistory.length >= 2, 'Must have received full chat history upon reconnect');
  console.log('✓ Turn timer resumed and full chat history recovered cleanly upon reconnect!');

  // Cleanup
  c1.disconnect();
  c2.disconnect();
  activeReconnected.disconnect();
  server.close();
  console.log('--- ALL TAB-SWITCH & CHAT HISTORY TESTS PASSED! 🎉 ---');
  process.exit(0);
}

testTabSwitchAndHistory().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
