// Pomodoro Timer App
(function() {
  'use strict';

  // Constants
  const CIRCUMFERENCE = 2 * Math.PI * 90; // 565.48

  // DOM Elements
  const timerDisplay = document.getElementById('timerDisplay');
  const timerLabel = document.getElementById('timerLabel');
  const progressRing = document.getElementById('progress');
  const startBtn = document.getElementById('startBtn');
  const resetBtn = document.getElementById('resetBtn');
  const skipBtn = document.getElementById('skipBtn');
  const sessionCount = document.getElementById('sessionCount');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const resetStats = document.getElementById('resetStats');

  // Settings inputs
  const workDurationInput = document.getElementById('workDuration');
  const shortBreakInput = document.getElementById('shortBreakDuration');
  const longBreakInput = document.getElementById('longBreakDuration');
  const sessionsUntilLongInput = document.getElementById('sessionsUntilLong');
  const autoStartBreaksToggle = document.getElementById('autoStartBreaks');
  const autoStartWorkToggle = document.getElementById('autoStartWork');
  const soundEnabledToggle = document.getElementById('soundEnabled');

  // State
  let settings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLong: 4,
    autoStartBreaks: false,
    autoStartWork: false,
    soundEnabled: true
  };

  let state = {
    mode: 'work', // 'work', 'short', 'long'
    isRunning: false,
    timeRemaining: 25 * 60, // seconds
    totalTime: 25 * 60,
    sessions: 0,
    intervalId: null
  };

  // Labels for modes
  const modeLabels = {
    work: 'Focus Time',
    short: 'Short Break',
    long: 'Long Break'
  };

  // Load settings
  function loadSettings() {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }

    const stats = localStorage.getItem('pomodoroStats');
    if (stats) {
      state.sessions = JSON.parse(stats).sessions || 0;
    }

    applySettings();
  }

  // Save settings
  function saveSettings() {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }

  // Save stats
  function saveStats() {
    localStorage.setItem('pomodoroStats', JSON.stringify({ sessions: state.sessions }));
  }

  // Apply settings to UI
  function applySettings() {
    workDurationInput.value = settings.workDuration;
    shortBreakInput.value = settings.shortBreakDuration;
    longBreakInput.value = settings.longBreakDuration;
    sessionsUntilLongInput.value = settings.sessionsUntilLong;
    autoStartBreaksToggle.checked = settings.autoStartBreaks;
    autoStartWorkToggle.checked = settings.autoStartWork;
    soundEnabledToggle.checked = settings.soundEnabled;

    sessionCount.textContent = state.sessions;

    // Reset timer with new settings if not running
    if (!state.isRunning) {
      setMode(state.mode);
    }
  }

  // Format time as MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Update display
  function updateDisplay() {
    timerDisplay.textContent = formatTime(state.timeRemaining);

    // Update progress ring
    const progress = 1 - (state.timeRemaining / state.totalTime);
    const offset = CIRCUMFERENCE * (1 - progress);
    progressRing.style.strokeDashoffset = offset;

    // Update page title
    document.title = `${formatTime(state.timeRemaining)} - ${modeLabels[state.mode]}`;
  }

  // Set mode
  function setMode(mode) {
    state.mode = mode;
    state.isRunning = false;

    // Update duration based on mode
    switch (mode) {
      case 'work':
        state.totalTime = settings.workDuration * 60;
        break;
      case 'short':
        state.totalTime = settings.shortBreakDuration * 60;
        break;
      case 'long':
        state.totalTime = settings.longBreakDuration * 60;
        break;
    }

    state.timeRemaining = state.totalTime;

    // Update UI
    document.getElementById('app').dataset.mode = mode;
    timerLabel.textContent = modeLabels[mode];

    modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    updateDisplay();
    updateStartButton();

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  // Update start button icon
  function updateStartButton() {
    const playIcon = startBtn.querySelector('.icon-play');
    const pauseIcon = startBtn.querySelector('.icon-pause');

    if (state.isRunning) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  // Start/pause timer
  function toggleTimer() {
    if (state.isRunning) {
      pause();
    } else {
      start();
    }
  }

  // Start timer
  function start() {
    state.isRunning = true;
    updateStartButton();

    state.intervalId = setInterval(() => {
      state.timeRemaining--;
      updateDisplay();

      if (state.timeRemaining <= 0) {
        timerComplete();
      }
    }, 1000);
  }

  // Pause timer
  function pause() {
    state.isRunning = false;
    updateStartButton();

    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  // Reset timer
  function reset() {
    pause();
    state.timeRemaining = state.totalTime;
    updateDisplay();
  }

  // Skip to next
  function skip() {
    timerComplete();
  }

  // Timer complete
  function timerComplete() {
    pause();

    // Play sound
    if (settings.soundEnabled) {
      playNotificationSound();
    }

    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Determine next mode
    if (state.mode === 'work') {
      state.sessions++;
      sessionCount.textContent = state.sessions;
      saveStats();

      // Check if long break
      if (state.sessions % settings.sessionsUntilLong === 0) {
        setMode('long');
      } else {
        setMode('short');
      }

      if (settings.autoStartBreaks) {
        setTimeout(start, 500);
      }
    } else {
      setMode('work');

      if (settings.autoStartWork) {
        setTimeout(start, 500);
      }
    }
  }

  // Play notification sound
  function playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      function playTone(frequency, startTime, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      }

      const now = audioContext.currentTime;
      playTone(523, now, 0.15);
      playTone(659, now + 0.15, 0.15);
      playTone(784, now + 0.3, 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  // Event Listeners
  startBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', reset);
  skipBtn.addEventListener('click', skip);

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      if (!state.isRunning) {
        setMode(tab.dataset.mode);
      } else {
        // Confirm mode change while running
        if (confirm('Timer is running. Switch mode?')) {
          setMode(tab.dataset.mode);
        }
      }
    });
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.hidden = false;
  });

  closeSettings.addEventListener('click', () => {
    settingsPanel.hidden = true;

    // Read and save settings
    settings.workDuration = parseInt(workDurationInput.value, 10) || 25;
    settings.shortBreakDuration = parseInt(shortBreakInput.value, 10) || 5;
    settings.longBreakDuration = parseInt(longBreakInput.value, 10) || 15;
    settings.sessionsUntilLong = parseInt(sessionsUntilLongInput.value, 10) || 4;
    settings.autoStartBreaks = autoStartBreaksToggle.checked;
    settings.autoStartWork = autoStartWorkToggle.checked;
    settings.soundEnabled = soundEnabledToggle.checked;

    saveSettings();

    // Reset timer if not running
    if (!state.isRunning) {
      setMode(state.mode);
    }
  });

  resetStats.addEventListener('click', () => {
    if (confirm('Reset all statistics?')) {
      state.sessions = 0;
      sessionCount.textContent = 0;
      saveStats();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (settingsPanel.hidden) {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleTimer();
      } else if (e.code === 'KeyR') {
        reset();
      } else if (e.code === 'KeyS') {
        skip();
      }
    }
  });

  // Initialize
  loadSettings();
  setMode('work');

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
