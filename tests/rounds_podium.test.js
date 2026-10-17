const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');
const dictionary = require('../src/dictionary');

async function testRoundsAndPodium() {
  console.log('--- STARTING 3-ROUND MATCH & PODIUM TEST ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('submit_word', (data) => roomManager.submitWord(socket, data));
  });

  const PORT = 3334;
  await new Promise((resolve) => server.listen(PORT, resolve));

  const p1 = ioClient(`http://localhost:${PORT}`);
  const p2 = ioClient(`http://localhost:${PORT}`);

  await Promise.all([
    new Promise(res => p1.on('connect', res)),
    new Promise(res => p2.on('connect', res))
  ]);

  let roomId = null;
  const p1JoinedPromise = new Promise(resolve => {
    p1.on('room_updated', (room) => {
      if (room.status === 'waiting' && !roomId) {
        roomId = room.id;
        resolve(room);
      }
    });
  });

  // Create room with maxRounds = 3
  p1.emit('create_room', { nickname: 'Bé Thỏ', avatar: '🐰', maxRounds: 3 });
  await p1JoinedPromise;

  const p2JoinedPromise = new Promise(resolve => {
    p2.on('room_updated', (room) => {
      if (room.players.length === 2 && room.status === 'waiting') resolve(room);
    });
  });
  p2.emit('join_room', { roomId, nickname: 'Bé Cáo', avatar: '🦊' });
  await p2JoinedPromise;

  console.log(`✓ Room ${roomId} created for 3 rounds between 🐰 Bé Thỏ and 🦊 Bé Cáo`);

  // ================= ROUND 1 =================
  let roundEndedPromise = new Promise(resolve => {
    p1.once('round_ended', (data) => resolve(data));
  });

  p1.emit('start_game');
  await new Promise(res => setTimeout(res, 100));

  let room = roomManager.getRoom(roomId);
  assert.strictEqual(room.roundNumber, 1);
  assert.strictEqual(room.maxRounds, 3);

  // Eliminate active player intentionally in round 1
  let activeP = room.players[room.turnIndex];
  let activeClient = activeP.nickname === 'Bé Thỏ' ? p1 : p2;
  activeClient.emit('submit_word', `${room.expectedSyllable} sai_bét_nhé`);

  let r1Data = await roundEndedPromise;
  assert.strictEqual(r1Data.currentRound, 1);
  assert.strictEqual(r1Data.maxRounds, 3);
  assert.ok(r1Data.roundWinner, 'Must have a round winner');
  console.log(`✓ Round 1 ended! Winner: @${r1Data.roundWinner.nickname} (+50 pts)`);

  // ================= ROUND 2 =================
  roundEndedPromise = new Promise(resolve => {
    p1.once('round_ended', (data) => resolve(data));
  });

  p1.emit('start_game'); // advance to round 2
  await new Promise(res => setTimeout(res, 100));

  room = roomManager.getRoom(roomId);
  assert.strictEqual(room.roundNumber, 2);

  activeP = room.players[room.turnIndex];
  activeClient = activeP.nickname === 'Bé Thỏ' ? p1 : p2;
  activeClient.emit('submit_word', `${room.expectedSyllable} từ_bậy_bạ`);

  let r2Data = await roundEndedPromise;
  assert.strictEqual(r2Data.currentRound, 2);
  assert.strictEqual(r2Data.maxRounds, 3);
  console.log(`✓ Round 2 ended! Winner: @${r2Data.roundWinner.nickname} (+50 pts)`);

  // ================= ROUND 3 (Final Round -> Match Finish & Podium) =================
  const matchFinishedPromise = new Promise(resolve => {
    p1.once('match_finished', (data) => resolve(data));
  });

  p1.emit('start_game'); // advance to round 3
  await new Promise(res => setTimeout(res, 100));

  room = roomManager.getRoom(roomId);
  assert.strictEqual(room.roundNumber, 3);

  activeP = room.players[room.turnIndex];
  activeClient = activeP.nickname === 'Bé Thỏ' ? p1 : p2;
  activeClient.emit('submit_word', `${room.expectedSyllable} từ_chế_linh_tinh`);

  const matchData = await matchFinishedPromise;
  assert.strictEqual(matchData.totalRounds, 3);
  assert.ok(matchData.podium && matchData.podium.length === 2);
  assert.strictEqual(matchData.podium[0].rank, 1);
  assert.strictEqual(matchData.podium[1].rank, 2);
  assert.ok(matchData.podium[0].score >= matchData.podium[1].score);

  console.log(`✓ Match Finished! 🏆 Top 1: ${matchData.podium[0].avatar} @${matchData.podium[0].nickname} with ${matchData.podium[0].score} pts`);
  console.log(`✓ 🥈 Top 2: ${matchData.podium[1].avatar} @${matchData.podium[1].nickname} with ${matchData.podium[1].score} pts`);

  // Teardown
  p1.disconnect();
  p2.disconnect();
  server.close();

  console.log('--- ALL 3-ROUND MATCH & PODIUM TESTS PASSED! 🎉 ---');
  process.exit(0);
}

testRoundsAndPodium().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
