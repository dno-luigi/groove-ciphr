// main.js

// ======= PIANO KEYBOARD MAPPING =======

// White keys: (c6)a (d6)s (e6)d (f6)f (g6)g (a7)h (b7)j (c7)k (d7)l (e7); (f7)' (g7)Enter
const WHITE_KEYS = [
  'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'
];
const WHITE_MIDI = [
  84, // C6
  86, // D6
  88, // E6
  89, // F6
  91, // G6
  93, // A7
  95, // B7
  96, // C7
  98, // D7
  100, // E7
  101, // F7
  103  // G7
];

// Black keys: (c#7)2 (d#7)e [skip-r] (f#7)t (g#7)y (a#8)u [skip-i] (c#8)o (d#8)p (e#8)[
const BLACK_KEYS = [
  '2',  // C#7
  'e',  // D#7
  // skip 'r'
  't',  // F#7
  'y',  // G#7
  'u',  // A#8
  // skip 'i'
  'o',  // C#8
  'p',  // D#8
  '[',  // E#8
];
const BLACK_MIDI = [
  85,  // C#7
  87,  // D#7
  90,  // F#7
  92,  // G#7
  94,  // A#8
  97,  // C#8
  99,  // D#8
  102  // E#8
];

// ======= CapsLock Mode =======
let capsLockActive = false;
document.addEventListener('keydown', e => {
  if (e.key === "CapsLock") {
    capsLockActive = !capsLockActive;
    document.body.classList.toggle('capslock-disabled', capsLockActive);
    return;
  }
});

// ======= UI: Render Piano =======
function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';

  // White keys
  WHITE_KEYS.forEach((k, i) => {
    const midi = WHITE_MIDI[i];
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

  // Black keys (approximate positioning)
  BLACK_KEYS.forEach((k, i) => {
    const midi = BLACK_MIDI[i];
    const div = document.createElement('div');
    div.className = 'piano-key black';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.style.left = `${(i + 0.7) * 33}px`;
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
  if (e.key === "CapsLock") return; // handled above

  if (capsLockActive) {
    // All keyboard/piano input is disabled while CapsLock is ON
    return;
  }

  const k = e.key;

  // Remove last note with Backspace
  if (k === "Backspace") {
    e.preventDefault();
    if (melody.length > 0) {
      melody.pop();
      updateMelodyBar();
    }
    return;
  }

  // White keys
  let idx = WHITE_KEYS.indexOf(k);
  if (idx !== -1) {
    playNote(WHITE_MIDI[idx]);
    addToMelody(WHITE_MIDI[idx]);
    return;
  }
  // Black keys
  idx = BLACK_KEYS.indexOf(k);
  if (idx !== -1) {
    playNote(BLACK_MIDI[idx]);
    addToMelody(BLACK_MIDI[idx]);
    return;
  }
});

// ======= Music/Sound/Highlight Functions =======
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

// ======= Encoding/Decoding (Unchanged) =======
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
