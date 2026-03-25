// ===== PIXEL RUSH - Main Game =====

// ===== State =====
let state = 'menu'; // menu | playing | gameover
let score = 0;
let highScore = parseInt(localStorage.getItem('pixelrush_hs') || '0');
let lives = 3;
let speed = 1;
let speedTimer = 0;
let combo = 0;
let comboTimer = 0;
let objects = [];
let particles = [];
let scorePopups = [];
let shakeTimer = 0;
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 2000;
let missedCount = 0;
let successCount = 0;

// ===== DOM =====
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const tutorial = document.getElementById('tutorial');
const startBtn = document.getElementById('startBtn');
const skipBtn = document.getElementById('skipBtn');

let W = 0, H = 0;

// ===== Colors =====
const COLORS = {
  bg: '#050510',
  neon1: '#00ff88',
  neon2: '#ff00aa',
  neon3: '#00ddff',
  neon4: '#ffdd00',
  neon5: '#ff4444',
  white: '#ffffff'
};

// ===== Resize =====
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ===== Tutorial buttons =====
startBtn.addEventListener('click', function() {
  playMenuTick();
  tutorial.classList.add('hidden');
  startGame();
});

skipBtn.addEventListener('click', function() {
  tutorial.classList.add('hidden');
  startGame();
});

// ===== Spawn =====
function spawnObject() {
  let pool;
  if (speed < 1.5) {
    pool = OBJECT_TYPES.slice(0, 3);
  } else if (speed < 2.5) {
    pool = OBJECT_TYPES.slice(0, 4);
  } else {
    pool = OBJECT_TYPES;
  }
  const template = pool[Math.floor(Math.random()*pool.length)];
  const o = Object.assign({}, template);
  o.id = Date.now() + Math.random();
  o.life = Math.max(1.2, 3.0 - speed * 0.4);
  o.pulse = 0;
  o.size = template.type === 'double_tap' ? 38 : template.type === 'hold' ? 50 : template.type === 'tap' ? 44 : 50;
  template.onAppear(o, W, H);
  objects.push(o);
}

// ===== Particles =====
function burst(x, y, color, count) {
  for (let i=0; i<count; i++) {
    const angle = (Math.PI*2/count)*i + Math.random()*0.5;
    const spd = 3 + Math.random()*5;
    particles.push({
      x, y,
      vx: Math.cos(angle)*spd,
      vy: Math.sin(angle)*spd,
      color,
      size: 4 + Math.random()*4,
      life: 1
    });
  }
}

function scorePopup(x, y, text, color) {
  scorePopups.push({ x, y, text, color, life: 1, vy: -2 });
}

// ===== Hit / Miss =====
function hitObject(o, idx) {
  objects.splice(idx, 1);
  burst(o.x, o.y, o.color, 12);
  combo++;
  comboTimer = 1.5;
  const multiplier = Math.min(Math.floor(combo/3)+1, 5);
  const pts = 10 * multiplier * Math.ceil(speed);
  score += pts;
  successCount++;
  shakeTimer = 0.1;
  scorePopup(o.x, o.y-20, '+'+pts+'  x'+multiplier, o.color);
  stopHoldSound();
  playHit();
  if (combo >= 3) playCombo(Math.min(Math.floor(combo/3), 5));
  if (score > highScore) highScore = score;
}

function missObject(o, idx) {
  objects.splice(idx, 1);
  burst(o.x, o.y, COLORS.neon5, 8);
  const hadCombo = combo >= 2;
  combo = 0;
  lives--;
  shakeTimer = 0.25;
  missedCount++;
  scorePopup(o.x, o.y-20, 'MISS', COLORS.neon5);
  stopHoldSound();
  playMiss();
  if (hadCombo) playComboBreak();
  if (lives <= 0) {
    playGameOver();
    endGame();
  }
}

// ===== Input =====
let activeHolds = {};      // touch id -> object
let touchStartPos = {};     // touch id -> {x, y}
let pendingSwipes = {};    // touch id -> {startX, startY}  pending detection

function handlePointerStart(x, y, id) {
  if (state === 'gameover') {
    // Restart button
    const r = getRestartBtnRect();
    if (r && x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) {
      playMenuTick();
      startGame();
    }
    return;
  }

  if (state !== 'playing') return;

  touchStartPos[id] = { x, y };

  // Find object under touch
  for (let i=objects.length-1; i>=0; i--) {
    const o = objects[i];
    const dx = x - o.x;
    const dy = y - o.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (o.type === 'tap' && dist < o.size + 35) {
      hitObject(o, i);
      return;
    }
    if (o.type === 'double_tap' && dist < o.size + 35) {
      o.tapCount++;
      burst(x, y, o.color, 6);
      if (o.tapCount >= 2) hitObject(o, i);
      return;
    }
    if (o.type === 'hold' && dist < o.size + 40) {
      activeHolds[id] = o;
      o.holding = true;
      return;
    }
    // Swipe objects: mark as pending, full swipe zone
    if (o.type === 'swipe_up' || o.type === 'swipe_down') {
      pendingSwipes[id] = o;
      return;
    }
  }
}

