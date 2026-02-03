// Breathing Exercise App
(function() {
  'use strict';

  // Breathing patterns (times in seconds)
  const PATTERNS = {
    relaxing: {
      name: '4-7-8 Relaxing',
      steps: [
        { phase: 'inhale', duration: 4 },
        { phase: 'hold', duration: 7 },
        { phase: 'exhale', duration: 8 }
      ]
    },
    balanced: {
      name: '4-4-4-4 Box Breathing',
      steps: [
        { phase: 'inhale', duration: 4 },
        { phase: 'hold', duration: 4 },
        { phase: 'exhale', duration: 4 },
        { phase: 'hold', duration: 4 }
      ]
    },
    energizing: {
      name: '4-4 Energizing',
      steps: [
        { phase: 'inhale', duration: 4 },
        { phase: 'exhale', duration: 4 }
      ]
    }
  };

  const PHASE_LABELS = {
    inhale: 'Breathe In',
    hold: 'Hold',
    exhale: 'Breathe Out'
  };

  // DOM Elements
  const breathCircle = document.getElementById('breathCircle');
  const breathGlow = document.getElementById('breathGlow');
  const instruction = document.getElementById('instruction');
  const timer = document.getElementById('timer');
  const startBtn = document.getElementById('startBtn');
  const controls = document.getElementById('controls');
  const patterns = document.getElementById('patterns');
  const patternBtns = document.querySelectorAll('.pattern-btn');
  const sessionInfo = document.getElementById('sessionInfo');
  const cycleCount = document.getElementById('cycleCount');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const hapticEnabled = document.getElementById('hapticEnabled');
  const soundEnabled = document.getElementById('soundEnabled');

  // State
  let currentPattern = 'relaxing';
  let isRunning = false;
  let currentStepIndex = 0;
  let timeRemaining = 0;
  let cycles = 0;
  let intervalId = null;
  let settings = {
    haptic: true,
    sound: true
  };

  // Audio context for sounds
  let audioContext = null;

  // Load settings
  function loadSettings() {
    const saved = localStorage.getItem('breathingSettings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
    hapticEnabled.checked = settings.haptic;
    soundEnabled.checked = settings.sound;
  }

  // Save settings
  function saveSettings() {
    localStorage.setItem('breathingSettings', JSON.stringify(settings));
  }

  // Initialize audio context
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Play phase transition sound
  function playSound(phase) {
    if (!settings.sound) return;

    try {
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Different tones for different phases
      const frequencies = {
        inhale: 440,   // A4
        hold: 523,     // C5
        exhale: 349    // F4
      };

      osc.frequency.value = frequencies[phase] || 440;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  // Haptic feedback
  function haptic(pattern = [50]) {
    if (!settings.haptic) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Start breathing session
  function start() {
    isRunning = true;
    cycles = 0;
    currentStepIndex = 0;

    controls.hidden = true;
    patterns.hidden = true;
    sessionInfo.hidden = false;
    cycleCount.textContent = cycles;

    // Remove tap to start text
    breathCircle.style.cursor = 'pointer';

    startStep();
  }

  // Stop breathing session
  function stop() {
    isRunning = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    breathCircle.className = 'breath-circle';
    breathGlow.className = 'breath-glow';
    instruction.textContent = 'Tap to Start';
    timer.textContent = '';

    controls.hidden = false;
    patterns.hidden = false;
    sessionInfo.hidden = true;
  }

  // Start a breathing step
  function startStep() {
    const pattern = PATTERNS[currentPattern];
    const step = pattern.steps[currentStepIndex];

    timeRemaining = step.duration;

    // Update instruction
    instruction.textContent = PHASE_LABELS[step.phase];
    timer.textContent = timeRemaining;

    // Play sound and haptic
    playSound(step.phase);
    haptic([30]);

    // Set animation duration
    if (step.phase === 'inhale') {
      breathCircle.style.setProperty('--inhale-duration', `${step.duration}s`);
      breathGlow.style.setProperty('--inhale-duration', `${step.duration}s`);
    } else if (step.phase === 'exhale') {
      breathCircle.style.setProperty('--exhale-duration', `${step.duration}s`);
      breathGlow.style.setProperty('--exhale-duration', `${step.duration}s`);
    }

    // Apply animation class
    breathCircle.className = `breath-circle ${step.phase}`;
    breathGlow.className = `breath-glow ${step.phase}`;

    // Start countdown
    intervalId = setInterval(() => {
      timeRemaining--;
      timer.textContent = timeRemaining;

      if (timeRemaining <= 0) {
        clearInterval(intervalId);
        nextStep();
      }
    }, 1000);
  }

  // Move to next step
  function nextStep() {
    const pattern = PATTERNS[currentPattern];
    currentStepIndex++;

    // Check if cycle complete
    if (currentStepIndex >= pattern.steps.length) {
      currentStepIndex = 0;
      cycles++;
      cycleCount.textContent = cycles;
    }

    if (isRunning) {
      startStep();
    }
  }

  // Select pattern
  function selectPattern(patternKey) {
    currentPattern = patternKey;

    patternBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pattern === patternKey);
    });
  }

  // Event Listeners
  startBtn.addEventListener('click', start);

  breathCircle.addEventListener('click', () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  });

  patternBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isRunning) {
        selectPattern(btn.dataset.pattern);
      }
    });
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.hidden = false;
  });

  closeSettings.addEventListener('click', () => {
    settingsPanel.hidden = true;
    settings.haptic = hapticEnabled.checked;
    settings.sound = soundEnabled.checked;
    saveSettings();
  });

  // Initialize
  loadSettings();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
