// main.js (Tone.js-powered for Groove Box/Cipher!)

// ======= Tone.js Setup & Instruments =======
Tone.context.lookAhead = 0.03; // Tighten timing

// Melody synth (polyphonic, supports chords)
const synth = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.01, decay: 0.12, sustain: 0, release: 0.18 }
}).toDestination();

// Drum sample players
const drumSamples = {
  kick: new Tone.Player("kick.wav").toDestination(),
  snare: new Tone.Player("snare.wav").toDestination(),
  hat: new Tone.Player("hat.wav").toDestination(),
  clap: new Tone.Player("clap.wav").toDestination(),
  perc1: new Tone.Player("perc1.wav").toDestination()
};

// ======= State =======
let currentOctave = 6, MIN_OCTAVE = 1, MAX_OCTAVE = 8;
let melody = [];
let ledRows = 5, ledCols = 5;
let ledGrid = Array.from({length: ledRows}, () => Array(ledCols).fill(null)); // null or sample name
let isRecording = false;
let melodyStep = 0;
let melodySequence = null;
let ledSequence = null;
let bpm = 120;

// ======= Piano Keyboard =======
const WHITE_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'];
const WHITE_MIDI_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
const BLACK_KEYS = ['w','e',null,'t','y','u',null,'o','p',']','\\'];
const BLACK_MIDI_OFFSETS = [1,3,null,6,8,10,null,13,15,18,20];

function renderPiano() {
  const wrap = document.getElementById('piano-wrap');
  wrap.innerHTML = '';
  const piano = document.createElement('div');
  piano.className = 'piano';
  WHITE_KEYS.forEach((k, i) => {
    const midi = 12 * currentOctave + WHITE_MIDI_OFFSETS[i];
    const div = document.createElement('div');
    div.className = 'piano-key white';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.innerHTML = `<span class="key-label">${displayKeyLabel(k)}</span>
      <span class="key-note">${midiToNote(midi)}</span>`;
    div.onmousedown = () => {
      playNoteToneJS(midi);
      if (isRecording) addToMelody(midi);
    };
    piano.appendChild(div);
  });
  BLACK_KEYS.forEach((k, i) => {
    if (!k || BLACK_MIDI_OFFSETS[i] === null) return;
    const midi = 12 * currentOctave + BLACK_MIDI_OFFSETS[i];
    const div = document.createElement('div');
    div.className = 'piano-key black';
    div.dataset.midi = midi;
    div.dataset.key = k;
    div.style.left = `${i * 36 + 24}px`;
    div.innerHTML = `<span class="key-label">${displayKeyLabel(k)}</span>`;
    div.onmousedown = () => {
      playNoteToneJS(midi);
      if (isRecording) addToMelody(midi);
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

function shiftOctave(dir) {
  currentOctave += dir;
  if (currentOctave < MIN_OCTAVE) currentOctave = MIN_OCTAVE;
  if (currentOctave > MAX_OCTAVE) currentOctave = MAX_OCTAVE;
  renderPiano();
}

// ======= Play Note with Tone.js =======
async function playNoteToneJS(midi, vol = 0.18) {
  await Tone.start();
  const freq = Tone.Frequency(midi, "midi").toFrequency();
  synth.set({ volume: Tone.gainToDb(vol) });
  synth.triggerAttackRelease(freq, 0.2);
  highlightKey(midi);
}
function highlightKey(midi) {
  document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('active'));
  const el = document.querySelector(`.piano-key[data-midi="${midi}"]`);
  if (el) { el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 140); }
}

// ======= Melody Recording =======
function addToMelody(midi) {
  if (melody.length > 63) return;
  melody.push({ midi, time: Tone.Transport.seconds });
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

// ======= Melody Sequencer (with LED grid animation) =======
function playMelody() {
  if (melody.length === 0) return;
  if (melodySequence) melodySequence.dispose();
  melodyStep = 0;
  melodySequence = new Tone.Sequence((time, noteObj) => {
    synth.triggerAttackRelease(Tone.Frequency(noteObj.midi, "midi"), 0.18, time);
    highlightKey(noteObj.midi);
    highlightMelodyStep(melodyStep++);
    animateGridToMelody(noteObj.midi); // Animate LED grid to melody
  }, melody, "8n").start(0);
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.start("+0.1");
}
function stopMelody() {
  if (melodySequence) melodySequence.dispose();
  melodySequence = null;
  Tone.Transport.stop();
  melodyStep = 0;
}
function highlightMelodyStep(idx) {
  const bar = document.getElementById('melody-bar').children;
  for (let i = 0; i < bar.length; i++) bar[i].classList.remove('playing');
  if (bar[idx]) bar[idx].classList.add('playing');
}

// ======= LED Drum Grid =======
function renderLEDGrid() {
  const wrap = document.getElementById('led-grid-wrap');
  wrap.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'led-grid';
  for (let r = 0; r < ledRows; r++) {
    for (let c = 0; c < ledCols; c++) {
      const cell = document.createElement('div');
      cell.className = 'led-cell' + (ledGrid[r][c] ? ' on' : '');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.onclick = () => {
        // Cycle through samples: null -> kick -> snare -> hat -> clap -> perc1 -> null
        const samples = [null, 'kick', 'snare', 'hat', 'clap', 'perc1'];
        const curr = samples.indexOf(ledGrid[r][c]);
        ledGrid[r][c] = samples[(curr + 1) % samples.length];
        renderLEDGrid();
      };
      grid.appendChild(cell);
    }
  }
  wrap.appendChild(grid);
}
function clearLEDGrid() {
  ledGrid = Array.from({length: ledRows}, () => Array(ledCols).fill(null));
  renderLEDGrid();
}

// ======= Advanced LED Animations =======

// Flash a column in the LED grid (called during sequencer step)
function flashLEDColumn(col, duration = 120) {
  for (let row = 0; row < ledRows; row++) {
    const idx = row * ledCols + col;
    const el = document.querySelectorAll('.led-cell')[idx];
    if (el) {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), duration);
    }
  }
}

// Animate a random cell for melody notes
function animateGridToMelody(midi) {
  const cells = document.querySelectorAll('.led-cell');
  if (cells.length === 0) return;
  const idx = Math.floor(Math.random() * cells.length);
  const el = cells[idx];
  if (el) {
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 140);
  }
}

