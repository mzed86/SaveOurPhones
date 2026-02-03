// Metronome App
(function() {
  'use strict';

  // DOM Elements
  const pendulum = document.getElementById('pendulum');
  const beatIndicator = document.getElementById('beatIndicator');
  const bpmValue = document.getElementById('bpmValue');
  const bpmSlider = document.getElementById('bpmSlider');
  const bpmDown = document.getElementById('bpmDown');
  const bpmUp = document.getElementById('bpmUp');
  const playBtn = document.getElementById('playBtn');
  const tapBtn = document.getElementById('tapBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const sigBtns = document.querySelectorAll('.sig-btn');

  // State
  let bpm = 120;
  let beatsPerMeasure = 4;
  let currentBeat = 0;
  let isPlaying = false;
  let intervalId = null;
  let audioContext = null;
  let pendulumDirection = true; // true = right, false = left

  // Tap tempo
  let tapTimes = [];
  let tapTimeout = null;

  // Initialize audio context
  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
  }

  // Play click sound
  function playClick(isAccent = false) {
    try {
      const ctx = initAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Higher pitch for accent (first beat)
      osc.frequency.value = isAccent ? 1000 : 800;
      osc.type = 'sine';

      gain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  // Update beat indicator dots
  function updateBeatIndicator() {
    // Clear existing dots
    beatIndicator.innerHTML = '';

    // Create dots for current time signature
    for (let i = 0; i < beatsPerMeasure; i++) {
      const dot = document.createElement('span');
      dot.className = 'beat-dot';
      if (i === currentBeat) {
        dot.classList.add('active');
      }
      beatIndicator.appendChild(dot);
    }
  }

  // Tick
  function tick() {
    const isAccent = currentBeat === 0;

    // Play sound
    playClick(isAccent);

    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate(isAccent ? 30 : 15);
    }

    // Update visual
    updateBeatIndicator();

    // Animate pendulum
    pendulumDirection = !pendulumDirection;
    pendulum.className = `pendulum ${pendulumDirection ? 'tick' : 'tock'}`;

    // Next beat
    currentBeat = (currentBeat + 1) % beatsPerMeasure;
  }

  // Start metronome
  function start() {
    if (isPlaying) return;

    isPlaying = true;
    playBtn.classList.add('playing');
    playBtn.querySelector('.icon-play').style.display = 'none';
    playBtn.querySelector('.icon-pause').style.display = 'block';

    // Initialize audio context on user interaction
    initAudio();

    // Initial tick
    tick();

    // Start interval
    const interval = 60000 / bpm;
    intervalId = setInterval(tick, interval);
  }

  // Stop metronome
  function stop() {
    isPlaying = false;
    playBtn.classList.remove('playing');
    playBtn.querySelector('.icon-play').style.display = 'block';
    playBtn.querySelector('.icon-pause').style.display = 'none';

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // Reset pendulum
    pendulum.className = 'pendulum';
    currentBeat = 0;
    updateBeatIndicator();
  }

  // Toggle play/stop
  function toggle() {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }

  // Set BPM
  function setBPM(newBpm) {
    bpm = Math.max(20, Math.min(240, newBpm));
    bpmValue.textContent = bpm;
    bpmSlider.value = bpm;

    // Update preset buttons
    presetBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.bpm) === bpm);
    });

    // Restart if playing
    if (isPlaying) {
      stop();
      start();
    }
  }

  // Set time signature
  function setTimeSignature(beats) {
    beatsPerMeasure = beats;
    currentBeat = 0;
    updateBeatIndicator();

    // Update signature buttons
    sigBtns.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.beats) === beats);
    });
  }

  // Tap tempo
  function tapTempo() {
    const now = Date.now();

    // Clear tap history after 2 seconds of inactivity
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }
    tapTimeout = setTimeout(() => {
      tapTimes = [];
    }, 2000);

    tapTimes.push(now);

    // Keep only last 8 taps
    if (tapTimes.length > 8) {
      tapTimes.shift();
    }

    // Calculate BPM from taps (need at least 2)
    if (tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const tappedBpm = Math.round(60000 / avgInterval);

      setBPM(tappedBpm);
    }

    // Visual feedback
    tapBtn.style.background = 'var(--bg-secondary)';
    setTimeout(() => {
      tapBtn.style.background = 'transparent';
    }, 100);
  }

  // Event Listeners
  playBtn.addEventListener('click', toggle);

  bpmSlider.addEventListener('input', () => {
    setBPM(parseInt(bpmSlider.value));
  });

  bpmDown.addEventListener('click', () => {
    setBPM(bpm - 1);
  });

  bpmUp.addEventListener('click', () => {
    setBPM(bpm + 1);
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setBPM(parseInt(btn.dataset.bpm));
    });
  });

  sigBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeSignature(parseInt(btn.dataset.beats));
    });
  });

  tapBtn.addEventListener('click', tapTempo);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      toggle();
    } else if (e.code === 'ArrowUp') {
      setBPM(bpm + 1);
    } else if (e.code === 'ArrowDown') {
      setBPM(bpm - 1);
    } else if (e.code === 'KeyT') {
      tapTempo();
    }
  });

  // Initialize
  updateBeatIndicator();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
