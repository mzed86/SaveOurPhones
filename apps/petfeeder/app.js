(function() {
  'use strict';

  // Pet icons
  const PET_ICONS = {
    dog: '🐕',
    cat: '🐈',
    bird: '🐦',
    fish: '🐟',
    rabbit: '🐰',
    other: '🐾'
  };

  // State
  let pets = [];
  let editingPetId = null;
  let viewingPetId = null;

  // DOM elements
  const petsList = document.getElementById('pets-list');
  const emptyState = document.getElementById('empty-state');
  const addPetBtn = document.getElementById('add-pet-btn');
  const addFirstPet = document.getElementById('add-first-pet');

  const petModal = document.getElementById('pet-modal');
  const modalTitle = document.getElementById('modal-title');
  const petNameInput = document.getElementById('pet-name');
  const petTypeButtons = document.querySelectorAll('.pet-type');
  const feedTimesSelect = document.getElementById('feed-times');
  const cancelBtn = document.getElementById('cancel-btn');
  const savePetBtn = document.getElementById('save-pet-btn');

  const historyModal = document.getElementById('history-modal');
  const historyTitle = document.getElementById('history-title');
  const historyList = document.getElementById('history-list');
  const closeHistoryBtn = document.getElementById('close-history');

  const toast = document.getElementById('toast');

  // Load pets from storage
  function loadPets() {
    try {
      const saved = localStorage.getItem('petfeeder-pets');
      if (saved) {
        pets = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load pets:', e);
    }
    renderPets();
  }

  // Save pets to storage
  function savePets() {
    localStorage.setItem('petfeeder-pets', JSON.stringify(pets));
  }

  // Render pets list
  function renderPets() {
    if (pets.length === 0) {
      petsList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    petsList.innerHTML = pets.map(pet => {
      const fedToday = getFeedingsToday(pet);
      const feedingsNeeded = pet.feedTimes;
      const progress = Math.min((fedToday / feedingsNeeded) * 100, 100);
      const lastFed = getLastFedTime(pet);
      const isFed = fedToday >= feedingsNeeded;

      return `
        <div class="pet-card" data-id="${pet.id}">
          <div class="pet-header">
            <div class="pet-icon">${PET_ICONS[pet.type] || PET_ICONS.other}</div>
            <div class="pet-info">
              <h3 class="pet-name">${escapeHtml(pet.name)}</h3>
              <div class="pet-schedule">${feedingsNeeded}x daily</div>
            </div>
            <div class="pet-actions">
              <button class="small-btn history-btn" data-id="${pet.id}" aria-label="History">📋</button>
              <button class="small-btn edit-btn" data-id="${pet.id}" aria-label="Edit">✏️</button>
              <button class="small-btn delete-btn" data-id="${pet.id}" aria-label="Delete">🗑️</button>
            </div>
          </div>

          <div class="feed-status">
            <div class="status-row">
              <span class="status-label">Last fed</span>
              <span class="status-value ${lastFed ? 'fed' : 'hungry'}">${lastFed || 'Not yet today'}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${progress < 50 ? 'warning' : ''}" style="width: ${progress}%"></div>
            </div>
            <div class="status-row" style="margin-top: 8px;">
              <span class="status-label">Today's feedings</span>
              <span class="status-value">${fedToday} / ${feedingsNeeded}</span>
            </div>
          </div>

          <button class="feed-btn ${isFed ? 'fed' : ''}" data-id="${pet.id}">
            ${isFed ? '✓ Fed Today' : '🍽️ Feed Now'}
          </button>
        </div>
      `;
    }).join('');

    // Add event listeners
    petsList.querySelectorAll('.feed-btn').forEach(btn => {
      btn.addEventListener('click', () => feedPet(btn.dataset.id));
    });

    petsList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    petsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePet(btn.dataset.id));
    });

    petsList.querySelectorAll('.history-btn').forEach(btn => {
      btn.addEventListener('click', () => showHistory(btn.dataset.id));
    });
  }

  // Get feedings count for today
  function getFeedingsToday(pet) {
    const today = new Date().toDateString();
    return (pet.feedings || []).filter(f => new Date(f).toDateString() === today).length;
  }

  // Get last fed time
  function getLastFedTime(pet) {
    const today = new Date().toDateString();
    const todayFeedings = (pet.feedings || [])
      .filter(f => new Date(f).toDateString() === today)
      .sort((a, b) => new Date(b) - new Date(a));

    if (todayFeedings.length === 0) return null;

    const lastFed = new Date(todayFeedings[0]);
    return lastFed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Feed a pet
  function feedPet(id) {
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    if (!pet.feedings) pet.feedings = [];
    pet.feedings.push(new Date().toISOString());

    // Keep only last 30 days of feedings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    pet.feedings = pet.feedings.filter(f => new Date(f) > thirtyDaysAgo);

    savePets();
    renderPets();
    showToast(`${pet.name} has been fed! 🍽️`);

    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  }

  // Open add/edit modal
  function openAddModal() {
    editingPetId = null;
    modalTitle.textContent = 'Add Pet';
    petNameInput.value = '';
    feedTimesSelect.value = '2';

    petTypeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === 'dog');
    });

    petModal.classList.remove('hidden');
    petNameInput.focus();
  }

  function openEditModal(id) {
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    editingPetId = id;
    modalTitle.textContent = 'Edit Pet';
    petNameInput.value = pet.name;
    feedTimesSelect.value = pet.feedTimes;

    petTypeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === pet.type);
    });

    petModal.classList.remove('hidden');
    petNameInput.focus();
  }

  function closeModal() {
    petModal.classList.add('hidden');
    editingPetId = null;
  }

  // Save pet
  function savePet() {
    const name = petNameInput.value.trim();
    if (!name) {
      showToast('Please enter a name');
      return;
    }

    const type = document.querySelector('.pet-type.active').dataset.type;
    const feedTimes = parseInt(feedTimesSelect.value);

    if (editingPetId) {
      const pet = pets.find(p => p.id === editingPetId);
      if (pet) {
        pet.name = name;
        pet.type = type;
        pet.feedTimes = feedTimes;
      }
    } else {
      pets.push({
        id: Date.now().toString(),
        name,
        type,
        feedTimes,
        feedings: []
      });
    }

    savePets();
    renderPets();
    closeModal();
    showToast(editingPetId ? 'Pet updated!' : 'Pet added!');
  }

  // Delete pet
  function deletePet(id) {
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    if (confirm(`Delete ${pet.name}?`)) {
      pets = pets.filter(p => p.id !== id);
      savePets();
      renderPets();
      showToast('Pet deleted');
    }
  }

  // Show feeding history
  function showHistory(id) {
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    viewingPetId = id;
    historyTitle.textContent = `${pet.name}'s History`;

    const feedings = (pet.feedings || [])
      .sort((a, b) => new Date(b) - new Date(a))
      .slice(0, 20);

    if (feedings.length === 0) {
      historyList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No feeding history</p>';
    } else {
      historyList.innerHTML = feedings.map(f => {
        const date = new Date(f);
        return `
          <div class="history-item">
            <span class="history-date">${date.toLocaleDateString()}</span>
            <span class="history-time">${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        `;
      }).join('');
    }

    historyModal.classList.remove('hidden');
  }

  function closeHistory() {
    historyModal.classList.add('hidden');
    viewingPetId = null;
  }

  // Utility functions
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
  addPetBtn.addEventListener('click', openAddModal);
  addFirstPet.addEventListener('click', openAddModal);
  cancelBtn.addEventListener('click', closeModal);
  savePetBtn.addEventListener('click', savePet);
  closeHistoryBtn.addEventListener('click', closeHistory);

  petTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      petTypeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Close modals on backdrop click
  petModal.addEventListener('click', (e) => {
    if (e.target === petModal) closeModal();
  });

  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeHistory();
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  // Update display periodically (for "time since fed")
  setInterval(renderPets, 60000);

  // Initialize
  loadPets();
})();
