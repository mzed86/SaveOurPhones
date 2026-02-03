(function() {
  'use strict';

  // Time slot labels
  const TIME_LABELS = {
    morning: '🌅 Morning',
    afternoon: '☀️ Afternoon',
    evening: '🌆 Evening',
    night: '🌙 Night'
  };

  const TIME_ORDER = ['morning', 'afternoon', 'evening', 'night'];

  // State
  let medications = [];
  let takenLog = {}; // { 'YYYY-MM-DD': { medId: [timeSlot, ...] } }
  let currentDate = new Date();
  let editingMedId = null;

  // DOM elements
  const medsList = document.getElementById('meds-list');
  const emptyState = document.getElementById('empty-state');
  const summary = document.getElementById('summary');
  const addMedBtn = document.getElementById('add-med-btn');
  const addFirstMed = document.getElementById('add-first-med');

  const currentDateEl = document.getElementById('current-date');
  const prevDayBtn = document.getElementById('prev-day');
  const nextDayBtn = document.getElementById('next-day');

  const medModal = document.getElementById('med-modal');
  const modalTitle = document.getElementById('modal-title');
  const medNameInput = document.getElementById('med-name');
  const medDosageInput = document.getElementById('med-dosage');
  const medNotesInput = document.getElementById('med-notes');
  const timeSlotCheckboxes = document.querySelectorAll('.time-slot input');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveMedBtn = document.getElementById('save-med-btn');

  const takenCountEl = document.getElementById('taken-count');
  const remainingCountEl = document.getElementById('remaining-count');
  const streakCountEl = document.getElementById('streak-count');

  const toast = document.getElementById('toast');

  // Date helpers
  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  function isToday(date) {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  }

  function isFuture(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
  }

  function formatDisplayDate(date) {
    if (isToday(date)) return 'Today';

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDate(date) === formatDate(yesterday)) return 'Yesterday';

    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  // Load data
  function loadData() {
    try {
      const savedMeds = localStorage.getItem('meds-list');
      if (savedMeds) medications = JSON.parse(savedMeds);

      const savedLog = localStorage.getItem('meds-log');
      if (savedLog) takenLog = JSON.parse(savedLog);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    render();
  }

  // Save data
  function saveData() {
    localStorage.setItem('meds-list', JSON.stringify(medications));
    localStorage.setItem('meds-log', JSON.stringify(takenLog));
  }

  // Render medications
  function render() {
    updateDateDisplay();

    if (medications.length === 0) {
      medsList.innerHTML = '';
      emptyState.style.display = 'block';
      summary.classList.add('hidden');
      return;
    }

    emptyState.style.display = 'none';
    summary.classList.remove('hidden');

    const dateKey = formatDate(currentDate);
    const dayLog = takenLog[dateKey] || {};

    // Group meds by time slot
    const groups = {};
    TIME_ORDER.forEach(time => groups[time] = []);

    medications.forEach(med => {
      med.schedule.forEach(time => {
        groups[time].push({
          ...med,
          timeSlot: time,
          taken: dayLog[med.id]?.includes(time) || false
        });
      });
    });

    let html = '';
    let takenCount = 0;
    let totalCount = 0;

    TIME_ORDER.forEach(time => {
      if (groups[time].length === 0) return;

      html += `<div class="time-group">
        <div class="time-group-header">${TIME_LABELS[time]}</div>`;

      groups[time].forEach(med => {
        totalCount++;
        if (med.taken) takenCount++;

        html += `
          <div class="med-card ${med.taken ? 'taken' : ''}" data-id="${med.id}" data-time="${med.timeSlot}">
            <button class="med-check ${med.taken ? 'checked' : ''}"
                    data-id="${med.id}"
                    data-time="${med.timeSlot}"
                    aria-label="${med.taken ? 'Mark as not taken' : 'Mark as taken'}">
            </button>
            <div class="med-info">
              <div class="med-name">${escapeHtml(med.name)}</div>
              <div class="med-dosage">${escapeHtml(med.dosage)}</div>
              ${med.notes ? `<div class="med-notes">${escapeHtml(med.notes)}</div>` : ''}
            </div>
            <div class="med-actions">
              <button class="small-btn edit-btn" data-id="${med.id}">✏️</button>
              <button class="small-btn delete-btn" data-id="${med.id}">🗑️</button>
            </div>
          </div>
        `;
      });

      html += '</div>';
    });

    medsList.innerHTML = html;

    // Update summary
    takenCountEl.textContent = takenCount;
    remainingCountEl.textContent = totalCount - takenCount;
    streakCountEl.textContent = calculateStreak();

    // Add event listeners
    medsList.querySelectorAll('.med-check').forEach(btn => {
      btn.addEventListener('click', () => toggleTaken(btn.dataset.id, btn.dataset.time));
    });

    medsList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(btn.dataset.id);
      });
    });

    medsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteMed(btn.dataset.id);
      });
    });
  }

  // Update date display
  function updateDateDisplay() {
    currentDateEl.textContent = formatDisplayDate(currentDate);
    nextDayBtn.disabled = isToday(currentDate) || isFuture(currentDate);
  }

  // Toggle medication taken status
  function toggleTaken(medId, timeSlot) {
    if (isFuture(currentDate)) {
      showToast("Can't log future dates");
      return;
    }

    const dateKey = formatDate(currentDate);
    if (!takenLog[dateKey]) takenLog[dateKey] = {};
    if (!takenLog[dateKey][medId]) takenLog[dateKey][medId] = [];

    const idx = takenLog[dateKey][medId].indexOf(timeSlot);
    if (idx === -1) {
      takenLog[dateKey][medId].push(timeSlot);
      if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    } else {
      takenLog[dateKey][medId].splice(idx, 1);
    }

    saveData();
    render();
  }

  // Calculate streak
  function calculateStreak() {
    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    while (true) {
      const dateKey = formatDate(checkDate);
      const dayLog = takenLog[dateKey] || {};

      // Check if all meds were taken
      let allTaken = true;
      let hasMeds = false;

      medications.forEach(med => {
        med.schedule.forEach(time => {
          hasMeds = true;
          if (!dayLog[med.id]?.includes(time)) {
            allTaken = false;
          }
        });
      });

      if (!hasMeds || !allTaken) {
        // Don't break streak if today isn't complete yet
        if (formatDate(checkDate) === formatDate(today)) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }

      streak++;
      checkDate.setDate(checkDate.getDate() - 1);

      // Safety limit
      if (streak > 365) break;
    }

    return streak;
  }

  // Open add modal
  function openAddModal() {
    editingMedId = null;
    modalTitle.textContent = 'Add Medication';
    medNameInput.value = '';
    medDosageInput.value = '';
    medNotesInput.value = '';

    timeSlotCheckboxes.forEach(cb => {
      cb.checked = cb.value === 'morning';
    });

    medModal.classList.remove('hidden');
    medNameInput.focus();
  }

  // Open edit modal
  function openEditModal(id) {
    const med = medications.find(m => m.id === id);
    if (!med) return;

    editingMedId = id;
    modalTitle.textContent = 'Edit Medication';
    medNameInput.value = med.name;
    medDosageInput.value = med.dosage;
    medNotesInput.value = med.notes || '';

    timeSlotCheckboxes.forEach(cb => {
      cb.checked = med.schedule.includes(cb.value);
    });

    medModal.classList.remove('hidden');
    medNameInput.focus();
  }

  // Close modal
  function closeModal() {
    medModal.classList.add('hidden');
    editingMedId = null;
  }

  // Save medication
  function saveMed() {
    const name = medNameInput.value.trim();
    const dosage = medDosageInput.value.trim();
    const notes = medNotesInput.value.trim();

    if (!name) {
      showToast('Please enter medication name');
      return;
    }

    if (!dosage) {
      showToast('Please enter dosage');
      return;
    }

    const schedule = [];
    timeSlotCheckboxes.forEach(cb => {
      if (cb.checked) schedule.push(cb.value);
    });

    if (schedule.length === 0) {
      showToast('Please select at least one time');
      return;
    }

    if (editingMedId) {
      const med = medications.find(m => m.id === editingMedId);
      if (med) {
        med.name = name;
        med.dosage = dosage;
        med.notes = notes;
        med.schedule = schedule;
      }
    } else {
      medications.push({
        id: Date.now().toString(),
        name,
        dosage,
        notes,
        schedule
      });
    }

    saveData();
    render();
    closeModal();
    showToast(editingMedId ? 'Medication updated' : 'Medication added');
  }

  // Delete medication
  function deleteMed(id) {
    const med = medications.find(m => m.id === id);
    if (!med) return;

    if (confirm(`Delete ${med.name}?`)) {
      medications = medications.filter(m => m.id !== id);
      saveData();
      render();
      showToast('Medication deleted');
    }
  }

  // Navigate dates
  function prevDay() {
    currentDate.setDate(currentDate.getDate() - 1);
    render();
  }

  function nextDay() {
    if (!isToday(currentDate) && !isFuture(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      render();
    }
  }

  // Utilities
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 200);
    }, 2000);
  }

  // Event listeners
  addMedBtn.addEventListener('click', openAddModal);
  addFirstMed.addEventListener('click', openAddModal);
  cancelBtn.addEventListener('click', closeModal);
  saveMedBtn.addEventListener('click', saveMed);
  prevDayBtn.addEventListener('click', prevDay);
  nextDayBtn.addEventListener('click', nextDay);

  medModal.addEventListener('click', (e) => {
    if (e.target === medModal) closeModal();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  // Initialize
  loadData();
})();
