(function() {
  'use strict';

  // State
  let quantity = 1;
  let modifier = 0;
  let history = [];
  const MAX_HISTORY = 20;
  let soundEnabled = true;

  // Audio Context for sound generation
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Sound effects using Web Audio API (no external files needed)
  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      if (type === 'roll') {
        // Dice rolling sound - rapid clicking/rattling
        for (let i = 0; i < 8; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 200 + Math.random() * 400;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.08, now + i * 0.03);
          gain.gain.exponentialDecayTo ? gain.gain.exponentialDecayTo(0.001, now + i * 0.03 + 0.05) : gain.gain.setValueAtTime(0.001, now + i * 0.03 + 0.05);
          osc.start(now + i * 0.03);
          osc.stop(now + i * 0.03 + 0.05);
        }
      } else if (type === 'land') {
        // Landing thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'critical') {
        // Triumphant fanfare for nat 20
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.3);
        });
      } else if (type === 'fumble') {
        // Sad descending tone for nat 1
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'click') {
        // Button click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 600;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      // Audio not supported, fail silently
    }
  }

  // DOM elements
  const resultValue = document.getElementById('result-value');
  const resultBreakdown = document.getElementById('result-breakdown');
  const quantityEl = document.getElementById('quantity');
  const modifierEl = document.getElementById('modifier');
  const historyList = document.getElementById('history-list');

  const diceBtns = document.querySelectorAll('.dice-btn[data-sides]');
  const customDiceBtn = document.getElementById('custom-dice');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const modMinus = document.getElementById('mod-minus');
  const modPlus = document.getElementById('mod-plus');
  const clearHistoryBtn = document.getElementById('clear-history');

  const customModal = document.getElementById('custom-modal');
  const customSidesInput = document.getElementById('custom-sides');
  const cancelCustomBtn = document.getElementById('cancel-custom');
  const rollCustomBtn = document.getElementById('roll-custom');

  // Dice shapes for different types
  const diceShapes = {
    4: '▲',
    6: '⬜',
    8: '◆',
    10: '⬠',
    12: '⬡',
    20: '△',
    100: '%'
  };

  // Get dice shape for sides
  function getDiceShape(sides) {
    return diceShapes[sides] || '⬜';
  }

  // Create a visual die element
  function createDie(sides, finalValue, index, totalDice) {
    const die = document.createElement('div');
    die.className = 'rolling-die';
    die.innerHTML = `<span class="die-face">${getDiceShape(sides)}</span><span class="die-value">${finalValue}</span>`;

    // Random starting position and animation
    const startX = Math.random() * 60 - 30;
    const startY = -50 - Math.random() * 30;
    const rotation = Math.random() * 720 - 360;
    const delay = index * 0.05;

    die.style.setProperty('--start-x', `${startX}px`);
    die.style.setProperty('--start-y', `${startY}px`);
    die.style.setProperty('--rotation', `${rotation}deg`);
    die.style.setProperty('--delay', `${delay}s`);

    // Calculate final position (spread them out)
    const angle = (index / totalDice) * Math.PI * 2 + Math.random() * 0.5;
    const radius = totalDice > 1 ? 25 + Math.random() * 15 : 0;
    const finalX = Math.cos(angle) * radius;
    const finalY = Math.sin(angle) * radius * 0.5;

    die.style.setProperty('--final-x', `${finalX}px`);
    die.style.setProperty('--final-y', `${finalY}px`);

    return die;
  }

  // Roll dice
  function roll(sides) {
    const rolls = [];
    for (let i = 0; i < quantity; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    // Check for critical/fumble on d20
    const isCritical = sides === 20 && quantity === 1 && rolls[0] === 20;
    const isFumble = sides === 20 && quantity === 1 && rolls[0] === 1;

    // Get arena and result elements
    const diceArena = document.getElementById('dice-arena');
    const resultDisplay = document.getElementById('result-display');

    // Clear previous dice and hide result
    diceArena.innerHTML = '';
    resultValue.textContent = '';
    resultValue.classList.remove('critical', 'fumble', 'bounce', 'critical-glow', 'fumble-shake', 'visible');
    resultBreakdown.textContent = '';
    resultDisplay.classList.add('active', 'rolling');

    // Play rolling sound
    playSound('roll');

    // Create visual dice
    rolls.forEach((value, i) => {
      const die = createDie(sides, value, i, quantity);
      diceArena.appendChild(die);
    });

    // Animate dice tumbling
    requestAnimationFrame(() => {
      diceArena.classList.add('tumbling');
    });

    // Rolling duration
    const rollDuration = 800 + quantity * 50;

    // After rolling, show the dice settling
    setTimeout(() => {
      diceArena.classList.remove('tumbling');
      diceArena.classList.add('settled');
      playSound('land');

      // Show values on dice
      const dice = diceArena.querySelectorAll('.rolling-die');
      dice.forEach(die => {
        die.classList.add('show-value');
      });
    }, rollDuration);

    // After dice settle, show total
    setTimeout(() => {
      // Fade out dice
      diceArena.classList.add('fading');

      setTimeout(() => {
        diceArena.classList.remove('tumbling', 'settled', 'fading');
        diceArena.innerHTML = '';
        resultDisplay.classList.remove('rolling');

        // Show final result
        resultValue.textContent = total;
        resultValue.classList.add('visible', 'bounce');

        if (isCritical) {
          resultValue.classList.add('critical', 'critical-glow');
          playSound('critical');
        } else if (isFumble) {
          resultValue.classList.add('fumble', 'fumble-shake');
          playSound('fumble');
        }

        // Show breakdown
        let breakdown = '';
        if (quantity > 1) {
          breakdown = `[${rolls.join(' + ')}]`;
          if (modifier !== 0) {
            breakdown += ` ${modifier >= 0 ? '+' : ''}${modifier}`;
          }
        } else if (modifier !== 0) {
          breakdown = `${rolls[0]} ${modifier >= 0 ? '+' : ''}${modifier}`;
        }

        if (isCritical) breakdown += ' 🎯 Critical!';
        if (isFumble) breakdown += ' 💀 Fumble!';

        resultBreakdown.textContent = breakdown;
        resultBreakdown.classList.add('fade-in');
        setTimeout(() => resultBreakdown.classList.remove('fade-in'), 300);

        // Add to history
        addToHistory(sides, rolls, modifier, total, isCritical, isFumble);

        // Haptic feedback
        if (navigator.vibrate) {
          if (isCritical) {
            navigator.vibrate([50, 30, 50, 30, 50]);
          } else if (isFumble) {
            navigator.vibrate([100, 50, 100]);
          } else {
            navigator.vibrate(30);
          }
        }

        setTimeout(() => {
          resultDisplay.classList.remove('active');
          resultValue.classList.remove('bounce');
        }, 500);
      }, 300);
    }, rollDuration + 600);
  }

  // Add to history
  function addToHistory(sides, rolls, mod, total, isCritical, isFumble) {
    const rollDesc = quantity > 1 ? `${quantity}d${sides}` : `d${sides}`;
    const modDesc = mod !== 0 ? (mod > 0 ? `+${mod}` : mod.toString()) : '';

    history.unshift({
      roll: rollDesc + modDesc,
      result: total,
      isCritical,
      isFumble
    });

    if (history.length > MAX_HISTORY) {
      history.pop();
    }

    saveHistory();
    renderHistory();
  }

  // Render history
  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 13px;">No rolls yet</p>';
      return;
    }

    historyList.innerHTML = history.map(h => {
      let className = 'history-result';
      if (h.isCritical) className += ' critical';
      if (h.isFumble) className += ' fumble';

      return `
        <div class="history-item">
          <span class="history-roll">${h.roll}</span>
          <span class="${className}">${h.result}${h.isCritical ? ' 🎯' : ''}${h.isFumble ? ' 💀' : ''}</span>
        </div>
      `;
    }).join('');
  }

  // Save/load history
  function saveHistory() {
    localStorage.setItem('dice-history', JSON.stringify(history));
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem('dice-history');
      if (saved) history = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    renderHistory();
  }

  // Update quantity
  function updateQuantity(delta) {
    quantity = Math.max(1, Math.min(20, quantity + delta));
    quantityEl.textContent = quantity;
    quantityEl.classList.add('pop');
    setTimeout(() => quantityEl.classList.remove('pop'), 150);
    playSound('click');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // Update modifier
  function updateModifier(delta) {
    modifier = Math.max(-20, Math.min(20, modifier + delta));
    modifierEl.textContent = modifier >= 0 ? `+${modifier}` : modifier.toString();
    modifierEl.classList.add('pop');
    setTimeout(() => modifierEl.classList.remove('pop'), 150);
    playSound('click');
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // Open custom modal
  function openCustomModal() {
    customModal.classList.remove('hidden');
    customSidesInput.value = '6';
    customSidesInput.focus();
    customSidesInput.select();
  }

  // Close custom modal
  function closeCustomModal() {
    customModal.classList.add('hidden');
  }

  // Roll custom dice
  function rollCustomDice() {
    const sides = parseInt(customSidesInput.value);
    if (sides >= 2 && sides <= 1000) {
      closeCustomModal();
      roll(sides);
    }
  }

  // Clear history
  function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
    if (navigator.vibrate) navigator.vibrate(50);
  }

  // Event listeners
  diceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sides = parseInt(btn.dataset.sides);
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 200);
      roll(sides);
    });
  });

  customDiceBtn.addEventListener('click', openCustomModal);
  cancelCustomBtn.addEventListener('click', closeCustomModal);
  rollCustomBtn.addEventListener('click', rollCustomDice);

  customModal.addEventListener('click', (e) => {
    if (e.target === customModal) closeCustomModal();
  });

  customSidesInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') rollCustomDice();
  });

  qtyMinus.addEventListener('click', () => updateQuantity(-1));
  qtyPlus.addEventListener('click', () => updateQuantity(1));
  modMinus.addEventListener('click', () => updateModifier(-1));
  modPlus.addEventListener('click', () => updateModifier(1));

  clearHistoryBtn.addEventListener('click', clearHistory);

  // Shake to roll (device motion)
  let lastShake = 0;
  window.addEventListener('devicemotion', (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const force = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
    const now = Date.now();

    if (force > 30 && now - lastShake > 500) {
      lastShake = now;
      roll(20); // Shake rolls a d20
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === '4') roll(4);
    else if (key === '6') roll(6);
    else if (key === '8') roll(8);
    else if (key === '0' || key === '1' && e.shiftKey) roll(10);
    else if (key === '2' && !e.shiftKey) roll(12);
    else if (key === '2' && e.shiftKey) roll(20);
    else if (key === '%') roll(100);
    else if (key === ' ') {
      e.preventDefault();
      roll(20);
    }
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  // Initialize
  loadHistory();
})();
