const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');
const dictionary = require('../src/dictionary');

async function runHintTests() {
  console.log('--- STARTING HINT FEATURE TESTS ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('submit_word', (data) => roomManager.submitWord(socket, data));
    socket.on('request_hint', () => roomManager.requestHint(socket));
  });

  const PORT = 3338;
  await new Promise((resolve) => server.listen(PORT, resolve));

  const client1 = ioClient(`http://localhost:${PORT}`);
  const client2 = ioClient(`http://localhost:${PORT}`);

  await Promise.all([
    new Promise(res => client1.on('connect', res)),
    new Promise(res => client2.on('connect', res))
  ]);
  console.log('✓ Both test clients connected to server');

  let testRoomId = null;

  // 1. Create Room with hints allowed (default)
  const roomPromise = new Promise(resolve => {
    client1.on('room_updated', (room) => {
      if (room.status === 'waiting' && !testRoomId) {
        testRoomId = room.id;
        resolve(room);
      }
    });
  });
  client1.emit('create_room', { nickname: 'Bé Út', avatar: '🐰', allowHints: true });
  const createdRoom = await roomPromise;
  assert.strictEqual(createdRoom.allowHints, true);
  assert.strictEqual(createdRoom.players[0].hintsRemaining, 1);
  console.log(`✓ Room created with hints enabled, player has 1 hint`);

  // 2. Client 2 joins room
  const joinPromise = new Promise(resolve => {
    client2.on('room_updated', (room) => {
      if (room.players.length === 2 && room.status === 'waiting') {
        resolve(room);
      }
    });
  });
  client2.emit('join_room', { roomId: testRoomId, nickname: 'Bé Hai', avatar: '🐱' });
  const joinedRoom = await joinPromise;
  assert.strictEqual(joinedRoom.players[1].hintsRemaining, 1);
  console.log(`✓ Client 2 joined room, also has 1 hint`);

  // 3. Start Game
  const gameStartPromise = new Promise(resolve => {
    client1.on('turn_announcement', (ann) => {
      resolve(ann);
    });
  });
  client1.emit('start_game');
  await gameStartPromise;

  const room = roomManager.getRoom(testRoomId);
  const activePlayer = room.players[room.turnIndex];
  const activeClient = activePlayer.id === client1.id ? client1 : client2;
  const passiveClient = activePlayer.id === client1.id ? client2 : client1;

  console.log(`✓ Match started. Active player: @${activePlayer.nickname}, Expected syllable: "${room.expectedSyllable}"`);

  // 4. Test passive client requesting hint (should be rejected)
  const passiveHintRejectPromise = new Promise(resolve => {
    passiveClient.once('hint_response', resolve);
  });
  passiveClient.emit('request_hint');
  const passiveReject = await passiveHintRejectPromise;
  assert.strictEqual(passiveReject.success, false);
  assert.strictEqual(passiveReject.reason, 'Chưa tới lượt của bạn để xin gợi ý!');
  console.log('✓ Non-active player rejected when requesting hint');

  // 5. Test active client requesting hint (should succeed!)
  const activeHintPromise = new Promise(resolve => {
    activeClient.once('hint_response', resolve);
  });
  activeClient.emit('request_hint');
  const hintResult = await activeHintPromise;
  assert.strictEqual(hintResult.success, true);
  assert.ok(hintResult.word);
  assert.ok(hintResult.tail);
  assert.strictEqual(hintResult.word.startsWith(room.expectedSyllable), true);
  assert.strictEqual(hintResult.hintsRemaining, 0);
  assert.strictEqual(activePlayer.hintsRemaining, 0);
  console.log(`✓ Active player received hint: "${hintResult.word}" (tail: "${hintResult.tail}"), remaining: 0`);

  // 6. Test active client requesting hint second time (should be rejected because 0 remaining)
  const secondHintPromise = new Promise(resolve => {
    activeClient.once('hint_response', resolve);
  });
  activeClient.emit('request_hint');
  const secondResult = await secondHintPromise;
  assert.strictEqual(secondResult.success, false);
  assert.strictEqual(secondResult.reason, 'Bạn đã dùng hết lượt gợi ý của hiệp này!');
  console.log('✓ Second hint request correctly rejected (limit: 1 per round)');

  // 7. Test active client submitting the hinted word
  activeClient.emit('submit_word', hintResult.word);
  await new Promise(r => setTimeout(r, 200));
  assert.strictEqual(room.usedWords.has(hintResult.word), true);
  console.log(`✓ Hinted word "${hintResult.word}" accepted successfully by referee!`);

  // Clean up
  client1.disconnect();
  client2.disconnect();
  await new Promise((resolve) => server.close(resolve));
  console.log('--- ALL HINT FEATURE TESTS PASSED! 🎉 ---');
}

runHintTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
