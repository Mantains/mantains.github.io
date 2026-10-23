import { palettes, defaultPalette, paletteStorageKey } from '../lib/palettes.mjs';

export function initPalettePicker(doc = document, win = window) {
  const picker = doc.querySelector('[data-palette-picker]');
  if (!picker) return;
  const inputs = picker.querySelectorAll('input[name="reading-palette"]');

  function apply(id, persist = false) {
    const palette = palettes.find(p => p.id === id) || palettes.find(p => p.id === defaultPalette);
    doc.documentElement.dataset.palette = palette.id;
    doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.colors.paper);
    inputs.forEach(input => { input.checked = input.value === palette.id; });
    if (persist) {
      try { win.localStorage.setItem(paletteStorageKey, palette.id); } catch { /* The selected palette still works when storage is unavailable. */ }
    }
  }

  let initial = doc.documentElement.dataset.palette || defaultPalette;
  try { initial = win.localStorage.getItem(paletteStorageKey) || initial; } catch { /* Keep the default or in-page selection. */ }
  apply(initial);
  picker.hidden = false;

  inputs.forEach(input => input.addEventListener('change', () => {
    if (input.checked) apply(input.value, true);
  }));

  doc.addEventListener('click', event => {
    if (!picker.contains(event.target)) picker.open = false;
  });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && picker.open) {
      picker.open = false;
      picker.querySelector('summary')?.focus();
    }
  });
  win.addEventListener('storage', event => {
    if (event.storageArea === win.localStorage && (event.key === paletteStorageKey || event.key === null)) apply(event.newValue);
  });
}
