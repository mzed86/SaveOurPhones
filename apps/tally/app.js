(function() {
  'use strict';
  const countEl = document.getElementById('count');
  const labelEl = document.getElementById('label');
  const display = document.querySelector('.counter-display');
  const plusBtn = document.getElementById('plusBtn');
  const minusBtn = document.getElementById('minusBtn');
  const resetBtn = document.getElementById('resetBtn');
  const countersList = document.getElementById('countersList');
  const addCounterBtn = document.getElementById('addCounter');

  let counters = [{ id: 'default', name: 'Counter', value: 0 }];
  let activeId = 'default';

  function load() {
    const saved = localStorage.getItem('tallyCounters');
    if (saved) {
      const data = JSON.parse(saved);
      counters = data.counters || counters;
      activeId = data.activeId || 'default';
    }
    render();
  }

  function save() {
    localStorage.setItem('tallyCounters', JSON.stringify({ counters, activeId }));
  }

  function getActive() {
    return counters.find(c => c.id === activeId) || counters[0];
  }

  function bump() {
    countEl.classList.add('bump');
    setTimeout(() => countEl.classList.remove('bump'), 100);
    if ('vibrate' in navigator) navigator.vibrate(10);
  }

  function increment() {
    getActive().value++;
    bump();
    render();
    save();
  }

  function decrement() {
    const c = getActive();
    if (c.value > 0) { c.value--; bump(); render(); save(); }
  }

  function reset() {
    if (confirm('Reset counter to 0?')) {
      getActive().value = 0;
      render();
      save();
    }
  }

  function setActive(id) {
    activeId = id;
    render();
    save();
  }

  function addCounter() {
    const name = prompt('Counter name:', `Counter ${counters.length + 1}`);
    if (name) {
      const id = Date.now().toString();
      counters.push({ id, name, value: 0 });
      activeId = id;
      render();
      save();
    }
  }

  function deleteCounter(id) {
    if (counters.length === 1) return alert('Need at least one counter');
    if (confirm('Delete this counter?')) {
      counters = counters.filter(c => c.id !== id);
      if (activeId === id) activeId = counters[0].id;
      render();
      save();
    }
  }

  function render() {
    const active = getActive();
    countEl.textContent = active.value;
    labelEl.textContent = counters.length > 1 ? active.name : 'Tap anywhere to count';

    if (counters.length > 1) {
      countersList.innerHTML = counters.map(c => `
        <div class="counter-item ${c.id === activeId ? 'active' : ''}" data-id="${c.id}">
          <span class="counter-item-name">${c.name}</span>
          <span class="counter-item-value">${c.value}</span>
          <button class="counter-item-delete" data-delete="${c.id}">×</button>
        </div>
      `).join('');
    } else {
      countersList.innerHTML = '';
    }
  }

  display.addEventListener('click', increment);
  plusBtn.addEventListener('click', e => { e.stopPropagation(); increment(); });
  minusBtn.addEventListener('click', e => { e.stopPropagation(); decrement(); });
  resetBtn.addEventListener('click', e => { e.stopPropagation(); reset(); });
  addCounterBtn.addEventListener('click', addCounter);
  countersList.addEventListener('click', e => {
    const del = e.target.closest('[data-delete]');
    if (del) { e.stopPropagation(); deleteCounter(del.dataset.delete); return; }
    const item = e.target.closest('.counter-item');
    if (item) setActive(item.dataset.id);
  });

  load();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
