const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');

async function runLeaveRoomTests() {
  console.log('--- STARTING LEAVE ROOM TESTS ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('leave_room', () => roomManager.leaveRoom(socket));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('sync_session', (data) => roomManager.syncSession(socket, data));
  });

  const PORT = 3340;
  await new Promise((resolve) => server.listen(PORT, resolve));

  const client1 = ioClient(`http://localhost:${PORT}`);
  const client2 = ioClient(`http://localhost:${PORT}`);

  await Promise.all([
    new Promise(res => client1.on('connect', res)),
    new Promise(res => client2.on('connect', res))
  ]);
  console.log('✓ Both test clients connected to server');

  let testRoomId = null;
  let client2SessionToken = null;

  // 1. Create room
  const createPromise = new Promise(resolve => {
    client1.on('room_updated', (room) => {
      if (room.status === 'waiting' && !testRoomId) {
        testRoomId = room.id;
        resolve(room);
      }
    });
  });
  client1.emit('create_room', { nickname: 'Alice', avatar: '👩' });
  await createPromise;

  // 2. Client 2 joins and saves session token
  client2.on('session_created', (data) => {
    client2SessionToken = data.sessionToken;
  });

  const joinPromise = new Promise(resolve => {
    client2.on('room_updated', (room) => {
      if (room.players.length === 2 && room.status === 'waiting') resolve(room);
    });
  });
  client2.emit('join_room', { roomId: testRoomId, nickname: 'Bob', avatar: '👨' });
  await joinPromise;
  console.log(`✓ Both players joined room ${testRoomId}`);

  // 3. Start game
  const gameStartPromise = new Promise(resolve => {
    client1.on('room_updated', (room) => {
      if (room.status === 'playing') resolve(room);
    });
  });
  client1.emit('start_game');
  await gameStartPromise;
  console.log('✓ Game started');

  // 4. Bob (Client 2) clicks "Thoát" -> emits leave_room
  const client2LeftPromise = new Promise(resolve => {
    client2.on('room_left', resolve);
  });
  const hostMatchFinishedPromise = new Promise(resolve => {
    client1.on('match_finished', resolve);
  });

  client2.emit('leave_room');
  await client2LeftPromise;
  console.log('✓ Client 2 received room_left event');

  const finishPayload = await hostMatchFinishedPromise;
  assert(finishPayload.podium[0].nickname === 'Alice', 'Remaining player (Alice) should be the winner');
  console.log('✓ Host received match_finished because opponent left');

  const room = roomManager.getRoom(testRoomId);
  assert(room.players.length === 1, 'Only Alice should remain in room');
  assert(room.players[0].nickname === 'Alice', 'Alice is only player');
  console.log('✓ Bob was completely removed from room.players');

  // 5. Test Bob trying to sync old session
  client2.emit('sync_session', { roomId: testRoomId, sessionToken: client2SessionToken });
  await new Promise(r => setTimeout(r, 200));
  assert(room.players.length === 1, 'Bob cannot restore previous session after leaving');
  console.log('✓ Bob cannot reconnect or sync session with old token');

  // 6. Test Host leaving room (Alice leaves)
  const client1LeftPromise = new Promise(resolve => {
    client1.on('room_left', resolve);
  });
  client1.emit('leave_room');
  await client1LeftPromise;
  console.log('✓ Host Alice received room_left');

  // Since Alice was the last player, room should be deleted
  assert(!roomManager.getRoom(testRoomId), 'Room should be deleted when last player leaves');
  console.log('✓ Room was deleted when the last player left');

  // 7. Test host transfer when non-last host leaves
  const clientA = ioClient(`http://localhost:${PORT}`);
  const clientB = ioClient(`http://localhost:${PORT}`);
  await Promise.all([
    new Promise(res => clientA.on('connect', res)),
    new Promise(res => clientB.on('connect', res))
  ]);

  let room2Id = null;
  const create2Promise = new Promise(resolve => {
    clientA.on('room_updated', (r) => {
      if (!room2Id) {
        room2Id = r.id;
        resolve(r);
      }
    });
  });
  clientA.emit('create_room', { nickname: 'HostPlayer', avatar: '👑' });
  await create2Promise;

  const join2Promise = new Promise(resolve => {
    clientB.on('room_updated', (r) => {
      if (r.players.length === 2) resolve(r);
    });
  });
  clientB.emit('join_room', { roomId: room2Id, nickname: 'SecondPlayer', avatar: '🌟' });
  await join2Promise;

  // HostPlayer leaves
  const hostLeavePromise = new Promise(resolve => {
    clientB.on('room_updated', (r) => {
      const bInRoom = r.players.find(p => p.nickname === 'SecondPlayer');
      if (bInRoom && bInRoom.isHost && r.players.length === 1) resolve(r);
    });
  });
  clientA.emit('leave_room');
  const updatedR2 = await hostLeavePromise;
  assert(updatedR2.players[0].isHost === true, 'Second player should become new host');
  console.log('✓ Host transferred successfully when host left');

  clientA.disconnect();
  clientB.disconnect();
  client1.disconnect();
  client2.disconnect();
  server.close();

  console.log('--- ALL LEAVE ROOM TESTS PASSED! 🎉 ---');
}

runLeaveRoomTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
