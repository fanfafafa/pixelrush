// ===== Audio System (Web Audio API) =====

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playBeep(freq, type, dur, vol) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol || 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch(e) {}
}

// Success - bright upward chirp
function playHit() {
  playBeep(880, 'sine', 0.1, 0.3);
  setTimeout(() => playBeep(1320, 'sine', 0.08, 0.2), 40);
}

// Miss - low thud
function playMiss() {
  playBeep(150, 'sawtooth', 0.25, 0.2);
  setTimeout(() => playBeep(80, 'sine', 0.3, 0.15), 50);
}

// Combo - escalating tone
function playCombo(level) {
  const baseFreq = 440 + level * 110;
  playBeep(baseFreq, 'sine', 0.06, 0.2);
  setTimeout(() => playBeep(baseFreq * 1.25, 'sine', 0.06, 0.18), 50);
  setTimeout(() => playBeep(baseFreq * 1.5, 'sine', 0.1, 0.15), 100);
}

// Combo break
function playComboBreak() {
  playBeep(200, 'sawtooth', 0.15, 0.2);
  setTimeout(() => playBeep(150, 'sawtooth', 0.15, 0.15), 80);
}

// Hold charge - continuous hum
let holdOsc = null;
let holdGain = null;

function startHoldSound(freq) {
  try {
    stopHoldSound();
    const ctx = getAudioCtx();
    holdOsc = ctx.createOscillator();
    holdGain = ctx.createGain();
    holdOsc.type = 'triangle';
    holdOsc.frequency.value = freq || 300;
    holdGain.gain.value = 0;
    holdOsc.connect(holdGain);
    holdGain.connect(ctx.destination);
    holdOsc.start();
  } catch(e) {}
}

function updateHoldSound(progress) {
  if (holdGain) {
    holdGain.gain.setTargetAtTime(0.12 * Math.min(progress, 1), audioCtx.currentTime, 0.05);
  }
}

function stopHoldSound() {
  try {
    if (holdOsc) { holdOsc.stop(); holdOsc = null; holdGain = null; }
  } catch(e) {}
}

// Game over - descending melody
function playGameOver() {
  playBeep(440, 'sine', 0.2, 0.3);
  setTimeout(() => playBeep(330, 'sine', 0.2, 0.25), 200);
  setTimeout(() => playBeep(220, 'sine', 0.3, 0.2), 400);
  setTimeout(() => playBeep(110, 'sine', 0.6, 0.15), 600);
}

// Menu / start sound
function playMenuTick() {
  playBeep(660, 'sine', 0.05, 0.15);
}
