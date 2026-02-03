// Kitchen Timer App
(function() {
  'use strict';

  // DOM Elements
  const timersList = document.getElementById('timersList');
  const addTimerBtn = document.getElementById('addTimer');
  const addModal = document.getElementById('addModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const timerNameInput = document.getElementById('timerName');
  const hoursInput = document.getElementById('hoursInput');
  const minutesInput = document.getElementById('minutesInput');
  const secondsInput = document.getElementById('secondsInput');
  const cancelAddBtn = document.getElementById('cancelAdd');
  const confirmAddBtn = document.getElementById('confirmAdd');
  const alertModal = document.getElementById('alertModal');
  const alertName = document.getElementById('alertName');
  const dismissAlertBtn = document.getElementById('dismissAlert');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // State
  let timers = [];
  let timerIdCounter = 0;
  let alertAudio = null;
  let alertingTimer = null;

  // Load timers from localStorage
  function loadTimers() {
    const saved = localStorage.getItem('kitchenTimers');
    if (saved) {
      const data = JSON.parse(saved);
      timers = data.timers || [];
      timerIdCounter = data.counter || 0;

      // Recalculate remaining time for running timers
      const now = Date.now();
      timers.forEach(timer => {
        if (timer.isRunning && timer.endTime) {
          timer.remaining = Math.max(0, Math.floor((timer.endTime - now) / 1000));
          if (timer.remaining <= 0) {
            timer.isRunning = false;
            timer.finished = true;
          }
        }
      });
    }
    renderTimers();
  }

  // Save timers to localStorage
  function saveTimers() {
    localStorage.setItem('kitchenTimers', JSON.stringify({
      timers: timers,
      counter: timerIdCounter
    }));
  }

  // Format time
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Create timer element
  function createTimerElement(timer) {
    const div = document.createElement('div');
    div.className = 'timer-card';
    div.dataset.id = timer.id;

    if (timer.finished) {
      div.classList.add('finished');
    } else if (timer.isRunning) {
      div.classList.add('running');
    } else if (timer.remaining < timer.total) {
      div.classList.add('paused');
    }

    const progress = timer.total > 0 ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;

    div.innerHTML = `
      <div class="timer-header">
        <span class="timer-name">${timer.name || 'Timer'}</span>
        <button class="timer-delete" data-action="delete" aria-label="Delete">×</button>
      </div>
      <div class="timer-display">${formatTime(timer.remaining)}</div>
      <div class="timer-progress">
        <div class="timer-progress-bar" style="width: ${progress}%"></div>
      </div>
      <div class="timer-controls">
        ${timer.finished ? `
          <button class="timer-btn danger" data-action="reset">Reset</button>
        ` : timer.isRunning ? `
          <button class="timer-btn secondary" data-action="pause">Pause</button>
          <button class="timer-btn secondary" data-action="reset">Reset</button>
        ` : `
          <button class="timer-btn primary" data-action="start">Start</button>
          ${timer.remaining < timer.total ? `<button class="timer-btn secondary" data-action="reset">Reset</button>` : ''}
        `}
      </div>
    `;

    return div;
  }

  // Render all timers
  function renderTimers() {
    if (timers.length === 0) {
      timersList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⏱️</div>
          <p>No timers yet</p>
          <p style="font-size: 0.875rem">Tap + or use quick presets below</p>
        </div>
      `;
      return;
    }

    timersList.innerHTML = '';
    timers.forEach(timer => {
      timersList.appendChild(createTimerElement(timer));
    });
  }

  // Update a single timer display
  function updateTimerDisplay(timer) {
    const card = timersList.querySelector(`[data-id="${timer.id}"]`);
    if (!card) return;

    const display = card.querySelector('.timer-display');
    const progressBar = card.querySelector('.timer-progress-bar');

    display.textContent = formatTime(timer.remaining);

    const progress = timer.total > 0 ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;
    progressBar.style.width = `${progress}%`;

    // Update classes
    card.classList.remove('running', 'paused', 'finished');
    if (timer.finished) {
      card.classList.add('finished');
    } else if (timer.isRunning) {
      card.classList.add('running');
    } else if (timer.remaining < timer.total) {
      card.classList.add('paused');
    }
  }

  // Add new timer
  function addTimer(name, hours, minutes, seconds) {
    const total = (hours * 3600) + (minutes * 60) + seconds;
    if (total <= 0) return;

    const timer = {
      id: ++timerIdCounter,
      name: name || '',
      total: total,
      remaining: total,
      isRunning: false,
      finished: false,
      endTime: null
    };

    timers.push(timer);
    saveTimers();
    renderTimers();

    // Auto-start the timer
    startTimer(timer.id);
  }

  // Start timer
  function startTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (!timer || timer.finished) return;

    timer.isRunning = true;
    timer.endTime = Date.now() + (timer.remaining * 1000);
    saveTimers();
    renderTimers();
  }

  // Pause timer
  function pauseTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;

    timer.isRunning = false;
    timer.endTime = null;
    saveTimers();
    renderTimers();
  }

  // Reset timer
  function resetTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;

    timer.remaining = timer.total;
    timer.isRunning = false;
    timer.finished = false;
    timer.endTime = null;
    saveTimers();
    renderTimers();
  }

  // Delete timer
  function deleteTimer(id) {
    timers = timers.filter(t => t.id !== id);
    saveTimers();
    renderTimers();
  }

  // Timer tick
  function tick() {
    const now = Date.now();
    let needsRender = false;

    timers.forEach(timer => {
      if (timer.isRunning && !timer.finished) {
        timer.remaining = Math.max(0, Math.floor((timer.endTime - now) / 1000));
        updateTimerDisplay(timer);

        if (timer.remaining <= 0) {
          timer.isRunning = false;
          timer.finished = true;
          needsRender = true;
          triggerAlert(timer);
        }
      }
    });

    if (needsRender) {
      saveTimers();
      renderTimers();
    }
  }

  // Trigger alert
  function triggerAlert(timer) {
    alertingTimer = timer;
    alertName.textContent = timer.name || 'Timer';
    alertModal.hidden = false;

    // Play sound
    playAlertSound();

    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
  }

  // Play alert sound
  function playAlertSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      function beep(freq, start, duration) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.frequency.value = freq;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      }

      const now = audioContext.currentTime;
      beep(880, now, 0.2);
      beep(880, now + 0.25, 0.2);
      beep(880, now + 0.5, 0.2);

      alertAudio = setInterval(() => {
        if (!alertModal.hidden) {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const t = ctx.currentTime;
          beep.call({ audioContext: ctx }, 880, t, 0.2);
        } else {
          clearInterval(alertAudio);
        }
      }, 2000);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  // Dismiss alert
  function dismissAlert() {
    alertModal.hidden = true;
    if (alertAudio) {
      clearInterval(alertAudio);
      alertAudio = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  // Open add modal
  function openAddModal() {
    timerNameInput.value = '';
    hoursInput.value = '0';
    minutesInput.value = '5';
    secondsInput.value = '0';
    addModal.hidden = false;
    timerNameInput.focus();
  }

  // Close add modal
  function closeAddModal() {
    addModal.hidden = true;
  }

  // Event Listeners
  addTimerBtn.addEventListener('click', openAddModal);
  modalBackdrop.addEventListener('click', closeAddModal);
  cancelAddBtn.addEventListener('click', closeAddModal);

  confirmAddBtn.addEventListener('click', () => {
    const name = timerNameInput.value.trim();
    const hours = parseInt(hoursInput.value, 10) || 0;
    const minutes = parseInt(minutesInput.value, 10) || 0;
    const seconds = parseInt(secondsInput.value, 10) || 0;

    if (hours > 0 || minutes > 0 || seconds > 0) {
      addTimer(name, hours, minutes, seconds);
      closeAddModal();
    }
  });

  // Preset buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes, 10);
      addTimer('', 0, minutes, 0);
    });
  });

  // Timer list event delegation
  timersList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const card = btn.closest('.timer-card');
    const id = parseInt(card.dataset.id, 10);
    const action = btn.dataset.action;

    switch (action) {
      case 'start':
        startTimer(id);
        break;
      case 'pause':
        pauseTimer(id);
        break;
      case 'reset':
        resetTimer(id);
        break;
      case 'delete':
        deleteTimer(id);
        break;
    }
  });

  dismissAlertBtn.addEventListener('click', dismissAlert);

  // Enter key in modal
  addModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      confirmAddBtn.click();
    }
  });

  // Initialize
  loadTimers();

  // Start tick interval
  setInterval(tick, 250);

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
