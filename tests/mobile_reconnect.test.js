const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');

async function testMobileReconnection() {
  console.log('--- STARTING MOBILE RECONNECTION TEST ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('disconnect', () => roomManager.handleDisconnect(socket));
  });

  const PORT = 3334;
  await new Promise(res => server.listen(PORT, res));

  // 1. Client creates room and gets sessionToken
  let client1 = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => client1.on('connect', res));

  let roomId = null;
  let sessionToken = null;

  const sessionPromise = new Promise(resolve => {
    client1.on('session_created', (data) => {
      sessionToken = data.sessionToken;
      roomId = data.roomId;
      resolve(data);
    });
  });

  client1.emit('create_room', { nickname: 'MobileGamer', avatar: '📱' });
  await sessionPromise;
  assert.ok(sessionToken, 'Must receive a sessionToken');
  assert.ok(roomId, 'Must receive a roomId');
  console.log(`✓ Room created: ${roomId}, Session Token: ${sessionToken}`);

  // 2. Client disconnects (simulating mobile switching apps or 4G)
  console.log('Simulating phone switching apps (disconnecting)...');
  client1.disconnect();
  await new Promise(r => setTimeout(r, 200));

  const room = roomManager.getRoom(roomId);
  assert.ok(room, 'Room must still exist during grace period');
  assert.strictEqual(room.players.length, 1);
  assert.strictEqual(room.players[0].isDisconnected, true, 'Player should be marked isDisconnected during grace period');
  console.log('✓ Player marked as disconnected without being kicked out immediately');

  // 3. Phone foregrounds and reconnects with same sessionToken
  console.log('Phone waking up and reconnecting with sessionToken...');
  const client1Reconnected = ioClient(`http://localhost:${PORT}`);
  await new Promise(res => client1Reconnected.on('connect', res));

  const rejoinPromise = new Promise(resolve => {
    client1Reconnected.on('room_updated', (updatedRoom) => {
      resolve(updatedRoom);
    });
  });

  client1Reconnected.emit('join_room', {
    roomId,
    sessionToken,
    nickname: 'MobileGamer'
  });

  const updatedRoom = await rejoinPromise;
  assert.strictEqual(updatedRoom.players.length, 1);
  assert.strictEqual(updatedRoom.players[0].isDisconnected, false, 'Player should be restored to connected state');
  console.log('✓ Player successfully reconnected and session restored seamlessly!');

  client1Reconnected.disconnect();
  server.close();
  console.log('--- MOBILE RECONNECTION TEST PASSED SUCCESSFULLY! 🎉 ---');
  process.exit(0);
}

testMobileReconnection().catch(err => {
  console.error('Mobile reconnection test failed:', err);
  process.exit(1);
});
