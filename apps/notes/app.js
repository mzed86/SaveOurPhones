// Notes App
(function() {
  'use strict';

  // DOM Elements
  const listView = document.getElementById('listView');
  const editorView = document.getElementById('editorView');
  const notesList = document.getElementById('notesList');
  const searchInput = document.getElementById('searchInput');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const backBtn = document.getElementById('backBtn');
  const deleteNoteBtn = document.getElementById('deleteNoteBtn');
  const noteTitle = document.getElementById('noteTitle');
  const noteBody = document.getElementById('noteBody');
  const noteDate = document.getElementById('noteDate');
  const noteChars = document.getElementById('noteChars');

  // State
  let notes = [];
  let currentNoteId = null;
  let saveTimeout = null;

  // Load notes from localStorage
  function loadNotes() {
    const saved = localStorage.getItem('simpleNotes');
    if (saved) {
      notes = JSON.parse(saved);
    }
    renderNotesList();
  }

  // Save notes to localStorage
  function saveNotes() {
    localStorage.setItem('simpleNotes', JSON.stringify(notes));
  }

  // Generate unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Format date
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
      return 'Yesterday';
    }

    // This year
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Older
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Get preview text
  function getPreview(body) {
    if (!body) return 'No additional text';
    const preview = body.trim().replace(/\n/g, ' ').substring(0, 100);
    return preview || 'No additional text';
  }

  // Filter notes by search query
  function filterNotes(query) {
    if (!query) return notes;

    const q = query.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(q) ||
      note.body.toLowerCase().includes(q)
    );
  }

  // Render notes list
  function renderNotesList(query = '') {
    const filteredNotes = filterNotes(query);

    if (filteredNotes.length === 0) {
      if (query) {
        notesList.innerHTML = `
          <div class="empty-state">
            <p>No notes found</p>
          </div>
        `;
      } else {
        notesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <p>No notes yet</p>
            <p style="font-size: 0.875rem; color: var(--text-muted)">Tap + to create one</p>
          </div>
        `;
      }
      return;
    }

    // Sort by updated date (newest first)
    const sorted = [...filteredNotes].sort((a, b) => b.updated - a.updated);

    notesList.innerHTML = sorted.map(note => `
      <div class="note-card" data-id="${note.id}">
        <div class="note-card-title">${note.title || 'Untitled'}</div>
        <div class="note-card-preview">${getPreview(note.body)}</div>
        <div class="note-card-date">${formatDate(note.updated)}</div>
      </div>
    `).join('');
  }

  // Show list view
  function showList() {
    saveCurrentNote();
    currentNoteId = null;
    editorView.hidden = true;
    listView.hidden = false;
    renderNotesList(searchInput.value);
  }

  // Show editor view
  function showEditor(noteId) {
    currentNoteId = noteId;
    const note = notes.find(n => n.id === noteId);

    if (note) {
      noteTitle.value = note.title;
      noteBody.value = note.body;
      noteDate.textContent = `Modified ${formatDate(note.updated)}`;
      noteChars.textContent = `${note.body.length} characters`;
    } else {
      noteTitle.value = '';
      noteBody.value = '';
      noteDate.textContent = '';
      noteChars.textContent = '0 characters';
    }

    listView.hidden = true;
    editorView.hidden = false;
    noteTitle.focus();
  }

  // Create new note
  function createNote() {
    const note = {
      id: generateId(),
      title: '',
      body: '',
      created: Date.now(),
      updated: Date.now()
    };

    notes.push(note);
    saveNotes();
    showEditor(note.id);
  }

  // Save current note
  function saveCurrentNote() {
    if (!currentNoteId) return;

    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;

    const title = noteTitle.value.trim();
    const body = noteBody.value;

    // If note is empty, delete it
    if (!title && !body) {
      deleteNote(currentNoteId, false);
      return;
    }

    note.title = title;
    note.body = body;
    note.updated = Date.now();

    saveNotes();
  }

  // Auto-save with debounce
  function autoSave() {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(saveCurrentNote, 500);
  }

  // Delete note
  function deleteNote(noteId, confirm = true) {
    if (confirm && !window.confirm('Delete this note?')) {
      return;
    }

    notes = notes.filter(n => n.id !== noteId);
    saveNotes();

    if (currentNoteId === noteId) {
      currentNoteId = null;
      showList();
    } else {
      renderNotesList(searchInput.value);
    }
  }

  // Update character count
  function updateCharCount() {
    const count = noteBody.value.length;
    noteChars.textContent = `${count} character${count !== 1 ? 's' : ''}`;
  }

  // Event Listeners
  newNoteBtn.addEventListener('click', createNote);

  backBtn.addEventListener('click', showList);

  deleteNoteBtn.addEventListener('click', () => {
    if (currentNoteId) {
      deleteNote(currentNoteId);
    }
  });

  notesList.addEventListener('click', (e) => {
    const card = e.target.closest('.note-card');
    if (card) {
      showEditor(card.dataset.id);
    }
  });

  noteTitle.addEventListener('input', autoSave);
  noteBody.addEventListener('input', () => {
    autoSave();
    updateCharCount();
  });

  searchInput.addEventListener('input', () => {
    renderNotesList(searchInput.value);
  });

  // Handle back gesture / button on mobile
  window.addEventListener('popstate', () => {
    if (!editorView.hidden) {
      showList();
    }
  });

  // Push state when opening editor to enable back navigation
  const originalShowEditor = showEditor;
  showEditor = function(noteId) {
    history.pushState({ editor: true }, '');
    originalShowEditor(noteId);
  };

  // Initialize
  loadNotes();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
