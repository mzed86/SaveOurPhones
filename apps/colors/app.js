(function() {
  'use strict';
  const preview = document.getElementById('colorPreview');
  const hexValue = document.getElementById('hexValue');
  const rgbValue = document.getElementById('rgbValue');
  const rSlider = document.getElementById('rSlider');
  const gSlider = document.getElementById('gSlider');
  const bSlider = document.getElementById('bSlider');
  const rVal = document.getElementById('rVal');
  const gVal = document.getElementById('gVal');
  const bVal = document.getElementById('bVal');
  const saveBtn = document.getElementById('saveColor');
  const paletteEl = document.getElementById('palette');
  const presets = document.querySelectorAll('.preset');

  let r = 255, g = 87, b = 51;
  let savedColors = [];

  function componentToHex(c) {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function update() {
    const hex = rgbToHex(r, g, b).toUpperCase();
    preview.style.background = hex;
    hexValue.textContent = hex;
    rgbValue.textContent = `rgb(${r}, ${g}, ${b})`;
    rVal.textContent = r;
    gVal.textContent = g;
    bVal.textContent = b;
    rSlider.value = r;
    gSlider.value = g;
    bSlider.value = b;
  }

  function setColor(hex) {
    const rgb = hexToRgb(hex);
    if (rgb) { r = rgb.r; g = rgb.g; b = rgb.b; update(); }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const original = hexValue.textContent;
      hexValue.textContent = 'Copied!';
      setTimeout(() => hexValue.textContent = original, 1000);
    });
  }

  function loadSaved() {
    const saved = localStorage.getItem('savedColors');
    if (saved) savedColors = JSON.parse(saved);
    renderPalette();
  }

  function savePalette() {
    localStorage.setItem('savedColors', JSON.stringify(savedColors));
  }

  function renderPalette() {
    paletteEl.innerHTML = savedColors.map((c, i) => `
      <button class="saved-color" style="background:${c}" data-color="${c}">
        <span class="delete" data-delete="${i}">×</span>
      </button>
    `).join('');
  }

  rSlider.addEventListener('input', () => { r = parseInt(rSlider.value); update(); });
  gSlider.addEventListener('input', () => { g = parseInt(gSlider.value); update(); });
  bSlider.addEventListener('input', () => { b = parseInt(bSlider.value); update(); });

  hexValue.addEventListener('click', () => copyToClipboard(hexValue.textContent));
  rgbValue.addEventListener('click', () => copyToClipboard(rgbValue.textContent));

  saveBtn.addEventListener('click', () => {
    const hex = rgbToHex(r, g, b).toUpperCase();
    if (!savedColors.includes(hex)) {
      savedColors.push(hex);
      savePalette();
      renderPalette();
    }
  });

  paletteEl.addEventListener('click', e => {
    const del = e.target.closest('[data-delete]');
    if (del) {
      savedColors.splice(parseInt(del.dataset.delete), 1);
      savePalette();
      renderPalette();
      return;
    }
    const btn = e.target.closest('[data-color]');
    if (btn) setColor(btn.dataset.color);
  });

  presets.forEach(p => p.addEventListener('click', () => setColor(p.dataset.color)));

  loadSaved();
  update();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
