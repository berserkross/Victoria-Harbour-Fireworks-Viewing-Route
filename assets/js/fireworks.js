/* =============================================================
   fireworks.js — 鼠标点击处的烟花特效
   -------------------------------------------------------------
   · 纯 Canvas，无依赖
   · 只在页面空白处／文字上点火，点链接或按钮不会触发（不影响点按）
   · 没有粒子时自动停掉 requestAnimationFrame，不空转
   · 系统开了「减少动态效果」时整个脚本不启动
   ============================================================= */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'fw-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* 接近真实烟花的配色：暖芯 + 彩色外圈 */
  var HUES = [46, 12, 348, 300, 205, 165];

  var parts = [];
  var running = false;

  function burst(x, y) {
    var hue = HUES[(Math.random() * HUES.length) | 0];
    var n = 58 + ((Math.random() * 34) | 0);

    /* 一闪：炸开的瞬间有一团白光 */
    parts.push({
      x: x, y: y, vx: 0, vy: 0,
      life: 1, decay: 0.075,
      size: 46, flash: true,
      color: '255,255,255'
    });

    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.22;
      var sp = 1.7 + Math.random() * 4.4;
      /* 靠近中心的偏白、外围偏色，像真烟花那样分层 */
      var warm = Math.random() < 0.26;
      parts.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
        decay: 0.011 + Math.random() * 0.017,
        size: 1.3 + Math.random() * 2,
        color: warm ? '255,246,214'
                    : hslToRgb(hue + (Math.random() * 26 - 13), 0.95, 0.6 + Math.random() * 0.16)
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  /* 小工具：hsl -> "r,g,b" */
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return ((r * 255) | 0) + ',' + ((g * 255) | 0) + ',' + ((b * 255) | 0);
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];

      if (p.flash) {
        p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (1.25 - p.life));
        g.addColorStop(0, 'rgba(255,255,255,' + (p.life * 0.85).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.25 - p.life), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.965;          /* 空气阻力 */
      p.vy = p.vy * 0.965 + 0.055;  /* 加一点重力，尾部自然下垂 */
      p.life -= p.decay;

      if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }

      /* 拖尾：用一条短线代替圆点，运动感更强 */
      ctx.strokeStyle = 'rgba(' + p.color + ',' + Math.min(1, p.life * 1.15).toFixed(3) + ')';
      ctx.lineWidth = p.size * p.life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      ctx.stroke();
    }

    if (parts.length) {
      requestAnimationFrame(tick);
    } else {
      running = false;
      ctx.clearRect(0, 0, W, H);
    }
  }

  /* 只在自己的地盘点火：链接、按钮、表单控件上不触发 */
  var INTERACTIVE = 'a,button,input,label,select,textarea,summary,[role="button"]';

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;                       /* 只响应左键 */
    if (e.target.closest && e.target.closest(INTERACTIVE)) return;
    /* 触屏上不点火：手指点哪儿哪儿都被挡住，且很费电 */
    if (e.pointerType === 'touch') return;
    burst(e.clientX, e.clientY);
  }, { passive: true });
})();