function handlePointerEnd(x, y, id) {
  const startPos = touchStartPos[id];
  delete touchStartPos[id];

  if (state === 'gameover') return;
  if (state !== 'playing') return;

  // Check pending swipe
  const o = pendingSwipes[id];
  delete pendingSwipes[id];
  if (o && startPos) {
    const dy = startPos.y - y; // positive = finger moved UP
    const swipeDist = Math.abs(dy);
    const idx = objects.indexOf(o);
    if (swipeDist > 35) {
      if ((o.type === 'swipe_up' && dy > 0) || (o.type === 'swipe_down' && dy < 0)) {
        hitObject(o, idx);
      } else {
        missObject(o, idx);
      }
    }
    return;
  }

  // Check hold release
  const holdObj = activeHolds[id];
  delete activeHolds[id];
  if (holdObj) {
    holdObj.holding = false;
    const idx = objects.indexOf(holdObj);
    if (idx >= 0 && holdObj.holdProgress < holdObj.holdTarget) {
      missObject(holdObj, idx);
    }
  }
}

// Touch events
canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    handlePointerStart(t.clientX, t.clientY, t.identifier);
  }
}, {passive:false});

canvas.addEventListener('touchend', function(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const startPos = touchStartPos[t.identifier];
    handlePointerEnd(t.clientX, t.clientY, t.identifier);
    // restore for touchend processing
    if (startPos) touchStartPos[t.identifier] = startPos;
  }
}, {passive:false});

canvas.addEventListener('touchcancel', function(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const o = pendingSwipes[t.identifier];
    if (o) {
      const idx = objects.indexOf(o);
      if (idx >= 0) missObject(o, idx);
      delete pendingSwipes[t.identifier];
    }
    delete touchStartPos[t.identifier];
    const holdObj = activeHolds[t.identifier];
    delete activeHolds[t.identifier];
    if (holdObj) {
      holdObj.holding = false;
      const idx = objects.indexOf(holdObj);
      if (idx >= 0 && holdObj.holdProgress < holdObj.holdTarget) missObject(holdObj, idx);
    }
  }
}, {passive:false});

// Mouse events
canvas.addEventListener('mousedown', function(e) {
  handlePointerStart(e.clientX, e.clientY, 'mouse');
});
canvas.addEventListener('mouseup', function(e) {
  handlePointerEnd(e.clientX, e.clientY, 'mouse');
});

// ===== Update =====
function update(dt) {
  if (state !== 'playing') return;

  speedTimer += dt;
  if (speedTimer >= 8) {
    speedTimer = 0;
    speed += 0.25;
    spawnInterval = Math.max(600, 2000 - speed*200);
  }

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  spawnTimer += dt * 1000;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnObject();
  }

  for (let i=objects.length-1; i>=0; i--) {
    const o = objects[i];
    o.life -= dt;
    o.pulse = Math.sin(Date.now()*0.008)*4;

    if (o.type === 'hold' && o.holding) {
      o.holdProgress += dt;
      updateHoldSound(o.holdProgress / o.holdTarget);
      if (o.holdProgress >= o.holdTarget) {
        hitObject(o, i);
      }
    }

    if (o.life <= 0) {
      missObject(o, i);
    }
  }

  for (let i=particles.length-1; i>=0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2;
    p.life -= dt*2;
    if (p.life <= 0) particles.splice(i,1);
  }

  for (let i=scorePopups.length-1; i>=0; i--) {
    const p = scorePopups[i];
    p.y += p.vy;
    p.life -= dt*1.2;
    if (p.life <= 0) scorePopups.splice(i,1);
  }

  if (shakeTimer > 0) shakeTimer -= dt;
}

