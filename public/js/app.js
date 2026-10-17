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
  let isHintEnabled = true; // Default: Bật gợi ý (1 lần/hiệp)
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

  // Timer & Hint Elements
  const toggleTimerSwitch = document.getElementById('toggleTimerSwitch');
  const timerToggleDesc = document.getElementById('timerToggleDesc');
  const timerDurationsContainer = document.getElementById('timerDurationsContainer');
  const timerDurationsRow = document.getElementById('timerDurationsRow');
  const toggleHintSwitch = document.getElementById('toggleHintSwitch');

  // Waiting Room Elements
  const waitingRoomCode = document.getElementById('waitingRoomCode');
  const btnShareRoomNative = document.getElementById('btnShareRoomNative');
  const btnShowQrCode = document.getElementById('btnShowQrCode');
  const playerCount = document.getElementById('playerCount');
  const roomHintBadge = document.getElementById('roomHintBadge');
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
  const btnRequestHint = document.getElementById('btnRequestHint');
  const hintBadgeCount = document.getElementById('hintBadgeCount');
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
  const btnRoundReturnLobby = document.getElementById('btnRoundReturnLobby');
  const btnRoundLeaveRoom = document.getElementById('btnRoundLeaveRoom');

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
  const btnReturnLobby = document.getElementById('btnReturnLobby');
  const btnPodiumLeaveRoom = document.getElementById('btnPodiumLeaveRoom');
  const btnClosePodium = document.getElementById('btnClosePodium');

  // Match Ended Floating Banner
  const matchEndedBanner = document.getElementById('matchEndedBanner');
  const btnBannerPlayAgain = document.getElementById('btnBannerPlayAgain');
  const btnBannerReturnLobby = document.getElementById('btnBannerReturnLobby');
  const btnBannerLeaveRoom = document.getElementById('btnBannerLeaveRoom');

  const modalRules = document.getElementById('modalRules');
  const btnOpenRules = document.getElementById('btnOpenRules');
  const btnCloseRules = document.getElementById('btnCloseRules');
  const btnAcknowledgeRules = document.getElementById('btnAcknowledgeRules');
  const toastContainer = document.getElementById('toastContainer');

  // Avatar HTML Renderer (supports emojis & custom image avatars)
  function renderAvatarHtml(avatar, sizeClass = 'w-6 h-6 text-sm') {
    if (!avatar) return `<span class="${sizeClass} inline-flex items-center justify-center">🐰</span>`;
    if (avatar.startsWith('/') || avatar.includes('custom_avatar') || avatar.startsWith('http') || avatar.startsWith('data:')) {
      return `<img src="${avatar}" alt="Avatar" class="${sizeClass} object-cover rounded-full inline-block pointer-events-none" />`;
    }
    return `<span class="${sizeClass} inline-flex items-center justify-center">${avatar}</span>`;
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

    // In iOS Safari, the browser may shift the layout viewport upward (window.scrollY > 0),
    // or offset the visual viewport (vv.offsetTop > 0).
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const vvOffset = vv ? (vv.offsetTop || 0) : 0;
    const totalOffset = vvOffset + scrollY;

    rootStyle.setProperty('--vv-height', `${height}px`);
    rootStyle.setProperty('--vv-top', `${totalOffset}px`);
    rootStyle.setProperty('--vvh', `${height}px`);

    // Detect if virtual keyboard is open on small mobile devices only
    const isSmallScreen = window.innerWidth <= 768;
    const isHeightShrunk = vv ? (window.innerHeight - vv.height > 120) : false;
    const isKeyboardOpen = isSmallScreen && isHeightShrunk;
    document.body.classList.toggle('keyboard-open', isKeyboardOpen);

    // Keep chat scrolled to bottom when keyboard is open
    if (chatFeed && isKeyboardOpen) {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewport);
    window.visualViewport.addEventListener('scroll', updateViewport);
  }
  window.addEventListener('resize', updateViewport);
  window.addEventListener('orientationchange', () => setTimeout(updateViewport, 200));
  window.addEventListener('scroll', updateViewport);
  updateViewport();

  // Reset any layout shift on focus and blur across all text inputs
  [inputWord, inputNickname, inputRoomCode].forEach(input => {
    if (!input) return;
    input.addEventListener('focus', () => {
      updateViewport();
      // Counter Safari's native scroll animation across multiple frames
      [30, 80, 150, 300].forEach(delay => {
        setTimeout(() => {
          if (window.scrollY !== 0 || window.scrollX !== 0) {
            window.scrollTo(0, 0);
          }
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
          updateViewport();
        }, delay);
      });
    });

    input.addEventListener('blur', () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        updateViewport();
      }, 50);
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        updateViewport();
      }, 250);
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

  // Prevent elastic rubber-banding outside scrollable containers on iOS
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('#chatFeed, .overflow-y-auto, .overflow-x-auto, input, textarea, select')) {
      e.preventDefault();
    }
  }, { passive: false });

  function clearRoomStorage() {
    try {
      sessionStorage.removeItem('noitu_session_token');
      sessionStorage.removeItem('noitu_room_id');
      localStorage.removeItem('noitu_session_token');
      localStorage.removeItem('noitu_room_id');
      localStorage.removeItem('noitu_last_room');
      if (tabId) {
        localStorage.removeItem(`noitu_session_${tabId}`);
        localStorage.removeItem(`noitu_room_${tabId}`);
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('noitu_session_') || key.startsWith('noitu_room_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('Error clearing room storage:', e);
    }
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
      btnLeaveRoom.classList.add('hidden');
      btnLeaveRoom.classList.remove('flex');
    } else if (view === 'waiting') {
      viewWaitingRoom.classList.remove('hidden');
      btnLeaveRoom.classList.remove('hidden');
      btnLeaveRoom.classList.add('flex');
    } else if (view === 'game') {
      viewGame.classList.remove('hidden');
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

    toast.className = `px-4 py-2.5 rounded-xl border shadow-md text-sm sm:text-base font-bold transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto flex items-center justify-between space-x-2 ${colors[type] || colors.info}`;
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
      btnModeRounds.className = 'btn-mode-opt py-3 px-2 rounded-xl text-base font-bold border-2 border-blue-600 bg-blue-50 text-blue-700 transition';
      btnModeBR.className = 'btn-mode-opt py-3 px-2 rounded-xl text-base font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 transition';
      roundsSelectionGroup.classList.remove('hidden');
      brDescGroup.classList.add('hidden');
      window.soundManager.playPop();
    });

    btnModeBR.addEventListener('click', () => {
      selectedGameMode = 'battle_royale';
      btnModeBR.className = 'btn-mode-opt py-3 px-2 rounded-xl text-base font-bold border-2 border-blue-600 bg-blue-50 text-blue-700 transition';
      btnModeRounds.className = 'btn-mode-opt py-3 px-2 rounded-xl text-base font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 transition';
      roundsSelectionGroup.classList.add('hidden');
      brDescGroup.classList.remove('hidden');
      window.soundManager.playPop();
    });
  }

  // Round options toggle
  document.querySelectorAll('.btn-round-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-round-opt').forEach(b => {
        b.className = 'btn-round-opt py-2.5 rounded-xl text-sm sm:text-base font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300';
      });
      btn.className = 'btn-round-opt py-2.5 rounded-xl text-sm sm:text-base font-bold border-2 border-blue-600 bg-blue-50 text-blue-700';
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
      } else {
        turnDuration = 0;
        if (timerDurationsContainer) timerDurationsContainer.classList.add('hidden');
      }
      window.soundManager.playPop();
    });
  }

  // Hint toggle switch
  if (toggleHintSwitch) {
    toggleHintSwitch.addEventListener('change', () => {
      isHintEnabled = toggleHintSwitch.checked;
      window.soundManager.playPop();
    });
  }

  // Turn Time Selection (10s, 15s, 20s, 30s)
  document.querySelectorAll('.btn-time-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-time-opt').forEach(b => {
        b.className = 'btn-time-opt py-1.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:border-slate-300';
      });
      btn.className = 'btn-time-opt py-1.5 rounded-xl text-xs sm:text-sm font-bold border-2 border-blue-600 bg-blue-50 text-blue-700';
      selectedTimedSeconds = parseInt(btn.dataset.time, 10);
      if (isTimerEnabled) {
        turnDuration = selectedTimedSeconds;
      }
      window.soundManager.playPop();
    });
  });

  // Tab switching
  tabCreateRoom.addEventListener('click', () => {
    tabCreateRoom.className = 'py-2.5 rounded-lg text-base font-bold text-slate-900 bg-white shadow-sm transition';
    tabJoinRoom.className = 'py-2.5 rounded-lg text-base font-bold text-slate-500 hover:text-slate-900 transition';
    panelCreateRoom.classList.remove('hidden');
    panelJoinRoom.classList.add('hidden');
  });

  tabJoinRoom.addEventListener('click', () => {
    tabJoinRoom.className = 'py-2.5 rounded-lg text-base font-bold text-slate-900 bg-white shadow-sm transition';
    tabCreateRoom.className = 'py-2.5 rounded-lg text-base font-bold text-slate-500 hover:text-slate-900 transition';
    panelJoinRoom.classList.remove('hidden');
    panelCreateRoom.classList.add('hidden');
    setTimeout(() => {
      try { inputRoomCode.focus({ preventScroll: true }); } catch (e) { inputRoomCode.focus(); }
    }, 100);
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
      allowHints: isHintEnabled,
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
      try { inputRoomCode.focus({ preventScroll: true }); } catch (e) { inputRoomCode.focus(); }
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
  if (navRoomBadge) navRoomBadge.addEventListener('click', shareRoomNative);

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

  function handleLeaveRoom() {
    window.soundManager.playPop();
    socket.emit('leave_room');
    clearRoomStorage();
    currentRoom = null;
    mySessionToken = null;
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (modalRoundEnd) modalRoundEnd.classList.add('hidden');
    if (modalPodium) modalPodium.classList.add('hidden');
    if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
    if (modalQrCode) modalQrCode.classList.add('hidden');
    if (navRoomBadge) navRoomBadge.classList.add('hidden');
    if (inputRoomCode) inputRoomCode.value = '';
    if (inputWord) inputWord.value = '';
    showView('lobby');
    showToast('Đã rời khỏi phòng', 'info');
  }

  btnLeaveRoom.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn rời khỏi phòng này?')) {
      handleLeaveRoom();
    }
  });

  if (btnRoundLeaveRoom) {
    btnRoundLeaveRoom.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn rời khỏi phòng này?')) {
        handleLeaveRoom();
      }
    });
  }

  if (btnPodiumLeaveRoom) {
    btnPodiumLeaveRoom.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn rời khỏi phòng này?')) {
        handleLeaveRoom();
      }
    });
  }

  if (btnBannerLeaveRoom) {
    btnBannerLeaveRoom.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn rời khỏi phòng này?')) {
        handleLeaveRoom();
      }
    });
  }

  // ================= GAMEPLAY ACTIONS =================
  formWordSubmit.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawInput = inputWord.value.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
    if (!rawInput) return;

    const prefix = (currentRoom?.expectedSyllable || '').trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFC');
    let fullWord = '';

    if (prefix) {
      const parts = rawInput.split(' ');
      if (parts.length === 2 && parts[0] === prefix) {
        fullWord = `${parts[0]} ${parts[1]}`;
      } else if (parts.length === 1 && parts[0] === prefix) {
        showToast('Vui lòng nhập thêm tiếng thứ 2!', 'warning');
        return;
      } else if (parts.length === 1) {
        fullWord = `${prefix} ${parts[0]}`;
      } else {
        fullWord = rawInput;
      }
    } else {
      fullWord = rawInput;
    }

    window.soundManager.playPop();
    socket.emit('submit_word', fullWord.normalize('NFC'));
    inputWord.value = '';

    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  });

  // Request word hint button
  if (btnRequestHint) {
    btnRequestHint.addEventListener('click', () => {
      if (btnRequestHint.disabled) return;
      window.soundManager.playPop();
      btnRequestHint.disabled = true;
      socket.emit('request_hint');
    });
  }

  // ================= MODAL ACTIONS =================
  btnOpenRules.addEventListener('click', () => modalRules.classList.remove('hidden'));
  btnCloseRules.addEventListener('click', () => modalRules.classList.add('hidden'));
  btnAcknowledgeRules.addEventListener('click', () => modalRules.classList.add('hidden'));

  btnNextRound.addEventListener('click', () => {
    modalRoundEnd.classList.add('hidden');
    window.soundManager.playPop();
    socket.emit('start_game');
  });

  if (btnRoundReturnLobby) {
    btnRoundReturnLobby.addEventListener('click', () => {
      modalRoundEnd.classList.add('hidden');
      window.soundManager.playPop();
      socket.emit('return_to_lobby');
    });
  }

  btnPlayAgainMatch.addEventListener('click', () => {
    const me = currentRoom ? currentRoom.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken)) : null;
    const amIHost = me ? me.isHost : false;
    window.soundManager.playPop();
    if (amIHost) {
      modalPodium.classList.add('hidden');
      if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
      socket.emit('restart_game');
    } else {
      socket.emit('request_rematch');
      showToast('Đã gửi đề nghị chơi lại tới chủ phòng!', 'info');
      btnPlayAgainMatch.textContent = 'Đã gửi đề nghị...';
      btnPlayAgainMatch.disabled = true;
    }
  });

  if (btnReturnLobby) {
    btnReturnLobby.addEventListener('click', () => {
      modalPodium.classList.add('hidden');
      if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
      window.soundManager.playPop();
      socket.emit('return_to_lobby');
    });
  }

  btnClosePodium.addEventListener('click', () => {
    modalPodium.classList.add('hidden');
    if (matchEndedBanner && currentRoom?.status === 'match_ended') {
      matchEndedBanner.classList.remove('hidden');
      matchEndedBanner.classList.add('flex');
    }
  });

  if (btnBannerPlayAgain) {
    btnBannerPlayAgain.addEventListener('click', () => {
      const me = currentRoom ? currentRoom.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken)) : null;
      const amIHost = me ? me.isHost : false;
      window.soundManager.playPop();
      if (amIHost) {
        if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
        socket.emit('restart_game');
      } else {
        socket.emit('request_rematch');
        showToast('Đã gửi đề nghị chơi lại tới chủ phòng!', 'info');
      }
    });
  }

  if (btnBannerReturnLobby) {
    btnBannerReturnLobby.addEventListener('click', () => {
      if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
      window.soundManager.playPop();
      socket.emit('return_to_lobby');
    });
  }

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

  socket.on('room_left', () => {
    clearRoomStorage();
    currentRoom = null;
    mySessionToken = null;
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (modalRoundEnd) modalRoundEnd.classList.add('hidden');
    if (modalPodium) modalPodium.classList.add('hidden');
    if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
    if (modalQrCode) modalQrCode.classList.add('hidden');
    if (navRoomBadge) navRoomBadge.classList.add('hidden');
    if (inputRoomCode) inputRoomCode.value = '';
    if (inputWord) inputWord.value = '';
    showView('lobby');
  });

  socket.on('error_message', (msg) => {
    showToast(msg, 'error');
    window.soundManager.playBuzzer();
    if (msg.includes('không tồn tại') || msg.includes('giải tán')) {
      clearRoomStorage();
      currentRoom = null;
      mySessionToken = null;
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      showView('lobby');
    }
  });

  socket.on('room_updated', (room) => {
    currentRoom = room;
    if (navRoomCode) navRoomCode.textContent = room.id;
    waitingRoomCode.textContent = room.id;
    if (room.turnDuration === 0) {
      roomDurationBadge.textContent = 'Không tính giờ';
      timerNumber.textContent = '';
      if (timerBox) {
        timerBox.classList.add('hidden');
        timerBox.classList.remove('flex');
      }
      const timerProgressWrapper = document.getElementById('timerProgressWrapper');
      if (timerProgressWrapper) timerProgressWrapper.classList.add('hidden');
    } else {
      roomDurationBadge.textContent = `${room.turnDuration}s`;
    }
    
    if (roomRoundsBadge) {
      roomRoundsBadge.textContent = room.gameMode === 'battle_royale' ? 'Battle Royale' : `${room.maxRounds} Hiệp`;
    }
    if (roomHintBadge) {
      if (room.allowHints !== false) {
        roomHintBadge.classList.remove('hidden');
        roomHintBadge.textContent = '💡 1 gợi ý';
      } else {
        roomHintBadge.classList.add('hidden');
      }
    }
    playerCount.textContent = room.players.length;

    const me = room.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken));
    const amIHost = me ? me.isHost : false;

    // View Switching
    if (room.status === 'waiting') {
      showView('waiting');
      if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
      modalRoundEnd.classList.add('hidden');
      modalPodium.classList.add('hidden');
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
          ? 'w-full py-2.5 sm:py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm sm:text-base shadow-xs transition active:scale-98'
          : 'w-full py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-xs transition active:scale-98';
      }
    } else if (room.status === 'playing' || room.status === 'round_ended' || room.status === 'match_ended' || room.status === 'ended') {
      showView('game');
      if (room.status === 'playing') {
        if (matchEndedBanner) matchEndedBanner.classList.add('hidden');
        modalRoundEnd.classList.add('hidden');
        modalPodium.classList.add('hidden');
      } else if (room.status === 'match_ended') {
        if (matchEndedBanner) {
          if (modalPodium.classList.contains('hidden')) {
            matchEndedBanner.classList.remove('hidden');
            matchEndedBanner.classList.add('flex');
          }
          if (btnBannerPlayAgain) {
            btnBannerPlayAgain.textContent = amIHost ? '🎮 Chơi lại' : '🙋 Muốn chơi lại';
          }
          if (btnBannerReturnLobby) {
            if (amIHost) btnBannerReturnLobby.classList.remove('hidden');
            else btnBannerReturnLobby.classList.add('hidden');
          }
        }
      }
      renderGameBoard(room, me);
    }
  });

  function renderWaitingPlayers(players, amIHost) {
    waitingPlayersList.innerHTML = '';
    players.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 transition';
      
      const isMe = p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken);
      item.innerHTML = `
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8">${renderAvatarHtml(p.avatar, 'w-7 h-7 sm:w-8 sm:h-8 text-base')}</span>
          <div class="min-w-0">
            <div class="text-xs sm:text-sm font-semibold text-slate-800 flex items-center space-x-1.5 truncate">
              <span class="truncate">${p.nickname}</span>
              ${isMe ? '<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold flex-shrink-0">BẠN</span>' : ''}
              ${p.isHost ? '<span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold flex-shrink-0">Chủ phòng</span>' : ''}
              ${p.isBot ? '<span class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold flex-shrink-0">Bot</span>' : ''}
              ${p.isDisconnected ? '<span class="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded font-bold flex-shrink-0">Mất mạng</span>' : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 flex-shrink-0">
          ${p.isHost 
            ? '<span class="text-xs font-semibold text-emerald-600">Sẵn sàng</span>' 
            : p.isReady 
              ? '<span class="text-xs font-semibold text-emerald-600">Sẵn sàng</span>' 
              : '<span class="text-xs font-medium text-slate-400">Đang chờ</span>'}
          ${amIHost && p.isBot ? `<button onclick="window.removeBot('${p.id}')" class="text-slate-400 hover:text-red-500 p-1" title="Xóa Bot"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : ''}
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

    const activePlayer = room.players[room.turnIndex];
    if (activePlayer) {
      if (activePlayerAvatar) activePlayerAvatar.innerHTML = renderAvatarHtml(activePlayer.avatar, 'w-5 h-5 text-sm');
      if (activePlayerName) activePlayerName.textContent = `@${activePlayer.nickname}`;
    }

    // Mini streamlined players strip
    gamePlayersStrip.innerHTML = '';
    room.players.forEach(p => {
      const badge = document.createElement('div');
      const isTurn = activePlayer && p.id === activePlayer.id;
      const isMe = p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken);
      badge.className = `flex-shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border text-xs sm:text-sm font-bold transition-all duration-200 ${
        isTurn 
          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-1 ring-blue-400/50' 
          : p.isAlive 
            ? 'bg-slate-50 border-slate-200 text-slate-700' 
            : 'bg-red-50/70 border-red-200 text-red-400 opacity-50'
      }`;
      badge.innerHTML = `
        <span class="flex-shrink-0 flex items-center justify-center">${renderAvatarHtml(p.avatar, 'w-4 h-4 sm:w-5 sm:h-5 text-xs sm:text-sm')}</span>
        <span class="max-w-[95px] sm:max-w-[130px] truncate">${p.nickname}${isMe ? ' (Bạn)' : ''}</span>
        ${isTurn ? '<span class="text-blue-600 text-xs font-black animate-pulse">●</span>' : p.isAlive ? '<span class="text-emerald-500 text-xs font-bold">●</span>' : '<span class="text-red-500 text-xs font-bold">✕</span>'}
        <span class="text-xs sm:text-sm text-slate-500 font-mono font-bold">${p.score || 0}đ</span>
      `;
      gamePlayersStrip.appendChild(badge);
    });

    // Hide timer elements immediately if room has no timer
    const hasTimer = room.hasTimer !== false && room.turnDuration && room.turnDuration > 0;
    if (!hasTimer) {
      if (timerBox) {
        timerBox.classList.add('hidden');
        timerBox.classList.remove('flex');
      }
      const timerProgressWrapper = document.getElementById('timerProgressWrapper');
      if (timerProgressWrapper) timerProgressWrapper.classList.add('hidden');
    }

    // Control input box availability & Prefix pill (ONLY show prefix on MY turn)
    const isMyTurn = activePlayer && (activePlayer.id === myId || (activePlayer.sessionToken && activePlayer.sessionToken === mySessionToken)) && me && me.isAlive;
    
    if (isMyTurn && room.expectedSyllable) {
      inputPrefixBadge.classList.remove('hidden');
      inputPrefixBadge.classList.add('flex');
      inputPrefixText.textContent = room.expectedSyllable;
    } else {
      inputPrefixBadge.classList.add('hidden');
      inputPrefixBadge.classList.remove('flex');
    }

    if (isMyTurn) {
      inputWord.disabled = false;
      btnSendWord.disabled = false;
      inputWord.placeholder = 'Gõ tiếng tiếp theo (hoặc cả từ)...';
      if (document.activeElement !== inputWord) {
        try {
          inputWord.focus({ preventScroll: true });
        } catch (e) {
          inputWord.focus();
        }
      }
    } else {
      inputWord.disabled = true;
      btnSendWord.disabled = true;
      if (me && !me.isAlive) {
        inputWord.placeholder = 'Bạn đã bị loại khỏi ván đấu';
      } else if (activePlayer) {
        inputWord.placeholder = `Chờ lượt @${activePlayer.nickname}...`;
      } else {
        inputWord.placeholder = 'Đang chờ...';
      }
    }

    // Control hint button availability
    if (btnRequestHint) {
      if (room.allowHints !== false) {
        btnRequestHint.classList.remove('hidden');
        btnRequestHint.classList.add('flex');
        const hintsLeft = me ? (me.hintsRemaining !== undefined ? me.hintsRemaining : 1) : 0;
        if (hintBadgeCount) hintBadgeCount.textContent = hintsLeft;

        if (isMyTurn && hintsLeft > 0) {
          btnRequestHint.disabled = false;
          btnRequestHint.classList.remove('opacity-30', 'pointer-events-none');
          btnRequestHint.classList.add('hover:bg-amber-100', 'cursor-pointer');
        } else {
          btnRequestHint.disabled = true;
          btnRequestHint.classList.add('opacity-30', 'pointer-events-none');
          btnRequestHint.classList.remove('hover:bg-amber-100', 'cursor-pointer');
        }
      } else {
        btnRequestHint.classList.add('hidden');
        btnRequestHint.classList.remove('flex');
      }
    }
  }

  // Timer Tick Event (Compact Pill & Thin Progress Line)
  socket.on('timer_tick', ({ timeRemaining, totalDuration, isUnlimited }) => {
    const timerProgressWrapper = document.getElementById('timerProgressWrapper');
    if (isUnlimited || totalDuration === 0) {
      if (timerBox) {
        timerBox.classList.add('hidden');
        timerBox.classList.remove('flex');
      }
      if (timerProgressWrapper) timerProgressWrapper.classList.add('hidden');
      return;
    }

    if (timerBox) {
      timerBox.classList.remove('hidden');
      timerBox.classList.add('flex');
    }
    if (timerProgressWrapper) timerProgressWrapper.classList.remove('hidden');
    timerNumber.textContent = `${timeRemaining}s`;
    const pct = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));
    timerProgressBar.style.width = `${pct}%`;

    if (timeRemaining <= 4) {
      timerBox.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-red-50 border-2 border-red-500 text-red-600 font-mono text-xs sm:text-sm font-bold timer-critical transition-colors';
      timerProgressBar.className = 'h-full bg-red-500 transition-all duration-300';
      window.soundManager.playTick();
    } else if (timeRemaining <= 7) {
      timerBox.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-400 text-amber-700 font-mono text-xs sm:text-sm font-bold transition-colors';
      timerProgressBar.className = 'h-full bg-amber-500 transition-all duration-300';
    } else {
      timerBox.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs sm:text-sm font-bold transition-colors';
      timerProgressBar.className = 'h-full bg-blue-600 transition-all duration-300';
    }
  });

  // Helper renderers for chat feed messages
  function renderTurnAnnouncement({ nickname, avatar, syllable, startWord, isOpening }) {
    if (!isOpening) return; // Suppress repetitive mid-game banners from flooding the feed!
    const pill = document.createElement('div');
    pill.className = 'flex items-center justify-center my-2 animate-fadeIn';
    pill.innerHTML = `
      <div class="px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs sm:text-sm text-blue-900 font-bold shadow-xs text-center flex items-center space-x-1.5">
        <span class="text-blue-600">🎯</span>
        <span>Mở màn: <strong class="text-blue-950 font-black">${startWord}</strong> &bull; Lượt đầu: <strong class="text-blue-700 font-black">@${nickname}</strong></span>
      </div>
    `;
    chatFeed.appendChild(pill);
    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  }

  function renderPlayerMessage({ playerId, nickname, avatar, word, timestamp }, playSound = true) {
    const isMe = playerId === myId || (currentRoom && currentRoom.players.find(p => p.id === playerId)?.sessionToken === mySessionToken);
    if (playSound) {
      if (isMe) window.soundManager.playPop();
      else window.soundManager.playMessageReceived();
    }

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex items-end space-x-2 my-1 animate-fadeIn ${isMe ? 'justify-end' : 'justify-start'}`;

    if (isMe) {
      bubbleWrapper.innerHTML = `
        <div class="flex flex-col items-end max-w-[85%]">
          <div class="chat-bubble-me px-3.5 py-1.5 text-sm sm:text-base font-bold break-words tracking-wide">
            ${word}
          </div>
        </div>
      `;
    } else {
      bubbleWrapper.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden mb-1">
          ${renderAvatarHtml(avatar, 'w-full h-full text-sm')}
        </div>
        <div class="flex flex-col items-start max-w-[85%]">
          <span class="text-[11px] font-semibold text-slate-500 ml-1 mb-0.5">${nickname}</span>
          <div class="chat-bubble-other px-3.5 py-1.5 text-sm sm:text-base font-bold break-words tracking-wide">
            ${word}
          </div>
        </div>
      `;
    }

    chatFeed.appendChild(bubbleWrapper);
    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  }

  function renderEliminationMessage({ playerId, nickname, avatar, reason }, playSound = true) {
    if (playSound) window.soundManager.playBuzzer();

    const card = document.createElement('div');
    card.className = 'flex items-center justify-center my-2 animate-fadeIn';
    card.innerHTML = `
      <div class="px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-bold shadow-xs text-center flex items-center space-x-1.5">
        <span class="text-red-500 font-black">✕</span>
        <span><strong>@${nickname}</strong> bị loại: ${reason}</span>
      </div>
    `;

    chatFeed.appendChild(card);
    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  }

  function renderRefereeMessage({ text }) {
    const card = document.createElement('div');
    card.className = 'flex items-center justify-center my-2 animate-fadeIn';
    card.innerHTML = `
      <div class="px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs sm:text-sm font-bold text-amber-900 shadow-xs text-center flex items-center space-x-1.5">
        <span>⚠️</span>
        <span>${text}</span>
      </div>
    `;
    chatFeed.appendChild(card);
    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  }

  function renderChatBubble({ senderId, nickname, avatar, text }, playSound = true) {
    const isMe = senderId === myId;
    if (playSound && !isMe) window.soundManager.playMessageReceived();

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `flex items-end space-x-2 my-1 animate-fadeIn ${isMe ? 'justify-end' : 'justify-start'}`;

    if (isMe) {
      bubbleWrapper.innerHTML = `
        <div class="flex flex-col items-end max-w-[85%]">
          <div class="px-3 py-1.5 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm font-medium break-words">
            ${text}
          </div>
        </div>
      `;
    } else {
      bubbleWrapper.innerHTML = `
        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs sm:text-sm flex-shrink-0 overflow-hidden mb-1">
          ${renderAvatarHtml(avatar, 'w-full h-full text-xs sm:text-sm')}
        </div>
        <div class="flex flex-col items-start max-w-[85%]">
          <span class="text-[11px] font-semibold text-slate-500 ml-1 mb-0.5">${nickname}</span>
          <div class="px-3 py-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium break-words">
            ${text}
          </div>
        </div>
      `;
    }
    chatFeed.appendChild(bubbleWrapper);
    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  }

  // Socket Events for Chat and Gameplay Messages
  socket.on('turn_announcement', (data) => renderTurnAnnouncement(data));
  socket.on('player_message', (data) => renderPlayerMessage(data, true));
  socket.on('player_eliminated', (data) => renderEliminationMessage(data, true));
  socket.on('referee_message', (data) => renderRefereeMessage(data));
  socket.on('chat_bubble', (data) => renderChatBubble(data, true));

  // Hint Response Handler
  socket.on('hint_response', (data) => {
    if (!data.success) {
      showToast(data.reason || 'Không thể lấy gợi ý!', 'warning');
      window.soundManager.playBuzzer();
      return;
    }

    window.soundManager.playPop();
    showToast(`💡 Gợi ý từ cho bạn: "${data.word}"`, 'info');

    // Auto-fill input
    if (data.tail) {
      inputWord.value = data.tail;
    } else if (data.word) {
      inputWord.value = data.word;
    }
    try {
      inputWord.focus({ preventScroll: true });
    } catch (e) {
      inputWord.focus();
    }
  });

  // Chat History Recovery (when tab recovers / reloads / reconnects)
  socket.on('chat_history', (history) => {
    if (!Array.isArray(history) || history.length === 0) return;
    chatFeed.innerHTML = '';
    history.forEach(item => {
      if (item.type === 'player_message') renderPlayerMessage(item.data, false);
      else if (item.type === 'turn_announcement' && item.data?.isOpening) renderTurnAnnouncement(item.data);
      else if (item.type === 'referee_message') renderRefereeMessage(item.data);
      else if (item.type === 'player_eliminated') renderEliminationMessage(item.data, false);
      else if (item.type === 'chat_bubble') renderChatBubble(item.data, false);
    });
    requestAnimationFrame(() => {
      chatFeed.scrollTop = chatFeed.scrollHeight;
    });
  });

  // Timer Paused / Resumed Alerts
  socket.on('timer_paused', ({ timeRemaining }) => {
    timerNumber.textContent = `${timeRemaining}s ⏸`;
    timerBox.className = 'flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 font-mono text-sm sm:text-base font-black animate-pulse';
  });

  socket.on('timer_resumed', ({ timeRemaining }) => {
    timerNumber.textContent = `${timeRemaining}s`;
    timerBox.className = 'flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-sm sm:text-base font-black';
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
          <span class="w-5 font-bold text-center text-xs text-slate-400">#${item.rank}</span>
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center">${renderAvatarHtml(item.avatar, 'w-7 h-7 text-sm')}</span>
          <span class="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[140px]">${item.nickname}</span>
        </div>
        <span class="text-xs sm:text-sm font-black text-blue-600 font-mono">${item.score} đ</span>
      `;
      roundLeaderboardList.appendChild(row);
    });

    const me = currentRoom ? currentRoom.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken)) : null;
    const amIHost = me ? me.isHost : false;

    if (amIHost) {
      btnNextRound.disabled = false;
      btnNextRound.classList.remove('opacity-50', 'cursor-not-allowed');
      btnNextRound.textContent = `Vào hiệp ${currentRound + 1}`;
      if (btnRoundReturnLobby) btnRoundReturnLobby.classList.remove('hidden');
    } else {
      btnNextRound.disabled = true;
      btnNextRound.classList.add('opacity-50', 'cursor-not-allowed');
      btnNextRound.textContent = `Chờ chủ phòng vào hiệp ${currentRound + 1}...`;
      if (btnRoundReturnLobby) btnRoundReturnLobby.classList.add('hidden');
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
      podium1Avatar.innerHTML = renderAvatarHtml(p1.avatar, 'w-10 h-10 text-2xl');
      podium1Name.textContent = `@${p1.nickname}`;
      podium1Score.textContent = `${p1.score} đ`;
    } else {
      podium1Avatar.innerHTML = '👑';
      podium1Name.textContent = '---';
      podium1Score.textContent = '0 đ';
    }

    // 2nd place
    if (p2) {
      podium2Avatar.innerHTML = renderAvatarHtml(p2.avatar, 'w-9 h-9 text-xl');
      podium2Name.textContent = `@${p2.nickname}`;
      podium2Score.textContent = `${p2.score} đ`;
    } else {
      podium2Avatar.innerHTML = '🥈';
      podium2Name.textContent = '---';
      podium2Score.textContent = '0 đ';
    }

    // 3rd place
    if (p3) {
      podium3Avatar.innerHTML = renderAvatarHtml(p3.avatar, 'w-9 h-9 text-xl');
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
      item.className = 'flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold';
      item.innerHTML = `
        <div class="flex items-center space-x-2.5">
          <span class="text-slate-400 font-bold text-xs">#${p.rank}</span>
          <span class="w-6 h-6 flex items-center justify-center flex-shrink-0">${renderAvatarHtml(p.avatar, 'w-6 h-6 text-xs')}</span>
          <span class="font-bold text-slate-700 truncate max-w-[140px]">${p.nickname}</span>
        </div>
        <span class="font-black text-slate-600 font-mono">${p.score} đ</span>
      `;
      podiumOtherList.appendChild(item);
    });

    const me = currentRoom ? currentRoom.players.find(p => p.id === myId || (p.sessionToken && p.sessionToken === mySessionToken)) : null;
    const amIHost = me ? me.isHost : false;

    if (amIHost) {
      btnPlayAgainMatch.disabled = false;
      btnPlayAgainMatch.classList.remove('opacity-50', 'cursor-not-allowed');
      btnPlayAgainMatch.innerHTML = '<span>🎮 Chơi ván mới ngay</span>';
      if (btnReturnLobby) btnReturnLobby.classList.remove('hidden');
    } else {
      btnPlayAgainMatch.disabled = false;
      btnPlayAgainMatch.classList.remove('opacity-50', 'cursor-not-allowed');
      btnPlayAgainMatch.innerHTML = '<span>🙋 Đề nghị chơi lại ván mới</span>';
      if (btnReturnLobby) btnReturnLobby.classList.add('hidden');
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
