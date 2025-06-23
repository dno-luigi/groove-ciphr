// main.js

// ======= PIANO KEYBOARD MAPPING =======

// White keys in order (left to right)
const WHITE_KEYS = [
  'CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter', 'PageDown'
];
// Black keys in order (aligned to white keys)
const BLACK_KEYS = [
  'Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\', 'PageUp'
];

// MIDI note offsets for one octave (C major scale, 14 notes), starting at C
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23]; // 14 white keys
const BLACK_OFFSETS = [1, 3, 6, 8, 10, 13, 15, 18, 20, 22, 24, 25, 27, 29, 30]; // 15 black keys

// Initial octave is 4 (Middle C = 60)
let currentOctave = 4;
const MIN_OCTAVE = 1, MAX_OCTAVE = 7;

// Map key names to their MIDI
function getWhiteKeyMidi(i) {
  return 12 * currentOctave + WHITE_OFFSETS[i];
}
function getBlackKeyMidi(i) {
  return 12 * currentOctave + BLACK_OFFSETS[i];
}

// ======= UI: Render Piano =======
function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';

  // White keys
  WHITE_KEYS.forEach((k, i) => {
    const midi = getWhiteKeyMidi(i);
    const div = document.createElement('div');
    div.className = 'piano-key white';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.innerHTML = `
      <span class="key-label">${displayKeyLabel(k)}</span>
      <span class="key-note">${midiToNote(midi)}</span>
    `;
    div.onmousedown = () => { playNote(midi); addToMelody(midi); };
    piano.appendChild(div);
  });

  // Black keys (as overlay, positioned absolutely)
  BLACK_KEYS.forEach((k, i) => {
    const midi = getBlackKeyMidi(i);
    const div = document.createElement('div');
    div.className = 'piano-key black';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.style.left = `${(i + 0.7) * 33}px`; // approximate positioning
    div.innerHTML = `<span class="key-label">${displayKeyLabel(k)}</span>`;
    div.onmousedown = () => { playNote(midi); addToMelody(midi); };
    piano.appendChild(div);
  });

  wrap.appendChild(piano);

  // Show current octave
  let octDiv = document.getElementById('octave-indicator');
  if (!octDiv) {
    octDiv = document.createElement('div');
    octDiv.id = 'octave-indicator';
    octDiv.style = "margin: 8px 0 0 0; font-weight: bold; font-size: 1.1em; color: #888;";
    wrap.parentElement.insertBefore(octDiv, wrap.nextSibling);
  }
  octDiv.innerHTML = `Current Octave: <span id="octave-num">${currentOctave}</span>`;
}

function midiToNote(m) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[m % 12] + Math.floor(m / 12 - 1);
}
function displayKeyLabel(k) {
  if (k === 'CapsLock') return 'Caps';
  if (k === 'PageDown') return 'PgDn';
  if (k === 'PageUp') return 'PgUp';
  if (k === 'Tab') return 'Tab';
  if (k === 'Enter') return 'Enter';
  if (k === ' ') return 'Space';
  return k.length === 1 ? k.toUpperCase() : k;
}

// ======= Octave Shift Logic =======
function shiftOctave(dir) {
  const prev = currentOctave;
  currentOctave += dir;
  if (currentOctave < MIN_OCTAVE) currentOctave = MIN_OCTAVE;
  if (currentOctave > MAX_OCTAVE) currentOctave = MAX_OCTAVE;
  if (prev !== currentOctave) {
    renderPiano();
  }
}

// ======= Piano Note Playback =======
function playNote(midi, vol=0.18) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  const g = ctx.createGain();
  g.gain.value = vol;
  o.connect(g).connect(ctx.destination);
  o.start();
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
  o.stop(ctx.currentTime + 0.19);
  o.onended = () => ctx.close();
  highlightKey(midi);
}
function highlightKey(midi) {
  document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('active'));
  const el = document.querySelector(`.piano-key[data-midi="${midi}"]`);
  if (el) { el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 140); }
}

// ======= Melody Looper =======
let melody = [];
function addToMelody(midi) {
  if (melody.length > 63) return;
  melody.push({ midi, time: Date.now() });
  updateMelodyBar();
}
function updateMelodyBar() {
  const bar = document.getElementById('melody-bar');
  bar.innerHTML = '';
  melody.forEach((n, i) => {
    const d = document.createElement('span');
    d.className = 'melody-note';
    d.textContent = midiToNote(n.midi);
    bar.appendChild(d);
  });
}
function clearMelody() {
  melody = [];
  updateMelodyBar();
}
document.getElementById('melody-clear').onclick = clearMelody;

// ======= Keyboard Event Logic =======
document.addEventListener('keydown', e => {
  if (e.repeat) return;
  const k = e.key;
  // Octave shift keys
  if (k === 'CapsLock' || k === 'Tab' || k === 'PageUp') {
    shiftOctave(1);
    return;
  }
  if (k === 'PageDown') {
    shiftOctave(-1);
    return;
  }
  // White keys
  let idx = WHITE_KEYS.indexOf(k);
  if (idx !== -1) {
    const midi = getWhiteKeyMidi(idx);
    playNote(midi);
    addToMelody(midi);
    return;
  }
  // Black keys
  idx = BLACK_KEYS.indexOf(k);
  if (idx !== -1) {
    const midi = getBlackKeyMidi(idx);
    playNote(midi);
    addToMelody(midi);
    return;
  }
});

// ======= LED GRID, PERCUSSION, ETC (unchanged from prior) =======
// ... Your existing LED grid, sample, sequencer, and UI logic goes here, unchanged ...

// ======= Robust Encoding / Decoding =======
function melodyToHash() {
  // Use basic hash for demo
  return melody.map(n => n.midi).join(',');
}
function ledToHash() {
  return ledGrid.map(row => row.map(c => c ? 1 : 0).join('')).join('|');
}
function bothToHash() {
  return melodyToHash() + '||' + ledToHash();
}
document.getElementById('encode-btn').onclick = function () {
  const msg = document.getElementById('cipher-input').value;
  const mode = document.getElementById('unlock-mode').value;
  let pwHash;
  if (mode === 'melody') pwHash = melodyToHash();
  else if (mode === 'led') pwHash = ledToHash();
  else pwHash = bothToHash();
  // Only write to output area:
  document.getElementById('cipher-output').textContent =
    btoa(unescape(encodeURIComponent(msg))) + '::' + pwHash;
};
document.getElementById('decode-btn').onclick = function () {
  const val = document.getElementById('cipher-output').textContent.trim();
  if (!val.includes('::')) {
    document.getElementById('cipher-output').textContent = 'No encoded message to decode!';
    return;
  }
  const [enc, pwHash] = val.split('::');
  const mode = document.getElementById('unlock-mode').value;
  let inputHash;
  if (mode === 'melody') inputHash = melodyToHash();
  else if (mode === 'led') inputHash = ledToHash();
  else inputHash = bothToHash();
  if (inputHash !== pwHash) {
    document.getElementById('cipher-output').textContent = 'Wrong melody/pattern!';
    return;
  }
  const msg = decodeURIComponent(escape(atob(enc)));
  document.getElementById('cipher-output').textContent = `Decoded: ${msg}`;
};

// ======= Piano Render on Load =======
window.onload = function () {
  renderPiano();
  updateMelodyBar();
  // ... your other initializations ...
};
