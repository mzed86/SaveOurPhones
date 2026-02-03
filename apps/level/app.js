(function() {
  'use strict';
  const permissionScreen = document.getElementById('permissionScreen');
  const levelScreen = document.getElementById('levelScreen');
  const requestBtn = document.getElementById('requestPermission');
  const hBubble = document.getElementById('hBubble');
  const vBubble = document.getElementById('vBubble');
  const pitchEl = document.getElementById('pitch');
  const rollEl = document.getElementById('roll');
  const statusEl = document.getElementById('status');
  const calibrateBtn = document.getElementById('calibrateBtn');

  let calibrationPitch = 0;
  let calibrationRoll = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function handleOrientation(event) {
    let pitch = event.beta;  // -180 to 180 (front/back tilt)
    let roll = event.gamma;  // -90 to 90 (left/right tilt)

    if (pitch === null || roll === null) return;

    // Apply calibration
    pitch -= calibrationPitch;
    roll -= calibrationRoll;

    // Clamp to reasonable range
    pitch = clamp(pitch, -45, 45);
    roll = clamp(roll, -45, 45);

    // Update display
    pitchEl.textContent = pitch.toFixed(1) + '°';
    rollEl.textContent = roll.toFixed(1) + '°';

    // Calculate bubble positions (center is 100px for h, 100px for v)
    // Range: 10px to 190px for 240px container minus 40px bubble
    const hPos = 100 + (roll / 45) * 90;
    const vPos = 100 + (pitch / 45) * 90;

    hBubble.style.left = clamp(hPos, 10, 190) + 'px';
    vBubble.style.top = clamp(vPos, 10, 190) + 'px';

    // Check if level (within 1 degree)
    const isLevel = Math.abs(pitch) < 1 && Math.abs(roll) < 1;
    const isClose = Math.abs(pitch) < 5 && Math.abs(roll) < 5;

    statusEl.textContent = isLevel ? 'Level!' : 'Place phone on surface';
    statusEl.classList.toggle('level', isLevel);

    hBubble.classList.toggle('warning', Math.abs(roll) > 5);
    vBubble.classList.toggle('warning', Math.abs(pitch) > 5);

    // Haptic on level
    if (isLevel && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  async function requestPermission() {
    // iOS 13+ requires permission request
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          startLevel();
        } else {
          alert('Motion permission denied');
        }
      } catch (e) {
        console.error(e);
        alert('Could not request motion permission');
      }
    } else {
      // Non-iOS or older iOS
      startLevel();
    }
  }

  function startLevel() {
    permissionScreen.hidden = true;
    levelScreen.hidden = false;
    window.addEventListener('deviceorientation', handleOrientation);
  }

  function calibrate() {
    // Get current orientation as zero reference
    const handler = (event) => {
      calibrationPitch = event.beta || 0;
      calibrationRoll = event.gamma || 0;
      window.removeEventListener('deviceorientation', handler);

      // Visual feedback
      calibrateBtn.textContent = 'Calibrated!';
      setTimeout(() => calibrateBtn.textContent = 'Calibrate', 1000);
    };
    window.addEventListener('deviceorientation', handler);
  }

  requestBtn.addEventListener('click', requestPermission);
  calibrateBtn.addEventListener('click', calibrate);

  // Check if device orientation is available
  if (!('DeviceOrientationEvent' in window)) {
    permissionScreen.innerHTML = `
      <div class="icon">📐</div>
      <h2>Not Available</h2>
      <p>Your device doesn't support motion sensors.</p>
    `;
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
