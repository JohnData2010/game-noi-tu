// Game Nối Từ - Client Application Logic (Clean Light Theme, Popular App Style)

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  const socket = io({
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  // App State - tab isolated
  let tabId = sessionStorage.getItem('noitu_tab_id');
  if (!tabId) {
    tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    sessionStorage.setItem('noitu_tab_id', tabId);
  }
  let myId = null;
  let mySessionToken = sessionStorage.getItem('noitu_session_token') || null;
  let currentRoom = null;
  let selectedAvatar = localStorage.getItem('noitu_avatar') || '🐰';
  let isTimerEnabled = false; // Default: Không tính giờ
  let turnDuration = 0; // Default: 0 = Vô hạn thời gian
  let selectedTimedSeconds = 15; // Mốc giây khi bật tính giờ (mặc định 15s)
  let selectedRounds = 3;
  let selectedGameMode = 'rounds'; // 'rounds' | 'battle_royale'
  let isSoundEnabled = true;
  let serverLocalIp = window.location.hostname;
  let serverPort = window.location.port || '3000';

  // DOM Elements
  const viewLobby = document.getElementById('viewLobby');
  const viewWaitingRoom = document.getElementById('viewWaitingRoom');
  const viewGame = document.getElementById('viewGame');

  const navRoomBadge = document.getElementById('navRoomBadge');
  const navRoomCode = document.getElementById('navRoomCode');
  const btnLeaveRoom = document.getElementById('btnLeaveRoom');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const iconSound = document.getElementById('iconSound');
  const dictStats = document.getElementById('dictStats');

  // Lobby Elements
  const lobbyAvatarDisplay = document.getElementById('lobbyAvatarDisplay');
  const avatarPicker = document.getElementById('avatarPicker');
  const inputNickname = document.getElementById('inputNickname');
  const tabCreateRoom = document.getElementById('tabCreateRoom');
  const tabJoinRoom = document.getElementById('tabJoinRoom');
  const panelCreateRoom = document.getElementById('panelCreateRoom');
  const panelJoinRoom = document.getElementById('panelJoinRoom');
  const btnActionCreate = document.getElementById('btnActionCreate');
  const btnActionJoin = document.getElementById('btnActionJoin');
  const inputRoomCode = document.getElementById('inputRoomCode');

  // Mode Elements
  const btnModeRounds = document.getElementById('btnModeRounds');
  const btnModeBR = document.getElementById('btnModeBR');
  const roundsSelectionGroup = document.getElementById('roundsSelectionGroup');
  const brDescGroup = document.getElementById('brDescGroup');

  // Timer Elements
  const toggleTimerSwitch = document.getElementById('toggleTimerSwitch');
  const timerToggleDesc = document.getElementById('timerToggleDesc');
  const timerDurationsContainer = document.getElementById('timerDurationsContainer');
  const timerDurationsRow = document.getElementById('timerDurationsRow');

  // Waiting Room Elements
  const waitingRoomCode = document.getElementById('waitingRoomCode');
  const btnShareRoomNative = document.getElementById('btnShareRoomNative');
  const btnShowQrCode = document.getElementById('btnShowQrCode');
  const playerCount = document.getElementById('playerCount');
  const roomDurationBadge = document.getElementById('roomDurationBadge');
  const roomRoundsBadge = document.getElementById('roomRoundsBadge');
  const waitingPlayersList = document.getElementById('waitingPlayersList');
  const hostControls = document.getElementById('hostControls');
  const clientControls = document.getElementById('clientControls');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnAddBot = document.getElementById('btnAddBot');
  const btnToggleReady = document.getElementById('btnToggleReady');

  // Game Board Elements
  const currentWordDisplay = document.getElementById('currentWordDisplay');
  const expectedSyllableDisplay = document.getElementById('expectedSyllableDisplay');
  const roundBadge = document.getElementById('roundBadge');
  const activePlayerAvatar = document.getElementById('activePlayerAvatar');
  const activePlayerName = document.getElementById('activePlayerName');
  const timerBox = document.getElementById('timerBox');
  const timerNumber = document.getElementById('timerNumber');
  const timerProgressBar = document.getElementById('timerProgressBar');
  const gamePlayersStrip = document.getElementById('gamePlayersStrip');
  const chatFeed = document.getElementById('chatFeed');
  const typingIndicator = document.getElementById('typingIndicator');
  const typingAvatar = document.getElementById('typingAvatar');
  const typingText = document.getElementById('typingText');
  const inputPrefixBadge = document.getElementById('inputPrefixBadge');
  const inputPrefixText = document.getElementById('inputPrefixText');
  const formWordSubmit = document.getElementById('formWordSubmit');
  const inputWord = document.getElementById('inputWord');
  const btnSendWord = document.getElementById('btnSendWord');

  // Modals
  const modalQrCode = document.getElementById('modalQrCode');
  const qrCodeImg = document.getElementById('qrCodeImg');
  const btnCloseQrCode = document.getElementById('btnCloseQrCode');
  const btnCopyMobileLink = document.getElementById('btnCopyMobileLink');

  // Round End Modal
  const modalRoundEnd = document.getElementById('modalRoundEnd');
  const roundEndTitle = document.getElementById('roundEndTitle');
  const roundEndSubtitle = document.getElementById('roundEndSubtitle');
  const roundLeaderboardList = document.getElementById('roundLeaderboardList');
  const btnNextRound = document.getElementById('btnNextRound');

  // Podium Modal (Top 1, Top 2, Top 3)
  const modalPodium = document.getElementById('modalPodium');
  const podiumSubtitle = document.getElementById('podiumSubtitle');
  const podium1Avatar = document.getElementById('podium1Avatar');
  const podium1Name = document.getElementById('podium1Name');
  const podium1Score = document.getElementById('podium1Score');
  const podium2Avatar = document.getElementById('podium2Avatar');
  const podium2Name = document.getElementById('podium2Name');
  const podium2Score = document.getElementById('podium2Score');
  const podium3Avatar = document.getElementById('podium3Avatar');
  const podium3Name = document.getElementById('podium3Name');
  const podium3Score = document.getElementById('podium3Score');
  const podiumOtherList = document.getElementById('podiumOtherList');
  const btnPlayAgainMatch = document.getElementById('btnPlayAgainMatch');
  const btnClosePodium = document.getElementById('btnClosePodium');

  const modalRules = document.getElementById('modalRules');
  const btnOpenRules = document.getElementById('btnOpenRules');
  const btnCloseRules = document.getElementById('btnCloseRules');
  const btnAcknowledgeRules = document.getElementById('btnAcknowledgeRules');
  const toastContainer = document.getElementById('toastContainer');

  // Avatar HTML Renderer (supports emojis & custom image avatars)
  function renderAvatarHtml(avatar, sizeClass = 'w-6 h-6 text-sm') {
    if (!avatar) return '🐰';
    if (avatar.startsWith('/') || avatar.includes('custom_avatar') || avatar.startsWith('http') || avatar.startsWith('data:')) {
      return `<img src="${avatar}" alt="Avatar" class="${sizeClass} object-cover rounded-full inline-block pointer-events-none" />`;
    }
    return `<span class="inline-flex items-center justify-center">${avatar}</span>`;
  }

  // Setup saved avatar
  lobbyAvatarDisplay.innerHTML = renderAvatarHtml(selectedAvatar, 'w-16 h-16 text-3xl');
  const savedName = localStorage.getItem('noitu_nickname');
  if (savedName) inputNickname.value = savedName;

  // ================= MOBILE VIEWPORT & KEYBOARD FIX =================
  const rootStyle = document.documentElement.style;

  function updateViewport() {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;

    rootStyle.setProperty('--vv-height', `${height}px`);
    rootStyle.setProperty('--vv-top', `${top}px`);
    rootStyle.setProperty('--vvh', `${height}px`);

    // Detect if virtual keyboard is open (viewport height shrunk significantly)
    const isKeyboardOpen = vv ? (window.innerHeight - vv.height > 120) : false;
    document.body.classList.toggle('keyboard-open', isKeyboardOpen);

    // Force window scroll back to 0 to prevent iOS layout offset
    if (window.scrollY !== 0 || window.scrollX !== 0) {
      window.scrollTo(0, 0);
    }
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    if (chatFeed) {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', () => {
      updateViewport();
      window.scrollTo(0, 0);
    });
  }
  window.addEventListener('resize', updateViewport);
  window.addEventListener('orientationchange', () => setTimeout(updateViewport, 200));
  window.addEventListener('scroll', () => {
    if (window.scrollY !== 0 || window.scrollX !== 0) {
      window.scrollTo(0, 0);
    }
  });
  updateViewport();

  // Reset any layout shift on focus and blur across all text inputs
  [inputWord, inputNickname, inputRoomCode].forEach(input => {
    if (!input) return;
    input.addEventListener('focus', () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        updateViewport();
      }, 50);
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        updateViewport();
      }, 250);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        updateViewport();
      }, 100);
    });
  });

  // Tap on chat feed dismisses virtual keyboard
  if (chatFeed) {
    chatFeed.addEventListener('touchstart', () => {
      if (document.activeElement === inputWord) {
        inputWord.blur();
      }
    }, { passive: true });
  }

  function syncRoomSession() {
    const savedRoomId = sessionStorage.getItem('noitu_room_id') || localStorage.getItem(`noitu_room_${tabId}`) || localStorage.getItem('noitu_last_room');
    const savedToken = sessionStorage.getItem('noitu_session_token') || localStorage.getItem(`noitu_session_${tabId}`);
    if (savedRoomId && savedToken) {
      if (currentRoom && currentRoom.id === savedRoomId && socket.connected) {
        socket.emit('sync_session', {
          roomId: savedRoomId,
          sessionToken: savedToken
        });
      } else {
        socket.emit('join_room', {
          roomId: savedRoomId,
          sessionToken: savedToken,
          nickname: localStorage.getItem('noitu_nickname') || 'Người chơi',
          avatar: selectedAvatar
        });
      }
    }
  }

  let lastVisibilitySync = 0;
  function handleVisibilitySync() {
    updateViewport();
    const now = Date.now();
    if (now - lastVisibilitySync < 600) return;
    lastVisibilitySync = now;
    if (!socket.connected) {
      socket.connect();
    } else {
      syncRoomSession();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleVisibilitySync();
    }
  });

  window.addEventListener('focus', () => {
    handleVisibilitySync();
  });

  // ================= VIEW SWITCHER =================
  function showView(view) {
    viewLobby.classList.add('hidden');
    viewWaitingRoom.classList.add('hidden');
    viewGame.classList.add('hidden');

    if (view === 'lobby') {
      viewLobby.classList.remove('hidden');
      navRoomBadge.classList.add('hidden');
      navRoomBadge.classList.remove('flex');
      btnLeaveRoom.classList.add('hidden');
      btnLeaveRoom.classList.remove('flex');
    } else if (view === 'waiting') {
      viewWaitingRoom.classList.remove('hidden');
      navRoomBadge.classList.remove('hidden');
      navRoomBadge.classList.add('flex');
      btnLeaveRoom.classList.remove('hidden');
      btnLeaveRoom.classList.add('flex');
    } else if (view === 'game') {
      viewGame.classList.remove('hidden');
      navRoomBadge.classList.remove('hidden');
      navRoomBadge.classList.add('flex');
      btnLeaveRoom.classList.remove('hidden');
      btnLeaveRoom.classList.add('flex');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ================= TOAST NOTIFICATION =================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
      info: 'bg-slate-800 text-white border-slate-700',
      success: 'bg-emerald-600 text-white border-emerald-500',
      error: 'bg-red-600 text-white border-red-500',
      warning: 'bg-amber-600 text-white border-amber-500'
    };

    toast.className = `px-3.5 py-2 rounded-xl border shadow-md text-xs font-medium transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto flex items-center justify-between space-x-2 ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Fetch dictionary size and local IP info
  fetch('/api/stats')
    .then(r => r.json())
    .then(data => {
      if (data && data.dictionarySize) {
        dictStats.textContent = `${data.dictionarySize.toLocaleString('vi-VN')} từ`;
      }
      if (data && data.localIp) {
        serverLocalIp = data.localIp;
      }
      if (data && data.port) {
        serverPort = data.port;
      }
    })
    .catch(() => {});

  // ================= SOUND TOGGLE =================
  btnSoundToggle.addEventListener('click', () => {
    isSoundEnabled = window.soundManager.toggle();
    if (isSoundEnabled) {
      iconSound.setAttribute('data-lucide', 'volume-2');
      showToast('Đã bật âm thanh', 'info');
    } else {
      iconSound.setAttribute('data-lucide', 'volume-x');
      showToast('Đã tắt âm thanh', 'info');
    }
    if (window.lucide) window.lucide.createIcons();
  });

  // ================= AVATAR PICKER =================
  avatarPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.avatar-option');
    if (btn) {
      selectedAvatar = btn.dataset.avatar || btn.textContent.trim();
      lobbyAvatarDisplay.innerHTML = renderAvatarHtml(selectedAvatar, 'w-16 h-16 text-3xl');
      localStorage.setItem('noitu_avatar', selectedAvatar);
      window.soundManager.playPop();
    }
  });

  // Game Mode Selection
  if (btnModeRounds && btnModeBR) {
    btnModeRounds.addEventListener('click', () => {
      selectedGameMode = 'rounds';
      btnModeRounds.className = 'btn-mode-opt py-2 px-2 rounded-xl text-xs font-semibold border-2 border-blue-600 bg-blue-50 text-blue-700 transition';
      btnModeBR.className = 'btn-mode-opt py-2 px-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 transition';
      roundsSelectionGroup.classList.remove('hidden');
      brDescGroup.classList.add('hidden');
      window.soundManager.playPop();
    });

    btnModeBR.addEventListener('click', () => {
      selectedGameMode = 'battle_royale';
      btnModeBR.className = 'btn-mode-opt py-2 px-2 rounded-xl text-xs font-semibold border-2 border-blue-600 bg-blue-50 text-blue-700 transition';
      btnModeRounds.className = 'btn-mode-opt py-2 px-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 transition';
      roundsSelectionGroup.classList.add('hidden');
      brDescGroup.classList.remove('hidden');
      window.soundManager.playPop();
    });
  }

  // Round options toggle
  document.querySelectorAll('.btn-round-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-round-opt').forEach(b => {
        b.className = 'btn-round-opt py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300';
      });
      btn.className = 'btn-round-opt py-1.5 rounded-xl text-xs font-semibold border border-blue-600 bg-blue-50 text-blue-700';
      selectedRounds = parseInt(btn.dataset.rounds, 10);
      window.soundManager.playPop();
    });
  });

  // Timer switch toggle: Bật/Tắt tính giờ
  if (toggleTimerSwitch) {
    toggleTimerSwitch.addEventListener('change', () => {
      isTimerEnabled = toggleTimerSwitch.checked;
      if (isTimerEnabled) {
        turnDuration = selectedTimedSeconds || 15;
        if (timerDurationsContainer) timerDurationsContainer.classList.remove('hidden');
        if (timerToggleDesc) timerToggleDesc.textContent = `⏱️ Đang bật tính giờ: ${turnDuration} giây / lượt`;
      } else {
        turnDuration = 0;
        if (timerDurationsContainer) timerDurationsContainer.classList.add('hidden');
        if (timerToggleDesc) timerToggleDesc.textContent = '✨ Không tính giờ (vô hạn thời gian suy nghĩ)';
      }
      window.soundManager.playPop();
    });
  }

  // Turn Time Selection (10s, 15s, 20s, 30s)
  document.querySelectorAll('.btn-time-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-time-opt').forEach(b => {
        b.className = 'btn-time-opt py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:border-slate-300';
      });
      btn.className = 'btn-time-opt py-2 rounded-xl text-xs sm:text-sm font-bold border-2 border-blue-600 bg-blue-50 text-blue-700';
      selectedTimedSeconds = parseInt(btn.dataset.time, 10);
      if (isTimerEnabled) {
        turnDuration = selectedTimedSeconds;
        if (timerToggleDesc) timerToggleDesc.textContent = `⏱️ Đang bật tính giờ: ${turnDuration} giây / lượt`;
      }
      window.soundManager.playPop();
    });
  });

  // Tab switching
  tabCreateRoom.addEventListener('click', () => {
    tabCreateRoom.className = 'py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-white shadow-sm transition';
    tabJoinRoom.className = 'py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition';
    panelCreateRoom.classList.remove('hidden');
    panelJoinRoom.classList.add('hidden');
  });

  tabJoinRoom.addEventListener('click', () => {
    tabJoinRoom.className = 'py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-white shadow-sm transition';
    tabCreateRoom.className = 'py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition';
    panelJoinRoom.classList.remove('hidden');
    panelCreateRoom.classList.add('hidden');
    setTimeout(() => inputRoomCode.focus(), 100);
  });

  // Auto-detect URL parameter `?room=CODE`
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    tabJoinRoom.click();
    inputRoomCode.value = roomParam.toUpperCase().trim();
  }

  // ================= CREATE & JOIN ACTIONS =================
  btnActionCreate.addEventListener('click', () => {
    const nickname = inputNickname.value.trim() || 'Người chơi';
    localStorage.setItem('noitu_nickname', nickname);
    window.soundManager.playPop();
    socket.emit('create_room', {
      nickname,
      avatar: selectedAvatar,
      turnDuration: isTimerEnabled ? turnDuration : 0,
      isUnlimitedTime: !isTimerEnabled,
      maxRounds: selectedRounds,
      gameMode: selectedGameMode,
      sessionToken: mySessionToken
    });
  });

  btnActionJoin.addEventListener('click', () => {
    const nickname = inputNickname.value.trim() || 'Người chơi';
    localStorage.setItem('noitu_nickname', nickname);
    const code = inputRoomCode.value.trim().toUpperCase();
    if (!code) {
      showToast('Vui lòng nhập mã phòng!', 'warning');
      inputRoomCode.focus();
      return;
    }
    window.soundManager.playPop();
    socket.emit('join_room', {
      roomId: code,
      nickname,
      avatar: selectedAvatar,
      sessionToken: mySessionToken
    });
  });

  // ================= MOBILE SHARING & QR CODE =================
  function getMobileRoomLink() {
    if (!currentRoom) return window.location.href;
    const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `${serverLocalIp}:${serverPort}`
      : window.location.host;
    return `${window.location.protocol}//${host}/?room=${currentRoom.id}`;
  }

  async function shareRoomNative() {
    if (!currentRoom) return;
    const shareUrl = getMobileRoomLink();
    const shareData = {
      title: 'Game Nối Từ Ba Chị Em',
      text: `Vào chơi Nối Từ cùng mình nhé! Mã phòng: ${currentRoom.id}`,
      url: shareUrl
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        window.soundManager.playPop();
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl, 'Đã sao chép liên kết vào bộ nhớ tạm!');
        }
      }
    } else {
      copyToClipboard(shareUrl, 'Đã sao chép liên kết phòng!');
    }
  }

  btnShareRoomNative.addEventListener('click', shareRoomNative);
  navRoomBadge.addEventListener('click', shareRoomNative);

  btnShowQrCode.addEventListener('click', () => {
    if (!currentRoom) return;
    const shareUrl = getMobileRoomLink();
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`;
    modalQrCode.classList.remove('hidden');
    window.soundManager.playPop();
  });

  btnCloseQrCode.addEventListener('click', () => modalQrCode.classList.add('hidden'));

  btnCopyMobileLink.addEventListener('click', () => {
    const shareUrl = getMobileRoomLink();
    copyToClipboard(shareUrl, 'Đã sao chép liên kết vào bộ nhớ tạm!');
  });

  function copyToClipboard(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(msg, 'success');
        window.soundManager.playPop();
      }).catch(() => {
        prompt('Sao chép liên kết phòng:', text);
      });
    } else {
      prompt('Sao chép liên kết phòng:', text);
    }
  }

  btnStartGame.addEventListener('click', () => {
    window.soundManager.playPop();
    socket.emit('start_game');
  });

  btnAddBot.addEventListener('click', () => {
    window.soundManager.playPop();
    socket.emit('add_bot');
  });

  btnToggleReady.addEventListener('click', () => {
    window.soundManager.playPop();
    socket.emit('toggle_ready');
  });

  btnLeaveRoom.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn rời khỏi phòng này?')) {
      sessionStorage.removeItem('noitu_session_token');
      sessionStorage.removeItem('noitu_room_id');
      localStorage.removeItem('noitu_session_token');
      localStorage.removeItem('noitu_room_id');
      currentRoom = null;
      window.location.href = '/';
    }
  });

  // ================= GAMEPLAY ACTIONS =================
  formWordSubmit.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawInput = inputWord.value.trim().toLowerCase();
    if (!rawInput) return;

    const prefix = (currentRoom?.expectedSyllable || '').trim().toLowerCase();
    let fullWord = '';

    if (prefix) {
      if (rawInput.startsWith(prefix + ' ')) {
        fullWord = rawInput;
      } else if (rawInput === prefix) {
        showToast('Vui lòng nhập thêm tiếng thứ 2!', 'warning');
        return;
      } else {
        fullWord = `${prefix} ${rawInput}`;
      }
    } else {
      fullWord = rawInput;
    }

    window.soundManager.playPop();
    socket.emit('submit_word', fullWord);
    inputWord.value = '';

    setTimeout(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }, 50);
  });

  // ================= MODAL ACTIONS =================
  btnOpenRules.addEventListener('click', () => modalRules.classList.remove('hidden'));
  btnCloseRules.addEventListener('click', () => modalRules.classList.add('hidden'));
  btnAcknowledgeRules.addEventListener('click', () => modalRules.classList.add('hidden'));

  btnNextRound.addEventListener('click', () => {
    modalRoundEnd.classList.add('hidden');
    window.soundManager.playPop();
    socket.emit('start_game');
  });

  btnPlayAgainMatch.addEventListener('click', () => {
    modalPodium.classList.add('hidden');
    window.soundManager.playPop();
    socket.emit('start_game');
  });

  btnClosePodium.addEventListener('click', () => {
    modalPodium.classList.add('hidden');
  });

  // ================= SOCKET EVENT LISTENERS =================
  socket.on('connect', () => {
    myId = socket.id;
    syncRoomSession();
  });

  socket.on('session_created', ({ sessionToken, roomId }) => {
    mySessionToken = sessionToken;
    sessionStorage.setItem('noitu_session_token', sessionToken);
    sessionStorage.setItem('noitu_room_id', roomId);
    localStorage.setItem(`noitu_session_${tabId}`, sessionToken);
    localStorage.setItem(`noitu_room_${tabId}`, roomId);
    localStorage.setItem('noitu_last_room', roomId);
  });

  socket.on('error_message', (msg) => {
    showToast(msg, 'error');
    window.soundManager.playBuzzer();
    if (msg.includes('không tồn tại') || msg.includes('giải tán')) {
      sessionStorage.removeItem('noitu_session_token');
      sessionStorage.removeItem('noitu_room_id');
      localStorage.removeItem(`noitu_session_${tabId}`);
      localStorage.removeItem(`noitu_room_${tabId}`);
      currentRoom = null;
      showView('lobby');
    }
  });

  socket.on('room_updated', (room) => {
    currentRoom = room;
    navRoomCode.textContent = room.id;
    waitingRoomCode.textContent = room.id;
    if (room.turnDuration === 0) {
      roomDurationBadge.textContent = 'Không tính giờ';
      timerNumber.textContent = '∞';
      timerNumber.className = 'text-sm sm:text-base font-bold text-slate-400 font-mono';
      timerProgressBar.style.width = '100%';
      timerProgressBar.className = 'h-full bg-slate-200 transition-all duration-300';
      timerBox.className = 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors duration-300';
    } else {
      roomDurationBadge.textContent = `${room.turnDuration}s`;
    }
    
    if (roomRoundsBadge) {
      roomRoundsBadge.textContent = room.gameMode === 'battle_royale' ? 'Battle Royale' : `${room.maxRounds} Hiệp`;
    }
    playerCount.textContent = room.players.length;

    const me = room.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken));
    const amIHost = me ? me.isHost : false;

    // View Switching
    if (room.status === 'waiting') {
      showView('waiting');
      renderWaitingPlayers(room.players, amIHost);

      if (amIHost) {
        hostControls.classList.remove('hidden');
        clientControls.classList.add('hidden');
        btnStartGame.disabled = room.players.length < 2;
        btnStartGame.classList.toggle('opacity-50', room.players.length < 2);
      } else {
        hostControls.classList.add('hidden');
        clientControls.classList.remove('hidden');
        btnToggleReady.textContent = me?.isReady ? 'Hủy sẵn sàng' : 'Sẵn sàng';
        btnToggleReady.className = me?.isReady 
          ? 'w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm transition active:scale-98'
          : 'w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition active:scale-98';
      }
    } else if (room.status === 'playing' || room.status === 'round_ended' || room.status === 'match_ended' || room.status === 'ended') {
      showView('game');
      if (room.status === 'playing') {
        modalRoundEnd.classList.add('hidden');
        modalPodium.classList.add('hidden');
      }
      renderGameBoard(room, me);
    }
  });

  function renderWaitingPlayers(players, amIHost) {
    waitingPlayersList.innerHTML = '';
    players.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 transition';
      
      const isMe = p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken);
      item.innerHTML = `
        <div class="flex items-center space-x-3 min-w-0">
          <span class="flex-shrink-0 flex items-center justify-center w-8 h-8">${renderAvatarHtml(p.avatar, 'w-8 h-8 text-2xl')}</span>
          <div class="min-w-0">
            <div class="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-1.5 truncate">
              <span class="truncate">${p.nickname}</span>
              ${isMe ? '<span class="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">BẠN</span>' : ''}
              ${p.isHost ? '<span class="text-[10px] sm:text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold flex-shrink-0">Chủ phòng</span>' : ''}
              ${p.isBot ? '<span class="text-[10px] sm:text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">Bot</span>' : ''}
              ${p.isDisconnected ? '<span class="text-[10px] sm:text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex-shrink-0">Mất mạng</span>' : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-2 flex-shrink-0">
          ${p.isHost 
            ? '<span class="text-xs sm:text-sm font-bold text-emerald-600">Sẵn sàng</span>' 
            : p.isReady 
              ? '<span class="text-xs sm:text-sm font-bold text-emerald-600">Sẵn sàng</span>' 
              : '<span class="text-xs sm:text-sm font-medium text-slate-400">Đang chờ</span>'}
          ${amIHost && p.isBot ? `<button onclick="window.removeBot('${p.id}')" class="text-slate-400 hover:text-red-500 p-1.5" title="Xóa Bot"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
        </div>
      `;
      waitingPlayersList.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  window.removeBot = function(botId) {
    socket.emit('remove_bot', botId);
  };

  function renderGameBoard(room, me) {
    currentWordDisplay.textContent = room.lastWord || '---';
    expectedSyllableDisplay.textContent = room.expectedSyllable || '---';
    
    if (roundBadge) {
      roundBadge.textContent = room.gameMode === 'battle_royale' 
        ? 'Sinh tồn' 
        : `Hiệp ${room.roundNumber || 1}/${room.maxRounds || 3}`;
    }

    // Show locked prefix in input bar
    if (room.expectedSyllable) {
      inputPrefixBadge.classList.remove('hidden');
      inputPrefixBadge.classList.add('flex');
      inputPrefixText.textContent = room.expectedSyllable;
    } else {
      inputPrefixBadge.classList.add('hidden');
      inputPrefixBadge.classList.remove('flex');
    }

    const activePlayer = room.players[room.turnIndex];
    if (activePlayer) {
      activePlayerAvatar.innerHTML = renderAvatarHtml(activePlayer.avatar, 'w-6 h-6 text-sm');
      activePlayerName.textContent = `@${activePlayer.nickname}`;
    }

    // Mini status strip
    gamePlayersStrip.innerHTML = '';
    room.players.forEach(p => {
      const badge = document.createElement('div');
      const isTurn = activePlayer && p.id === activePlayer.id;
      const isMe = p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken);
      badge.className = `flex-shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs sm:text-sm font-semibold transition ${
        isTurn 
          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
          : p.isAlive 
            ? 'bg-slate-50 border-slate-200 text-slate-700' 
            : 'bg-red-50 border-red-200 text-red-500 opacity-60'
      }`;
      badge.innerHTML = `
        <span class="flex-shrink-0 flex items-center justify-center">${renderAvatarHtml(p.avatar, 'w-5 h-5 text-sm')}</span>
        <span class="max-w-[85px] truncate">${p.nickname}${isMe ? ' (Bạn)' : ''}</span>
        ${p.isAlive ? '<span class="text-emerald-500 text-[10px]">●</span>' : '<span class="text-red-500 text-[10px]">×</span>'}
        <span class="text-xs text-slate-400 font-mono font-bold">(${p.score})</span>
      `;
      gamePlayersStrip.appendChild(badge);
    });

    // Control input box availability (CLEAN, NO EXAMPLES)
    const isMyTurn = activePlayer && (activePlayer.id === myId || (activePlayer.sessionToken && activePlayer.sessionToken === mySessionToken)) && me && me.isAlive;
    if (isMyTurn) {
      inputWord.disabled = false;
      btnSendWord.disabled = false;
      inputWord.placeholder = 'Nhập từ...';
      if (document.activeElement !== inputWord) {
        inputWord.focus();
      }
      typingIndicator.classList.add('hidden');
    } else {
      inputWord.disabled = true;
      btnSendWord.disabled = true;
      if (me && !me.isAlive) {
        inputWord.placeholder = 'Bạn đã bị loại';
      } else if (activePlayer) {
        inputWord.placeholder = `Chờ lượt ${activePlayer.nickname}...`;
      }

      if (activePlayer && room.status === 'playing') {
        typingAvatar.innerHTML = renderAvatarHtml(activePlayer.avatar, 'w-5 h-5 text-sm');
        typingText.textContent = `${activePlayer.nickname} đang suy nghĩ...`;
        typingIndicator.classList.remove('hidden');
      } else {
        typingIndicator.classList.add('hidden');
      }
    }
  }

  // Timer Tick Event
  socket.on('timer_tick', ({ timeRemaining, totalDuration, isUnlimited }) => {
    if (isUnlimited || totalDuration === 0) {
      timerNumber.textContent = '∞';
      timerNumber.className = 'text-sm sm:text-base font-bold text-slate-400 font-mono';
      timerProgressBar.style.width = '100%';
      timerProgressBar.className = 'h-full bg-slate-200 transition-all duration-300';
      timerBox.className = 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center transition-colors duration-300';
      return;
    }

    timerNumber.textContent = timeRemaining;
    const pct = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));
    timerProgressBar.style.width = `${pct}%`;

    if (timeRemaining <= 4) {
      timerBox.className = 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-50 border-2 border-red-500 flex items-center justify-center timer-critical transition-colors duration-300';
      timerNumber.className = 'text-base sm:text-lg font-black text-red-600 font-mono';
      timerProgressBar.className = 'h-full bg-red-500 transition-all duration-300';
      window.soundManager.playTick();
    } else if (timeRemaining <= 7) {
      timerBox.className = 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border-2 border-amber-500 flex items-center justify-center transition-colors duration-300';
      timerNumber.className = 'text-base sm:text-lg font-black text-amber-600 font-mono';
      timerProgressBar.className = 'h-full bg-amber-500 transition-all duration-300';
    } else {
      timerBox.className = 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors duration-300';
      timerNumber.className = 'text-base sm:text-lg font-black text-slate-800 font-mono';
      timerProgressBar.className = 'h-full bg-blue-600 transition-all duration-300';
    }
  });

  // Helper renderers for chat feed messages
  function renderTurnAnnouncement({ nickname, avatar, syllable, startWord, isOpening }) {
    const pill = document.createElement('div');
    pill.className = 'flex items-center justify-center my-1.5';
    if (isOpening) {
      pill.innerHTML = `
        <span class="px-4 py-1 rounded-full bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 font-medium shadow-xs">
          Mở màn: <strong class="text-slate-900 font-bold">${startWord}</strong> &bull; Lượt của <strong class="text-blue-600 font-bold">@${nickname}</strong>
        </span>
      `;
    } else {
      pill.innerHTML = `
        <span class="px-4 py-1 rounded-full bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 font-medium shadow-xs">
          Lượt của <strong class="text-blue-600 font-bold">@${nickname}</strong> &bull; Nối: <strong class="text-slate-900 font-bold">${syllable}</strong>
        </span>
      `;
    }
    chatFeed.appendChild(pill);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function renderPlayerMessage({ playerId, nickname, avatar, word, timestamp }, playSound = true) {
    const isMe = playerId === myId || (currentRoom && currentRoom.players.find(p => p.id === playerId)?.sessionToken === mySessionToken);
    if (playSound) {
      if (isMe) window.soundManager.playPop();
      else window.soundManager.playMessageReceived();
    }

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex items-end space-x-2 my-1 ${isMe ? 'justify-end' : 'justify-start'}`;

    if (isMe) {
      bubbleWrapper.innerHTML = `
        <div class="flex flex-col items-end max-w-[85%]">
          <div class="chat-bubble-me px-4 py-2 rounded-2xl shadow-xs text-base sm:text-lg font-bold break-words tracking-wide">
            ${word}
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5 mr-1 font-medium">${timestamp || ''}</span>
        </div>
      `;
    } else {
      bubbleWrapper.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
          ${renderAvatarHtml(avatar, 'w-full h-full text-sm')}
        </div>
        <div class="flex flex-col items-start max-w-[85%]">
          <span class="text-xs font-semibold text-slate-500 ml-1 mb-0.5">${nickname}</span>
          <div class="chat-bubble-other px-4 py-2 rounded-2xl text-base sm:text-lg font-bold break-words tracking-wide">
            ${word}
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5 ml-1 font-medium">${timestamp || ''}</span>
        </div>
      `;
    }

    chatFeed.appendChild(bubbleWrapper);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function renderEliminationMessage({ playerId, nickname, avatar, reason }, playSound = true) {
    if (playSound) window.soundManager.playBuzzer();

    const card = document.createElement('div');
    card.className = 'flex items-center justify-center my-1.5';
    card.innerHTML = `
      <span class="px-4 py-1 rounded-full bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-bold shadow-xs">
        <strong>@${nickname}</strong> bị loại: ${reason}
      </span>
    `;

    chatFeed.appendChild(card);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function renderRefereeMessage({ text }) {
    const card = document.createElement('div');
    card.className = 'flex items-center justify-center my-1.5';
    card.innerHTML = `
      <span class="px-4 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs sm:text-sm font-semibold text-amber-900 shadow-xs">
        ${text}
      </span>
    `;
    chatFeed.appendChild(card);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function renderChatBubble({ senderId, nickname, avatar, text, timestamp }, playSound = true) {
    const isMe = senderId === myId;
    if (playSound && !isMe) window.soundManager.playMessageReceived();

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex items-end space-x-2 my-1 ${isMe ? 'justify-end' : 'justify-start'}`;

    if (isMe) {
      bubbleWrapper.innerHTML = `
        <div class="flex flex-col items-end max-w-[85%]">
          <div class="px-3.5 py-1.5 rounded-2xl bg-blue-500 text-white text-sm font-medium break-words">
            ${text}
          </div>
          <span class="text-[10px] text-slate-400 mt-0.5 mr-1">${timestamp || ''}</span>
        </div>
      `;
    } else {
      bubbleWrapper.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs flex-shrink-0 overflow-hidden">
          ${renderAvatarHtml(avatar, 'w-full h-full text-xs')}
        </div>
        <div class="flex flex-col items-start max-w-[85%]">
          <span class="text-[11px] font-semibold text-slate-500 ml-1">${nickname}</span>
          <div class="px-3.5 py-1.5 rounded-2xl bg-slate-100 text-slate-800 text-sm font-medium break-words">
            ${text}
          </div>
          <span class="text-[10px] text-slate-400 mt-0.5 ml-1">${timestamp || ''}</span>
        </div>
      `;
    }
    chatFeed.appendChild(bubbleWrapper);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  // Socket Events for Chat and Gameplay Messages
  socket.on('turn_announcement', (data) => renderTurnAnnouncement(data));
  socket.on('player_message', (data) => renderPlayerMessage(data, true));
  socket.on('player_eliminated', (data) => renderEliminationMessage(data, true));
  socket.on('referee_message', (data) => renderRefereeMessage(data));
  socket.on('chat_bubble', (data) => renderChatBubble(data, true));

  // Chat History Recovery (when tab recovers / reloads / reconnects)
  socket.on('chat_history', (history) => {
    if (!Array.isArray(history) || history.length === 0) return;
    chatFeed.innerHTML = '';
    history.forEach(item => {
      if (item.type === 'player_message') renderPlayerMessage(item.data, false);
      else if (item.type === 'turn_announcement') renderTurnAnnouncement(item.data);
      else if (item.type === 'referee_message') renderRefereeMessage(item.data);
      else if (item.type === 'player_eliminated') renderEliminationMessage(item.data, false);
      else if (item.type === 'chat_bubble') renderChatBubble(item.data, false);
    });
    chatFeed.scrollTop = chatFeed.scrollHeight;
  });

  // Timer Paused / Resumed Alerts
  socket.on('timer_paused', ({ timeRemaining }) => {
    timerNumber.textContent = `${timeRemaining}s`;
    timerNumber.className = 'text-xs sm:text-sm font-bold text-amber-500 font-mono animate-pulse';
  });

  socket.on('timer_resumed', ({ timeRemaining }) => {
    timerNumber.textContent = `${timeRemaining}s`;
    timerNumber.className = 'text-sm sm:text-base font-bold text-slate-800 font-mono';
  });

  // ================= ROUND ENDED =================
  socket.on('round_ended', ({ roundWinner, currentRound, maxRounds, leaderboard }) => {
    window.soundManager.playStart();
    roundEndTitle.textContent = `Kết thúc hiệp ${currentRound}/${maxRounds}`;

    if (roundWinner) {
      roundEndSubtitle.innerHTML = `<strong>@${roundWinner.nickname}</strong> thắng hiệp (+50 điểm)`;
    } else {
      roundEndSubtitle.textContent = 'Hết hiệp đấu!';
    }

    // Leaderboard
    roundLeaderboardList.innerHTML = '';
    (leaderboard || []).forEach(item => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs';
      row.innerHTML = `
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-6 font-bold text-center text-sm text-slate-400">#${item.rank}</span>
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center">${renderAvatarHtml(item.avatar, 'w-7 h-7 text-base')}</span>
          <span class="text-sm font-bold text-slate-800 truncate max-w-[140px]">${item.nickname}</span>
        </div>
        <span class="text-sm font-bold text-blue-600 font-mono">${item.score} đ</span>
      `;
      roundLeaderboardList.appendChild(row);
    });

    const me = currentRoom ? currentRoom.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken)) : null;
    const amIHost = me ? me.isHost : false;

    if (amIHost) {
      btnNextRound.disabled = false;
      btnNextRound.classList.remove('opacity-50', 'cursor-not-allowed');
      btnNextRound.textContent = `Vào hiệp ${currentRound + 1}`;
    } else {
      btnNextRound.disabled = true;
      btnNextRound.classList.add('opacity-50', 'cursor-not-allowed');
      btnNextRound.textContent = `Chờ chủ phòng vào hiệp ${currentRound + 1}...`;
    }

    modalRoundEnd.classList.remove('hidden');
  });

  // ================= MATCH FINISHED / PODIUM =================
  socket.on('match_finished', ({ podium, totalRounds }) => {
    modalRoundEnd.classList.add('hidden');
    window.soundManager.playVictory();
    spawnConfetti();

    if (currentRoom?.gameMode === 'battle_royale') {
      podiumSubtitle.textContent = 'Trận chiến sinh tồn Battle Royale kết thúc!';
    } else {
      podiumSubtitle.textContent = 'Chúc mừng các người chơi xuất sắc nhất!';
    }

    const p1 = (podium || []).find(p => p.rank === 1);
    const p2 = (podium || []).find(p => p.rank === 2);
    const p3 = (podium || []).find(p => p.rank === 3);

    // 1st place
    if (p1) {
      podium1Avatar.innerHTML = renderAvatarHtml(p1.avatar, 'w-12 h-12 text-3xl');
      podium1Name.textContent = `@${p1.nickname}`;
      podium1Score.textContent = `${p1.score} đ`;
    } else {
      podium1Avatar.innerHTML = '👑';
      podium1Name.textContent = '---';
      podium1Score.textContent = '0 đ';
    }

    // 2nd place
    if (p2) {
      podium2Avatar.innerHTML = renderAvatarHtml(p2.avatar, 'w-10 h-10 text-2xl');
      podium2Name.textContent = `@${p2.nickname}`;
      podium2Score.textContent = `${p2.score} đ`;
    } else {
      podium2Avatar.innerHTML = '🥈';
      podium2Name.textContent = '---';
      podium2Score.textContent = '0 đ';
    }

    // 3rd place
    if (p3) {
      podium3Avatar.innerHTML = renderAvatarHtml(p3.avatar, 'w-10 h-10 text-2xl');
      podium3Name.textContent = `@${p3.nickname}`;
      podium3Score.textContent = `${p3.score} đ`;
    } else {
      podium3Avatar.innerHTML = '🥉';
      podium3Name.textContent = '---';
      podium3Score.textContent = '0 đ';
    }

    // Others (rank 4+)
    podiumOtherList.innerHTML = '';
    const others = (podium || []).filter(p => p.rank > 3);
    others.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm';
      item.innerHTML = `
        <div class="flex items-center space-x-2.5">
          <span class="text-slate-400 font-bold">#${p.rank}</span>
          <span class="w-6 h-6 flex items-center justify-center flex-shrink-0">${renderAvatarHtml(p.avatar, 'w-6 h-6 text-xs')}</span>
          <span class="font-bold text-slate-700 truncate max-w-[130px]">${p.nickname}</span>
        </div>
        <span class="font-bold text-slate-600 font-mono">${p.score} đ</span>
      `;
      podiumOtherList.appendChild(item);
    });

    const me = currentRoom ? currentRoom.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken)) : null;
    const amIHost = me ? me.isHost : false;

    if (amIHost) {
      btnPlayAgainMatch.disabled = false;
      btnPlayAgainMatch.classList.remove('opacity-50', 'cursor-not-allowed');
      btnPlayAgainMatch.textContent = 'Chơi ván mới';
    } else {
      btnPlayAgainMatch.disabled = true;
      btnPlayAgainMatch.classList.add('opacity-50', 'cursor-not-allowed');
      btnPlayAgainMatch.textContent = 'Chờ chủ phòng đấu lại...';
    }

    modalPodium.classList.remove('hidden');
  });

  // Confetti Animation Effect
  function spawnConfetti() {
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${2 + Math.random() * 2.5}s`;
      piece.style.animationDelay = `${Math.random() * 0.5}s`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }

});