// Flash all cells (success animation)
function gridSuccessFlash(duration = 350) {
  document.querySelectorAll('.led-cell').forEach(cell => {
    cell.classList.add('flash');
    setTimeout(() => cell.classList.remove('flash'), duration);
  });
}

// ======= LED Drum Sequencer (flash whole column during play) =======
function playLEDGrid() {
  if (ledSequence) ledSequence.dispose();
  ledSequence = new Tone.Sequence((time, col) => {
    for (let row = 0; row < ledRows; row++) {
      const sample = ledGrid[row][col];
      if (sample && drumSamples[sample]) {
        drumSamples[sample].start(time);
      }
      highlightLEDStep(row, col);
    }
    flashLEDColumn(col); // Flash column on grid
  }, [...Array(ledCols).keys()], "16n").start(0);
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.start("+0.1");
}
function stopLEDGrid() {
  if (ledSequence) ledSequence.dispose();
  ledSequence = null;
  Tone.Transport.stop();
}
function highlightLEDStep(row, col) {
  document.querySelectorAll('.led-cell').forEach(cell => cell.classList.remove('playing'));
  const idx = row * ledCols + col;
  const el = document.querySelectorAll('.led-cell')[idx];
  if (el) el.classList.add('playing');
}

// ======= Metronome =======
let metroPart = null;
function toggleMetronome(on) {
  if (on) {
    if (metroPart) metroPart.dispose();
    metroPart = new Tone.Loop((time) => {
      // Use a simple click sound
      const click = new Tone.MembraneSynth().toDestination();
      click.triggerAttackRelease("C4", 0.07, time, 0.3);
    }, "4n").start(0);
    Tone.Transport.start("+0.1");
  } else {
    if (metroPart) metroPart.dispose();
    metroPart = null;
  }
}

