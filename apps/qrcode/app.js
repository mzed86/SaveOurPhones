(function() {
  'use strict';

  // DOM elements
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const generateBtn = document.getElementById('generate-btn');
  const qrContainer = document.getElementById('qr-container');
  const qrCanvas = document.getElementById('qr-canvas');
  const saveBtn = document.getElementById('save-btn');
  const copyBtn = document.getElementById('copy-btn');
  const savedList = document.getElementById('saved-list');
  const toast = document.getElementById('toast');

  // Input elements
  const textInput = document.getElementById('text-input');
  const urlInput = document.getElementById('url-input');
  const wifiSsid = document.getElementById('wifi-ssid');
  const wifiPassword = document.getElementById('wifi-password');
  const wifiSecurity = document.getElementById('wifi-security');
  const wifiHidden = document.getElementById('wifi-hidden');
  const contactName = document.getElementById('contact-name');
  const contactPhone = document.getElementById('contact-phone');
  const contactEmail = document.getElementById('contact-email');
  const togglePassword = document.getElementById('toggle-password');

  let currentTab = 'text';
  let currentData = '';
  let savedCodes = [];

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    currentTab = tabId;

    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    tabContents.forEach(c => {
      c.classList.toggle('active', c.id === tabId + '-tab');
    });

    qrContainer.classList.add('hidden');
  }

  // Password visibility toggle
  togglePassword.addEventListener('click', () => {
    const type = wifiPassword.type === 'password' ? 'text' : 'password';
    wifiPassword.type = type;
    togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
  });

  // Generate QR code
  generateBtn.addEventListener('click', () => {
    const data = getData();
    if (!data) {
      showToast('Please enter some data');
      return;
    }

    try {
      currentData = data;
      const matrix = QRCode.create(data, 'M');
      QRCode.render(qrCanvas, matrix, {
        moduleSize: 6,
        margin: 2
      });
      qrContainer.classList.remove('hidden');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (e) {
      showToast('Error generating QR code');
      console.error(e);
    }
  });

  // Get data based on current tab
  function getData() {
    switch (currentTab) {
      case 'text':
        return textInput.value.trim();

      case 'url':
        let url = urlInput.value.trim();
        if (url && !url.match(/^https?:\/\//)) {
          url = 'https://' + url;
        }
        return url;

      case 'wifi':
        const ssid = wifiSsid.value.trim();
        if (!ssid) return '';

        const security = wifiSecurity.value;
        const password = wifiPassword.value;
        const hidden = wifiHidden.checked ? 'H:true;' : '';

        if (security === 'nopass') {
          return `WIFI:T:nopass;S:${escapeWifi(ssid)};${hidden};`;
        }
        return `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};${hidden};`;

      case 'contact':
        const name = contactName.value.trim();
        const phone = contactPhone.value.trim();
        const email = contactEmail.value.trim();

        if (!name && !phone && !email) return '';

        // vCard format
        let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
        if (name) vcard += `FN:${name}\n`;
        if (phone) vcard += `TEL:${phone}\n`;
        if (email) vcard += `EMAIL:${email}\n`;
        vcard += 'END:VCARD';
        return vcard;

      default:
        return '';
    }
  }

  // Escape special characters for WiFi QR codes
  function escapeWifi(str) {
    return str.replace(/([\\;,:"'])/g, '\\$1');
  }

  // Save QR code
  saveBtn.addEventListener('click', () => {
    if (!currentData) return;

    const savedCode = {
      id: Date.now(),
      type: currentTab,
      data: currentData,
      label: getLabel(),
      created: new Date().toISOString()
    };

    savedCodes.unshift(savedCode);
    if (savedCodes.length > 10) savedCodes.pop();

    saveCodes();
    renderSavedCodes();
    showToast('QR code saved');
  });

  // Get a label for the saved code
  function getLabel() {
    switch (currentTab) {
      case 'text':
        return textInput.value.substring(0, 30) + (textInput.value.length > 30 ? '...' : '');
      case 'url':
        return urlInput.value.substring(0, 30);
      case 'wifi':
        return `WiFi: ${wifiSsid.value}`;
      case 'contact':
        return contactName.value || contactPhone.value || contactEmail.value;
      default:
        return 'QR Code';
    }
  }

  // Copy QR code as image (or data URL)
  copyBtn.addEventListener('click', async () => {
    try {
      // Try to copy as image to clipboard
      const blob = await new Promise(resolve => qrCanvas.toBlob(resolve, 'image/png'));

      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('QR code copied to clipboard');
      } else {
        // Fallback: copy the data string
        await navigator.clipboard.writeText(currentData);
        showToast('Data copied to clipboard');
      }

      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      // Final fallback
      try {
        await navigator.clipboard.writeText(currentData);
        showToast('Data copied to clipboard');
      } catch (e2) {
        showToast('Could not copy');
      }
    }
  });

  // Render saved codes
  function renderSavedCodes() {
    if (savedCodes.length === 0) {
      savedList.innerHTML = '<p class="empty">No saved codes</p>';
      return;
    }

    savedList.innerHTML = savedCodes.map(code => `
      <div class="saved-item" data-id="${code.id}">
        <span class="saved-type">${getTypeIcon(code.type)}</span>
        <span class="saved-label">${escapeHtml(code.label)}</span>
        <button class="delete-btn" data-id="${code.id}">×</button>
      </div>
    `).join('');

    // Add click handlers
    savedList.querySelectorAll('.saved-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) return;
        const id = parseInt(item.dataset.id);
        loadSavedCode(id);
      });
    });

    savedList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        deleteSavedCode(id);
      });
    });
  }

  function getTypeIcon(type) {
    const icons = {
      text: '📝',
      url: '🔗',
      wifi: '📶',
      contact: '👤'
    };
    return icons[type] || '📱';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Load a saved code
  function loadSavedCode(id) {
    const code = savedCodes.find(c => c.id === id);
    if (!code) return;

    currentData = code.data;

    try {
      const matrix = QRCode.create(code.data, 'M');
      QRCode.render(qrCanvas, matrix, {
        moduleSize: 6,
        margin: 2
      });
      qrContainer.classList.remove('hidden');
    } catch (e) {
      showToast('Error loading QR code');
    }
  }

  // Delete a saved code
  function deleteSavedCode(id) {
    savedCodes = savedCodes.filter(c => c.id !== id);
    saveCodes();
    renderSavedCodes();
    showToast('Deleted');
  }

  // Save codes to localStorage
  function saveCodes() {
    localStorage.setItem('qrcode-saved', JSON.stringify(savedCodes));
  }

  // Load codes from localStorage
  function loadCodes() {
    try {
      const saved = localStorage.getItem('qrcode-saved');
      if (saved) {
        savedCodes = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved codes:', e);
    }
    renderSavedCodes();
  }

  // Toast notification
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 200);
    }, 2000);
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.error('Service worker registration failed:', err);
    });
  }

  // Initialize
  loadCodes();
})();
