(function() {
  'use strict';
  const habitsList = document.getElementById('habitsList');
  const addHabitBtn = document.getElementById('addHabit');
  const addModal = document.getElementById('addModal');
  const habitNameInput = document.getElementById('habitName');
  const iconPicker = document.getElementById('iconPicker');
  const cancelAdd = document.getElementById('cancelAdd');
  const confirmAdd = document.getElementById('confirmAdd');
  const currentDateEl = document.getElementById('currentDate');
  const prevDayBtn = document.getElementById('prevDay');
  const nextDayBtn = document.getElementById('nextDay');
  const totalChecked = document.getElementById('totalChecked');
  const currentStreak = document.getElementById('currentStreak');

  let habits = [];
  let selectedIcon = '✓';
  let currentDate = new Date();

  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  function formatDisplayDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDate(date) === formatDate(today)) return 'Today';
    if (formatDate(date) === formatDate(yesterday)) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function loadHabits() {
    const saved = localStorage.getItem('habitsData');
    if (saved) habits = JSON.parse(saved);
    render();
  }

  function saveHabits() {
    localStorage.setItem('habitsData', JSON.stringify(habits));
  }

  function isChecked(habit, date) {
    return habit.completions && habit.completions.includes(formatDate(date));
  }

  function toggleCheck(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    if (!habit.completions) habit.completions = [];
    const dateStr = formatDate(currentDate);
    const idx = habit.completions.indexOf(dateStr);
    if (idx >= 0) {
      habit.completions.splice(idx, 1);
    } else {
      habit.completions.push(dateStr);
    }
    saveHabits();
    render();
    if ('vibrate' in navigator) navigator.vibrate(20);
  }

  function getStreak(habit) {
    if (!habit.completions || habit.completions.length === 0) return 0;
    const sorted = [...habit.completions].sort().reverse();
    let streak = 0;
    let checkDate = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = formatDate(checkDate);
      if (sorted.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function deleteHabit(id) {
    if (confirm('Delete this habit?')) {
      habits = habits.filter(h => h.id !== id);
      saveHabits();
      render();
    }
  }

  function render() {
    currentDateEl.textContent = formatDisplayDate(currentDate);
    const today = formatDate(new Date());
    nextDayBtn.disabled = formatDate(currentDate) >= today;
    nextDayBtn.style.opacity = nextDayBtn.disabled ? 0.3 : 1;

    if (habits.length === 0) {
      habitsList.innerHTML = '<div class="empty-state"><p>No habits yet</p><p style="font-size:0.875rem;margin-top:8px">Tap + to add one</p></div>';
      totalChecked.textContent = 0;
      currentStreak.textContent = 0;
      return;
    }

    let checkedToday = 0;
    let maxStreak = 0;
    habitsList.innerHTML = habits.map(h => {
      const checked = isChecked(h, currentDate);
      if (checked) checkedToday++;
      const streak = getStreak(h);
      if (streak > maxStreak) maxStreak = streak;
      return `
        <div class="habit-card">
          <button class="habit-check ${checked ? 'checked' : ''}" data-id="${h.id}">${h.icon}</button>
          <div class="habit-info">
            <div class="habit-name">${h.name}</div>
            <div class="habit-streak">${streak} day streak</div>
          </div>
          <button class="habit-delete" data-delete="${h.id}">×</button>
        </div>
      `;
    }).join('');

    totalChecked.textContent = checkedToday;
    currentStreak.textContent = maxStreak;
  }

  habitsList.addEventListener('click', e => {
    const checkBtn = e.target.closest('.habit-check');
    if (checkBtn) toggleCheck(checkBtn.dataset.id);
    const delBtn = e.target.closest('[data-delete]');
    if (delBtn) deleteHabit(delBtn.dataset.delete);
  });

  addHabitBtn.addEventListener('click', () => { addModal.hidden = false; habitNameInput.focus(); });
  addModal.querySelector('.modal-backdrop').addEventListener('click', () => { addModal.hidden = true; });
  cancelAdd.addEventListener('click', () => { addModal.hidden = true; });

  iconPicker.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    selectedIcon = btn.dataset.icon;
    iconPicker.querySelectorAll('.icon-btn').forEach(b => b.classList.toggle('active', b === btn));
  });

  confirmAdd.addEventListener('click', () => {
    const name = habitNameInput.value.trim();
    if (!name) return;
    habits.push({ id: Date.now().toString(), name, icon: selectedIcon, completions: [] });
    saveHabits();
    render();
    addModal.hidden = true;
    habitNameInput.value = '';
    selectedIcon = '✓';
    iconPicker.querySelectorAll('.icon-btn').forEach(b => b.classList.toggle('active', b.dataset.icon === '✓'));
  });

  prevDayBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 1); render(); });
  nextDayBtn.addEventListener('click', () => {
    const today = formatDate(new Date());
    if (formatDate(currentDate) < today) { currentDate.setDate(currentDate.getDate() + 1); render(); }
  });

  loadHabits();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
