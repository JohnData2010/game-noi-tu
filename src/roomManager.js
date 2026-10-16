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
    const player = {
      id: socket.id,
      sessionToken,
      nickname: data.nickname || 'Người chơi 1',
      avatar: data.avatar || '🧑‍🚀',
      isHost: true,
      isAlive: true,
      isReady: true,
      score: 0,
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
      winner: null,
      podium: null
    };

    this.rooms.set(roomId, room);
    socket.join(roomId);
    socket.roomId = roomId;
    socket.sessionToken = sessionToken;

    socket.emit('session_created', { sessionToken, roomId });
    this.broadcastRoomUpdate(room);

    return room;
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
        this.broadcastRoomUpdate(room);

        // Sync active timer state if match is ongoing
        if (room.status === 'playing') {
          socket.emit('timer_tick', {
            timeRemaining: room.timeRemaining || 0,
            totalDuration: room.turnDuration || 0,
            isUnlimited: room.turnDuration === 0
          });
          if (wasDisconnected) {
            this.sendRefereeMessage(roomId, `✅ @${existing.nickname} đã kết nối lại.`);
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

    // Reset players alive state for this round
    for (const p of room.players) {
      p.isAlive = true;
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

    this.io.to(room.id).emit('turn_announcement', {
      nickname: activePlayer.nickname,
      avatar: activePlayer.avatar,
      syllable: startTail,
      startWord: startWord,
      isOpening: true,
      currentRound: room.roundNumber,
      maxRounds: room.maxRounds
    });

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
    this.io.to(room.id).emit('player_message', {
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      word: rawWord,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

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
    this.io.to(room.id).emit('player_eliminated', {
      playerId: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      reason
    });

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

    this.io.to(room.id).emit('turn_announcement', {
      nickname: nextPlayer.nickname,
      avatar: nextPlayer.avatar,
      syllable: room.expectedSyllable,
      isOpening: false
    });

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
    this.io.to(roomId).emit('referee_message', {
      sender: 'Trọng Tài',
      avatar: '⚖️',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  }

  broadcastRoomUpdate(room) {
    const serialized = {
      id: room.id,
      hostId: room.hostId,
      gameMode: room.gameMode || 'rounds',
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
      // 120-second grace period during live match for switching tabs/apps
      setTimeout(() => {
        if (leavingPlayer.isDisconnected && room.status === 'playing') {
          this.sendRefereeMessage(roomId, `⚠️ @${leavingPlayer.nickname} tạm gián đoạn mạng (đang chờ kết nối lại)...`);
        }
      }, 5000);
      this.broadcastRoomUpdate(room);

      leavingPlayer.disconnectTimeout = setTimeout(() => {
        if (!leavingPlayer.isDisconnected || room.status !== 'playing') return;

        leavingPlayer.isAlive = false;
        this.sendRefereeMessage(roomId, `🚨 @${leavingPlayer.nickname} mất kết nối quá 2 phút và đã bị loại.`);

        if (room.turnIndex === playerIndex) {
          this.advanceTurn(room, false);
        } else {
          const alive = room.players.filter(p => p.isAlive);
          if (alive.length === 1) {
            const winner = alive[0];
            room.winner = winner;
            room.status = 'ended';
            this.clearTurnTimer(room);
            const winnerPayload = { id: winner.id, nickname: winner.nickname, avatar: winner.avatar, score: winner.score || 0 };
            this.io.to(room.id).emit('game_over', { winner: winnerPayload });
            this.sendRefereeMessage(room.id, `👑 ${winner.avatar} @${winner.nickname} chiến thắng vì đối thủ mất kết nối!`);
          }
          this.broadcastRoomUpdate(room);
        }
      }, 120000);
    }
  }
}

module.exports = RoomManager;