// ===== Draw =====
function draw() {
  ctx.save();

  if (shakeTimer > 0) {
    ctx.translate(
      (Math.random()-0.5)*8*shakeTimer,
      (Math.random()-0.5)*8*shakeTimer
    );
  }

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x=0; x<W; x+=30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0; y<H; y+=30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Speed edge glow
  if (speed > 1) {
    const alpha = Math.min((speed-1)/3*0.35, 0.35);
    ctx.strokeStyle = `rgba(0,255,136,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(10,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W-10,0); ctx.lineTo(W-10,H); ctx.stroke();
  }

  if (state === 'playing' || state === 'gameover') {
    drawObjects();
    drawParticles();
    drawPopups();
    drawHUD();
    if (state === 'gameover') drawGameOver();
  }

  ctx.restore();
}

function drawObjects() {
  const now = Date.now();
  for (const o of objects) {
    o.draw(o, ctx, now);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
    ctx.restore();
  }
}

function drawPopups() {
  for (const p of scorePopups) {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.font = 'bold 18px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

function drawHUD() {
  ctx.save();
  ctx.textAlign = 'left';

  // Score
  ctx.shadowColor = COLORS.white;
  ctx.shadowBlur = 10;
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 26px Courier New, monospace';
  ctx.fillText(score, 16, 46);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#555';
  ctx.font = '10px Courier New, monospace';
  ctx.fillText('SCORE', 16, 60);

  // Combo
  if (combo >= 2) {
    ctx.textAlign = 'right';
    const lvl = Math.min(Math.floor(combo/3)+1, 5);
    ctx.shadowColor = COLORS.neon4;
    ctx.shadowBlur = 15;
    ctx.fillStyle = COLORS.neon4;
    ctx.font = 'bold 20px Courier New, monospace';
    ctx.fillText('x' + lvl + ' COMBO', W-16, 40);
    ctx.shadowBlur = 0;
  }

  // Lives
  ctx.textAlign = 'right';
  for (let i=0; i<3; i++) {
    ctx.fillStyle = i < lives ? COLORS.neon5 : '#222';
    ctx.shadowColor = i < lives ? COLORS.neon5 : 'transparent';
    ctx.shadowBlur = i < lives ? 12 : 0;
    ctx.font = '18px sans-serif';
    ctx.fillText('❤', W-16 - i*26, 72);
  }

  // Speed
  ctx.textAlign = 'left';
  const speedLabel = speed < 1.5 ? 'SLOW' : speed < 2.5 ? 'FAST' : 'CHAOS';
  const speedColor = speed < 1.5 ? COLORS.neon3 : speed < 2.5 ? COLORS.neon4 : COLORS.neon5;
  ctx.fillStyle = speedColor;
  ctx.font = 'bold 10px Courier New, monospace';
  ctx.fillText(speedLabel, 16, 90);

  ctx.restore();
}

// ===== Restart Button =====
let restartBtnRect = null;

function getRestartBtnRect() {
  return restartBtnRect;
}

function drawGameOver() {
  // Dim overlay - separate from shake
  ctx.save();
  ctx.fillStyle = 'rgba(5,5,16,0.88)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';

  // Title
  ctx.shadowColor = COLORS.neon5;
  ctx.shadowBlur = 30;
  ctx.fillStyle = COLORS.neon5;
  ctx.font = 'bold 30px Courier New, monospace';
  ctx.fillText('GAME OVER', W/2, H*0.28);

  // Score
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 52px Courier New, monospace';
  ctx.fillText(score, W/2, H*0.44);
  ctx.fillStyle = '#555';
  ctx.font = '11px Courier New, monospace';
  ctx.fillText('最终得分', W/2, H*0.44 + 24);

  // High score
  if (score >= highScore) {
    ctx.fillStyle = COLORS.neon4;
    ctx.shadowColor = COLORS.neon4;
    ctx.shadowBlur = 15;
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.fillText('★ 新纪录！★', W/2, H*0.56);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#484848';
    ctx.font = '12px Courier New, monospace';
    ctx.fillText('最高: ' + highScore, W/2, H*0.56);
  }

  // Stats
  ctx.fillStyle = '#3a3a3a';
  ctx.font = '11px Courier New, monospace';
  ctx.fillText('成功: ' + successCount + '  ·  失误: ' + missedCount + '  ·  最高速度: ' + speed.toFixed(1) + 'x', W/2, H*0.64);

  // Restart button
  const bw = 200, bh = 52;
  const bx = W/2 - bw/2;
  const by = H * 0.78;
  restartBtnRect = { x:bx, y:by, w:bw, h:bh };

  ctx.shadowColor = COLORS.neon1;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = COLORS.neon1;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,255,136,0.08)';
  ctx.fill();
  ctx.fillStyle = COLORS.neon1;
  ctx.font = 'bold 15px Courier New, monospace';
  ctx.fillText('再来一次', W/2, by + bh/2 + 5);

  ctx.restore();
}

// ===== Game Control =====
function startGame() {
  state = 'playing';
  score = 0;
  lives = 3;
  speed = 1;
  speedTimer = 0;
  combo = 0;
  comboTimer = 0;
  objects = [];
  particles = [];
  scorePopups = [];
  spawnTimer = 0;
  spawnInterval = 2000;
  missedCount = 0;
  successCount = 0;
  activeHolds = {};
  touchStartPos = {};
  pendingSwipes = {};
  restartBtnRect = null;
  shakeTimer = 0;
  setTimeout(spawnObject, 500);
}

function endGame() {
  state = 'gameover';
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('pixelrush_hs', highScore);
  }
}

// ===== Main Loop =====
function loop(time) {
  const dt = Math.min((time - lastTime)/1000, 0.1);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loop(0);
