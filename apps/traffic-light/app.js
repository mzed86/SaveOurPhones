// Traffic Light App
(function() {
  'use strict';

  // Phase sequences: which lamps are lit, and which duration setting applies
  const SEQUENCES = {
    uk: [
      { key: 'red', lamps: ['red'], label: 'red' },
      { key: 'redAmber', lamps: ['red', 'amber'], label: 'red and amber' },
      { key: 'green', lamps: ['green'], label: 'green' },
      { key: 'amber', lamps: ['amber'], label: 'amber' }
    ],
    standard: [
      { key: 'red', lamps: ['red'], label: 'red' },
      { key: 'green', lamps: ['green'], label: 'green' },
      { key: 'amber', lamps: ['amber'], label: 'amber' }
    ]
  };

  const HINTS = {
    uk: 'Red → Red & Amber → Green → Amber',
    standard: 'Red → Green → Amber'
  };

  const DEFAULTS = {
    sequence: 'uk',
    durations: { red: 10, redAmber: 2, green: 10, amber: 3 }
  };

  const MIN_SECONDS = 1;
  const MAX_SECONDS = 600;
  const UI_HIDE_DELAY = 4000;
  const HOLD_DELAY = 400;
  const HOLD_REPEAT = 110;

  // Housing proportions relative to lamp diameter (see styles.css)
  const LENGTH_RATIO = 3.7;
  const WIDTH_RATIO = 1.6;

  // DOM Elements
  const stage = document.getElementById('stage');
  const housing = document.getElementById('housing');
  const lamps = {
    red: document.getElementById('lampRed'),
    amber: document.getElementById('lampAmber'),
    green: document.getElementById('lampGreen')
  };
  const settingsBtn = document.getElementById('settingsBtn');
  const sheetBackdrop = document.getElementById('sheetBackdrop');
  const doneBtn = document.getElementById('doneBtn');
  const seqBtns = document.querySelectorAll('.seq-btn');
  const seqHint = document.getElementById('seqHint');
  const rows = document.querySelectorAll('.row');

  // State
  let settings = loadSettings();
  let phaseIndex = 0;
  let phaseTimer = null;
  let hideTimer = null;

  // Load settings from localStorage
  function loadSettings() {
    const result = {
      sequence: DEFAULTS.sequence,
      durations: Object.assign({}, DEFAULTS.durations)
    };
    try {
      const saved = JSON.parse(localStorage.getItem('trafficLightSettings'));
      if (saved) {
        if (SEQUENCES[saved.sequence]) result.sequence = saved.sequence;
        Object.keys(result.durations).forEach((key) => {
          const value = saved.durations && saved.durations[key];
          if (typeof value === 'number' && value >= MIN_SECONDS && value <= MAX_SECONDS) {
            result.durations[key] = value;
          }
        });
      }
    } catch (e) {}
    return result;
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem('trafficLightSettings', JSON.stringify(settings));
    } catch (e) {}
  }

  // ---------- Light cycle ----------

  function showPhase() {
    const sequence = SEQUENCES[settings.sequence];
    const phase = sequence[phaseIndex];

    Object.keys(lamps).forEach((name) => {
      lamps[name].classList.toggle('on', phase.lamps.indexOf(name) !== -1);
    });
    housing.setAttribute('aria-label', 'Traffic light showing ' + phase.label);

    clearTimeout(phaseTimer);
    phaseTimer = setTimeout(nextPhase, settings.durations[phase.key] * 1000);
  }

  function nextPhase() {
    phaseIndex = (phaseIndex + 1) % SEQUENCES[settings.sequence].length;
    showPhase();
  }

  function restartCycle() {
    phaseIndex = 0;
    showPhase();
  }

  // ---------- Layout ----------

  // Size the lamps to the largest that fits the screen in either orientation
  function layout() {
    const cs = getComputedStyle(stage);
    const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const landscape = w > h;
    const long = landscape ? w : h;
    const cross = landscape ? h : w;
    const d = Math.floor(Math.min(long / LENGTH_RATIO, cross / WIDTH_RATIO));

    document.documentElement.style.setProperty('--d', d + 'px');
    document.body.classList.toggle('landscape', landscape);
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

  stage.addEventListener('click', () => {
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
    seqBtns.forEach((btn) => {
      const active = btn.dataset.seq === settings.sequence;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    seqHint.textContent = HINTS[settings.sequence];

    const usedKeys = SEQUENCES[settings.sequence].map((p) => p.key);
    rows.forEach((row) => {
      const key = row.dataset.key;
      const value = settings.durations[key];
      row.classList.toggle('hidden', usedKeys.indexOf(key) === -1);
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
    const next = stepValue(settings.durations[key], dir);
    if (next === settings.durations[key]) return false;
    settings.durations[key] = next;
    saveSettings();
    renderSettings();
    return true;
  }

  function openSettings() {
    hideSettingsButton();
    renderSettings();
    sheetBackdrop.classList.add('open');
    sheetBackdrop.setAttribute('aria-hidden', 'false');
    doneBtn.focus();
  }

  function closeSettings() {
    sheetBackdrop.classList.remove('open');
    sheetBackdrop.setAttribute('aria-hidden', 'true');
  }

  settingsBtn.addEventListener('click', openSettings);
  doneBtn.addEventListener('click', closeSettings);

  sheetBackdrop.addEventListener('click', (e) => {
    if (e.target === sheetBackdrop) closeSettings();
  });

  seqBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.seq === settings.sequence) return;
      settings.sequence = btn.dataset.seq;
      saveSettings();
      renderSettings();
      restartCycle();
    });
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
  restartCycle();
  requestWakeLock();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