// ======= Tab Switching Logic =======
document.getElementById('tab-melody').onclick = function() {
  document.getElementById('melody-section').style.display = '';
  document.getElementById('led-section').style.display = 'none';
  this.classList.add('active');
  document.getElementById('tab-led').classList.remove('active');
  document.getElementById('tab-both').classList.remove('active');
};
document.getElementById('tab-led').onclick = function() {
  document.getElementById('melody-section').style.display = 'none';
  document.getElementById('led-section').style.display = '';
  this.classList.add('active');
  document.getElementById('tab-melody').classList.remove('active');
  document.getElementById('tab-both').classList.remove('active');
};
document.getElementById('tab-both').onclick = function() {
  document.getElementById('melody-section').style.display = '';
  document.getElementById('led-section').style.display = '';
  this.classList.add('active');
  document.getElementById('tab-melody').classList.remove('active');
  document.getElementById('tab-led').classList.remove('active');
};

// ======= Controls & Handlers =======
document.getElementById('melody-record').onclick = () => {
  isRecording = true;
  melody = [];
  updateMelodyBar();
};
document.getElementById('melody-stop').onclick = () => {
  isRecording = false;
};
document.getElementById('melody-play').onclick = () => {
  stopMelody();
  playMelody();
};
document.getElementById('melody-clear').onclick = () => {
  clearMelody();
};
document.getElementById('melody-save').onclick = () => {
  saveToFile(JSON.stringify(melody), "melody.json");
};
document.getElementById('melody-load').onclick = () => {
  document.getElementById('melody-file').click();
};
document.getElementById('melody-file').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    melody = JSON.parse(evt.target.result);
    updateMelodyBar();
  };
  reader.readAsText(file);
};

document.getElementById('led-clear').onclick = clearLEDGrid;
document.getElementById('led-save').onclick = () => {
  saveToFile(JSON.stringify(ledGrid), "ledgrid.json");
};
document.getElementById('led-load').onclick = () => {
  document.getElementById('led-file').click();
};
document.getElementById('led-file').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    ledGrid = JSON.parse(evt.target.result);
    renderLEDGrid();
  };
  reader.readAsText(file);
};

// ======= Metronome Controls =======
let metronomeOn = false;
document.getElementById('metronome-toggle').onclick = () => {
  metronomeOn = !metronomeOn;
  toggleMetronome(metronomeOn);
  document.getElementById('metronome-toggle').textContent = "Metronome: " + (metronomeOn ? "ON" : "OFF");
};
document.getElementById('bpm').oninput = (e) => {
  bpm = parseInt(e.target.value) || 120;
  Tone.Transport.bpm.value = bpm;
};

document.addEventListener('keydown', e => {
  // Octave shift
  if (e.key === "PageUp") {
    shiftOctave(1);
    return;
  }
  if (e.key === "PageDown") {
    shiftOctave(-1);
    return;
  }
  // Backspace for melody
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
    playNoteToneJS(midi);
    if (isRecording) addToMelody(midi);
    return;
  }
  // Black keys
  idx = BLACK_KEYS.indexOf(e.key);
  if (idx !== -1 && BLACK_MIDI_OFFSETS[idx] !== null) {
    const midi = 12 * currentOctave + BLACK_MIDI_OFFSETS[idx];
    playNoteToneJS(midi);
    if (isRecording) addToMelody(midi);
    return;
  }
});

// ======= Utility: Save to File =======
function saveToFile(data, filename) {
  const a = document.createElement('a');
  a.href = "data:application/json," + encodeURIComponent(data);
  a.download = filename;
  a.click();
}

// ======= Cipher Encode/Decode Feedback (success animation) =======
// You should insert your own encoding/decoding logic where indicated.
document.getElementById('encode-btn').onclick = function() {
  // ... your encoding logic here ...
  gridSuccessFlash(); // Visual feedback
};
document.getElementById('decode-btn').onclick = function() {
  // ... your decoding logic here ...
  gridSuccessFlash(); // Visual feedback
};

// ======= On Load =======
window.onload = function () {
  renderPiano();
  updateMelodyBar();
  renderLEDGrid();
};
