(function() {
  'use strict';
  const UNITS = {
    length: [
      { id: 'mm', name: 'Millimeters', factor: 0.001 },
      { id: 'cm', name: 'Centimeters', factor: 0.01 },
      { id: 'm', name: 'Meters', factor: 1 },
      { id: 'km', name: 'Kilometers', factor: 1000 },
      { id: 'in', name: 'Inches', factor: 0.0254 },
      { id: 'ft', name: 'Feet', factor: 0.3048 },
      { id: 'yd', name: 'Yards', factor: 0.9144 },
      { id: 'mi', name: 'Miles', factor: 1609.344 }
    ],
    weight: [
      { id: 'mg', name: 'Milligrams', factor: 0.000001 },
      { id: 'g', name: 'Grams', factor: 0.001 },
      { id: 'kg', name: 'Kilograms', factor: 1 },
      { id: 'oz', name: 'Ounces', factor: 0.0283495 },
      { id: 'lb', name: 'Pounds', factor: 0.453592 },
      { id: 'st', name: 'Stone', factor: 6.35029 }
    ],
    temp: [
      { id: 'c', name: 'Celsius' },
      { id: 'f', name: 'Fahrenheit' },
      { id: 'k', name: 'Kelvin' }
    ],
    volume: [
      { id: 'ml', name: 'Milliliters', factor: 0.001 },
      { id: 'l', name: 'Liters', factor: 1 },
      { id: 'gal', name: 'Gallons (US)', factor: 3.78541 },
      { id: 'qt', name: 'Quarts (US)', factor: 0.946353 },
      { id: 'pt', name: 'Pints (US)', factor: 0.473176 },
      { id: 'cup', name: 'Cups (US)', factor: 0.236588 },
      { id: 'floz', name: 'Fl Oz (US)', factor: 0.0295735 }
    ]
  };

  const catBtns = document.querySelectorAll('.cat-btn');
  const fromValue = document.getElementById('fromValue');
  const toValue = document.getElementById('toValue');
  const fromUnit = document.getElementById('fromUnit');
  const toUnit = document.getElementById('toUnit');
  const swapBtn = document.getElementById('swapBtn');
  const formula = document.getElementById('formula');

  let currentCat = 'length';

  function populateUnits() {
    const units = UNITS[currentCat];
    fromUnit.innerHTML = toUnit.innerHTML = units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    toUnit.selectedIndex = 1;
  }

  function convertTemp(val, from, to) {
    let c;
    if (from === 'c') c = val;
    else if (from === 'f') c = (val - 32) * 5/9;
    else c = val - 273.15;
    if (to === 'c') return c;
    if (to === 'f') return c * 9/5 + 32;
    return c + 273.15;
  }

  function convert() {
    const val = parseFloat(fromValue.value) || 0;
    const from = fromUnit.value;
    const to = toUnit.value;
    let result;

    if (currentCat === 'temp') {
      result = convertTemp(val, from, to);
    } else {
      const units = UNITS[currentCat];
      const fromF = units.find(u => u.id === from).factor;
      const toF = units.find(u => u.id === to).factor;
      result = val * fromF / toF;
    }

    toValue.value = result ? (Math.abs(result) < 0.0001 || Math.abs(result) > 9999999 ? result.toExponential(4) : parseFloat(result.toPrecision(8))) : '';
    updateFormula();
  }

  function updateFormula() {
    const from = UNITS[currentCat].find(u => u.id === fromUnit.value);
    const to = UNITS[currentCat].find(u => u.id === toUnit.value);
    formula.textContent = `${from.name} → ${to.name}`;
  }

  function setCategory(cat) {
    currentCat = cat;
    catBtns.forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    populateUnits();
    fromValue.value = '';
    toValue.value = '';
    updateFormula();
  }

  catBtns.forEach(btn => btn.addEventListener('click', () => setCategory(btn.dataset.cat)));
  fromValue.addEventListener('input', convert);
  fromUnit.addEventListener('change', convert);
  toUnit.addEventListener('change', convert);
  swapBtn.addEventListener('click', () => {
    const tmpIdx = fromUnit.selectedIndex;
    fromUnit.selectedIndex = toUnit.selectedIndex;
    toUnit.selectedIndex = tmpIdx;
    fromValue.value = toValue.value;
    convert();
  });

  setCategory('length');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();
