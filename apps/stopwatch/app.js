(function() {
  'use strict';

  // State
  let isRunning = false;
  let startTime = 0;
  let elapsedTime = 0;
  let animationId = null;
  let laps = [];
  let lastLapTime = 0;

  // DOM elements
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const msEl = document.getElementById('ms');

  const startBtn = document.getElementById('start-btn');
  const lapBtn = document.getElementById('lap-btn');
  const resetBtn = document.getElementById('reset-btn');

  const lapsContainer = document.getElementById('laps-container');
  const lapsList = document.getElementById('laps-list');

  const statsContainer = document.getElementById('stats');
  const fastestEl = document.getElementById('fastest');
  const slowestEl = document.getElementById('slowest');
  const averageEl = document.getElementById('average');

  // Format time
  function formatTime(ms, includeMs = true) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);

    if (includeMs) {
      return {
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
        ms: String(milliseconds).padStart(2, '0')
      };
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Update display
  function updateDisplay() {
    const time = formatTime(elapsedTime);
    hoursEl.textContent = time.hours;
    minutesEl.textContent = time.minutes;
    secondsEl.textContent = time.seconds;
    msEl.textContent = time.ms;
  }

  // Animation loop
  function tick() {
    if (isRunning) {
      elapsedTime = Date.now() - startTime;
      updateDisplay();
      animationId = requestAnimationFrame(tick);
    }
  }

  // Start/Stop
  function toggleTimer() {
    if (isRunning) {
      // Stop
      isRunning = false;
      cancelAnimationFrame(animationId);
      startBtn.textContent = 'Resume';
      startBtn.classList.remove('running');
      lapBtn.disabled = true;
    } else {
      // Start
      isRunning = true;
      startTime = Date.now() - elapsedTime;
      startBtn.textContent = 'Stop';
      startBtn.classList.add('running');
      lapBtn.disabled = false;
      resetBtn.disabled = false;
      tick();

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  }

  // Record lap
  function recordLap() {
    if (!isRunning) return;

    const lapTime = elapsedTime - lastLapTime;
    lastLapTime = elapsedTime;

    laps.unshift({
      number: laps.length + 1,
      lapTime: lapTime,
      totalTime: elapsedTime
    });

    renderLaps();

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([20, 50, 20]);
    }
  }

  // Render laps
  function renderLaps() {
    if (laps.length === 0) {
      lapsContainer.classList.add('hidden');
      statsContainer.classList.add('hidden');
      return;
    }

    lapsContainer.classList.remove('hidden');

    // Find fastest and slowest
    const lapTimes = laps.map(l => l.lapTime);
    const fastest = Math.min(...lapTimes);
    const slowest = Math.max(...lapTimes);

    lapsList.innerHTML = laps.map(lap => {
      let className = 'lap-item';
      if (laps.length > 1) {
        if (lap.lapTime === fastest) className += ' fastest';
        else if (lap.lapTime === slowest) className += ' slowest';
      }

      return `
        <div class="${className}">
          <span class="lap-number">Lap ${lap.number}</span>
          <span class="lap-time">${formatTime(lap.lapTime, false)}</span>
          <span class="lap-total">${formatTime(lap.totalTime, false)}</span>
        </div>
      `;
    }).join('');

    // Update stats if we have laps
    if (laps.length >= 2) {
      statsContainer.classList.remove('hidden');
      fastestEl.textContent = formatTime(fastest, false);
      slowestEl.textContent = formatTime(slowest, false);

      const avg = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;
      averageEl.textContent = formatTime(avg, false);
    } else {
      statsContainer.classList.add('hidden');
    }
  }

  // Reset
  function reset() {
    isRunning = false;
    cancelAnimationFrame(animationId);

    elapsedTime = 0;
    lastLapTime = 0;
    laps = [];

    updateDisplay();
    renderLaps();

    startBtn.textContent = 'Start';
    startBtn.classList.remove('running');
    lapBtn.disabled = true;
    resetBtn.disabled = true;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  // Event listeners
  startBtn.addEventListener('click', toggleTimer);
  lapBtn.addEventListener('click', recordLap);
  resetBtn.addEventListener('click', reset);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggleTimer();
    } else if (e.code === 'KeyL' && isRunning) {
      recordLap();
    } else if (e.code === 'KeyR' && !isRunning && elapsedTime > 0) {
      reset();
    }
  });

  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isRunning) {
      // Resume animation when page becomes visible
      tick();
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  // Initialize display
  updateDisplay();
})();
