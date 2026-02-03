// Bedside Clock App
(function() {
  'use strict';

  // DOM Elements
  const timeEl = document.getElementById('time');
  const secondsEl = document.getElementById('seconds');
  const dateEl = document.getElementById('date');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const closeSettings = document.getElementById('closeSettings');
  const format24Toggle = document.getElementById('format24');
  const showSecondsToggle = document.getElementById('showSeconds');
  const showDateToggle = document.getElementById('showDate');
  const brightnessSlider = document.getElementById('brightness');
  const colorOptions = document.getElementById('colorOptions');
  const alarmEnabled = document.getElementById('alarmEnabled');
  const alarmTimeRow = document.getElementById('alarmTimeRow');
  const alarmTimeInput = document.getElementById('alarmTimeInput');
  const alarmIndicator = document.getElementById('alarmIndicator');
  const alarmTimeDisplay = document.getElementById('alarmTime');
  const alarmAlert = document.getElementById('alarmAlert');
  const alarmAlertTime = document.getElementById('alarmAlertTime');
  const dismissAlarmBtn = document.getElementById('dismissAlarm');

  // State
  let settings = {
    format24: false,
    showSeconds: true,
    showDate: true,
    brightness: 100,
    color: '#ffffff',
    alarmEnabled: false,
    alarmTime: '07:00'
  };

  let alarmTriggered = false;
  let alarmAudio = null;

  // Load settings from localStorage
  function loadSettings() {
    const saved = localStorage.getItem('clockSettings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
    applySettings();
  }

  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem('clockSettings', JSON.stringify(settings));
  }

  // Apply settings to UI
  function applySettings() {
    format24Toggle.checked = settings.format24;
    showSecondsToggle.checked = settings.showSeconds;
    showDateToggle.checked = settings.showDate;
    brightnessSlider.value = settings.brightness;
    alarmEnabled.checked = settings.alarmEnabled;
    alarmTimeInput.value = settings.alarmTime;

    // Show/hide seconds
    secondsEl.hidden = !settings.showSeconds;

    // Show/hide date
    dateEl.hidden = !settings.showDate;

    // Apply brightness
    document.body.style.opacity = settings.brightness / 100;

    // Apply color
    document.documentElement.style.setProperty('--clock-color', settings.color);
    colorOptions.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === settings.color);
    });

    // Alarm indicator
    alarmTimeRow.style.display = settings.alarmEnabled ? 'flex' : 'none';
    alarmIndicator.hidden = !settings.alarmEnabled;
    if (settings.alarmEnabled) {
      alarmTimeDisplay.textContent = formatAlarmTime(settings.alarmTime);
    }
  }

  // Format time for display
  function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (!settings.format24) {
      hours = hours % 12 || 12;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // Format alarm time for indicator
  function formatAlarmTime(timeStr) {
    if (settings.format24) return timeStr;

    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  }

  // Format date
  function formatDate(date) {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  // Update clock display
  function updateClock() {
    const now = new Date();

    timeEl.textContent = formatTime(now);
    secondsEl.textContent = now.getSeconds().toString().padStart(2, '0');
    dateEl.textContent = formatDate(now);

    // Check alarm
    if (settings.alarmEnabled && !alarmTriggered) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime === settings.alarmTime && now.getSeconds() === 0) {
        triggerAlarm();
      }
    }
  }

  // Trigger alarm
  function triggerAlarm() {
    alarmTriggered = true;
    alarmAlertTime.textContent = formatAlarmTime(settings.alarmTime);
    alarmAlert.hidden = false;

    // Play alarm sound (using Web Audio API)
    playAlarmSound();

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }

  // Play alarm sound using Web Audio API
  function playAlarmSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      function beep() {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 880;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      }

      // Beep pattern
      beep();
      setTimeout(beep, 600);
      setTimeout(beep, 1200);

      alarmAudio = setInterval(() => {
        if (!alarmAlert.hidden) {
          beep();
          setTimeout(beep, 600);
          setTimeout(beep, 1200);
        }
      }, 2000);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  // Dismiss alarm
  function dismissAlarm() {
    alarmAlert.hidden = true;
    alarmTriggered = false;

    if (alarmAudio) {
      clearInterval(alarmAudio);
      alarmAudio = null;
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  // Event listeners
  settingsBtn.addEventListener('click', () => {
    settingsPanel.hidden = false;
  });

  closeSettings.addEventListener('click', () => {
    settingsPanel.hidden = true;
  });

  format24Toggle.addEventListener('change', () => {
    settings.format24 = format24Toggle.checked;
    saveSettings();
    updateClock();
    if (settings.alarmEnabled) {
      alarmTimeDisplay.textContent = formatAlarmTime(settings.alarmTime);
    }
  });

  showSecondsToggle.addEventListener('change', () => {
    settings.showSeconds = showSecondsToggle.checked;
    secondsEl.hidden = !settings.showSeconds;
    saveSettings();
  });

  showDateToggle.addEventListener('change', () => {
    settings.showDate = showDateToggle.checked;
    dateEl.hidden = !settings.showDate;
    saveSettings();
  });

  brightnessSlider.addEventListener('input', () => {
    settings.brightness = parseInt(brightnessSlider.value, 10);
    document.body.style.opacity = settings.brightness / 100;
    saveSettings();
  });

  colorOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.color-btn');
    if (!btn) return;

    settings.color = btn.dataset.color;
    document.documentElement.style.setProperty('--clock-color', settings.color);

    colorOptions.querySelectorAll('.color-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });

    saveSettings();
  });

  alarmEnabled.addEventListener('change', () => {
    settings.alarmEnabled = alarmEnabled.checked;
    alarmTimeRow.style.display = settings.alarmEnabled ? 'flex' : 'none';
    alarmIndicator.hidden = !settings.alarmEnabled;
    alarmTriggered = false;

    if (settings.alarmEnabled) {
      alarmTimeDisplay.textContent = formatAlarmTime(settings.alarmTime);
    }

    saveSettings();
  });

  alarmTimeInput.addEventListener('change', () => {
    settings.alarmTime = alarmTimeInput.value;
    alarmTimeDisplay.textContent = formatAlarmTime(settings.alarmTime);
    alarmTriggered = false;
    saveSettings();
  });

  dismissAlarmBtn.addEventListener('click', dismissAlarm);

  // Double tap on clock to toggle settings (for quick access)
  let lastTap = 0;
  document.getElementById('clockDisplay').addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      settingsPanel.hidden = !settingsPanel.hidden;
    }
    lastTap = now;
  });

  // Prevent screen from dimming (request wake lock if available)
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
  loadSettings();
  updateClock();
  setInterval(updateClock, 1000);
  requestWakeLock();

  // Re-request wake lock when page becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
