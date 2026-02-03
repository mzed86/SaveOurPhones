// Sound Level Meter App
(function() {
  'use strict';

  // DOM Elements
  const permissionScreen = document.getElementById('permissionScreen');
  const meterScreen = document.getElementById('meterScreen');
  const requestPermissionBtn = document.getElementById('requestPermission');
  const dbValue = document.getElementById('dbValue');
  const meterBar = document.getElementById('meterBar');
  const levelLabel = document.getElementById('levelLabel');
  const minDb = document.getElementById('minDb');
  const avgDb = document.getElementById('avgDb');
  const maxDb = document.getElementById('maxDb');
  const resetStatsBtn = document.getElementById('resetStats');

  // Audio context and analyser
  let audioContext = null;
  let analyser = null;
  let microphone = null;
  let dataArray = null;
  let animationId = null;

  // Stats
  let stats = {
    min: Infinity,
    max: -Infinity,
    sum: 0,
    count: 0
  };

  // Level descriptions
  const LEVELS = [
    { max: 30, label: 'Very Quiet', class: 'quiet' },
    { max: 50, label: 'Quiet', class: 'quiet' },
    { max: 70, label: 'Moderate', class: 'moderate' },
    { max: 85, label: 'Loud', class: 'loud' },
    { max: 100, label: 'Very Loud', class: 'loud' },
    { max: Infinity, label: 'Dangerous!', class: 'dangerous' }
  ];

  // Convert amplitude to decibels (approximation)
  function amplitudeToDb(amplitude) {
    // This is a rough approximation for display purposes
    // Real dB measurement requires calibration
    if (amplitude === 0) return 0;

    // Scale amplitude (0-255) to a reasonable dB range (0-120)
    const normalized = amplitude / 255;
    const db = 20 * Math.log10(normalized * 100);

    // Map to 0-120 range
    return Math.max(0, Math.min(120, db + 40));
  }

  // Get RMS (Root Mean Square) from audio data
  function getRMS(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  // Get level info for dB value
  function getLevelInfo(db) {
    for (const level of LEVELS) {
      if (db <= level.max) {
        return level;
      }
    }
    return LEVELS[LEVELS.length - 1];
  }

  // Update display
  function updateDisplay(db) {
    // Round to nearest integer
    const displayDb = Math.round(db);

    // Update value
    dbValue.textContent = displayDb;

    // Update meter bar (scale to 0-100%)
    const percentage = Math.min(100, (db / 120) * 100);
    meterBar.style.width = `${percentage}%`;

    // Update level label
    const level = getLevelInfo(db);
    levelLabel.textContent = level.label;
    levelLabel.className = `level-label ${level.class}`;

    // Update stats
    if (db > 0) {
      stats.min = Math.min(stats.min, db);
      stats.max = Math.max(stats.max, db);
      stats.sum += db;
      stats.count++;

      minDb.textContent = Math.round(stats.min);
      maxDb.textContent = Math.round(stats.max);
      avgDb.textContent = Math.round(stats.sum / stats.count);
    }
  }

  // Animation loop
  function analyze() {
    animationId = requestAnimationFrame(analyze);

    analyser.getByteTimeDomainData(dataArray);

    const rms = getRMS(dataArray);
    const db = amplitudeToDb(rms * 255);

    updateDisplay(db);
  }

  // Initialize audio
  async function initAudio() {
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      // Create audio context
      audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create analyser
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;

      // Connect microphone to analyser
      microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      // Create data array
      dataArray = new Uint8Array(analyser.fftSize);

      // Show meter screen
      permissionScreen.hidden = true;
      meterScreen.hidden = false;

      // Start analysis
      analyze();

    } catch (error) {
      console.error('Error accessing microphone:', error);

      if (error.name === 'NotAllowedError') {
        alert('Microphone access was denied. Please allow microphone access in your browser settings.');
      } else {
        alert('Could not access microphone. Please ensure your device has a working microphone.');
      }
    }
  }

  // Reset stats
  function resetStats() {
    stats = {
      min: Infinity,
      max: -Infinity,
      sum: 0,
      count: 0
    };

    minDb.textContent = '--';
    avgDb.textContent = '--';
    maxDb.textContent = '--';
  }

  // Event Listeners
  requestPermissionBtn.addEventListener('click', initAudio);
  resetStatsBtn.addEventListener('click', resetStats);

  // Handle visibility change (pause when hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    } else if (!document.hidden && analyser && !animationId) {
      analyze();
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
