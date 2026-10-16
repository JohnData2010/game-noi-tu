const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const assert = require('assert');

const RoomManager = require('../src/roomManager');
const dictionary = require('../src/dictionary');

async function runSimulation() {
  console.log('--- STARTING MULTIPLAYER SIMULATION TEST ---');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const roomManager = new RoomManager(io);

  // Setup sockets
  io.on('connection', (socket) => {
    socket.on('create_room', (data) => roomManager.createRoom(socket, data));
    socket.on('join_room', (data) => roomManager.joinRoom(socket, data.roomId, data));
    socket.on('start_game', () => roomManager.startGame(socket));
    socket.on('submit_word', (data) => roomManager.submitWord(socket, data));
  });

  const PORT = 3333;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Test server running on port ${PORT}`);

  const client1 = ioClient(`http://localhost:${PORT}`);
  const client2 = ioClient(`http://localhost:${PORT}`);

  await Promise.all([
    new Promise(res => client1.on('connect', res)),
    new Promise(res => client2.on('connect', res))
  ]);
  console.log('✓ Both test clients connected to server');

  let testRoomId = null;

  // Step 1: Client 1 creates room
  const createRoomPromise = new Promise(resolve => {
    client1.on('room_updated', (room) => {
      if (room.status === 'waiting' && !testRoomId) {
        testRoomId = room.id;
        resolve(room);
      }
    });
  });
  client1.emit('create_room', { nickname: 'Alice', avatar: '🧑‍🚀', turnDuration: 5, maxRounds: 1 });
  const createdRoom = await createRoomPromise;
  assert.strictEqual(createdRoom.players.length, 1);
  console.log(`✓ Room created with ID: ${testRoomId}`);

  // Step 2: Client 2 joins room
  const joinRoomPromise = new Promise(resolve => {
    client2.on('room_updated', (room) => {
      if (room.players.length === 2 && room.status === 'waiting') {
        resolve(room);
      }
    });
  });
  client2.emit('join_room', { roomId: testRoomId, nickname: 'Bob', avatar: '🦊' });
  const joinedRoom = await joinRoomPromise;
  assert.strictEqual(joinedRoom.players.length, 2);
  console.log('✓ Client 2 successfully joined room');

  // Step 3: Client 1 starts game
  const startGamePromise = new Promise(resolve => {
    client1.on('room_updated', (room) => {
      if (room.status === 'playing') {
        resolve(room);
      }
    });
  });
  client1.emit('start_game');
  const playingRoom = await startGamePromise;
  assert.strictEqual(playingRoom.status, 'playing');
  assert.ok(playingRoom.lastWord, 'Match must have a starting word');
  console.log(`✓ Match started! Initial word: "${playingRoom.lastWord}", Expected next syllable: "${playingRoom.expectedSyllable}"`);

  // Step 4: Active player plays a valid move
  const activePlayer = playingRoom.players[playingRoom.turnIndex];
  const activeClient = activePlayer.nickname === 'Alice' ? client1 : client2;
  const otherClient = activeClient === client1 ? client2 : client1;

  const validNextOptions = dictionary.getNextOptions(playingRoom.expectedSyllable);
  assert.ok(validNextOptions.length > 0, 'Must have valid next options');
  const validMove = validNextOptions[0];

  const movePromise = new Promise(resolve => {
    const check = (room) => {
      if (room.usedWordsCount >= 2) {
        resolve(room);
      }
    };
    client1.on('room_updated', check);
  });

  console.log(`Active player (${activePlayer.nickname}) submitting valid word: "${validMove}"`);
  activeClient.emit('submit_word', validMove);
  const updatedRoom = await movePromise;
  console.log(`✓ Valid word processed. Words in match: ${updatedRoom.usedWordsCount}`);

  // Step 5: Next player makes an invalid move: matches head syllable but NOT in dictionary
  const nextPlayer = updatedRoom.players[updatedRoom.turnIndex];
  const nextClient = nextPlayer.nickname === 'Alice' ? client1 : client2;

  const eliminationPromise = new Promise(resolve => {
    nextClient.on('player_eliminated', (data) => {
      resolve(data);
    });
  });

  const matchFinishedPromise = new Promise(resolve => {
    client1.on('match_finished', (data) => {
      resolve(data);
    });
  });

  const nonDictWord = `${updatedRoom.expectedSyllable} dỏm`;
  console.log(`Next player (${nextPlayer.nickname}) submitting word not in dictionary: "${nonDictWord}"`);
  nextClient.emit('submit_word', nonDictWord);

  const eliminatedData = await eliminationPromise;
  assert.strictEqual(eliminatedData.nickname, nextPlayer.nickname);
  assert.ok(eliminatedData.reason.includes('không có trong từ điển tiếng Việt'));
  console.log(`✓ Referee eliminated player correctly: ${eliminatedData.reason}`);

  const matchFinishedData = await matchFinishedPromise;
  assert.ok(matchFinishedData.podium && matchFinishedData.podium.length >= 2);
  const firstPlace = matchFinishedData.podium[0];
  console.log(`✓ Match finished! 🥇 Top 1: ${firstPlace.avatar} @${firstPlace.nickname} (${firstPlace.score} điểm)`);

  // Teardown
  client1.disconnect();
  client2.disconnect();
  server.close();

  console.log('--- ALL MULTIPLAYER SIMULATION TESTS PASSED! 🎉 ---');
}

runSimulation().catch(err => {
  console.error('Simulation test failed:', err);
  process.exit(1);
});
