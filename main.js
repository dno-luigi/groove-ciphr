// main.js (Tone.js-powered for Groove Box/Cipher!)
// ... [existing code above remains unchanged]

// ======= Tab Switching Logic (NEW) =======
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

// ======= Melody Sequencer (add grid animation to melody) =======
function playMelody() {
  if (melody.length === 0) return;
  if (melodySequence) melodySequence.dispose();
  melodyStep = 0;
  melodySequence = new Tone.Sequence((time, noteObj) => {
    synth.triggerAttackRelease(Tone.Frequency(noteObj.midi, "midi"), 0.18, time);
    highlightKey(noteObj.midi);
    highlightMelodyStep(melodyStep++);
    animateGridToMelody(noteObj.midi); // <--- NEW: Animate LED grid to melody
  }, melody, "8n").start(0);
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.start("+0.1");
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
    flashLEDColumn(col); // <--- NEW: Flash column on grid
  }, [...Array(ledCols).keys()], "16n").start(0);
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.start("+0.1");
}

// ======= Cipher Encode/Decode Feedback (success animation) =======
// Attach to encode/decode buttons
document.getElementById('encode-btn').onclick = function() {
  // ... your existing encode logic here ...
  gridSuccessFlash(); // <--- NEW: Success animation
};
document.getElementById('decode-btn').onclick = function() {
  // ... your existing decode logic here ...
  gridSuccessFlash(); // <--- NEW: Success animation
};

// ... [rest of your main.js remains unchanged] ...
