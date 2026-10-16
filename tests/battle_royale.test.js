const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');
const dictionary = require('../src/dictionary');

async function testBattleRoyale() {
  console.log('--- STARTING BATTLE ROYALE MODE TEST ---');

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

  const PORT = 3335;
  await new Promise((resolve) => server.listen(PORT, resolve));

  const p1 = ioClient(`http://localhost:${PORT}`);
  const p2 = ioClient(`http://localhost:${PORT}`);

  await Promise.all([
    new Promise(res => p1.on('connect', res)),
    new Promise(res => p2.on('connect', res))
  ]);

  let roomId = null;
  const p1RoomPromise = new Promise(resolve => {
    p1.on('room_updated', (room) => {
      if (room.status === 'waiting' && !roomId) {
        roomId = room.id;
        resolve(room);
      }
    });
  });

  // Create Battle Royale room
  p1.emit('create_room', {
    nickname: 'Player 1',
    avatar: '🐰',
    gameMode: 'battle_royale',
    turnDuration: 10
  });
  const created = await p1RoomPromise;
  assert.strictEqual(created.gameMode, 'battle_royale');
  assert.strictEqual(created.maxRounds, 1);
  console.log(`✓ Battle Royale room created with 1 round limit`);

  const p2RoomPromise = new Promise(resolve => {
    p2.on('room_updated', (room) => {
      if (room.players.length === 2 && room.status === 'waiting') resolve(room);
    });
  });
  p2.emit('join_room', { roomId, nickname: 'Player 2', avatar: '🐱' });
  await p2RoomPromise;

  // Start game
  const startPromise = new Promise(resolve => {
    p1.on('room_updated', (room) => {
      if (room.status === 'playing') resolve(room);
    });
  });
  p1.emit('start_game');
  const playing = await startPromise;
  assert.strictEqual(playing.status, 'playing');
  assert.strictEqual(playing.gameMode, 'battle_royale');
  console.log(`✓ Battle Royale match started`);

  // Active player plays word
  const room = roomManager.getRoom(roomId);
  const activeP = room.players[room.turnIndex];
  const activeClient = activeP.nickname === 'Player 1' ? p1 : p2;
  const otherClient = activeClient === p1 ? p2 : p1;

  const validNext = dictionary.getNextOptions(room.expectedSyllable)[0];
  activeClient.emit('submit_word', validNext);

  await new Promise(res => setTimeout(res, 200));

  // Next player submits an interjection -> eliminated!
  const matchFinishedPromise = new Promise(resolve => {
    p1.on('match_finished', (data) => resolve(data));
  });

  otherClient.emit('submit_word', `${room.expectedSyllable} ôi chao`);

  const finishedData = await matchFinishedPromise;
  assert.ok(finishedData.podium);
  assert.strictEqual(finishedData.podium[0].rank, 1);
  assert.strictEqual(finishedData.totalRounds, 1);
  console.log(`✓ Battle Royale match ended! Winner: ${finishedData.podium[0].avatar} @${finishedData.podium[0].nickname}`);

  p1.disconnect();
  p2.disconnect();
  server.close();
  console.log('--- BATTLE ROYALE TEST PASSED! 🎉 ---');
}

testBattleRoyale().catch(err => {
  console.error('Battle Royale test failed:', err);
  process.exit(1);
});
