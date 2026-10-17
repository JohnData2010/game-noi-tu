const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');
const dictionary = require('../src/dictionary');

async function runRematchTests() {
  console.log('--- STARTING REMATCH & RETURN TO LOBBY TESTS ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('restart_game', () => roomManager.restartGame(socket));
    socket.on('return_to_lobby', () => roomManager.returnToLobby(socket));
    socket.on('submit_word', (data) => roomManager.submitWord(socket, data));
  });

  const PORT = 3339;
  await new Promise((resolve) => server.listen(PORT, resolve));

  const client1 = ioClient(`http://localhost:${PORT}`);
  const client2 = ioClient(`http://localhost:${PORT}`);

  await Promise.all([
    new Promise(res => client1.on('connect', res)),
    new Promise(res => client2.on('connect', res))
  ]);
  console.log('✓ Both test clients connected to server');

  let testRoomId = null;

  // 1. Create room with maxRounds = 1
  const createPromise = new Promise(resolve => {
    client1.on('room_updated', (room) => {
      if (room.status === 'waiting' && !testRoomId) {
        testRoomId = room.id;
        resolve(room);
      }
    });
  });
  client1.emit('create_room', { nickname: 'HostPlayer', avatar: '👑', maxRounds: 1 });
  await createPromise;

  // 2. Client 2 joins
  const joinPromise = new Promise(resolve => {
    client2.on('room_updated', (room) => {
      if (room.players.length === 2 && room.status === 'waiting') resolve(room);
    });
  });
  client2.emit('join_room', { roomId: testRoomId, nickname: 'GuestPlayer', avatar: '🐱' });
  await joinPromise;
  console.log(`✓ Both players in room ${testRoomId}`);

  // 3. Start game
  const matchEndedPromise = new Promise(resolve => {
    client1.on('match_finished', resolve);
  });
  client1.emit('start_game');
  await new Promise(r => setTimeout(r, 100));

  const room = roomManager.getRoom(testRoomId);
  assert.strictEqual(room.status, 'playing');

  // Eliminate one player so match finishes
  const activeP = room.players[room.turnIndex];
  const activeClient = activeP.id === client1.id ? client1 : client2;
  activeClient.emit('submit_word', `${room.expectedSyllable} sai_hoan_toan`);

  await matchEndedPromise;
  assert.strictEqual(room.status, 'match_ended');
  console.log('✓ Match finished! Status is match_ended');

  // 4. Test return_to_lobby without leaving room
  const waitingPromise = new Promise(resolve => {
    client1.on('room_updated', (updated) => {
      if (updated.status === 'waiting') resolve(updated);
    });
  });
  client1.emit('return_to_lobby');
  const waitingRoom = await waitingPromise;

  assert.strictEqual(waitingRoom.status, 'waiting');
  assert.strictEqual(waitingRoom.players.length, 2);
  assert.strictEqual(waitingRoom.players[0].score, 0);
  assert.strictEqual(waitingRoom.players[1].score, 0);
  console.log('✓ Successfully returned to lobby without leaving room or creating new room!');

  // 5. Test restart_game directly
  client1.emit('start_game');
  await new Promise(r => setTimeout(r, 100));
  assert.strictEqual(room.status, 'playing');
  assert.strictEqual(room.roundNumber, 1);
  console.log('✓ Successfully restarted game cleanly with the same players in the same room!');

  // Teardown
  client1.disconnect();
  client2.disconnect();
  await new Promise((resolve) => server.close(resolve));
  console.log('--- ALL REMATCH & RETURN TO LOBBY TESTS PASSED! 🎉 ---');
}

runRematchTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
