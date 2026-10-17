const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');

async function testNoTimerAndTabSwitch() {
  console.log('--- STARTING NO-TIMER & TAB-SWITCH RECOVERY TEST ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('submit_word', (word) => roomManager.submitWord(socket, word));
    socket.on('disconnect', () => roomManager.handleDisconnect(socket));
  });

  const PORT = 3336;
  await new Promise(res => server.listen(PORT, res));

  // 1. Create room with turnDuration: 0 (Không tính giờ)
  const client1 = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => client1.on('connect', res));

  let roomId = null;
  let sessionToken1 = null;

  const session1Promise = new Promise(resolve => {
    client1.on('session_created', data => {
      sessionToken1 = data.sessionToken;
      roomId = data.roomId;
      resolve(data);
    });
  });

  client1.emit('create_room', {
    nickname: 'ChiCa',
    avatar: '🐰',
    turnDuration: 0,
    isUnlimitedTime: true,
    maxRounds: 3
  });

  await session1Promise;
  assert.ok(roomId, 'Must have roomId');
  console.log(`✓ Room created with NO TIMER: ${roomId}`);

  // 2. Client 2 joins
  const client2 = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => client2.on('connect', res));

  let sessionToken2 = null;
  const session2Promise = new Promise(resolve => {
    client2.on('session_created', data => {
      sessionToken2 = data.sessionToken;
      resolve(data);
    });
  });

  client2.emit('join_room', {
    roomId,
    nickname: 'ChiHai',
    avatar: '🐱'
  });
  await session2Promise;
  console.log('✓ ChiHai joined room');

  // 3. Verify room has turnDuration = 0
  const room = roomManager.getRoom(roomId);
  assert.strictEqual(room.turnDuration, 0, 'Turn duration must be 0 for unlimited time');

  // 4. Start game and verify timer_tick emits isUnlimited: true
  let receivedUnlimitedTick = false;
  client1.on('timer_tick', (tick) => {
    if (tick.isUnlimited || tick.totalDuration === 0) {
      receivedUnlimitedTick = true;
    }
  });

  client1.emit('start_game');
  await new Promise(r => setTimeout(r, 600));

  assert.strictEqual(room.status, 'playing', 'Match must be playing');
  assert.ok(receivedUnlimitedTick, 'timer_tick must notify client that timer is unlimited');
  console.log('✓ Game started with unlimited time (no countdown timeout)');

  // 5. Test tab-switch simulation:
  // Client 2 switches tabs (disconnects socket), stays away for 2 seconds
  console.log('Simulating ChiHai switching tabs during active match...');
  client2.disconnect();
  await new Promise(r => setTimeout(r, 1000));

  // Player must NOT be eliminated after disconnect
  const player2 = room.players.find(p => p.sessionToken === sessionToken2);
  assert.ok(player2, 'Player 2 must still be in room');
  assert.strictEqual(player2.isAlive, true, 'Player 2 must still be alive during tab switch');
  console.log('✓ ChiHai remains in room and ALIVE while tabbed out');

  // 6. ChiHai switches back to tab (reconnects with sessionToken)
  console.log('ChiHai switches back to tab (reconnecting)...');
  const client2Reconnected = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => client2Reconnected.on('connect', res));

  const roomUpdatePromise = new Promise(resolve => {
    client2Reconnected.on('room_updated', updated => {
      resolve(updated);
    });
  });

  client2Reconnected.emit('join_room', {
    roomId,
    sessionToken: sessionToken2,
    nickname: 'ChiHai'
  });

  const updatedRoom = await roomUpdatePromise;
  assert.strictEqual(updatedRoom.status, 'playing', 'Game must still be playing');
  const p2After = updatedRoom.players.find(p => p.sessionToken === sessionToken2);
  assert.strictEqual(p2After.isDisconnected, false, 'Player 2 status must be active');
  assert.strictEqual(p2After.isAlive, true, 'Player 2 must still be alive');
  console.log('✓ ChiHai reconnected seamlessly, recovered room and active game board!');

  // Cleanup
  client1.disconnect();
  client2Reconnected.disconnect();
  server.close();
  console.log('--- ALL NO-TIMER & TAB-SWITCH RECOVERY TESTS PASSED! 🎉 ---');
  process.exit(0);
}

testNoTimerAndTabSwitch().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
