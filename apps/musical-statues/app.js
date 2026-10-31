// Musical Statues App
(function() {
  'use strict';

  const DEFAULTS = {
    video: '',
    durations: { danceMin: 5, danceMax: 15, freezeMin: 3, freezeMax: 6 }
  };

  // Each min/max pair is kept in order when either end is changed
  const PAIRS = {
    danceMin: 'danceMax',
    danceMax: 'danceMin',
    freezeMin: 'freezeMax',
    freezeMax: 'freezeMin'
  };

  const MIN_SECONDS = 1;
  const MAX_SECONDS = 300;
  const UI_HIDE_DELAY = 4000;
  const HOLD_DELAY = 400;
  const HOLD_REPEAT = 110;
  const DANCE_FRAME = 420;
  const PLAY_CHECK_DELAY = 2500;

  // YouTube asks for embedded players of at least 200 x 200
  const MIN_PLAYER = 200;
  // Housing proportions relative to lamp diameter (see styles.css)
  const LENGTH_RATIO = 2.55;
  const WIDTH_RATIO = 1.6;
  const GAP = 16;

  const STATUS = {
    empty: 'Paste a YouTube link, then press play on the video to start.',
    loading: 'Loading video…',
    ready: 'Press play on the video to start the game.',
    playing: 'Game on! Pause the video to stop the game.',
    blocked: 'Tap play on the video to carry on.',
    invalid: 'That doesn’t look like a YouTube video or playlist link.',
    offline: 'Music needs an internet connection. Check you’re online and try again.',
    notFound: 'That video can’t be found. It may be private or removed.',
    noEmbed: 'The owner doesn’t allow this video to play in other apps. Try another.',
    failed: 'This video can’t be played here. Try another.'
  };

  // DOM Elements
  const stage = document.getElementById('stage');
  const housing = document.getElementById('housing');
  const lampRed = document.getElementById('lampRed');
  const lampGreen = document.getElementById('lampGreen');
  const screen = document.getElementById('screen');
  const playerWrap = document.getElementById('playerWrap');
  const screenEmpty = document.getElementById('screenEmpty');
  const screenMsg = document.getElementById('screenMsg');
  const chooseBtn = document.getElementById('chooseBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const videoInput = document.getElementById('videoInput');
  const loadBtn = document.getElementById('loadBtn');
  const statusEl = document.getElementById('status');
  const doneBtn = document.getElementById('doneBtn');
  const rows = document.querySelectorAll('.row');

  // State
  let settings = loadSettings();
  let game = 'idle'; // idle | dance | freeze
  let player = null;
  let playerReady = false;
  let apiPromise = null;
  let phaseTimer = null;
  let danceTimer = null;
  let playCheckTimer = null;
  let hideTimer = null;

  // Load settings from localStorage
  function loadSettings() {
    const result = {
      video: DEFAULTS.video,
      durations: Object.assign({}, DEFAULTS.durations)
    };
    try {
      const saved = JSON.parse(localStorage.getItem('musicalStatuesSettings'));
      if (saved) {
        if (typeof saved.video === 'string') result.video = saved.video;
        Object.keys(result.durations).forEach((key) => {
          const value = saved.durations && saved.durations[key];
          if (typeof value === 'number' && value >= MIN_SECONDS && value <= MAX_SECONDS) {
            result.durations[key] = value;
          }
        });
        const d = result.durations;
        if (d.danceMin > d.danceMax) d.danceMax = d.danceMin;
        if (d.freezeMin > d.freezeMax) d.freezeMax = d.freezeMin;
      }
    } catch (e) {}
    return result;
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem('musicalStatuesSettings', JSON.stringify(settings));
    } catch (e) {}
  }

  // ---------- YouTube ----------

  // Accepts youtube.com, youtu.be, music.youtube.com, shorts and playlist links, or a bare video ID
  function parseYouTube(text) {
    text = text.trim();
    if (!text) return null;
    if (/^[\w-]{11}$/.test(text)) return { videoId: text, list: null };

    let url;
    try {
      url = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text);
    } catch (e) {
      return null;
    }

    const host = url.hostname.replace(/^(www|m|music)\./, '');
    let videoId = null;
    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1).split('/')[0];
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      videoId = url.searchParams.get('v');
      const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (match) videoId = match[1];
    } else {
      return null;
    }

    if (videoId && !/^[\w-]{11}$/.test(videoId)) videoId = null;
    const list = url.searchParams.get('list');
    if (!videoId && !list) return null;
    return { videoId: videoId, list: list };
  }

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = resolve;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        script.parentNode.removeChild(script);
        apiPromise = null;
        reject(new Error('YouTube API failed to load'));
      };
      document.head.appendChild(script);
    });
    return apiPromise;
  }

  function destroyPlayer() {
    if (player) {
      try { player.destroy(); } catch (e) {}
      player = null;
    }
    playerReady = false;
    playerWrap.innerHTML = '';
  }

  function loadVideo(source) {
    stopGame();
    destroyPlayer();
    setStatus('loading');

    loadYouTubeApi().then(() => {
      // YT.Player replaces this element with its iframe
      const target = document.createElement('div');
      playerWrap.appendChild(target);

      const playerVars = { playsinline: 1, rel: 0, modestbranding: 1 };
      if (source.list) {
        playerVars.listType = 'playlist';
        playerVars.list = source.list;
      }

      player = new YT.Player(target, {
        width: '100%',
        height: '100%',
        videoId: source.videoId || undefined,
        playerVars: playerVars,
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    }).catch(() => {
      setStatus('offline');
    });
  }

  function onPlayerReady() {
    playerReady = true;
    // Keep a playlist going round once it reaches the end
    if (player.getPlaylist && player.getPlaylist()) player.setLoop(true);
    setStatus('ready');
  }

  function onPlayerStateChange(e) {
    const S = YT.PlayerState;

    if (e.data === S.PLAYING) {
      clearTimeout(playCheckTimer);
      if (game === 'idle') {
        setPhase('dance');
      } else if (game === 'freeze') {
        // Music must stay off while everyone is frozen
        player.pauseVideo();
      }
    } else if (e.data === S.PAUSED) {
      // The game only pauses during a freeze, so this was someone pressing pause
      if (game === 'dance') stopGame();
    } else if (e.data === S.ENDED) {
      if (game === 'dance' && !(player.getPlaylist && player.getPlaylist())) {
        player.seekTo(0, true);
        player.playVideo();
      }
    }
  }

  function onPlayerError(e) {
    stopGame();
    if (e.data === 2) setStatus('invalid');
    else if (e.data === 100) setStatus('notFound');
    else if (e.data === 101 || e.data === 150) setStatus('noEmbed');
    else setStatus('failed');
  }

  // ---------- Game ----------

  function randomSeconds(minKey, maxKey) {
    const min = settings.durations[minKey];
    const max = settings.durations[maxKey];
    return min + Math.random() * (max - min);
  }

  function setPhase(next) {
    game = next;
    clearTimeout(phaseTimer);
    clearTimeout(playCheckTimer);

    const dancing = next === 'dance';
    lampGreen.classList.toggle('on', dancing);
    lampRed.classList.toggle('on', !dancing);
    housing.setAttribute('aria-label', dancing ? 'Signal showing green: dance' : 'Signal showing red: stand still');
    setDancing(dancing);

    if (next === 'dance') {
      phaseTimer = setTimeout(freeze, randomSeconds('danceMin', 'danceMax') * 1000);
      setStatus('playing');
    } else if (next === 'freeze') {
      phaseTimer = setTimeout(resume, randomSeconds('freezeMin', 'freezeMax') * 1000);
    }
  }

  function freeze() {
    setPhase('freeze');
    player.pauseVideo();
  }

  function resume() {
    setPhase('dance');
    player.playVideo();

    // Some browsers refuse to restart playback without a tap
    playCheckTimer = setTimeout(() => {
      const state = player.getPlayerState();
      if (game === 'dance' && state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
        stopGame();
        setStatus('blocked');
      }
    }, PLAY_CHECK_DELAY);
  }

  function stopGame() {
    clearTimeout(phaseTimer);
    clearTimeout(playCheckTimer);
    setPhase('idle');
    if (playerReady) setStatus('ready');
  }

  // Swap the green figure between two poses while dancing
  function setDancing(on) {
    clearInterval(danceTimer);
    lampGreen.classList.remove('alt');
    if (on) {
      danceTimer = setInterval(() => {
        lampGreen.classList.toggle('alt');
      }, DANCE_FRAME);
    }
  }

  // ---------- Status ----------

  function setStatus(key) {
    const isError = ['invalid', 'offline', 'notFound', 'noEmbed', 'failed'].indexOf(key) !== -1;
    statusEl.textContent = STATUS[key];
    statusEl.classList.toggle('error', isError);

    // Show the placeholder until a player is on screen
    const showEmpty = !player || key === 'offline';
    screenEmpty.classList.toggle('hidden', !showEmpty);
    screenMsg.textContent = key === 'empty' ? 'Choose a song or playlist from YouTube' : STATUS[key];
  }

  // ---------- Layout ----------

  // Fit the signal and a video screen of at least MIN_PLAYER in either orientation
  function layout() {
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const landscape = w > h;
    let screenW;
    let screenH;
    let d;

    if (landscape) {
      screenH = Math.max(MIN_PLAYER, Math.round(h * 0.75));
      screenW = Math.max(MIN_PLAYER, Math.min(Math.round(w * 0.5), Math.round(screenH * 16 / 9)));
      d = Math.min(h / LENGTH_RATIO, (w - screenW - GAP) / WIDTH_RATIO);
    } else {
      screenW = w;
      screenH = Math.max(MIN_PLAYER, Math.round(w * 9 / 16));
      d = Math.min((h - screenH - GAP) / LENGTH_RATIO, w / WIDTH_RATIO);
    }

    document.documentElement.style.setProperty('--d', Math.floor(d) + 'px');
    document.body.classList.toggle('landscape', landscape);
    screen.style.width = screenW + 'px';
    screen.style.height = screenH + 'px';
  }

  // ---------- Settings button reveal ----------

  function showSettingsButton() {
    settingsBtn.classList.add('visible');
    settingsBtn.tabIndex = 0;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideSettingsButton, UI_HIDE_DELAY);
  }

  function hideSettingsButton() {
    clearTimeout(hideTimer);
    settingsBtn.classList.remove('visible');
    settingsBtn.tabIndex = -1;
  }

  stage.addEventListener('click', (e) => {
    if (screen.contains(e.target)) return;
    if (settingsBtn.classList.contains('visible')) {
      hideSettingsButton();
    } else {
      showSettingsButton();
    }
  });

  // ---------- Settings sheet ----------

  function formatSeconds(s) {
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m + ':' + (rem < 10 ? '0' : '') + rem;
  }

  function renderSettings() {
    rows.forEach((row) => {
      const key = row.dataset.key;
      const value = settings.durations[key];
      row.querySelector('.step-value').textContent = formatSeconds(value);
      row.querySelector('[data-dir="-1"]').disabled = value <= MIN_SECONDS;
      row.querySelector('[data-dir="1"]').disabled = value >= MAX_SECONDS;
    });
  }

  // Finer steps for short durations, coarser for long ones
  function stepValue(value, dir) {
    const ref = dir > 0 ? value : value - 1;
    const size = ref < 30 ? 1 : ref < 120 ? 5 : 15;
    const next = Math.round((value + dir * size) / size) * size;
    return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, next));
  }

  function adjust(key, dir) {
    const d = settings.durations;
    const next = stepValue(d[key], dir);
    if (next === d[key]) return false;
    d[key] = next;

    // Drag the other end of the range along so shortest <= longest
    const other = PAIRS[key];
    const isMin = key.slice(-3) === 'Min';
    if (isMin && d[other] < next) d[other] = next;
    if (!isMin && d[other] > next) d[other] = next;

    saveSettings();
    renderSettings();
    return true;
  }

  function openSettings() {
    hideSettingsButton();
    renderSettings();
    videoInput.value = settings.video;
    sheetBackdrop.classList.add('open');
    sheetBackdrop.setAttribute('aria-hidden', 'false');
  }

  function closeSettings() {
    videoInput.blur();
    sheetBackdrop.classList.remove('open');
    sheetBackdrop.setAttribute('aria-hidden', 'true');
  }

  function submitVideo() {
    const text = videoInput.value.trim();
    const source = parseYouTube(text);
    if (!source) {
      setStatus('invalid');
      return;
    }
    settings.video = text;
    saveSettings();
    videoInput.blur();
    loadVideo(source);
    closeSettings();
  }

  settingsBtn.addEventListener('click', openSettings);
  chooseBtn.addEventListener('click', openSettings);
  doneBtn.addEventListener('click', closeSettings);
  loadBtn.addEventListener('click', submitVideo);

  videoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitVideo();
  });

  sheetBackdrop.addEventListener('click', (e) => {
    if (e.target === sheetBackdrop) closeSettings();
  });

  // Steppers: tap to change, hold to repeat
  rows.forEach((row) => {
    const key = row.dataset.key;

    row.querySelectorAll('.step-btn').forEach((btn) => {
      const dir = parseInt(btn.dataset.dir, 10);
      let holdTimer = null;
      let lastRelease = 0;

      function release() {
        if (!holdTimer) return;
        clearTimeout(holdTimer);
        clearInterval(holdTimer);
        holdTimer = null;
        lastRelease = Date.now();
      }

      function press(e) {
        e.preventDefault();
        release();
        adjust(key, dir);
        holdTimer = setTimeout(() => {
          holdTimer = setInterval(() => {
            if (!adjust(key, dir)) release();
          }, HOLD_REPEAT);
        }, HOLD_DELAY);
      }

      btn.addEventListener('touchstart', press);
      btn.addEventListener('mousedown', press);
      btn.addEventListener('touchend', release);
      btn.addEventListener('touchcancel', release);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);

      // Keyboard and VoiceOver activation
      btn.addEventListener('click', () => {
        if (Date.now() - lastRelease < 500) return;
        adjust(key, dir);
      });
    });
  });

  // ---------- Wake lock ----------

  // Request wake lock to keep screen on
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen');
      } catch (e) {
        console.log('Wake Lock not available');
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
  });

  // Initialize
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 300));
  layout();
  setPhase('idle');

  const savedSource = parseYouTube(settings.video);
  if (savedSource) {
    loadVideo(savedSource);
  } else {
    setStatus('empty');
  }

  requestWakeLock();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
