(function() {
  'use strict';

  // State
  let quantity = 1;
  let modifier = 0;
  let history = [];
  const MAX_HISTORY = 20;

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

    // Animate result
    resultValue.classList.add('rolling');
    resultValue.classList.remove('critical', 'fumble');

    setTimeout(() => {
      resultValue.classList.remove('rolling');
      resultValue.textContent = total;

      if (isCritical) {
        resultValue.classList.add('critical');
      } else if (isFumble) {
        resultValue.classList.add('fumble');
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
    }, 200);
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
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // Update modifier
  function updateModifier(delta) {
    modifier = Math.max(-20, Math.min(20, modifier + delta));
    modifierEl.textContent = modifier >= 0 ? `+${modifier}` : modifier.toString();
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
