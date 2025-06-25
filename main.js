// main.js

// ======= Mappings as specified =======

// White keys, left to right
const WHITE_KEYS = [
  'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter"
];

// Black keys, left to right, null for skips
// The array index must match the white key base for proper overlay
const BLACK_KEYS = [
  '2',    // C#7 above 'a'
  'e',    // D#7 above 's'
  null,   // skip above 'd'
  't',    // F#7 above 'f'
  'y',    // G#7 above 'g'
  'u',    // A#8 above 'h'
  null,   // skip above 'j'
  'o',    // C#8 above 'k'
  'p',    // D#8 above 'l'
  '[',    // E#8 above ';'
  null,   // skip above "'"
  null    // skip above 'Enter'
];

// Base MIDI for C6
const WHITE_MIDI_BASE = 84; // C6
const BLACK_MIDI_OFFSETS = [1, 3, null, 6, 8, 10, null, 13, 15, 17, null, null];

// ======= Octave shifting =======
let currentOctave = 6; // C6 = 84
const MIN_OCTAVE = 1;
const MAX_OCTAVE = 8;

// ======= CapsLock toggle disables input =======
let capsLockActive = false;

// ======= Melody =======
let melody = [];

// ======= Piano rendering =======
function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';

  // White keys
  WHITE_KEYS.forEach((k, i) => {
    const midi = WHITE_MIDI_BASE + (i * 2) + (i > 2 ? 1 : 0); // Account for E-F and B-C semitone gap
    const div = document.createElement('div');
    div.className = 'piano-key white';
    div.dataset.midi = midi + (currentOctave - 6) * 12;
    div.dataset.key = k;
    div.innerHTML = `
      <span class="key-label">${displayKeyLabel(k)}</span>
      <span class="key-note">${midiToNote(midi + (currentOctave - 6) * 12)}</span>
    `;
    div.onmousedown = () => {
      if (!capsLockActive) {
        playNote(midi + (currentOctave - 6) * 12);
        addToMelody(midi + (currentOctave - 6) * 12);
      }
    };
    piano.appendChild(div);
  });

  // Black keys as overlay
  BLACK_KEYS.forEach((k, i) => {
    if (!k) return;
    const midi = WHITE_MIDI_BASE + BLACK_MIDI_OFFSETS[i] + (currentOctave - 6) * 12;
    const div = document.createElement('div');
    div.className = 'piano-key black';
    div.dataset.midi = midi;
    div.dataset.key = k;
    // Position: left of the next white key, offset for black key width
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
  if (k === 'Enter') return 'Enter';
  if (k === ' ') return 'Space';
  return k.length === 1 ? k.toUpperCase() : k;
}

// ======= Melody functions =======
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

// ======= Play sound and highlight =======
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

// ======= Keyboard event logic =======
document.addEventListener('keydown', e => {
  if (e.repeat) return;

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
    const midi = WHITE_MIDI_BASE + (idx * 2) + (idx > 2 ? 1 : 0) + (currentOctave - 6) * 12;
    playNote(midi);
    addToMelody(midi);
    return;
  }

  // Black keys
  idx = BLACK_KEYS.indexOf(e.key);
  if (idx !== -1 && BLACK_MIDI_OFFSETS[idx] !== null) {
    const midi = WHITE_MIDI_BASE + BLACK_MIDI_OFFSETS[idx] + (currentOctave - 6) * 12;
    playNote(midi);
    addToMelody(midi);
    return;
  }
});

// ======= Encoding/Decoding (unchanged) =======
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

// ======= On load =======
window.onload = function () {
  renderPiano();
  updateMelodyBar();
};
