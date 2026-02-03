// Bus Times App - London TfL Real-time Bus Arrivals
(function() {
  'use strict';

  const CONFIG_KEY = 'busTimesConfig';
  const CACHE_KEY = 'busTimesCache';
  const REFRESH_INTERVAL = 30;
  const MAX_BUSES = 3;
  const LONG_PRESS_DURATION = 1500;

  const busList = document.getElementById('bus-list');
  const lastUpdated = document.getElementById('last-updated');
  const networkStatus = document.getElementById('network-status');
  const refreshCountdown = document.getElementById('refresh-countdown');
  const appTitle = document.getElementById('app-title');
  const settingsOverlay = document.getElementById('settings-overlay');
  const stopSearch = document.getElementById('stop-search');
  const searchBtn = document.getElementById('search-btn');
  const searchResults = document.getElementById('search-results');
  const stop1Name = document.getElementById('stop1-name');
  const stop2Name = document.getElementById('stop2-name');
  const saveSettingsBtn = document.getElementById('save-settings');
  const cancelSettingsBtn = document.getElementById('cancel-settings');

  let countdownTimer = null;
  let secondsUntilRefresh = REFRESH_INTERVAL;
  let isRefreshing = false;
  let stopInfo = [];
  let longPressTimer = null;
  let pendingStopConfig = { stop1: null, stop2: null };

  init();

  function init() {
    loadConfig();
    updateNetworkStatus();
    if (stopInfo.length === 0) {
      showSetupPrompt();
    } else {
      fetchBusTimes();
      startCountdown();
    }
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    document.getElementById('container').addEventListener('click', handleTapRefresh);
    setupLongPress();
    searchBtn.addEventListener('click', searchStops);
    stopSearch.addEventListener('keypress', e => { if (e.key === 'Enter') searchStops(); });
    saveSettingsBtn.addEventListener('click', saveSettings);
    cancelSettingsBtn.addEventListener('click', closeSettings);
    document.querySelectorAll('.clear-btn').forEach(btn => {
      btn.addEventListener('click', e => clearStop(e.target.dataset.stop));
    });
    requestWakeLock();
  }

  function loadConfig() {
    try {
      const config = localStorage.getItem(CONFIG_KEY);
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.stops && parsed.stops.length > 0) {
          stopInfo = parsed.stops;
        }
      }
    } catch (e) {}
  }

  function saveConfig() {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify({ stops: stopInfo })); } catch (e) {}
  }

  function showSetupPrompt() {
    busList.innerHTML = `<div class="setup-prompt"><h2>Welcome!</h2><p>Configure your bus stops to get started</p><button onclick="openSettings()">Set Up Stops</button></div>`;
  }

  function setupLongPress() {
    const startPress = () => { longPressTimer = setTimeout(openSettings, LONG_PRESS_DURATION); };
    const endPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
    appTitle.addEventListener('touchstart', startPress);
    appTitle.addEventListener('touchend', endPress);
    appTitle.addEventListener('touchcancel', endPress);
    appTitle.addEventListener('mousedown', startPress);
    appTitle.addEventListener('mouseup', endPress);
    appTitle.addEventListener('mouseleave', endPress);
  }

  window.openSettings = function() {
    document.body.style.overflow = 'hidden';
    pendingStopConfig = { stop1: stopInfo[0] || null, stop2: stopInfo[1] || null };
    updateSelectedStopsDisplay();
    searchResults.innerHTML = '<div class="search-result-hint">Search for stops above, then tap to select</div>';
    stopSearch.value = '';
    settingsOverlay.classList.remove('hidden');
  };

  function closeSettings() {
    settingsOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function updateSelectedStopsDisplay() {
    if (pendingStopConfig.stop1) {
      stop1Name.textContent = `${pendingStopConfig.stop1.name} → ${pendingStopConfig.stop1.direction}`;
      stop1Name.classList.remove('not-set');
    } else {
      stop1Name.textContent = 'Tap a search result';
      stop1Name.classList.add('not-set');
    }
    if (pendingStopConfig.stop2) {
      stop2Name.textContent = `${pendingStopConfig.stop2.name} → ${pendingStopConfig.stop2.direction}`;
      stop2Name.classList.remove('not-set');
    } else {
      stop2Name.textContent = 'Tap a search result';
      stop2Name.classList.add('not-set');
    }
  }

  function clearStop(slot) {
    if (slot === '1') pendingStopConfig.stop1 = null;
    else pendingStopConfig.stop2 = null;
    updateSelectedStopsDisplay();
  }

  async function searchStops() {
    const query = stopSearch.value.trim();
    if (!query) return;
    searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
    try {
      const response = await fetch(`https://api.tfl.gov.uk/StopPoint/Search?query=${encodeURIComponent(query)}&modes=bus&maxResults=10`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      if (!data.matches || data.matches.length === 0) {
        searchResults.innerHTML = '<div class="search-result-hint">No stops found. Try a different search.</div>';
        return;
      }
      let html = '';
      for (const match of data.matches.slice(0, 5)) {
        try {
          const detailResponse = await fetch(`https://api.tfl.gov.uk/StopPoint/${match.id}`);
          const detail = await detailResponse.json();
          const stops = detail.children && detail.children.length > 0 ? detail.children.filter(c => c.stopType === 'NaptanPublicBusCoachTram') : [detail];
          for (const stop of stops) {
            const lines = stop.lines ? stop.lines.map(l => l.name).join(', ') : '';
            let direction = '';
            if (stop.additionalProperties) {
              const towards = stop.additionalProperties.find(p => p.key === 'Towards');
              if (towards) direction = towards.value;
            }
            if (!direction && stop.indicator) direction = stop.indicator;
            html += `<div class="search-result" data-stop-id="${stop.naptanId || stop.id}" data-stop-name="${stop.commonName}" data-direction="${direction}"><div class="stop-name">${stop.commonName}</div>${direction ? `<div class="stop-direction">→ ${direction}</div>` : ''}${lines ? `<div class="stop-lines">🚌 ${lines}</div>` : ''}</div>`;
          }
        } catch (e) {
          html += `<div class="search-result" data-stop-id="${match.id}" data-stop-name="${match.name}" data-direction=""><div class="stop-name">${match.name}</div></div>`;
        }
      }
      searchResults.innerHTML = html || '<div class="search-result-hint">No bus stops found</div>';
      searchResults.querySelectorAll('.search-result').forEach(el => el.addEventListener('click', () => selectStop(el)));
    } catch (error) {
      searchResults.innerHTML = '<div class="search-result-hint">Search failed. Please try again.</div>';
    }
  }

  function selectStop(element) {
    const stopData = { id: element.dataset.stopId, name: element.dataset.stopName, direction: element.dataset.direction || 'Unknown' };
    if (!pendingStopConfig.stop1) pendingStopConfig.stop1 = stopData;
    else if (!pendingStopConfig.stop2) pendingStopConfig.stop2 = stopData;
    else pendingStopConfig.stop2 = stopData;
    updateSelectedStopsDisplay();
  }

  function saveSettings() {
    const newStops = [];
    if (pendingStopConfig.stop1) newStops.push(pendingStopConfig.stop1);
    if (pendingStopConfig.stop2) newStops.push(pendingStopConfig.stop2);
    if (newStops.length === 0) { alert('Please select at least one stop'); return; }
    stopInfo = newStops;
    saveConfig();
    closeSettings();
    localStorage.removeItem(CACHE_KEY);
    fetchBusTimes();
    if (!countdownTimer) startCountdown();
  }

  function handleTapRefresh(e) {
    if (!settingsOverlay.classList.contains('hidden')) return;
    e.preventDefault();
    if (!isRefreshing && stopInfo.length > 0) { fetchBusTimes(); resetCountdown(); }
  }

  async function fetchBusTimes() {
    if (isRefreshing || stopInfo.length === 0) return;
    isRefreshing = true;
    busList.classList.add('refreshing');
    try {
      const arrivalsResults = await Promise.all(stopInfo.map(info => fetch(`https://api.tfl.gov.uk/StopPoint/${info.id}/Arrivals`).then(r => { if (!r.ok) throw new Error('API error'); return r.json(); })));
      localStorage.setItem(CACHE_KEY, JSON.stringify({ arrivals: arrivalsResults, timestamp: Date.now() }));
      renderBusTimes(arrivalsResults, false);
      updateLastUpdated(false);
    } catch (error) {
      const cached = loadCachedData();
      if (cached) { renderBusTimes(cached.arrivals, true); updateLastUpdated(true, cached.timestamp); }
      else renderError();
    } finally {
      isRefreshing = false;
      busList.classList.remove('refreshing');
    }
  }

  function renderBusTimes(arrivalsResults, fromCache) {
    let html = '';
    stopInfo.forEach((info, idx) => {
      const arrivals = arrivalsResults[idx];
      let directionLabel = info.direction || 'Direction ' + (idx + 1);
      html += `<div class="direction"><h2>→ ${directionLabel}</h2>`;
      if (!arrivals || arrivals.length === 0) {
        html += `<div class="no-buses">No buses scheduled</div>`;
      } else {
        arrivals.sort((a, b) => a.timeToStation - b.timeToStation);
        arrivals.slice(0, MAX_BUSES).forEach((bus, busIdx) => {
          const minutes = Math.floor(bus.timeToStation / 60);
          const isNextBus = busIdx === 0;
          const timeClass = minutes <= 1 ? 'time-due' : minutes <= 5 ? 'time-soon' : 'time-normal';
          const timeText = minutes <= 0 ? 'Due' : minutes === 1 ? '1 min' : `${minutes} min`;
          const destination = bus.destinationName.replace(/ Bus Station| Station| Shopping Centre| Town Centre/g, '');
          html += `<div class="bus-item ${isNextBus ? 'next-bus' : ''}"><span class="bus-line">${bus.lineName}</span><span class="bus-destination">${destination}</span><span class="bus-time ${timeClass}">${timeText}</span></div>`;
        });
      }
      html += `</div>`;
    });
    busList.innerHTML = html;
  }

  function renderError() {
    busList.innerHTML = `<div class="error-message"><div>Unable to load bus times</div><div class="retry-hint">Tap to retry</div></div>`;
  }

  function loadCachedData() {
    try { const cached = localStorage.getItem(CACHE_KEY); if (cached) return JSON.parse(cached); } catch (e) {}
    return null;
  }

  function updateLastUpdated(isStale, cacheTimestamp) {
    const time = isStale ? new Date(cacheTimestamp) : new Date();
    const timeStr = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (isStale) {
      lastUpdated.innerHTML = `Cached: ${timeStr} <span class="cached-indicator">OFFLINE</span>`;
      lastUpdated.classList.add('stale');
    } else {
      lastUpdated.textContent = `Updated: ${timeStr}`;
      lastUpdated.classList.remove('stale');
    }
  }

  function updateNetworkStatus() {
    if (navigator.onLine) { networkStatus.textContent = '● Online'; networkStatus.className = 'online'; }
    else { networkStatus.textContent = '○ Offline'; networkStatus.className = 'offline'; }
  }

  function startCountdown() {
    countdownTimer = setInterval(() => {
      secondsUntilRefresh--;
      if (secondsUntilRefresh <= 0) { fetchBusTimes(); resetCountdown(); }
      else refreshCountdown.textContent = `↻ ${secondsUntilRefresh}s`;
    }, 1000);
  }

  function resetCountdown() {
    secondsUntilRefresh = REFRESH_INTERVAL;
    refreshCountdown.textContent = `↻ ${secondsUntilRefresh}s`;
  }

  async function requestWakeLock() {
    if ('wakeLock' in navigator) { try { await navigator.wakeLock.request('screen'); } catch (e) {} }
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
