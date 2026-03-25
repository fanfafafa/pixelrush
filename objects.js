// ===== Game Object Definitions =====

const OBJECT_TYPES = [
  {
    type: 'tap',
    color: '#00ff88',
    desc: 'TAP',
    onAppear: function(o, W, H) {
      o.x = W/2 + (Math.random()-0.5)*W*0.6;
      o.y = H/2 + (Math.random()-0.5)*H*0.4;
    },
    draw: function(o, ctx, now) {
      ctx.save();
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 25 + Math.sin(now*0.005)*8;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size + (o.pulse||0), 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size*0.4, 0, Math.PI*2);
      ctx.stroke();
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x-4, o.y-4, 8, 8);
      ctx.font = 'bold 11px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TAP', o.x, o.y + o.size + 22);
      ctx.restore();
    }
  },
  {
    type: 'swipe_up',
    color: '#ff00aa',
    desc: '↑ SWIPE',
    onAppear: function(o, W, H) {
      o.x = W/2 + (Math.random()-0.5)*W*0.5;
      o.y = H * 0.65;
    },
    draw: function(o, ctx, now) {
      ctx.save();
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3;
      // Arrow body
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x-4, o.y-30, 8, 50);
      // Arrow head
      ctx.fillRect(o.x-18, o.y-48, 36, 10);
      ctx.fillRect(o.x-12, o.y-38, 24, 8);
      ctx.fillRect(o.x-6,  o.y-28, 12, 6);
      // Glow ring
      ctx.globalAlpha = 0.3 + Math.sin(now*0.006)*0.2;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size + 10 + (o.pulse||0), 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    type: 'swipe_down',
    color: '#00ddff',
    desc: '↓ SWIPE',
    onAppear: function(o, W, H) {
      o.x = W/2 + (Math.random()-0.5)*W*0.5;
      o.y = H * 0.35;
    },
    draw: function(o, ctx, now) {
      ctx.save();
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3;
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x-4, o.y-20, 8, 50);
      ctx.fillRect(o.x-18, o.y+38, 36, 10);
      ctx.fillRect(o.x-12, o.y+30, 24, 8);
      ctx.fillRect(o.x-6,  o.y+22, 12, 6);
      ctx.restore();
    }
  },
  {
    type: 'hold',
    color: '#ffdd00',
    desc: 'HOLD',
    onAppear: function(o, W, H) {
      o.x = W/2 + (Math.random()-0.5)*W*0.6;
      o.y = H/2 + (Math.random()-0.5)*H*0.35;
      o.holdProgress = 0;
      o.holding = false;
      // 初始值，后续在 spawnObject 中会根据当前速度重新计算
      o.holdTarget = 1.2;
    },
    draw: function(o, ctx, now) {
      ctx.save();
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3;
      // Outer target ring
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size + 15, 0, Math.PI*2);
      ctx.stroke();
      // Progress arc
      if (o.holdProgress > 0) {
        const prog = Math.min(o.holdProgress/o.holdTarget, 1);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size+15, -Math.PI/2, -Math.PI/2 + Math.PI*2*prog);
        ctx.strokeStyle = o.color;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      // Main circle
      ctx.strokeStyle = o.color;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size + (o.pulse||0), 0, Math.PI*2);
      ctx.stroke();
      // Center fill
      const prog = Math.min(o.holdProgress/o.holdTarget, 1);
      ctx.fillStyle = `rgba(255,221,0,${0.15 + prog*0.25})`;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.size*0.7, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = o.color;
      ctx.font = 'bold 11px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOLD', o.x, o.y + o.size + 22);
      ctx.restore();
    }
  },
  {
    type: 'double_tap',
    color: '#ff4444',
    desc: '2x TAP',
    onAppear: function(o, W, H) {
      o.x = W/2 + (Math.random()-0.5)*W*0.5;
      o.y = H/2 + (Math.random()-0.5)*H*0.35;
      o.tapCount = 0;
      o.done = false;
    },
    draw: function(o, ctx, now) {
      ctx.save();
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 3;
      const gap = 28 + (o.pulse||0);
      ctx.beginPath();
      ctx.arc(o.x - gap/2, o.y, o.size, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(o.x + gap/2, o.y, o.size, 0, Math.PI*2);
      ctx.stroke();
      // Fill done circles
      if (o.tapCount >= 1) {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x-gap/2, o.y, o.size*0.5, 0, Math.PI*2);
        ctx.fill();
      }
      if (o.tapCount >= 2) {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x+gap/2, o.y, o.size*0.5, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle = o.color;
      ctx.font = 'bold 10px Courier New, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('2x TAP', o.x, o.y + o.size + 22);
      ctx.restore();
    }
  }
];
