// Torch App
(function() {
  'use strict';

  // Colors
  const COLORS = {
    white: '#ffffff',
    warm: '#ffeaa7',
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff'
  };

  // SOS pattern (in ms): dot=200, dash=600, gap=200, letter-gap=600, word-gap=1400
  // S = ...  O = ---  S = ...
  const SOS_PATTERN = [
    200, 200, 200, 200, 200, 600,  // S: dot dot dot (gap)
    600, 200, 600, 200, 600, 600,  // O: dash dash dash (gap)
    200, 200, 200, 200, 200, 1400  // S: dot dot dot (word gap)
  ];

  // DOM Elements
  const app = document.getElementById('app');
  const torchScreen = document.getElementById('torchScreen');
  const powerBtn = document.getElementById('powerBtn');
  const colorBtns = document.querySelectorAll('.color-btn');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const brightnessSlider = document.getElementById('brightness');
  const themeColor = document.getElementById('themeColor');

  // State
  let isOn = false;
  let currentColor = 'white';
  let currentMode = 'solid';
  let brightness = 100;
  let sosInterval = null;
  let sosIndex = 0;

  // Apply color
  function applyColor() {
    const color = COLORS[currentColor];
    document.documentElement.style.setProperty('--light-color', color);

    // Update theme color for status bar
    if (isOn) {
      themeColor.content = color;
    } else {
      themeColor.content = '#1a1a1a';
    }
  }

  // Apply brightness
  function applyBrightness() {
    app.style.filter = `brightness(${brightness / 100})`;
  }

  // Toggle light
  function toggle() {
    isOn = !isOn;

    app.classList.toggle('on', isOn);
    powerBtn.classList.toggle('active', isOn);

    applyColor();

    if (isOn) {
      startMode();
    } else {
      stopMode();
    }
  }

  // Start current mode
  function startMode() {
    stopMode(); // Clear any existing mode

    if (currentMode === 'strobe') {
      app.classList.add('strobe');
    } else if (currentMode === 'sos') {
      app.classList.add('sos');
      startSOS();
    }
  }

  // Stop current mode
  function stopMode() {
    app.classList.remove('strobe', 'sos');

    if (sosInterval) {
      clearTimeout(sosInterval);
      sosInterval = null;
    }
  }

  // Start SOS pattern
  function startSOS() {
    sosIndex = 0;
    runSOSStep();
  }

  // Run single SOS step
  function runSOSStep() {
    if (!isOn || currentMode !== 'sos') return;

    const isLightOn = sosIndex % 2 === 0;
    const duration = SOS_PATTERN[Math.floor(sosIndex / 2) % SOS_PATTERN.length];

    app.classList.toggle('on', isLightOn);

    sosIndex++;

    sosInterval = setTimeout(runSOSStep, duration);
  }

  // Select color
  function selectColor(color) {
    currentColor = color;

    colorBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });

    applyColor();
  }

  // Select mode
  function selectMode(mode) {
    currentMode = mode;

    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (isOn) {
      startMode();
    }
  }

  // Event Listeners
  powerBtn.addEventListener('click', toggle);

  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectColor(btn.dataset.color);
    });
  });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectMode(btn.dataset.mode);
    });
  });

  brightnessSlider.addEventListener('input', () => {
    brightness = parseInt(brightnessSlider.value, 10);
    applyBrightness();
  });

  // Tap screen to toggle (when on)
  torchScreen.addEventListener('click', () => {
    if (isOn) {
      toggle();
    }
  });

  // Double tap anywhere to toggle
  let lastTap = 0;
  app.addEventListener('click', (e) => {
    if (e.target.closest('.controls') || e.target.closest('.brightness-control')) return;

    const now = Date.now();
    if (now - lastTap < 300) {
      toggle();
    }
    lastTap = now;
  });

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

  // Initialize
  applyColor();
  requestWakeLock();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isOn) {
      requestWakeLock();
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
