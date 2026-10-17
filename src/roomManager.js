const dictionary = require('./dictionary');
const referee = require('./referee');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
  }

  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId?.toUpperCase());
  }

  createRoom(socket, data = {}) {
    const sessionToken = data.sessionToken || `st_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const roomId = this.generateRoomId();
    const allowHints = data.allowHints !== false;
    const player = {
      id: socket.id,
      sessionToken,
      nickname: data.nickname || 'Người chơi 1',
      avatar: data.avatar || '🧑‍🚀',
      isHost: true,
      isAlive: true,
      isReady: true,
      score: 0,
      hintsRemaining: allowHints ? 1 : 0,
      isBot: false,
      isDisconnected: false,
      disconnectTimeout: null
    };

    const gameMode = data.gameMode === 'battle_royale' ? 'battle_royale' : 'rounds';
    const maxRounds = gameMode === 'battle_royale' ? 1 : Math.min(10, Math.max(1, parseInt(data.maxRounds, 10) || 3));
    const isExplicitTime = data.turnDuration !== undefined && data.turnDuration !== null && data.turnDuration !== 0 && data.turnDuration !== '0' && data.isUnlimitedTime !== true;
    const turnDuration = isExplicitTime ? Math.min(60, Math.max(5, parseInt(data.turnDuration, 10) || 15)) : 0;
    const room = {
      id: roomId,
      hostId: socket.id,
      gameMode,
      allowHints,
      initialTurnDuration: turnDuration,
      turnDuration,
      turnCount: 0,
      maxRounds,
      roundNumber: 0,
      status: 'waiting', // 'waiting' | 'playing' | 'round_ended' | 'match_ended'
      players: [player],
      eliminatedOrder: [],
      turnIndex: 0,
      lastWord: null,
      expectedSyllable: null,
      usedWords: new Set(),
      timer: null,
      timeRemaining: 0,
      isTimerPaused: false,
      winner: null,
      podium: null,
      chatHistory: []
    };

    this.rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.sessionToken = sessionToken;

    socket.emit('session_created', { sessionToken, roomId });
    this.broadcastRoomUpdate(room);

    return room;
  }

  addHistory(room, type, data) {
    if (!room) return;
    if (!room.chatHistory) room.chatHistory = [];
    room.chatHistory.push({ type, data });
    if (room.chatHistory.length > 60) {
      room.chatHistory.shift();
    }
  }

  syncSession(socket, data = {}) {
    const roomId = data.roomId?.toUpperCase();
    const room = this.getRoom(roomId);
    if (!room) return;

    if (data.sessionToken) {
      const existing = room.players.find(p => p.sessionToken === data.sessionToken);
      if (existing) {
        if (existing.disconnectTimeout) {
          clearTimeout(existing.disconnectTimeout);
          existing.disconnectTimeout = null;
        }
        existing.id = socket.id;
        existing.isDisconnected = false;
        if (existing.isHost) room.hostId = socket.id;

        socket.join(roomId);
        socket.roomId = roomId;
        socket.sessionToken = existing.sessionToken;

        socket.emit('session_created', { sessionToken: existing.sessionToken, roomId });
        socket.emit('chat_history', room.chatHistory || []);
        this.broadcastRoomUpdate(room);

        if (room.status === 'playing') {
          const existingIndex = room.players.indexOf(existing);
          if (room.isTimerPaused && room.turnIndex === existingIndex) {
            this.resumeTurnTimer(room);
          } else {
            socket.emit('timer_tick', {
              timeRemaining: room.timeRemaining || 0,
              totalDuration: room.turnDuration || 0,
              isUnlimited: room.turnDuration === 0
            });
          }
        }
      }
    }
  }

  joinRoom(socket, roomId, data = {}) {
    roomId = roomId?.toUpperCase();
    const room = this.getRoom(roomId);
    if (!room) {
      socket.emit('error_message', 'Phòng không tồn tại hoặc đã bị giải tán!');
      return null;
    }

    // Check if player is reconnecting with an existing sessionToken
    if (data.sessionToken) {
      const existing = room.players.find(p => p.sessionToken === data.sessionToken);
      if (existing) {
        // Reconnection recovery!
        if (existing.disconnectTimeout) {
          clearTimeout(existing.disconnectTimeout);
          existing.disconnectTimeout = null;
        }
        const wasDisconnected = existing.isDisconnected;
        existing.id = socket.id;
        existing.isDisconnected = false;
        if (existing.isHost) room.hostId = socket.id;

        socket.join(roomId);
        socket.roomId = roomId;
        socket.sessionToken = existing.sessionToken;

        socket.emit('session_created', { sessionToken: existing.sessionToken, roomId });
        // Restore all previous chat / referee messages
        socket.emit('chat_history', room.chatHistory || []);
        this.broadcastRoomUpdate(room);

        // Sync active timer state if match is ongoing
        if (room.status === 'playing') {
          const existingIndex = room.players.indexOf(existing);
          if (room.isTimerPaused && room.turnIndex === existingIndex) {
            this.resumeTurnTimer(room);
            this.sendRefereeMessage(roomId, `▶️ @${existing.nickname} đã quay lại! Tiếp tục lượt chơi.`);
          } else {
            socket.emit('timer_tick', {
              timeRemaining: room.timeRemaining || 0,
              totalDuration: room.turnDuration || 0,
              isUnlimited: room.turnDuration === 0
            });
          }
          if (wasDisconnected) {
            this.sendRefereeMessage(roomId, `✅ @${existing.nickname} đã kết nối lại phòng.`);
          }
        }
        return room;
      }
    }

    if (room.status === 'playing') {
      socket.emit('error_message', 'Ván đấu đang diễn ra. Vui lòng đợi ván đấu kết thúc!');
      return null;
    }

    if (room.players.length >= 8) {
      socket.emit('error_message', 'Phòng đã đủ số lượng người chơi tối đa (8 người)!');
      return null;
    }

    const sessionToken = data.sessionToken || `st_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const player = {
      id: socket.id,
      sessionToken,
      nickname: data.nickname || `Người chơi ${room.players.length + 1}`,
      avatar: data.avatar || '🐱',
      isHost: false,
      isAlive: true,
      isReady: false,
      score: 0,
      hintsRemaining: room.allowHints !== false ? 1 : 0,
      isBot: false,
      isDisconnected: false,
      disconnectTimeout: null
    };

    room.players.push(player);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.sessionToken = sessionToken;

    socket.emit('session_created', { sessionToken, roomId });
    this.broadcastRoomUpdate(room);
    return room;
  }

  leaveRoom(socket) {
    let roomId = socket.roomId;
    let room = roomId ? this.getRoom(roomId) : null;
    if (!room) {
      for (const r of this.rooms.values()) {
        if (r.players.some(p => p.id === socket.id || (socket.sessionToken && p.sessionToken === socket.sessionToken))) {
          room = r;
          roomId = r.id;
          break;
        }
      }
    }

    if (!room) {
      delete socket.roomId;
      delete socket.sessionToken;
      socket.emit('room_left');
      return;
    }

    const playerIndex = room.players.findIndex(p => p.id === socket.id || (socket.sessionToken && p.sessionToken === socket.sessionToken));
    if (playerIndex === -1) {
      socket.leave(roomId);
      delete socket.roomId;
      delete socket.sessionToken;
      socket.emit('room_left');
      return;
    }

    const leavingPlayer = room.players[playerIndex];
    if (leavingPlayer.disconnectTimeout) {
      clearTimeout(leavingPlayer.disconnectTimeout);
      leavingPlayer.disconnectTimeout = null;
    }

    // Remove player completely from room
    room.players.splice(playerIndex, 1);
    socket.leave(roomId);
    delete socket.roomId;
    delete socket.sessionToken;

    // Check if room has any remaining human players
    const humanPlayers = room.players.filter(p => !p.isBot);
    if (humanPlayers.length === 0) {
      this.clearTurnTimer(room);
      this.rooms.delete(roomId);
      socket.emit('room_left');
      return;
    }

    // If host left, reassign host to the next human player
    if (leavingPlayer.isHost) {
      const nextHost = humanPlayers[0] || room.players[0];
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.id;
      }
    }

    this.sendRefereeMessage(roomId, `🚪 ${leavingPlayer.avatar} @${leavingPlayer.nickname} đã rời khỏi phòng.`);

    // If game was playing, handle alive check and turn progression
    if (room.status === 'playing') {
      const alivePlayers = room.players.filter(p => p.isAlive);
      if (alivePlayers.length <= 1) {
        this.clearTurnTimer(room);
        if (alivePlayers.length === 1) {
          const winner = alivePlayers[0];
          winner.score = (winner.score || 0) + 50;
          winner.roundsWon = (winner.roundsWon || 0) + 1;
          room.winner = winner;
          room.status = 'match_ended';
          const winnerPayload = { id: winner.id, nickname: winner.nickname, avatar: winner.avatar, score: winner.score || 0 };
          this.io.to(room.id).emit('match_finished', {
            podium: [{ rank: 1, ...winnerPayload }],
            totalRounds: room.maxRounds
          });
          this.sendRefereeMessage(room.id, `👑 ${winner.avatar} @${winner.nickname} chiến thắng vì đối thủ đã rời phòng!`);
        } else {
          room.status = 'waiting';
        }
      } else {
        // Adjust turnIndex because player was spliced out
        if (playerIndex < room.turnIndex) {
          room.turnIndex--;
        } else if (playerIndex === room.turnIndex) {
          if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
          }
          let attempts = 0;
          while (!room.players[room.turnIndex]?.isAlive && attempts < room.players.length) {
            room.turnIndex = (room.turnIndex + 1) % room.players.length;
            attempts++;
          }
          const nextPlayer = room.players[room.turnIndex];
          if (nextPlayer) {
            const turnPayload = {
              nickname: nextPlayer.nickname,
              avatar: nextPlayer.avatar,
              syllable: room.expectedSyllable,
              isOpening: false
            };
            this.addHistory(room, 'turn_announcement', turnPayload);
            this.io.to(room.id).emit('turn_announcement', turnPayload);
            this.startTurnTimer(room);
          }
        }
      }
    }

    this.broadcastRoomUpdate(room);
    socket.emit('room_left');
  }

  toggleReady(socket) {
    const room = this.getRoom(socket.roomId);
    if (!room || room.status !== 'waiting') return;

    const player = room.players.find(p => p.id === socket.id);
    if (player && !player.isHost) {
      player.isReady = !player.isReady;
      this.broadcastRoomUpdate(room);
    }
  }

  addBot(socket) {
    const room = this.getRoom(socket.roomId);
    if (!room || room.status !== 'waiting') return;
    if (room.hostId !== socket.id) return;
    if (room.players.length >= 8) return;

    const botNumber = room.players.filter(p => p.isBot).length + 1;
    const botPlayer = {
      id: `bot_${Date.now()}_${botNumber}`,
      nickname: `Trọng Tài Bot ${botNumber}`,
      avatar: '🤖',
      isHost: false,
      isAlive: true,
      isReady: true,
      score: 0,
      isBot: true
    };

    room.players.push(botPlayer);
    this.broadcastRoomUpdate(room);
    this.sendRefereeMessage(room.id, `🤖 Đã thêm ${botPlayer.nickname} vào phòng!`);
  }

  removeBot(socket, botId) {
    const room = this.getRoom(socket.roomId);
    if (!room || room.status !== 'waiting') return;
    if (room.hostId !== socket.id) return;

    const index = room.players.findIndex(p => p.id === botId && p.isBot);
    if (index !== -1) {
      const bot = room.players.splice(index, 1)[0];
      this.broadcastRoomUpdate(room);
      this.sendRefereeMessage(room.id, `Đã xóa ${bot.nickname} khỏi phòng.`);
    }
  }

  returnToLobby(socket) {
    const room = this.getRoom(socket.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', 'Chỉ chủ phòng mới có quyền đưa phòng về sảnh chờ!');
      return;
    }

    this.clearTurnTimer(room);
    room.status = 'waiting';
    room.roundNumber = 0;
    room.podium = null;
    room.winner = null;
    room.lastWord = null;
    room.expectedSyllable = null;
    room.usedWords.clear();
    room.eliminatedOrder = [];
    room.turnCount = 0;
    room.turnDuration = room.initialTurnDuration !== undefined ? room.initialTurnDuration : 0;
    room.isTimerPaused = false;

    // Reset player scores & ready states
    for (const p of room.players) {
      p.isAlive = true;
      p.score = 0;
      p.wordsCount = 0;
      p.roundsWon = 0;
      p.hintsRemaining = room.allowHints !== false ? 1 : 0;
      p.isReady = p.isHost || p.isBot;
    }

    this.sendRefereeMessage(room.id, '🔄 Đã quay về phòng chờ. Bạn có thể sẵn sàng và bắt đầu lại ván mới!');
    this.broadcastRoomUpdate(room);
  }

  restartGame(socket) {
    const room = this.getRoom(socket.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', 'Chỉ chủ phòng mới có quyền bắt đầu lại ván mới!');
      return;
    }
    room.status = 'match_ended'; // Triggers full score & round reset in startGame
    this.startGame(socket);
  }

  startGame(socket) {
    const room = this.getRoom(socket.roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', 'Chỉ chủ phòng mới có quyền bắt đầu trận đấu!');
      return;
    }
    if (room.players.length < 2) {
      socket.emit('error_message', 'Cần ít nhất 2 người chơi (hoặc thêm Bot) để bắt đầu!');
      return;
    }

    // Check if restarting completely after a completed match
    if (room.status === 'match_ended') {
      room.roundNumber = 0;
      room.podium = null;
      room.turnCount = 0;
      room.turnDuration = room.initialTurnDuration !== undefined ? room.initialTurnDuration : 0;
      for (const p of room.players) {
        p.score = 0;
        p.wordsCount = 0;
        p.roundsWon = 0;
      }
    }

    // Advance round
    room.status = 'playing';
    room.winner = null;
    room.usedWords.clear();
    room.eliminatedOrder = [];
    room.roundNumber += 1;

    // Reset players alive state and hints for this round
    for (const p of room.players) {
      p.isAlive = true;
      p.hintsRemaining = room.allowHints !== false ? 1 : 0;
    }

    // Starting player is random or 1st player
    room.turnIndex = Math.floor(Math.random() * room.players.length);
    const activePlayer = room.players[room.turnIndex];

    // Pick a starting word
    const startWord = dictionary.getRandomStartWord();
    room.lastWord = startWord;
    const [startHead, startTail] = startWord.split(' ');
    room.expectedSyllable = startTail;
    room.usedWords.add(startWord);

    const turnPayload = {
      nickname: activePlayer.nickname,
      avatar: activePlayer.avatar,
      syllable: startTail,
      startWord: startWord,
      isOpening: true,
      currentRound: room.roundNumber,
      maxRounds: room.maxRounds
    };
    this.addHistory(room, 'turn_announcement', turnPayload);
    this.io.to(room.id).emit('turn_announcement', turnPayload);

    this.startTurnTimer(room);
    this.broadcastRoomUpdate(room);

    // If bot opens
    if (activePlayer.isBot) {
      this.triggerBotTurn(room);
    }
  }

  startTurnTimer(room) {
    this.clearTurnTimer(room);

    if (!room.turnDuration || room.turnDuration <= 0) {
      room.timeRemaining = 0;
      this.io.to(room.id).emit('timer_tick', {
        timeRemaining: 0,
        totalDuration: 0,
        isUnlimited: true
      });
      return;
    }

    room.timeRemaining = room.turnDuration;
    this.io.to(room.id).emit('timer_tick', {
      timeRemaining: room.timeRemaining,
      totalDuration: room.turnDuration,
      isUnlimited: false
    });

    room.timer = setInterval(() => {
      room.timeRemaining -= 1;
      this.io.to(room.id).emit('timer_tick', {
        timeRemaining: room.timeRemaining,
        totalDuration: room.turnDuration,
        isUnlimited: false
      });

      if (room.timeRemaining <= 0) {
        this.clearTurnTimer(room);
        this.handleTimeout(room);
      }
    }, 1000);
  }

  pauseTurnTimer(room) {
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
    room.isTimerPaused = true;
    this.io.to(room.id).emit('timer_paused', {
      timeRemaining: room.timeRemaining || 0,
      totalDuration: room.turnDuration || 0
    });
  }

  resumeTurnTimer(room) {
    if (!room.isTimerPaused || !room.turnDuration || room.turnDuration <= 0) return;
    room.isTimerPaused = false;
    this.clearTurnTimer(room);

    this.io.to(room.id).emit('timer_resumed', {
      timeRemaining: room.timeRemaining,
      totalDuration: room.turnDuration
    });

    room.timer = setInterval(() => {
      room.timeRemaining -= 1;
      this.io.to(room.id).emit('timer_tick', {
        timeRemaining: room.timeRemaining,
        totalDuration: room.turnDuration,
        isUnlimited: false
      });

      if (room.timeRemaining <= 0) {
        this.clearTurnTimer(room);
        this.handleTimeout(room);
      }
    }, 1000);
  }

  clearTurnTimer(room) {
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
  }

  handleTimeout(room) {
    if (room.status !== 'playing') return;

    const activePlayer = room.players[room.turnIndex];
    if (!activePlayer || !activePlayer.isAlive) return;

    // Eliminate player for timeout
    this.eliminatePlayer(room, activePlayer, `Hết thời gian (${room.turnDuration}s) không đưa ra được từ nối!`);
  }

  requestHint(socket) {
    const room = this.getRoom(socket.roomId);
    if (!room || room.status !== 'playing') {
      socket.emit('hint_response', { success: false, reason: 'Trận đấu chưa bắt đầu!' });
      return;
    }
    if (room.allowHints === false) {
      socket.emit('hint_response', { success: false, reason: 'Phòng không bật quyền trợ giúp gợi ý!' });
      return;
    }
    const activePlayer = room.players[room.turnIndex];
    if (!activePlayer || activePlayer.id !== socket.id) {
      socket.emit('hint_response', { success: false, reason: 'Chưa tới lượt của bạn để xin gợi ý!' });
      return;
    }
    if (!activePlayer.isAlive) {
      socket.emit('hint_response', { success: false, reason: 'Bạn đã bị loại khỏi hiệp đấu!' });
      return;
    }
    if ((activePlayer.hintsRemaining || 0) <= 0) {
      socket.emit('hint_response', { success: false, reason: 'Bạn đã dùng hết lượt gợi ý của hiệp này!' });
      return;
    }

    const options = dictionary.getNextOptions(room.expectedSyllable, room.usedWords);
    if (!options || options.length === 0) {
      socket.emit('hint_response', {
        success: false,
        reason: `Không còn từ nào trong từ điển nối được tiếng "${room.expectedSyllable}"!`
      });
      return;
    }

    const chosenWord = options[Math.floor(Math.random() * options.length)];
    const parts = chosenWord.split(' ');
    const tailSyllable = parts[1] || '';

    activePlayer.hintsRemaining = 0;
    socket.emit('hint_response', {
      success: true,
      word: chosenWord,
      tail: tailSyllable,
      hintsRemaining: 0
    });

    this.sendRefereeMessage(room.id, `💡 @${activePlayer.nickname} đã dùng quyền trợ giúp gợi ý từ!`);
    this.broadcastRoomUpdate(room);
  }

  submitWord(socket, word) {
    const room = this.getRoom(socket.roomId);
    if (!room || room.status !== 'playing') return;

    const activePlayer = room.players[room.turnIndex];
    if (!activePlayer || activePlayer.id !== socket.id) {
      socket.emit('error_message', 'Chưa đến lượt của bạn!');
      return;
    }

    this.processWord(room, activePlayer, word);
  }

  processWord(room, player, rawWord) {
    this.clearTurnTimer(room);

    // Announce player's message in chat feed
    const playerMsg = {
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      word: rawWord,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.addHistory(room, 'player_message', playerMsg);
    this.io.to(room.id).emit('player_message', playerMsg);

    // Validate via Referee
    const verdict = referee.validate(rawWord, room.expectedSyllable, room.usedWords);

    if (!verdict.valid) {
      // PENALTY / ELIMINATION: Invalid word
      this.eliminatePlayer(room, player, verdict.reason);
      return;
    }

    // SUCCESSFUL MOVE: +10 points per word
    const validWord = verdict.word;
    room.usedWords.add(validWord);
    room.lastWord = validWord;
    room.expectedSyllable = verdict.tailSyllable;
    player.score = (player.score || 0) + 10;
    player.wordsCount = (player.wordsCount || 0) + 1;

    // Check if player created a trap / dead-end
    const optionsRemaining = dictionary.getNextOptions(verdict.tailSyllable, room.usedWords);
    if (optionsRemaining.length === 0) {
      this.sendRefereeMessage(
        room.id,
        `⚡ BẪY TỪ CỰC MẠNH! Không còn từ nào trong từ điển bắt đầu bằng tiếng "${verdict.tailSyllable}"!`
      );
    }

    // Advance to next alive player
    this.advanceTurn(room);
  }

  eliminatePlayer(room, player, reason) {
    player.isAlive = false;
    if (!room.eliminatedOrder) room.eliminatedOrder = [];
    if (!room.eliminatedOrder.some(p => p.id === player.id)) {
      room.eliminatedOrder.push(player);
    }

    // Sound effect trigger & single clean referee elimination alert
    const elimPayload = {
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      reason
    };
    this.addHistory(room, 'player_eliminated', elimPayload);
    this.io.to(room.id).emit('player_eliminated', elimPayload);

    const alivePlayers = room.players.filter(p => p.isAlive);

    if (alivePlayers.length === 1) {
      // ROUND COMPLETED!
      const winner = alivePlayers[0];
      winner.score = (winner.score || 0) + 50; // +50 bonus for winning the round
      winner.roundsWon = (winner.roundsWon || 0) + 1;

      // Round placement bonus
      if (room.eliminatedOrder.length >= 1) {
        const second = room.eliminatedOrder[room.eliminatedOrder.length - 1];
        second.score = (second.score || 0) + 25;
      }
      if (room.eliminatedOrder.length >= 2) {
        const third = room.eliminatedOrder[room.eliminatedOrder.length - 2];
        third.score = (third.score || 0) + 10;
      }

      this.clearTurnTimer(room);

      if (room.roundNumber >= room.maxRounds) {
        // MATCH COMPLETELY FINISHED!
        room.status = 'match_ended';
        const sorted = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        room.podium = sorted.map((p, idx) => ({
          rank: idx + 1,
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score || 0,
          wordsCount: p.wordsCount || 0,
          roundsWon: p.roundsWon || 0
        }));

        this.io.to(room.id).emit('match_finished', {
          podium: room.podium,
          totalRounds: room.maxRounds
        });
        this.broadcastRoomUpdate(room);
        return;
      } else {
        // END OF CURRENT ROUND
        room.status = 'round_ended';
        const sorted = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        this.io.to(room.id).emit('round_ended', {
          roundWinner: {
            id: winner.id,
            nickname: winner.nickname,
            avatar: winner.avatar
          },
          currentRound: room.roundNumber,
          maxRounds: room.maxRounds,
          leaderboard: sorted.map((p, idx) => ({
            rank: idx + 1,
            nickname: p.nickname,
            avatar: p.avatar,
            score: p.score || 0
          }))
        });
        this.broadcastRoomUpdate(room);
        return;
      }
    }

    if (alivePlayers.length === 0) {
      // Everyone eliminated in round
      this.clearTurnTimer(room);
      if (room.roundNumber >= room.maxRounds) {
        room.status = 'match_ended';
        const sorted = [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        room.podium = sorted.map((p, idx) => ({
          rank: idx + 1,
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score || 0
        }));
        this.io.to(room.id).emit('match_finished', {
          podium: room.podium,
          totalRounds: room.maxRounds
        });
      } else {
        room.status = 'round_ended';
        this.io.to(room.id).emit('round_ended', {
          roundWinner: null,
          currentRound: room.roundNumber,
          maxRounds: room.maxRounds
        });
      }
      this.broadcastRoomUpdate(room);
      return;
    }

    this.advanceTurn(room, false);
  }

  advanceTurn(room, isNewWord = true) {
    if (room.gameMode === 'battle_royale' && isNewWord && room.turnDuration > 0) {
      room.turnCount = (room.turnCount || 0) + 1;
      const aliveCount = room.players.filter(p => p.isAlive).length;
      if (room.turnCount % Math.max(2, aliveCount) === 0 && room.turnDuration > 5) {
        room.turnDuration = Math.max(5, room.turnDuration - 1);
        this.sendRefereeMessage(
          room.id,
          `Bo thu hẹp: Thời gian mỗi lượt giảm còn ${room.turnDuration}s!`
        );
      }
    }

    // Find next alive player
    let nextIndex = room.turnIndex;
    let attempts = 0;
    do {
      nextIndex = (nextIndex + 1) % room.players.length;
      attempts++;
    } while (!room.players[nextIndex].isAlive && attempts < room.players.length);

    room.turnIndex = nextIndex;
    const nextPlayer = room.players[room.turnIndex];

    const turnPayload = {
      nickname: nextPlayer.nickname,
      avatar: nextPlayer.avatar,
      syllable: room.expectedSyllable,
      isOpening: false
    };
    this.addHistory(room, 'turn_announcement', turnPayload);
    this.io.to(room.id).emit('turn_announcement', turnPayload);

    this.startTurnTimer(room);
    this.broadcastRoomUpdate(room);

    if (nextPlayer.isBot) {
      this.triggerBotTurn(room);
    }
  }

  triggerBotTurn(room) {
    const currentTurn = room.turnIndex;
    const bot = room.players[currentTurn];
    if (!bot || !bot.isBot || !bot.isAlive) return;

    // Simulate thinking delay (1.5 - 2.5 seconds)
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
      // Check if turn didn't change in the meantime
      if (room.status !== 'playing' || room.turnIndex !== currentTurn) return;

      const options = dictionary.getNextOptions(room.expectedSyllable, room.usedWords);
      if (options.length > 0) {
        // Pick a random valid option
        const chosen = options[Math.floor(Math.random() * options.length)];
        this.processWord(room, bot, chosen);
      } else {
        // Bot is trapped and admits defeat
        this.eliminatePlayer(room, bot, `Không còn từ nào hợp lệ để nối tiếp tiếng "${room.expectedSyllable}"!`);
      }
    }, delay);
  }

  sendRefereeMessage(roomId, text) {
    const room = this.getRoom(roomId);
    const refPayload = {
      sender: 'Trọng Tài',
      avatar: '⚖️',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    if (room) {
      this.addHistory(room, 'referee_message', refPayload);
    }
    this.io.to(roomId).emit('referee_message', refPayload);
  }

  broadcastRoomUpdate(room) {
    const serialized = {
      id: room.id,
      hostId: room.hostId,
      gameMode: room.gameMode || 'rounds',
      allowHints: room.allowHints !== false,
      turnDuration: room.turnDuration,
      status: room.status,
      turnIndex: room.turnIndex,
      lastWord: room.lastWord,
      expectedSyllable: room.expectedSyllable,
      usedWordsCount: room.usedWords.size,
      roundNumber: room.roundNumber,
      maxRounds: room.maxRounds,
      winner: room.winner ? {
        id: room.winner.id,
        nickname: room.winner.nickname,
        avatar: room.winner.avatar,
        score: room.winner.score || 0
      } : null,
      podium: room.podium,
      players: room.players.map(p => ({
        id: p.id,
        sessionToken: p.sessionToken,
        nickname: p.nickname,
        avatar: p.avatar,
        isHost: p.isHost,
        isAlive: p.isAlive,
        isReady: p.isReady,
        score: p.score || 0,
        wordsCount: p.wordsCount || 0,
        roundsWon: p.roundsWon || 0,
        hintsRemaining: p.hintsRemaining !== undefined ? p.hintsRemaining : (room.allowHints !== false ? 1 : 0),
        isBot: p.isBot,
        isDisconnected: p.isDisconnected
      }))
    };
    this.io.to(room.id).emit('room_updated', serialized);
  }

  handleDisconnect(socket) {
    const roomId = socket.roomId;
    if (!roomId) return;

    const room = this.getRoom(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    const leavingPlayer = room.players[playerIndex];
    leavingPlayer.isDisconnected = true;

    if (room.status === 'waiting') {
      // 120-second grace period in waiting lobby (switching apps to invite friends, etc.)
      leavingPlayer.disconnectTimeout = setTimeout(() => {
        if (!leavingPlayer.isDisconnected) return;
        const curIndex = room.players.findIndex(p => p.sessionToken === leavingPlayer.sessionToken);
        if (curIndex !== -1) {
          room.players.splice(curIndex, 1);
        }
        if (room.players.length === 0) {
          this.clearTurnTimer(room);
          this.rooms.delete(roomId);
          return;
        }
        if (leavingPlayer.isHost) {
          const nextHuman = room.players.find(p => !p.isBot) || room.players[0];
          if (nextHuman) {
            nextHuman.isHost = true;
            room.hostId = nextHuman.id;
          }
        }
        this.sendRefereeMessage(roomId, `${leavingPlayer.avatar} ${leavingPlayer.nickname} đã rời phòng.`);
        this.broadcastRoomUpdate(room);
      }, 120000);
    } else if (room.status === 'playing') {
      const isMyTurn = room.turnIndex === playerIndex;

      // If timed match and it's active player's turn: pause timer and allow 30s reconnect window
      if (isMyTurn && room.turnDuration > 0) {
        this.pauseTurnTimer(room);
        this.sendRefereeMessage(roomId, `⚠️ @${leavingPlayer.nickname} tạm chuyển tab / gián đoạn mạng. Tạm dừng thời gian trong 30s...`);
      } else {
        setTimeout(() => {
          if (leavingPlayer.isDisconnected && room.status === 'playing') {
            this.sendRefereeMessage(roomId, `⚠️ @${leavingPlayer.nickname} tạm gián đoạn mạng (đang chờ kết nối lại)...`);
          }
        }, 4000);
      }
      this.broadcastRoomUpdate(room);

      const timeoutMs = (isMyTurn && room.turnDuration > 0) ? 30000 : 300000;

      leavingPlayer.disconnectTimeout = setTimeout(() => {
        if (!leavingPlayer.isDisconnected || room.status !== 'playing') return;

        leavingPlayer.isAlive = false;
        if (room.isTimerPaused && isMyTurn) {
          room.isTimerPaused = false;
        }
        this.sendRefereeMessage(roomId, `🚨 @${leavingPlayer.nickname} mất kết nối quá thời gian chờ và đã bị loại.`);

        if (room.turnIndex === playerIndex) {
          this.advanceTurn(room, false);
        } else {
          const alive = room.players.filter(p => p.isAlive);
          if (alive.length === 1) {
            const winner = alive[0];
            winner.score = (winner.score || 0) + 50;
            winner.roundsWon = (winner.roundsWon || 0) + 1;
            room.winner = winner;
            room.status = 'match_ended';
            this.clearTurnTimer(room);
            const winnerPayload = { id: winner.id, nickname: winner.nickname, avatar: winner.avatar, score: winner.score || 0 };
            this.io.to(room.id).emit('match_finished', {
              podium: [{ rank: 1, ...winnerPayload }],
              totalRounds: room.maxRounds
            });
            this.sendRefereeMessage(room.id, `👑 ${winner.avatar} @${winner.nickname} chiến thắng vì đối thủ mất kết nối!`);
          }
          this.broadcastRoomUpdate(room);
        }
      }, timeoutMs);
    }
  }
}

module.exports = RoomManager;
