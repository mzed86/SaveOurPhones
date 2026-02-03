(function() {
  'use strict';

  // Audio context and active sounds
  let audioCtx = null;
  const activeSounds = new Map();
  let masterGain = null;
  let timerInterval = null;
  let timerEndTime = null;

  // Settings
  const settings = {
    volume: 50,
    timerMinutes: 0,
    allowMix: false
  };

  // DOM elements
  const soundBtns = document.querySelectorAll('.sound-btn');
  const volumeSlider = document.getElementById('volume');
  const volumeValue = document.getElementById('volume-value');
  const timerBtns = document.querySelectorAll('.timer-btn');
  const timerDisplay = document.getElementById('timer-display');
  const timerValue = document.getElementById('timer-value');
  const allowMixCheckbox = document.getElementById('allow-mix');
  const stopAllBtn = document.getElementById('stop-all');

  // Initialize audio context on user interaction
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.connect(audioCtx.destination);
      updateVolume();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Generate white noise buffer
  function createWhiteNoise() {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Generate pink noise (1/f noise)
  function createPinkNoise() {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Generate brown noise (1/f^2 noise)
  function createBrownNoise() {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    return buffer;
  }

  // Create nature sound (modulated noise with filters)
  function createRainSound() {
    const source = audioCtx.createBufferSource();
    source.buffer = createWhiteNoise();
    source.loop = true;

    // Bandpass filter for rain-like sound
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    // Add some variation with LFO
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.3;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = audioCtx.createGain();
    gain.gain.value = 0.7;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();

    return { source, filter, lfo, gain };
  }

  function createOceanSound() {
    const source = audioCtx.createBufferSource();
    source.buffer = createBrownNoise();
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    // Wave-like modulation
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);

    const gain = audioCtx.createGain();
    gain.gain.value = 0.8;
    lfoGain.connect(gain.gain);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
    lfo.start();

    return { source, filter, lfo, gain };
  }

  function createWindSound() {
    const source = audioCtx.createBufferSource();
    source.buffer = createPinkNoise();
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.3;

    // Wind gusts
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = audioCtx.createGain();
    gain.gain.value = 0.6;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
    lfo.start();

    return { source, filter, lfo, gain };
  }

  function createFireSound() {
    const source = audioCtx.createBufferSource();
    source.buffer = createBrownNoise();
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    // Crackling effect
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type = 'square';
    lfo.frequency.value = 8;
    lfoGain.gain.value = 0.1;
    lfo.connect(lfoGain);

    const gain = audioCtx.createGain();
    gain.gain.value = 0.5;
    lfoGain.connect(gain.gain);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
    lfo.start();

    return { source, filter, lfo, gain };
  }

  function createForestSound() {
    const source = audioCtx.createBufferSource();
    source.buffer = createPinkNoise();
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.2;

    // Gentle rustle
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = audioCtx.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
    lfo.start();

    return { source, filter, lfo, gain };
  }

  // Create basic noise sounds
  function createNoiseSound(type) {
    const source = audioCtx.createBufferSource();

    switch (type) {
      case 'white':
        source.buffer = createWhiteNoise();
        break;
      case 'pink':
        source.buffer = createPinkNoise();
        break;
      case 'brown':
        source.buffer = createBrownNoise();
        break;
    }

    source.loop = true;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(masterGain);
    source.start();

    return { source, gain };
  }

  // Start a sound
  function startSound(soundType) {
    initAudio();

    if (!settings.allowMix) {
      stopAllSounds();
    }

    if (activeSounds.has(soundType)) {
      stopSound(soundType);
      return;
    }

    let soundNodes;
    switch (soundType) {
      case 'white':
      case 'pink':
      case 'brown':
        soundNodes = createNoiseSound(soundType);
        break;
      case 'rain':
        soundNodes = createRainSound();
        break;
      case 'ocean':
        soundNodes = createOceanSound();
        break;
      case 'wind':
        soundNodes = createWindSound();
        break;
      case 'fire':
        soundNodes = createFireSound();
        break;
      case 'forest':
        soundNodes = createForestSound();
        break;
    }

    activeSounds.set(soundType, soundNodes);
    updateUI();
  }

  // Stop a specific sound
  function stopSound(soundType) {
    const nodes = activeSounds.get(soundType);
    if (nodes) {
      if (nodes.source) {
        try { nodes.source.stop(); } catch (e) {}
      }
      if (nodes.lfo) {
        try { nodes.lfo.stop(); } catch (e) {}
      }
      activeSounds.delete(soundType);
    }
    updateUI();
  }

  // Stop all sounds
  function stopAllSounds() {
    activeSounds.forEach((nodes, soundType) => {
      stopSound(soundType);
    });
    clearTimer();
    updateUI();
  }

  // Update volume
  function updateVolume() {
    if (masterGain) {
      masterGain.gain.value = settings.volume / 100;
    }
  }

  // Set timer
  function setTimer(minutes) {
    settings.timerMinutes = minutes;
    clearTimer();

    if (minutes > 0 && activeSounds.size > 0) {
      timerEndTime = Date.now() + (minutes * 60 * 1000);
      timerInterval = setInterval(updateTimerDisplay, 1000);
      updateTimerDisplay();
    }

    updateUI();
    saveSettings();
  }

  // Clear timer
  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerEndTime = null;
    timerDisplay.classList.add('hidden');
  }

  // Update timer display
  function updateTimerDisplay() {
    if (!timerEndTime) return;

    const remaining = Math.max(0, timerEndTime - Date.now());

    if (remaining <= 0) {
      stopAllSounds();
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.classList.remove('hidden');
  }

  // Update UI state
  function updateUI() {
    // Update sound buttons
    soundBtns.forEach(btn => {
      const sound = btn.dataset.sound;
      btn.classList.toggle('active', activeSounds.has(sound));
    });

    // Update timer buttons
    timerBtns.forEach(btn => {
      const minutes = parseInt(btn.dataset.minutes);
      btn.classList.toggle('active', settings.timerMinutes === minutes);
    });

    // Update stop button visibility
    stopAllBtn.classList.toggle('hidden', activeSounds.size === 0);

    // Update timer display visibility
    if (activeSounds.size === 0 || settings.timerMinutes === 0) {
      timerDisplay.classList.add('hidden');
    }
  }

  // Save settings
  function saveSettings() {
    localStorage.setItem('whitenoise-settings', JSON.stringify(settings));
  }

  // Load settings
  function loadSettings() {
    try {
      const saved = localStorage.getItem('whitenoise-settings');
      if (saved) {
        Object.assign(settings, JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }

    // Apply loaded settings
    volumeSlider.value = settings.volume;
    volumeValue.textContent = settings.volume + '%';
    allowMixCheckbox.checked = settings.allowMix;
    updateUI();
  }

  // Event listeners
  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const soundType = btn.dataset.sound;
      startSound(soundType);

      // Start timer if active sounds and timer is set
      if (settings.timerMinutes > 0 && activeSounds.size > 0 && !timerInterval) {
        setTimer(settings.timerMinutes);
      }
    });
  });

  volumeSlider.addEventListener('input', () => {
    settings.volume = parseInt(volumeSlider.value);
    volumeValue.textContent = settings.volume + '%';
    updateVolume();
    saveSettings();
  });

  timerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.minutes);
      setTimer(minutes);
    });
  });

  allowMixCheckbox.addEventListener('change', () => {
    settings.allowMix = allowMixCheckbox.checked;
    saveSettings();
  });

  stopAllBtn.addEventListener('click', stopAllSounds);

  // Handle visibility change to save battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && audioCtx) {
      // Keep playing in background but don't update UI
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  // Initialize
  loadSettings();
})();
