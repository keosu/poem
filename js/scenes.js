'use strict';

// 所有坐标都是相对底图（1536×1024）的归一化坐标：x 以图宽为单位，y 以图高为单位，
// 尺寸以图宽为单位。底图按 cover 方式铺满屏幕，env 负责换算到屏幕像素。

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const flick = (t, s) => Math.sin(t * 9.1 + s) * 0.4 + Math.sin(t * 15.7 + s * 1.9) * 0.35 + Math.sin(t * 27.3 + s * 3.1) * 0.25;

function interp(pts, y) {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, v0] = pts[i - 1], [y1, v1] = pts[i];
      return lerp(v0, v1, (y - y0) / (y1 - y0));
    }
  }
  return pts[pts.length - 1][1];
}

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ---------------- 预渲染贴图 ---------------- */

const spriteCache = new Map();
function cached(key, make) {
  if (!spriteCache.has(key)) spriteCache.set(key, make());
  return spriteCache.get(key);
}

function glowSprite(rgb) {
  return cached('glow' + rgb, () => {
    const c = canvasOf(128, 128), g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.18, `rgba(${rgb},0.55)`);
    gr.addColorStop(0.45, `rgba(${rgb},0.16)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  });
}

function cloudSprite(rgb, { w = 384, h = 160, n = 18, seed = 1, a = 0.32 } = {}) {
  return cached(`cloud${rgb}|${w}|${h}|${n}|${seed}|${a}`, () => {
    const R = mulberry(seed * 9973 + 17), c = canvasOf(w, h), g = c.getContext('2d');
    for (let i = 0; i < n; i++) {
      const r = h * (0.16 + R() * 0.26);
      const x = w / 2 + (R() + R() - 1) * (w / 2 - r);
      const y = h / 2 + (R() + R() - 1) * (h / 2 - r) * 0.7;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},${a})`);
      gr.addColorStop(0.6, `rgba(${rgb},${a * 0.4})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
  });
}

function flakeSprite() {
  return cached('flake', () => {
    const c = canvasOf(64, 64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.32, 'rgba(255,255,255,0.95)');
    gr.addColorStop(0.5, 'rgba(130,138,152,0.32)');
    gr.addColorStop(1, 'rgba(130,138,152,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  });
}

function petalSprite(c1, c2) {
  return cached(`petal${c1}${c2}`, () => {
    const c = canvasOf(64, 64), g = c.getContext('2d');
    g.translate(32, 32);
    const gr = g.createRadialGradient(0, 14, 2, 0, 0, 30);
    gr.addColorStop(0, `rgb(${c1})`);
    gr.addColorStop(1, `rgb(${c2})`);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, 28);
    g.bezierCurveTo(14, 18, 24, 0, 18, -16);
    g.quadraticCurveTo(14, -27, 6, -27);
    g.quadraticCurveTo(2, -27, 0, -21);
    g.quadraticCurveTo(-2, -27, -6, -27);
    g.quadraticCurveTo(-14, -27, -18, -16);
    g.bezierCurveTo(-24, 0, -14, 18, 0, 28);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 25); g.lineTo(0, -12); g.stroke();
    return c;
  });
}

function mapleSprite(c1, c2) {
  return cached(`maple${c1}${c2}`, () => {
    const S = 96, R = 40, c = canvasOf(S, S), g = c.getContext('2d');
    g.translate(S / 2, S / 2 + 4);
    const lowerK = (th) => 1 - 0.38 * smooth(1.7, 2.6, Math.abs(th));
    g.beginPath();
    const N = 260;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * TAU - Math.PI;
      const lobe = Math.pow(Math.abs(Math.cos(2.5 * th)), 2.2);
      const serr = 1 + 0.06 * Math.abs(Math.sin(12.5 * th));
      let r = R * (0.36 + 0.64 * lobe) * lowerK(th) * serr;
      if (Math.abs(th) > 2.95) r = R * 0.12;
      const x = r * Math.sin(th), y = -r * Math.cos(th);
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, R);
    gr.addColorStop(0, `rgb(${c1})`);
    gr.addColorStop(1, `rgb(${c2})`);
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = 'rgba(80,18,8,0.35)';
    g.lineWidth = 1.2;
    for (const th of [0, 1.2566, -1.2566, 2.513, -2.513]) {
      const r = R * 0.82 * lowerK(th);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(r * Math.sin(th), -r * Math.cos(th)); g.stroke();
    }
    g.strokeStyle = `rgb(${c2})`;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, R * 0.62); g.stroke();
    return c;
  });
}

/* ---------------- 绘制辅助 ---------------- */

function drawGlow(ctx, spr, x, y, d, a, h) {
  if (a <= 0.003) return;
  ctx.globalAlpha = Math.min(1, a);
  const hh = h || d;
  ctx.drawImage(spr, x - d / 2, y - hh / 2, d, hh);
  ctx.globalAlpha = 1;
}

// 横向漂移的云雾，在区域两端渐隐，避免突兀地出现/消失
function makeDrifters(n, cfg) {
  return Array.from({ length: n }, (_, i) => ({
    x: rand(cfg.x0, cfg.x1),
    y: rand(cfg.y0, cfg.y1),
    w: rand(cfg.w[0], cfg.w[1]),
    v: rand(cfg.v[0], cfg.v[1]),
    a: rand(cfg.a[0], cfg.a[1]),
    ph: rand(0, TAU),
    spr: cfg.sprite(i),
  }));
}
function drawDrifters(ctx, env, list, cfg, t, dt) {
  const span = cfg.x1 - cfg.x0, edge = cfg.fade || 0.14;
  for (const d of list) {
    d.x += d.v * dt;
    if (d.x > cfg.x1) { d.x -= span; d.y = rand(cfg.y0, cfg.y1); }
    const f = Math.min(smooth(cfg.x0, cfg.x0 + edge, d.x), 1 - smooth(cfg.x1 - edge, cfg.x1, d.x));
    const a = d.a * f * (0.82 + 0.18 * Math.sin(t * 0.3 + d.ph));
    if (a <= 0.004) continue;
    const w = env.S(d.w), h = (w * d.spr.height) / d.spr.width;
    ctx.globalAlpha = a;
    ctx.drawImage(d.spr, env.X(d.x) - w / 2, env.Y(d.y + Math.sin(t * 0.17 + d.ph) * 0.006) - h / 2, w, h);
  }
  ctx.globalAlpha = 1;
}

// 水面涟漪：扁椭圆扩散
function drawRipples(ctx, env, list, dt, style) {
  ctx.lineWidth = style.lw || 1;
  for (let i = list.length - 1; i >= 0; i--) {
    const r = list[i];
    r.age += dt;
    const k = r.age / r.life;
    if (k >= 1) { list.splice(i, 1); continue; }
    if (k < 0) continue;
    const rx = env.S(lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 2.2))), ry = rx * r.ratio;
    const a = r.a * Math.pow(1 - k, 1.4) * smooth(0, 0.06, k);
    const x = env.X(r.x), y = env.Y(r.y);
    if (style.dark) {
      ctx.strokeStyle = `rgba(${style.dark},${a})`;
      ctx.beginPath(); ctx.ellipse(x, y + 1.2, rx, ry, 0, 0, TAU); ctx.stroke();
    }
    if (style.light) {
      ctx.strokeStyle = `rgba(${style.light},${a})`;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke();
    }
  }
}

// 侧面飞鸟剪影，wing ∈ [-1,1] 为翅膀上下位置
function drawBird(ctx, x, y, s, wing, dir, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.15, -0.05, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(s * 0.47, -s * 0.06, s * 0.13, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.07); ctx.lineTo(s * 0.74, -s * 0.03); ctx.lineTo(s * 0.6, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.42, 0); ctx.lineTo(-s * 0.82, -s * 0.1); ctx.lineTo(-s * 0.78, s * 0.1); ctx.closePath(); ctx.fill();
  const wy = -s * 0.95 * wing;
  ctx.beginPath();
  ctx.moveTo(s * 0.18, -s * 0.04);
  ctx.quadraticCurveTo(0, wy * 0.65, -s * 0.42, wy);
  ctx.quadraticCurveTo(-s * 0.12, wy * 0.3, -s * 0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ================= 场景 ================= */

// 《静夜思》：窗中月晕、薄云掠月、月光斜照、浮尘与地上霜光
function createJingyesi(env) {
  const MOON = [0.832, 0.236];
  const WIN = { x: 0.803, y: 0.40, rx: 0.172, ry: 0.305 };
  const moonGlow = glowSprite('222,230,255');
  const dust = glowSprite('230,236,255');
  const wisps = [0, 1, 2, 3].map((i) => ({
    x: rand(WIN.x - WIN.rx, WIN.x + WIN.rx),
    y: rand(0.17, 0.44),
    w: rand(0.18, 0.3),
    v: rand(0.004, 0.008),
    a: rand(0.3, 0.5),
    spr: cloudSprite('196,208,238', { w: 480, h: 70, n: 30, seed: 11 + i, a: 0.2 }),
  }));
  const Q = [[0.69, 0.42], [0.955, 0.38], [0.99, 1.03], [0.42, 1.03]];
  const inBeam = (s, u) => [
    lerp(lerp(Q[0][0], Q[1][0], s), lerp(Q[3][0], Q[2][0], s), u),
    lerp(lerp(Q[0][1], Q[1][1], s), lerp(Q[3][1], Q[2][1], s), u),
  ];
  const motes = Array.from({ length: 50 }, () => ({
    s: rand(0.05, 0.95), u: rand(0.15, 0.85), vs: rand(-0.012, 0.012), vu: rand(-0.01, 0.004),
    r: rand(0.0015, 0.0035), ph: rand(0, TAU), sp: rand(0.5, 1.6),
  }));
  const frost = Array.from({ length: 70 }, () => ({
    s: rand(0.03, 0.97), u: rand(0.62, 0.99), r: rand(0.002, 0.0045), ph: rand(0, TAU), per: rand(2.5, 6.5),
  }));
  let beam = null, nextCricket = rand(1, 3);

  function buildBeam() {
    const sc = 0.5, c = canvasOf(Math.ceil(env.W * sc), Math.ceil(env.H * sc)), g = c.getContext('2d');
    g.scale(sc, sc);
    g.filter = `blur(${Math.max(4, env.S(0.018) * sc)}px)`;
    const gr = g.createLinearGradient(env.X(0.82), env.Y(0.4), env.X(0.66), env.Y(1.0));
    gr.addColorStop(0, 'rgba(190,206,248,0)');
    gr.addColorStop(0.35, 'rgba(190,206,248,0.22)');
    gr.addColorStop(0.8, 'rgba(190,206,248,0.13)');
    gr.addColorStop(1, 'rgba(190,206,248,0.07)');
    g.fillStyle = gr;
    g.beginPath();
    Q.forEach(([x, y], i) => (i ? g.lineTo(env.X(x), env.Y(y)) : g.moveTo(env.X(x), env.Y(y))));
    g.closePath();
    g.fill();
    beam = c;
  }

  return {
    resize: buildBeam,
    draw(ctx, t, dt) {
      if (!beam) buildBeam();
      const br = 0.5 + 0.5 * Math.sin(t * 0.5);
      const mx = env.X(MOON[0]), my = env.Y(MOON[1]);

      ctx.globalCompositeOperation = 'screen';
      drawGlow(ctx, moonGlow, mx, my, env.S(0.6), 0.08 + 0.04 * br);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(env.X(WIN.x), env.Y(WIN.y), env.S(WIN.rx), env.dh * WIN.ry, 0, 0, TAU);
      ctx.clip();
      drawGlow(ctx, moonGlow, mx, my, env.S(0.17 * (1 + 0.04 * Math.sin(t * 0.7))), 0.42 + 0.14 * br);
      ctx.globalCompositeOperation = 'source-over';
      for (const w of wisps) {
        w.x += w.v * dt;
        if (w.x - w.w / 2 > WIN.x + WIN.rx) { w.x = WIN.x - WIN.rx - w.w / 2; w.y = rand(0.17, 0.44); }
        const W = env.S(w.w), H = (W * w.spr.height) / w.spr.width;
        ctx.globalAlpha = w.a;
        ctx.drawImage(w.spr, env.X(w.x) - W / 2, env.Y(w.y) - H / 2, W, H);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.72 + 0.28 * Math.sin(t * 0.4);
      ctx.drawImage(beam, 0, 0, env.W, env.H);
      ctx.globalAlpha = 1;

      for (const m of motes) {
        m.s += (m.vs + Math.sin(t * 0.3 + m.ph) * 0.006) * dt;
        m.u += (m.vu + Math.cos(t * 0.25 + m.ph) * 0.004) * dt;
        if (m.s < 0) m.s += 1; if (m.s > 1) m.s -= 1;
        if (m.u < 0.1) m.u = 0.9; if (m.u > 0.95) m.u = 0.12;
        const [x, y] = inBeam(m.s, m.u);
        const a = (0.3 + 0.35 * Math.sin(t * m.sp + m.ph)) * smooth(0.1, 0.25, m.u) * (1 - smooth(0.8, 0.95, m.u));
        drawGlow(ctx, dust, env.X(x), env.Y(y), env.S(m.r * 4), a);
      }

      ctx.lineWidth = 0.8;
      for (const f of frost) {
        const k = Math.pow(Math.max(0, Math.sin((t * TAU) / f.per + f.ph)), 6);
        if (k < 0.02) continue;
        const [x, y] = inBeam(f.s, f.u);
        const X = env.X(x), Y = env.Y(y), r = env.S(f.r) * (0.6 + 0.6 * k);
        drawGlow(ctx, dust, X, Y, r * 3.2, k * 0.75);
        ctx.strokeStyle = `rgba(236,242,255,${k * 0.75})`;
        ctx.beginPath();
        ctx.moveTo(X - r, Y); ctx.lineTo(X + r, Y);
        ctx.moveTo(X, Y - r * 0.6); ctx.lineTo(X, Y + r * 0.6);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (t > nextCricket) { env.sfx('cricket'); nextCricket = t + rand(1.8, 5); }
    },
  };
}

// 《春晓》：风吹落花、花落水面泛涟漪、时有时无的细雨、朝阳光晕、飞鸟啼鸣
function createChunxiao(env) {
  const SUN = [0.656, 0.39];
  const WATER = { x0: 0.33, x1: 0.64, y0: 0.80, y1: 0.985 };
  const sprites = [
    petalSprite('255,216,226', '236,140,168'),
    petalSprite('255,228,234', '244,162,186'),
    petalSprite('252,200,214', '224,118,150'),
  ];
  const sun = glowSprite('255,228,182');
  const mistCfg = {
    x0: env.vis.x0 - 0.2, x1: env.vis.x1 + 0.2, y0: 0.5, y1: 0.72,
    w: [0.35, 0.55], v: [0.004, 0.009], a: [0.25, 0.4],
    sprite: (i) => cloudSprite('255,250,242', { seed: 30 + i }),
  };
  const mist = makeDrifters(4, mistCfg);
  const ripples = [], birds = [];
  let nextBird = rand(2, 4), nextChirp = rand(1, 3);

  function spawn(p, init) {
    if (init) {
      p.x = rand(env.vis.x0, env.vis.x1);
      p.y = rand(env.vis.y0, 0.85);
    } else if (Math.random() < 0.8) {
      p.x = rand(0.27, 1.04);
      p.y = 0.4 - 0.4 * clamp((p.x - 0.25) / 0.75, 0, 1) + rand(-0.05, 0.08);
    } else {
      p.x = rand(0.86, 1.02);
      p.y = rand(0.3, 0.62);
    }
    p.s = rand(0.0065, 0.012);
    p.vy = rand(0.028, 0.05);
    p.k = rand(0.6, 1.4);
    p.rot = rand(0, TAU); p.vr = rand(-1.3, 1.3);
    p.fl = rand(0, TAU); p.vf = rand(1.5, 3.6);
    p.ph = rand(0, TAU);
    p.spr = pick(sprites);
    p.state = 0; p.age = init ? 1 : 0; p.life = 0;
    p.landY = rand(WATER.y0, WATER.y1);
    return p;
  }
  const petals = Array.from({ length: Math.round(48 * env.k) }, () => spawn({}, true));

  const drops = Array.from({ length: 80 }, () => ({
    x: rand(env.vis.x0, env.vis.x1), y: rand(env.vis.y0, 1), v: rand(0.75, 1.05),
    len: rand(0.02, 0.04), landY: rand(0.8, 1.0),
  }));

  return {
    draw(ctx, t, dt) {
      const sx = env.X(SUN[0]), sy = env.Y(SUN[1]);
      ctx.globalCompositeOperation = 'screen';
      drawGlow(ctx, sun, sx, sy, env.S(0.45), 0.5 + 0.12 * Math.sin(t * 0.5));
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * 0.64 + (i - 3) * 0.13 + Math.sin(t * 0.07 + i) * 0.03;
        const L = env.S(0.9), w = env.S(0.035 + 0.025 * Math.sin(i * 2.3) ** 2);
        const a = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.3 + i * 1.7));
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang);
        const gr = ctx.createLinearGradient(0, 0, L, 0);
        gr.addColorStop(0, `rgba(255,236,200,${a})`);
        gr.addColorStop(1, 'rgba(255,236,200,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, -w / 2); ctx.lineTo(L, w / 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';

      drawDrifters(ctx, env, mist, mistCfg, t, dt);

      // 细雨：强度缓慢起伏，有时完全停歇
      const rain = clamp(0.45 + 0.65 * Math.sin(t * 0.09 + 0.4), 0, 1);
      const nRain = Math.round(drops.length * rain);
      ctx.strokeStyle = 'rgba(130,140,152,0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      drops.forEach((d, i) => {
        d.y += d.v * dt;
        d.x -= 0.12 * d.v * dt * (env.dh / env.dw);
        if (d.y > d.landY) {
          if (i < nRain && d.x > WATER.x0 && d.x < WATER.x1 && d.y > WATER.y0) {
            ripples.push({ x: d.x, y: d.y, r0: 0.002, r1: rand(0.012, 0.022), ratio: 0.3, life: 1.6, age: 0, a: 0.5 });
          }
          d.y = env.vis.y0 - rand(0, 0.3);
          d.x = rand(env.vis.x0, env.vis.x1 + 0.1);
          d.landY = rand(0.8, 1.0);
        }
        if (i >= nRain) return;
        const x = env.X(d.x), y = env.Y(d.y), L = env.dh * d.len;
        ctx.moveTo(x, y); ctx.lineTo(x + L * 0.12, y - L);
      });
      ctx.stroke();

      drawRipples(ctx, env, ripples, dt, { light: '255,255,255', dark: '90,100,108', lw: 1 });

      const wind = 0.6 + 0.4 * Math.sin(t * 0.23) + 0.5 * Math.pow(Math.max(0, Math.sin(t * 0.61)), 3);
      for (const p of petals) {
        let a;
        if (p.state === 0) {
          p.age += dt;
          p.x += (-(0.006 + 0.022 * wind) * p.k + Math.sin(t * 1.1 + p.ph) * 0.006) * dt;
          p.y += (p.vy + Math.sin(t * 1.7 + p.ph) * 0.01) * dt;
          p.rot += p.vr * dt;
          p.fl += p.vf * dt;
          if (p.y >= p.landY && p.x > WATER.x0 && p.x < WATER.x1) {
            p.state = 1;
            ripples.push({ x: p.x, y: p.y, r0: 0.004, r1: 0.04, ratio: 0.28, life: 3.5, age: 0, a: 0.55 });
          } else if (p.y > env.vis.y1 + 0.03 || p.x < env.vis.x0 - 0.05) {
            spawn(p, false);
            continue;
          }
          a = smooth(0, 0.8, p.age);
        } else {
          p.life += dt;
          p.x -= 0.003 * dt;
          if (p.life > 8) { spawn(p, false); continue; }
          a = 1 - smooth(5, 8, p.life);
        }
        const s = env.S(p.s);
        ctx.save();
        ctx.translate(env.X(p.x), env.Y(p.y));
        if (p.state === 0) {
          ctx.rotate(p.rot);
          const c = Math.cos(p.fl);
          ctx.scale(Math.sign(c) * Math.max(0.15, Math.abs(c)), 1);
        } else {
          ctx.rotate(p.rot * 0.2);
          ctx.scale(1, 0.45);
        }
        ctx.globalAlpha = a * 0.95;
        ctx.drawImage(p.spr, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (t > nextBird) {
        const n = 1 + ((Math.random() * 3) | 0), y = rand(0.1, 0.3);
        for (let i = 0; i < n; i++) {
          birds.push({
            x: env.vis.x1 + 0.03 + i * rand(0.02, 0.05), y: y + rand(-0.03, 0.03),
            vx: -rand(0.06, 0.085), s: rand(0.011, 0.015), fl: rand(0, TAU), ph: rand(0, TAU),
          });
        }
        env.sfx('chirp');
        nextBird = t + rand(9, 16);
      }
      if (t > nextChirp) { env.sfx('chirp'); nextChirp = t + rand(2.5, 7); }
      for (let i = birds.length - 1; i >= 0; i--) {
        const b = birds[i];
        b.x += b.vx * dt;
        b.y += Math.sin(t * 2 + b.ph) * 0.012 * dt;
        const flapping = Math.sin(t * 0.9 + b.ph) > -0.35;
        if (flapping) b.fl += dt * 24;
        const wing = flapping ? Math.sin(b.fl) : 0.2;
        drawBird(ctx, env.X(b.x), env.Y(b.y), env.S(b.s), wing, -1, 'rgba(62,50,44,0.85)');
        if (b.x < env.vis.x0 - 0.05) birds.splice(i, 1);
      }
    },
  };
}

// 《江雪》：三层远近飞雪、江面雾带、孤舟与钓线处的涟漪
function createJiangxue(env) {
  const BOAT = { x: 0.684, y: 0.86 }, LINE = { x: 0.79, y: 0.878 };
  const flake = flakeSprite();
  const layers = [
    { n: 120, r: [0.0010, 0.0016], v: [0.010, 0.016], a: [0.55, 0.85], sw: 0.004 },
    { n: 70, r: [0.0018, 0.0028], v: [0.018, 0.028], a: [0.65, 0.95], sw: 0.008 },
    { n: 24, r: [0.0036, 0.0058], v: [0.032, 0.048], a: [0.55, 0.85], sw: 0.014 },
  ].map((L) => ({
    ...L,
    flakes: Array.from({ length: Math.round(L.n * env.k) }, () => ({
      x: rand(env.vis.x0, env.vis.x1), y: rand(env.vis.y0, env.vis.y1),
      r: rand(L.r[0], L.r[1]), v: rand(L.v[0], L.v[1]), a: rand(L.a[0], L.a[1]), ph: rand(0, TAU),
    })),
  }));
  const mistCfg = {
    x0: env.vis.x0 - 0.25, x1: env.vis.x1 + 0.25, y0: 0.5, y1: 0.66,
    w: [0.35, 0.55], v: [0.003, 0.006], a: [0.45, 0.7],
    sprite: (i) => cloudSprite('250,251,253', { seed: 50 + i, a: 0.36 }),
  };
  const mist = makeDrifters(5, mistCfg);
  const ripples = [];
  let nextBoat = 0.5, nextLine = 1.8;

  function drawLayer(ctx, L, t, dt) {
    for (const f of L.flakes) {
      f.y += f.v * dt;
      f.x += (Math.cos(t * 0.8 + f.ph) * L.sw - 0.002) * dt;
      if (f.y > env.vis.y1 + 0.02) { f.y = env.vis.y0 - 0.02; f.x = rand(env.vis.x0, env.vis.x1); }
      if (f.x < env.vis.x0 - 0.02) f.x = env.vis.x1 + 0.01;
      if (f.x > env.vis.x1 + 0.02) f.x = env.vis.x0 - 0.01;
      const d = env.S(f.r) * 4.4;
      ctx.globalAlpha = f.a;
      ctx.drawImage(flake, env.X(f.x) - d / 2, env.Y(f.y) - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
  }

  return {
    draw(ctx, t, dt) {
      const sky = ctx.createLinearGradient(0, env.Y(env.vis.y0), 0, env.Y(0.6));
      sky.addColorStop(0, 'rgba(70,78,92,0.12)');
      sky.addColorStop(1, 'rgba(70,78,92,0)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, env.W, env.Y(0.6));

      drawLayer(ctx, layers[0], t, dt);
      drawDrifters(ctx, env, mist, mistCfg, t, dt);
      drawLayer(ctx, layers[1], t, dt);

      if (t > nextBoat) {
        ripples.push({ x: BOAT.x, y: BOAT.y, r0: 0.05, r1: 0.17, ratio: 0.12, life: 8, age: 0, a: 0.32 });
        nextBoat = t + 3.4;
      }
      if (t > nextLine) {
        ripples.push({ x: LINE.x, y: LINE.y, r0: 0.002, r1: 0.05, ratio: 0.2, life: 5, age: 0, a: 0.42 });
        nextLine = t + rand(2.2, 3.4);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, env.W, env.H);
      ctx.rect(env.X(0.628), env.Y(0.772), env.S(0.11), env.dh * 0.093);
      ctx.clip('evenodd');
      drawRipples(ctx, env, ripples, dt, { dark: '105,113,125', light: '255,255,255', lw: 1 });
      ctx.restore();

      drawLayer(ctx, layers[2], t, dt);
    },
  };
}

// 《望庐山瀑布》：飞流直下的水纹、谷底水雾升腾、香炉峰紫烟缭绕、低云流动
function createPubu(env) {
  const CX = [[0.21, 0.585], [0.35, 0.584], [0.5, 0.584], [0.65, 0.587], [0.8, 0.581], [0.89, 0.579]];
  const HW = [[0.21, 0.0025], [0.35, 0.006], [0.5, 0.0075], [0.65, 0.008], [0.8, 0.009], [0.89, 0.0105]];
  const TOP = 0.21, BOT = 0.885;
  const fx = (u, y) => env.X(interp(CX, y) + u * interp(HW, y));
  const streaks = Array.from({ length: 80 }, () => {
    const light = Math.random() < 0.62;
    return {
      u: rand(-1, 1), y: rand(TOP, BOT), len: rand(0.03, 0.09), w: rand(0.7, 2),
      color: light ? '255,255,255' : '86,106,128',
      a: light ? rand(0.45, 0.9) : rand(0.16, 0.3),
    };
  });
  const puffSprites = [0, 1, 2].map((i) => cloudSprite('255,255,255', { w: 256, h: 200, seed: 70 + i, a: 0.4 }));
  const puffs = [];
  let puffAcc = 0;
  const purple = [[0.72, 0.08], [0.88, 0.16], [0.97, 0.32], [0.62, 0.14], [0.8, 0.3]].map(([x, y], i) => ({
    x, y, w: rand(0.28, 0.42), a: rand(0.2, 0.32), ph: rand(0, TAU),
    spr: cloudSprite('206,164,236', { seed: 80 + i, a: 0.34 }),
  }));
  const lowCfg = {
    x0: env.vis.x0 - 0.25, x1: env.vis.x1 + 0.25, y0: 0.66, y1: 0.95,
    w: [0.3, 0.5], v: [0.004, 0.009], a: [0.35, 0.55],
    sprite: (i) => cloudSprite('255,255,255', { seed: 90 + i, a: 0.36 }),
  };
  const low = makeDrifters(5, lowCfg);
  const light = glowSprite('255,212,244');

  return {
    draw(ctx, t, dt) {
      ctx.globalCompositeOperation = 'screen';
      drawGlow(ctx, light, env.X(0.86), env.Y(0.0), env.S(0.95), 0.22 + 0.06 * Math.sin(t * 0.4));
      ctx.globalCompositeOperation = 'source-over';

      for (const p of purple) {
        const W = env.S(p.w), H = (W * p.spr.height) / p.spr.width;
        ctx.globalAlpha = p.a * (0.75 + 0.25 * Math.sin(t * 0.25 + p.ph));
        ctx.drawImage(p.spr, env.X(p.x + Math.sin(t * 0.06 + p.ph) * 0.035) - W / 2,
          env.Y(p.y + Math.sin(t * 0.09 + p.ph) * 0.012) - H / 2, W, H);
      }
      ctx.globalAlpha = 1;

      ctx.lineCap = 'round';
      for (const s of streaks) {
        s.y += (0.1 + 0.42 * ((s.y - TOP) / (BOT - TOP))) * dt;
        if (s.y - s.len > BOT) { s.y = TOP - rand(0, 0.05); s.u = rand(-1, 1); }
        const y1 = clamp(s.y, TOP, BOT), y0 = clamp(s.y - s.len, TOP, BOT);
        if (y1 - y0 < 0.004) continue;
        const X0 = fx(s.u, y0), Y0 = env.Y(y0), X1 = fx(s.u, y1), Y1 = env.Y(y1);
        const gr = ctx.createLinearGradient(X0, Y0, X1, Y1);
        gr.addColorStop(0, `rgba(${s.color},0)`);
        gr.addColorStop(0.7, `rgba(${s.color},${s.a})`);
        gr.addColorStop(1, `rgba(${s.color},0)`);
        ctx.strokeStyle = gr;
        ctx.lineWidth = s.w;
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
      }

      puffAcc += dt;
      while (puffAcc > 0.14) {
        puffAcc -= 0.14;
        puffs.push({
          x: 0.58 + rand(-0.012, 0.012), y: 0.885, vx: rand(-0.025, 0.025), vy: rand(-0.02, -0.006),
          s0: rand(0.02, 0.035), s1: rand(0.08, 0.15), life: rand(3.5, 5.5), age: 0, spr: pick(puffSprites),
        });
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt;
        const k = p.age / p.life;
        if (k >= 1) { puffs.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const W = env.S(lerp(p.s0, p.s1, Math.sqrt(k))), H = (W * p.spr.height) / p.spr.width;
        ctx.globalAlpha = 0.55 * Math.sin(Math.PI * k);
        ctx.drawImage(p.spr, env.X(p.x) - W / 2, env.Y(p.y) - H / 2, W, H);
      }
      ctx.globalAlpha = 1;

      drawDrifters(ctx, env, low, lowCfg, t, dt);
    },
  };
}

// 《山行》：枫叶翻飞飘落、白云生处缓缓流动、夕照暖光与金色浮尘
function createShanxing(env) {
  const sprites = [
    mapleSprite('236,92,52', '176,30,24'),
    mapleSprite('244,140,60', '200,70,30'),
    mapleSprite('250,190,80', '214,120,40'),
    mapleSprite('214,58,40', '140,20,20'),
  ];
  function spawn(p, init) {
    if (init) { p.x = rand(0.3, 1.0); p.y = rand(0.1, 0.9); }
    else { p.x = rand(0.66, 1.03); p.y = rand(0.12, 0.6); }
    p.s = rand(0.012, 0.021);
    p.vx = rand(0.012, 0.035);
    p.vy = rand(0.03, 0.055);
    p.rot = rand(0, TAU); p.vr = rand(-1.6, 1.6);
    p.fl = rand(0, TAU); p.vf = rand(1.2, 3);
    p.ph = rand(0, TAU);
    p.spr = pick(sprites);
    p.age = init ? 1 : 0;
    p.landY = rand(0.86, 1.02);
    p.land = 0;
    return p;
  }
  const leaves = Array.from({ length: Math.round(30 * env.k) }, () => spawn({}, true));
  const cloudCfg = {
    x0: 0.15, x1: 0.92, y0: 0.18, y1: 0.55, fade: 0.16,
    w: [0.2, 0.38], v: [0.003, 0.006], a: [0.35, 0.55],
    sprite: (i) => cloudSprite('255,253,248', { seed: 110 + i, a: 0.38 }),
  };
  const clouds = makeDrifters(6, cloudCfg);
  const sunset = glowSprite('255,196,130');
  const gold = glowSprite('255,214,150');
  const motes = Array.from({ length: 28 }, () => ({
    x: rand(0.45, 1.0), y: rand(0.3, 0.95), r: rand(0.002, 0.004), ph: rand(0, TAU), sp: rand(0.6, 1.5),
  }));

  return {
    draw(ctx, t, dt) {
      ctx.globalCompositeOperation = 'screen';
      drawGlow(ctx, sunset, env.X(0.86), env.Y(0.1), env.S(0.62), 0.3 + 0.08 * Math.sin(t * 0.45));
      ctx.globalCompositeOperation = 'source-over';

      drawDrifters(ctx, env, clouds, cloudCfg, t, dt);

      ctx.globalCompositeOperation = 'screen';
      for (const m of motes) {
        m.y -= 0.004 * dt;
        m.x += Math.sin(t * 0.4 + m.ph) * 0.003 * dt;
        if (m.y < 0.25) { m.y = 0.95; m.x = rand(0.45, 1.0); }
        drawGlow(ctx, gold, env.X(m.x), env.Y(m.y), env.S(m.r * 4), 0.25 + 0.3 * Math.sin(t * m.sp + m.ph));
      }
      ctx.globalCompositeOperation = 'source-over';

      const wind = 0.7 + 0.3 * Math.sin(t * 0.21) + 0.6 * Math.pow(Math.max(0, Math.sin(t * 0.47 + 1)), 4);
      for (const p of leaves) {
        p.age += dt;
        let a = smooth(0, 0.8, p.age);
        if (!p.land) {
          p.x += (-p.vx * wind + Math.sin(t * 1.3 + p.ph) * 0.01) * dt;
          p.y += (p.vy + Math.sin(t * 2.1 + p.ph) * 0.012) * dt;
          p.rot += p.vr * dt;
          p.fl += p.vf * dt;
          if (p.y > p.landY) p.land = 0.001;
          if (p.x < env.vis.x0 - 0.05) { spawn(p, false); continue; }
        } else {
          p.land += dt;
          a *= 1 - smooth(1.5, 4, p.land);
          if (p.land > 4) { spawn(p, false); continue; }
        }
        const s = env.S(p.s);
        ctx.save();
        ctx.translate(env.X(p.x), env.Y(p.y));
        ctx.rotate(p.rot);
        const c = Math.cos(p.fl);
        ctx.scale(Math.sign(c) * Math.max(0.12, Math.abs(c)), p.land ? 0.6 : 1);
        ctx.globalAlpha = a;
        ctx.drawImage(p.spr, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };
}

// 《枫桥夜泊》：月晕、霜华满天、渔火摇曳与水中倒影、寒鸦掠月、夜半钟声的声波
function createFengqiao(env) {
  const MOON = [0.585, 0.355], PAGODA = [0.781, 0.49];
  const LIGHTS = [
    { x: 0.744, y: 0.826, r: 0.05, a: 0.7 },
    { x: 0.897, y: 0.89, r: 0.035, a: 0.55 },
    { x: 0.84, y: 0.905, r: 0.025, a: 0.45 },
    { x: 0.508, y: 0.776, r: 0.02, a: 0.4 },
  ];
  const REFL = [
    { x: 0.745, y0: 0.862, y1: 0.995, w: 0.013, n: 15 },
    { x: 0.897, y0: 0.905, y1: 0.99, w: 0.007, n: 7 },
  ];
  const moonGlow = glowSprite('214,222,255');
  const warm = glowSprite('255,168,82');
  const warmCore = glowSprite('255,222,160');
  const cool = glowSprite('205,216,255');
  const frost = Array.from({ length: Math.round(150 * env.k) }, () => ({
    x: rand(env.vis.x0, env.vis.x1), y: rand(env.vis.y0, env.vis.y1),
    r: rand(0.0012, 0.0026), ph: rand(0, TAU), sp: rand(0.8, 2.2), vx: rand(-0.006, -0.002), vy: rand(0.003, 0.009),
  }));
  const shimmer = Array.from({ length: 36 }, () => ({
    x: rand(0.37, 0.7), y: rand(0.845, 0.995), len: rand(0.01, 0.03), ph: rand(0, TAU), sp: rand(0.5, 1.4),
  }));
  const mistCfg = {
    x0: env.vis.x0 - 0.25, x1: env.vis.x1 + 0.25, y0: 0.68, y1: 0.84,
    w: [0.3, 0.5], v: [0.003, 0.007], a: [0.18, 0.3],
    sprite: (i) => cloudSprite('170,186,222', { seed: 130 + i, a: 0.34 }),
  };
  const mist = makeDrifters(5, mistCfg);
  const crows = [], rings = [];
  let nextCrow = rand(3, 6), nextBell = 7.5, nextCricket = rand(2, 5);

  return {
    draw(ctx, t, dt) {
      ctx.globalCompositeOperation = 'screen';
      const br = 0.5 + 0.5 * Math.sin(t * 0.45);
      drawGlow(ctx, moonGlow, env.X(MOON[0]), env.Y(MOON[1]), env.S(0.5), 0.1 + 0.05 * br);
      drawGlow(ctx, moonGlow, env.X(MOON[0]), env.Y(MOON[1]), env.S(0.14), 0.3 + 0.1 * br);

      for (const f of frost) {
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.y > env.vis.y1) { f.y = env.vis.y0; f.x = rand(env.vis.x0, env.vis.x1 + 0.1); }
        if (f.x < env.vis.x0) f.x = env.vis.x1;
        const a = 0.18 + 0.32 * Math.pow(0.5 + 0.5 * Math.sin(t * f.sp + f.ph), 3);
        drawGlow(ctx, cool, env.X(f.x), env.Y(f.y), env.S(f.r * 3.5), a);
      }
      ctx.globalCompositeOperation = 'source-over';

      drawDrifters(ctx, env, mist, mistCfg, t, dt);

      ctx.globalCompositeOperation = 'lighter';
      LIGHTS.forEach((L, i) => {
        const a = L.a * (0.78 + 0.22 * flick(t, i * 3.3));
        const x = env.X(L.x), y = env.Y(L.y);
        drawGlow(ctx, warm, x, y, env.S(L.r * 2.6), a * 0.55);
        drawGlow(ctx, warmCore, x, y, env.S(L.r * 0.7), a * 0.8);
      });
      REFL.forEach((R, ri) => {
        for (let j = 0; j < R.n; j++) {
          const k = j / (R.n - 1);
          const y = env.Y(lerp(R.y0, R.y1, k));
          const w = env.S(R.w * (1 - 0.35 * k) * (0.7 + 0.3 * Math.sin(t * 2.3 + j * 1.7)));
          const x = env.X(R.x + Math.sin(t * 1.6 + j * 0.8) * 0.003 + Math.sin(t * 3.1 + j * 1.9) * 0.0015);
          const a = (0.5 - 0.32 * k) * (0.65 + 0.35 * flick(t * 0.6, j + ri * 7));
          drawGlow(ctx, warm, x, y, w * 2, a, env.S(0.005));
        }
      });
      for (const s of shimmer) {
        const a = Math.pow(Math.max(0, Math.sin(t * s.sp + s.ph)), 2) * 0.3;
        const x = env.X(s.x + Math.sin(t * 0.3 + s.ph) * 0.006);
        drawGlow(ctx, cool, x, env.Y(s.y), env.S(s.len) * 2, a, env.S(0.0035));
      }
      ctx.globalCompositeOperation = 'source-over';

      if (t > nextBell) {
        for (let i = 0; i < 3; i++) rings.push({ age: -i * 0.8, life: 6.5 });
        env.emit('bell');
        nextBell = t + rand(16, 19);
      }
      ctx.lineWidth = 1.2;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += dt;
        if (r.age < 0) continue;
        const k = r.age / r.life;
        if (k >= 1) { rings.splice(i, 1); continue; }
        const rad = env.S(lerp(0.01, 0.48, 1 - Math.pow(1 - k, 2.4)));
        ctx.strokeStyle = `rgba(214,224,255,${0.26 * Math.pow(1 - k, 1.6) * smooth(0, 0.05, k)})`;
        ctx.beginPath(); ctx.arc(env.X(PAGODA[0]), env.Y(PAGODA[1]), rad, 0, TAU); ctx.stroke();
      }

      if (t > nextCrow) {
        const n = Math.random() < 0.4 ? 2 : 1, y = rand(0.12, 0.3);
        for (let i = 0; i < n; i++) {
          crows.push({
            x: env.vis.x1 + 0.03 + i * 0.05, y: y + rand(-0.03, 0.03),
            vx: -rand(0.05, 0.07), vy: -rand(0, 0.008), s: rand(0.017, 0.023), fl: rand(0, TAU), ph: rand(0, TAU),
          });
        }
        env.sfx('caw');
        nextCrow = t + rand(11, 18);
      }
      for (let i = crows.length - 1; i >= 0; i--) {
        const c = crows[i];
        c.x += c.vx * dt;
        c.y += (c.vy + Math.sin(t * 1.5 + c.ph) * 0.006) * dt;
        c.s *= 1 - 0.03 * dt;
        const flapping = Math.sin(t * 0.8 + c.ph) > -0.4;
        if (flapping) c.fl += dt * TAU * 3.2;
        drawBird(ctx, env.X(c.x), env.Y(c.y), env.S(c.s), flapping ? Math.sin(c.fl) : 0.1, -1, 'rgba(14,18,32,0.9)');
        if (c.x < env.vis.x0 - 0.06) crows.splice(i, 1);
      }

      if (t > nextCricket) { env.sfx('cricket'); nextCricket = t + rand(3, 7); }
    },
  };
}

const SCENES = [
  {
    id: 'jingyesi', title: '静夜思', dynasty: '唐', author: '李白', theme: 'dark', sound: 'night',
    img: 'assets/jingyesi.jpg', origin: '82% 32%',
    lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'],
    caption: '月光漫过窗棂，落地成霜',
    create: createJingyesi,
  },
  {
    id: 'chunxiao', title: '春晓', dynasty: '唐', author: '孟浩然', theme: 'light', sound: 'spring',
    img: 'assets/chunxiao.jpg', origin: '65% 40%', poemTop: '60%',
    lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'],
    caption: '一夜风雨，满庭落红',
    create: createChunxiao,
  },
  {
    id: 'jiangxue', title: '江雪', dynasty: '唐', author: '柳宗元', theme: 'light', sound: 'snow',
    img: 'assets/jiangxue.jpg', origin: '68% 82%',
    lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'],
    caption: '天地一白，唯余孤舟',
    create: createJiangxue,
  },
  {
    id: 'pubu', title: '望庐山瀑布', dynasty: '唐', author: '李白', theme: 'light', sound: 'fall',
    img: 'assets/pubu.jpg', origin: '58% 45%',
    lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'],
    caption: '紫烟缭绕，银河倒悬',
    create: createPubu,
  },
  {
    id: 'shanxing', title: '山行', dynasty: '唐', author: '杜牧', theme: 'light', sound: 'autumn',
    img: 'assets/shanxing.jpg', origin: '70% 60%',
    lines: ['远上寒山石径斜', '白云生处有人家', '停车坐爱枫林晚', '霜叶红于二月花'],
    caption: '寒山石径，枫林尽染',
    create: createShanxing,
  },
  {
    id: 'fengqiao', title: '枫桥夜泊', dynasty: '唐', author: '张继', theme: 'dark', sound: 'river',
    img: 'assets/fengqiao.jpg', origin: '70% 70%', bellLine: 3,
    lines: ['月落乌啼霜满天', '江枫渔火对愁眠', '姑苏城外寒山寺', '夜半钟声到客船'],
    caption: '钟声穿过霜夜，抵达客船',
    create: createFengqiao,
  },
];
