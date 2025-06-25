// main.js

// ======= PIANO KEYBOARD MAPPING =======

// White keys in order (from C6): a s d f g h j k l ; ' Enter
const WHITE_KEYS = [
  'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'
];
// Black keys overlay (null for missing black key in layout): 2 e [skip-r] t y u [skip-i] o p [
const BLACK_KEYS = [
  '2',    // C# above 'a'
  'e',    // D# above 's'
  null,   // no black above 'd'
  't',    // F# above 'f'
  'y',    // G# above 'g'
  'u',    // A# above 'h'
  null,   // no black above 'j'
  'o',    // C# above 'k'
  'p',    // D# above 'l'
  '[',    // E# above ';'
  null,   // no black above "'"
  null    // no black above 'Enter'
];

// C6 = MIDI 84, so white keys: C6 D6 E6 F6 G6 A6 B6 C7 D7 E7 F7 G7
const WHITE_MIDI_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
const BLACK_MIDI_OFFSETS = [1, 3, null, 6, 8, 10, null, 13, 15, 17, null, null];

// ======= Octave Logic =======
let currentOctave = 6; // C6 = 84
const MIN_OCTAVE = 1;
const MAX_OCTAVE = 8;

// ======= CapsLock Toggle =======
let capsLockActive = false;

// ======= Melody =======
let melody = [];

// ======= UI: Render Piano =======
function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';
  // --- White keys ---
  WHITE_KEYS.forEach((k, i) => {
    const midi = 12 * currentOctave + WHITE_MIDI_OFFSETS[i];
    const div = document.createElement('div');
    div.className = 'piano-key white';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.innerHTML = `
      <span class="key-label">${displayKeyLabel(k)}</span>
      <span class="key-note">${midiToNote(midi)}</span>
    `;
    div.onmousedown = () => {
      if (!capsLockActive) {
        playNote(midi);
        addToMelody(midi);
      }
    };
    piano.appendChild(div);
  });
  // --- Black keys (overlay, absolute positioning) ---
  BLACK_KEYS.forEach((k, i) => {
    if (!k || BLACK_MIDI_OFFSETS[i] === null) return;
    const midi = 12 * currentOctave + BLACK_MIDI_OFFSETS[i];
    const div = document.createElement('div');
    div.className = 'piano-key black';
    div.dataset.midi = midi;
    div.dataset.key = k;
    // Position black keys between/above the right whites
    div.style.left = `${i * 36 + 24}px`;
    div.innerHTML = `<span class="key-label">${displayKeyLabel(k)}</span>`;
    div.onmousedown = () => {
      if (!capsLockActive) {
        playNote(midi);
        addToMelody(midi);
      }
    };
    piano.appendChild(div);
  });
  wrap.appendChild(piano);
  // Show octave
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
  if (k === 'Enter') return 'Enter';
  if (k === ' ') return 'Space';
  return k.length === 1 ? k.toUpperCase() : k;
}

// ======= Melody Looper =======
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

// ======= Sound/Highlight =======
function playNote(midi, vol = 0.18) {
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

// ======= Keyboard Event Logic =======
document.addEventListener('keydown', e => {
  if (e.repeat) return;
  // CapsLock
  if (e.key === "CapsLock") {
    capsLockActive = !capsLockActive;
    document.body.classList.toggle('capslock-disabled', capsLockActive);
    return;
  }
  if (capsLockActive) return;

  // Octave shift
  if (e.key === "PageUp") {
    if (currentOctave < MAX_OCTAVE) {
      currentOctave++;
      renderPiano();
    }
    return;
  }
  if (e.key === "PageDown") {
    if (currentOctave > MIN_OCTAVE) {
      currentOctave--;
      renderPiano();
    }
    return;
  }
  // Backspace
  if (e.key === "Backspace") {
    e.preventDefault();
    if (melody.length > 0) {
      melody.pop();
      updateMelodyBar();
    }
    return;
  }
  // White keys
  let idx = WHITE_KEYS.indexOf(e.key);
  if (idx !== -1) {
    const midi = 12 * currentOctave + WHITE_MIDI_OFFSETS[idx];
    playNote(midi);
    addToMelody(midi);
    return;
  }
  // Black keys
  idx = BLACK_KEYS.indexOf(e.key);
  if (idx !== -1 && BLACK_MIDI_OFFSETS[idx] !== null) {
    const midi = 12 * currentOctave + BLACK_MIDI_OFFSETS[idx];
    playNote(midi);
    addToMelody(midi);
    return;
  }
});

// ======= Encoding / Decoding (unchanged) =======
function melodyToHash() {
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

// ======= LED GRID, PERCUSSION, ETC (unchanged from prior) =======
// ... your existing LED grid, sample, sequencer, and UI logic goes here, unchanged ...
