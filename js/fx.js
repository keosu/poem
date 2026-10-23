'use strict';

// 可复用的动效模块。poems.js 中每首诗的 fx 数组按顺序叠加绘制。
// 每个模块：FX[type](env, cfg) → draw(ctx, t, dt)。工具函数与贴图来自 scenes.js。

const between = (v) => (Array.isArray(v) ? rand(v[0], v[1]) : v);
const inBox = (b, x, y) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
// 图高与图宽之比：把以图宽为单位的长度换算成以图高为单位
const HW = 1024 / 1536;
let fxSeed = 1;

function leafSprite(c1, c2) {
  return cached(`leaf${c1}${c2}`, () => {
    const c = canvasOf(64, 64), g = c.getContext('2d');
    g.translate(32, 32);
    const gr = g.createLinearGradient(-14, 0, 14, 0);
    gr.addColorStop(0, `rgb(${c1})`);
    gr.addColorStop(1, `rgb(${c2})`);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -29);
    g.quadraticCurveTo(17, -6, 0, 27);
    g.quadraticCurveTo(-17, -6, 0, -29);
    g.fill();
    g.strokeStyle = 'rgba(60,50,20,0.35)';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, -25); g.lineTo(0, 30); g.stroke();
    return c;
  });
}

function paperSprite(c1, c2) {
  return cached(`paper${c1}${c2}`, () => {
    const c = canvasOf(48, 48), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 10, 0, 38);
    gr.addColorStop(0, `rgb(${c1})`);
    gr.addColorStop(1, `rgb(${c2})`);
    g.fillStyle = gr;
    g.fillRect(14, 8, 20, 32);
    return c;
  });
}

function dropSprite() {
  return cached('drop', () => {
    const c = canvasOf(32, 48), g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 30, 1, 16, 28, 14);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');
    gr.addColorStop(1, 'rgba(190,210,230,0.5)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(16, 4);
    g.quadraticCurveTo(28, 26, 16, 42);
    g.quadraticCurveTo(4, 26, 16, 4);
    g.fill();
    return c;
  });
}

function rippleStyle(env, color) {
  return env.theme === 'dark'
    ? { light: color || '200,210,235', lw: 1 }
    : { dark: '70,82,92', light: color || '255,255,255', lw: 1 };
}

/* ---------------- 模块 ---------------- */

const FX = {
  // 光晕：日、月、灯火。flicker 火光跳动，pulse 明灭
  glow(env, c) {
    const spr = glowSprite(c.color), ph = rand(0, TAU), mode = c.mode || 'screen';
    return (ctx, t) => {
      let a = c.a;
      if (c.flicker) a *= 0.82 + 0.18 * flick(t, ph);
      else if (c.pulse) a *= 1 - c.pulse * (0.5 + 0.5 * Math.sin(t * 1.6 + ph));
      else a *= 0.88 + 0.12 * Math.sin(t * 0.45 + ph);
      ctx.globalCompositeOperation = mode;
      drawGlow(ctx, spr, env.X(c.at[0]), env.Y(c.at[1]), env.S(c.r * 2), a);
    };
  },

  // 光束：dir 为中心方向（弧度，画布坐标，π/2 朝下），spread 为张角
  rays(env, c) {
    const rays = Array.from({ length: c.n }, (_, i) => ({
      ang: c.dir + (c.n > 1 ? i / (c.n - 1) - 0.5 : 0) * c.spread + rand(-0.05, 0.05),
      w: rand(0.025, 0.07), len: c.len * rand(0.7, 1), ph: rand(0, TAU), sp: rand(0.15, 0.35),
    }));
    return (ctx, t) => {
      const x = env.X(c.at[0]), y = env.Y(c.at[1]);
      ctx.globalCompositeOperation = 'screen';
      for (const r of rays) {
        const a = c.a * (0.45 + 0.55 * Math.sin(t * r.sp + r.ph) ** 2);
        const L = env.S(r.len), ang = r.ang + Math.sin(t * 0.07 + r.ph) * 0.02;
        const g = ctx.createRadialGradient(x, y, 0, x, y, L);
        g.addColorStop(0, `rgba(${c.color},${a})`);
        g.addColorStop(1, `rgba(${c.color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, L, ang - r.w / 2, ang + r.w / 2);
        ctx.closePath();
        ctx.fill();
      }
    };
  },

  // 横向漂移的云雾，dir = -1 向左
  mist(env, c) {
    const dir = c.dir || 1, [y0, y1] = c.y, W = c.w || [0.3, 0.5], V = c.v || [0.004, 0.008];
    const span = () => [env.vis.x0 - 0.3, env.vis.x1 + 0.3];
    const [sx0, sx1] = span();
    const list = Array.from({ length: c.n }, () => ({
      x: rand(sx0, sx1), y: rand(y0, y1), w: between(W), v: between(V), a: between(c.a), ph: rand(0, TAU),
      spr: cloudSprite(c.color, { seed: 1 + (fxSeed++ % 8), a: 0.36 }),
    }));
    return (ctx, t, dt) => {
      const [x0, x1] = span(), edge = 0.18;
      for (const d of list) {
        d.x += d.v * dir * dt;
        if (dir > 0 && d.x > x1) { d.x = x0; d.y = rand(y0, y1); }
        if (dir < 0 && d.x < x0) { d.x = x1; d.y = rand(y0, y1); }
        const f = Math.min(smooth(x0, x0 + edge, d.x), 1 - smooth(x1 - edge, x1, d.x));
        const a = d.a * f * (0.82 + 0.18 * Math.sin(t * 0.3 + d.ph));
        if (a <= 0.004) continue;
        const w = env.S(d.w), h = (w * d.spr.height) / d.spr.width;
        ctx.globalAlpha = a;
        ctx.drawImage(d.spr, env.X(d.x) - w / 2, env.Y(d.y + Math.sin(t * 0.17 + d.ph) * 0.006) - h / 2, w, h);
      }
    };
  },

  // 水面波光：短促的闪烁光点，vx/vy 让它随水流移动
  shimmer(env, c) {
    const [x0, y0, x1, y1] = c.area, L = c.len || [0.006, 0.02], vx = c.vx || 0, vy = c.vy || 0;
    const ang = Math.hypot(vx, vy) > 0.012 ? Math.atan2(vy, vx) : 0;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const spawn = (g, init) => Object.assign(g, {
      x: rand(x0, x1), y: rand(y0, y1), len: between(L), life: rand(1.2, 3), w: rand(0.8, 1.8),
      age: init ? rand(0, 1.2) : 0,
    });
    const list = Array.from({ length: Math.round(c.n * env.k) }, () => spawn({}, true));
    return (ctx, t, dt) => {
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgb(${c.color})`;
      for (const g of list) {
        g.age += dt;
        if (g.age >= g.life) spawn(g, false);
        g.x += vx * dt; g.y += vy * dt;
        const a = c.a * Math.sin(Math.PI * (g.age / g.life));
        if (a < 0.01) continue;
        const depth = clamp((g.y - y0) / (y1 - y0 + 1e-6), 0, 1);
        const l = env.S(g.len * (0.6 + 0.8 * depth)) / 2, X = env.X(g.x), Y = env.Y(g.y);
        ctx.globalAlpha = a;
        ctx.lineWidth = g.w * (0.7 + 0.6 * depth) * Math.max(1, env.k);
        ctx.beginPath();
        ctx.moveTo(X - l * ca, Y - l * sa);
        ctx.lineTo(X + l * ca, Y + l * sa);
        ctx.stroke();
      }
    };
  },

  // 涟漪：area 内随机出现（rate 次/秒），或 pts 定点周期出现
  ripples(env, c) {
    const list = [], style = rippleStyle(env, c.color);
    const pts = (c.pts || []).map((p) => ({ ...p, next: rand(0, p.every) }));
    return (ctx, t, dt) => {
      for (const p of pts) {
        if (t < p.next) continue;
        list.push({ x: p.at[0], y: p.at[1], r0: p.r0, r1: p.r1, ratio: p.ratio || 0.2, life: p.every * 2.2, age: 0, a: 0.38 });
        p.next = t + p.every * rand(0.85, 1.15);
      }
      if (c.area && Math.random() < c.rate * dt) {
        const [x0, y0, x1, y1] = c.area;
        list.push({
          x: rand(x0, x1), y: rand(y0, y1), r0: 0.001, r1: c.r1 * rand(0.6, 1.3), ratio: 0.28,
          life: rand(2, 3.2), age: 0, a: 0.32,
        });
      }
      drawRipples(ctx, env, list, dt, style);
    };
  },

  // 游鱼：水下半透明的鱼影，偶尔触水泛起涟漪
  fish(env, c) {
    const [x0, y0, x1, y1] = c.area, col = `rgb(${c.color || '60,70,72'})`;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ripples = [];
    const list = Array.from({ length: c.n }, () => ({
      x: rand(x0, x1), y: rand(y0, y1), h: rand(0, TAU), v: rand(0.012, 0.025), s: rand(0.014, 0.022),
      ph: rand(0, TAU), turn: 0, next: rand(0, 3),
    }));
    return (ctx, t, dt) => {
      ctx.fillStyle = col;
      for (const f of list) {
        if (t > f.next) {
          f.turn = rand(-1.2, 1.2);
          f.next = t + rand(1, 3);
          if (Math.random() < 0.25) ripples.push({ x: f.x, y: f.y, r0: 0.002, r1: 0.03, ratio: 0.3, life: 2.5, age: 0, a: 0.3 });
        }
        let turn = f.turn;
        if (!inBox(c.area, f.x, f.y)) {
          const d = Math.atan2(cy - f.y, cx - f.x) - f.h;
          turn = Math.sign(Math.atan2(Math.sin(d), Math.cos(d))) * 1.6;
        }
        f.h += turn * dt;
        const sp = f.v * (1 + 0.6 * Math.max(0, Math.sin(t * 0.7 + f.ph)));
        f.x += Math.cos(f.h) * sp * dt;
        f.y += Math.sin(f.h) * sp * dt * 0.6;
        const S = env.S(f.s), wig = Math.sin(t * 9 + f.ph) * 0.4;
        ctx.save();
        ctx.translate(env.X(f.x), env.Y(f.y));
        ctx.scale(1, 0.55);
        ctx.rotate(f.h);
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.ellipse(0, 0, S * 0.5, S * 0.15, 0, 0, TAU); ctx.fill();
        ctx.rotate(wig * 0.5);
        ctx.beginPath();
        ctx.moveTo(-S * 0.4, 0);
        ctx.lineTo(-S * 0.72, -S * 0.17 + wig * S * 0.1);
        ctx.lineTo(-S * 0.72, S * 0.17 + wig * S * 0.1);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      drawRipples(ctx, env, ripples, dt, rippleStyle(env));
    };
  },

  // 昆虫：蝴蝶翩跹、蜻蜓点停、蜜蜂嗡飞
  insects(env, c) {
    const [x0, y0, x1, y1] = c.area, kind = c.kind;
    const P = { butterfly: { s: 0.012, v: 0.05 }, dragonfly: { s: 0.026, v: 0.22 }, bee: { s: 0.006, v: 0.07 } }[kind];
    const cols = [['255,250,236', '196,186,160'], ['250,214,90', '186,136,40'], ['245,160,70', '170,86,36'], ['236,236,250', '150,150,196']];
    const target = (b) => { b.tx = rand(x0, x1); b.ty = rand(y0, y1); };
    const list = Array.from({ length: c.n }, () => {
      const b = { x: rand(x0, x1), y: rand(y0, y1), ph: rand(0, TAU), col: pick(cols), dir: 1, hover: rand(0, 2), vx: 0, vy: 0 };
      target(b);
      return b;
    });
    return (ctx, t, dt) => {
      for (const b of list) {
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1e-6;
        if (kind === 'dragonfly') {
          if (b.hover > 0) {
            b.hover -= dt;
            b.x += Math.sin(t * 3 + b.ph) * 0.002 * dt;
            b.y += Math.cos(t * 2.3 + b.ph) * 0.002 * dt;
            if (b.hover <= 0) target(b);
          } else {
            const sp = P.v * Math.min(1, d * 10 + 0.15);
            b.x += (dx / d) * sp * dt;
            b.y += (dy / d) * sp * dt;
            if (Math.abs(dx) > 0.003) b.dir = Math.sign(dx);
            if (d < 0.004) b.hover = rand(1.5, 4);
          }
        } else {
          b.vx += ((dx / d) * P.v - b.vx) * dt * 1.5;
          b.vy += ((dy / d) * P.v - b.vy) * dt * 1.5;
          b.x += (b.vx + Math.sin(t * 2.1 + b.ph) * P.v * 0.4) * dt;
          b.y += (b.vy + Math.sin(t * 3.3 + b.ph) * P.v * 0.5) * dt;
          if (kind === 'bee') { b.x += rand(-1, 1) * 0.0006; b.y += rand(-1, 1) * 0.0006; }
          if (Math.abs(b.vx) > 0.003) b.dir = Math.sign(b.vx);
          if (d < 0.02) target(b);
        }
        drawInsect(ctx, kind, env.X(b.x), env.Y(b.y), env.S(P.s), b, t);
      }
      ctx.globalAlpha = 1;
    };
  },

  // 浮尘、萤光、光斑。blink 明灭，rise 上升速度，drift 横向漂移
  motes(env, c) {
    const [x0, y0, x1, y1] = c.area, size = c.size || [0.0012, 0.0025];
    const rise = c.rise ?? 0.004, drift = c.drift || 0, wander = c.wander ?? 0.003, A = c.a ?? 0.7;
    const spr = glowSprite(c.color);
    const list = Array.from({ length: Math.round(c.n * Math.min(1.2, env.k)) }, () => ({
      x: rand(x0, x1), y: rand(y0, y1), r: between(size), ph: rand(0, TAU), sp: rand(0.6, 1.5),
    }));
    return (ctx, t, dt) => {
      ctx.globalCompositeOperation = 'screen';
      for (const m of list) {
        m.y -= rise * dt;
        m.x += (drift + Math.sin(t * 0.4 + m.ph) * wander) * dt;
        if (m.y < y0) { m.y = y1; m.x = rand(x0, x1); }
        if (m.y > y1) { m.y = y0; m.x = rand(x0, x1); }
        if (m.x < x0) m.x = x1;
        if (m.x > x1) m.x = x0;
        const tw = c.blink ? Math.max(0, Math.sin(t * m.sp + m.ph)) : 0.6 + 0.4 * Math.sin(t * m.sp + m.ph);
        drawGlow(ctx, spr, env.X(m.x), env.Y(m.y), env.S(m.r * 4), A * tw);
      }
    };
  },

  // 飞鸟：一群群从画面一侧飞过。formation: 'v' 雁阵 / 'line' 一行
  birds(env, c) {
    const K = {
      bird: { s: [0.007, 0.011], v: [0.07, 0.1], f: 4, col: '45,42,40' },
      swallow: { s: [0.011, 0.014], v: [0.13, 0.18], f: 3, col: '30,34,44', swoop: 0.05 },
      eagle: { s: [0.022, 0.028], v: [0.03, 0.04], f: 0.5, col: '38,34,30', glide: true },
      goose: { s: [0.011, 0.013], v: [0.035, 0.045], f: 1.8, col: '55,52,50' },
      egret: { s: [0.016, 0.02], v: [0.035, 0.045], f: 1.3, col: '252,252,248', white: true },
      crane: { s: [0.024, 0.03], v: [0.025, 0.032], f: 1, col: '250,250,246', white: true },
    }[c.kind];
    const col = `rgb(${c.color || K.col})`, flocks = [];
    let next = rand(1, 5);
    const spawn = () => {
      const dir = c.dir || (Math.random() < 0.5 ? 1 : -1);
      const n = Math.floor(rand(c.count[0], c.count[1] + 1)), members = [];
      for (let i = 0; i < n; i++) {
        let dx = 0, dy = 0;
        if (c.formation === 'v') { const k = Math.ceil(i / 2); dx = -k * 0.022; dy = (i % 2 ? 1 : -1) * k * 0.016; }
        else if (c.formation === 'line') { dx = -i * 0.028; dy = i * 0.014; }
        else if (i) { dx = -rand(0, 0.08); dy = rand(-0.04, 0.04); }
        members.push({ dx, dy, s: between(K.s), ph: rand(0, TAU), f: K.f * rand(0.9, 1.1) });
      }
      flocks.push({
        x: dir > 0 ? env.vis.x0 - 0.05 : env.vis.x1 + 0.05, y: between(c.y), dir, v: between(K.v), members,
      });
    };
    return (ctx, t, dt) => {
      if (t > next) { spawn(); next = t + between(c.every); }
      for (let i = flocks.length - 1; i >= 0; i--) {
        const F = flocks[i];
        F.x += F.dir * F.v * dt;
        F.y -= (c.rise || 0) * dt;
        if ((F.dir > 0 && F.x > env.vis.x1 + 0.4) || (F.dir < 0 && F.x < env.vis.x0 - 0.4)) { flocks.splice(i, 1); continue; }
        for (const m of F.members) {
          const x = env.X(F.x + m.dx * F.dir), s = env.S(m.s);
          let y = F.y + m.dy + Math.sin(t * 0.8 + m.ph) * 0.004;
          if (K.swoop) y += Math.sin(t * 1.3 + m.ph) * K.swoop;
          let wing;
          if (K.glide) wing = Math.sin(t * 0.6 + m.ph) > 0.6 ? Math.sin(t * 6 + m.ph) : 0.3 + 0.1 * Math.sin(t * 1.5 + m.ph);
          else wing = Math.sin(t * m.f * TAU + m.ph);
          if (K.white) drawBird(ctx, x, env.Y(y) + 0.6, s * 1.1, wing, F.dir, 'rgba(90,90,90,0.45)');
          drawBird(ctx, x, env.Y(y), s, wing, F.dir, col);
        }
      }
    };
  },

  // 风痕：一闪而过的流线
  wind(env, c) {
    const [x0, y0, x1, y1] = c.area, dir = c.dir || 1;
    const spawn = (s, init) => Object.assign(s, {
      x: rand(x0, x1), y: rand(y0, y1), len: rand(0.08, 0.2), v: rand(0.25, 0.45), life: rand(1.2, 2.2),
      age: init ? rand(0, 2) : 0, amp: rand(0.004, 0.012), ph: rand(0, TAU),
    });
    const list = Array.from({ length: c.n }, () => spawn({}, true));
    return (ctx, t, dt) => {
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.1 * Math.max(1, env.k);
      for (const s of list) {
        s.age += dt;
        if (s.age > s.life) spawn(s, false);
        s.x += dir * s.v * dt;
        const a = c.a * Math.sin(Math.PI * clamp(s.age / s.life, 0, 1));
        if (a < 0.01) continue;
        const xs = env.X(s.x), xe = env.X(s.x - dir * s.len), y = env.Y(s.y), amp = env.dh * s.amp;
        const g = ctx.createLinearGradient(xe, 0, xs, 0);
        g.addColorStop(0, `rgba(${c.color},0)`);
        g.addColorStop(0.7, `rgba(${c.color},${a})`);
        g.addColorStop(1, `rgba(${c.color},0)`);
        ctx.strokeStyle = g;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const u = i / 12, X = lerp(xe, xs, u), Y = y + Math.sin(u * 5 + s.ph + t * 2) * amp * u;
          if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }
    };
  },

  // 前景草丛，风过成浪。kind: 'grain' 带下垂的穗
  grass(env, c) {
    const [x0, x1] = c.x || [-0.02, 1.02], base = c.base ?? 1.0, grain = c.kind === 'grain';
    const rgb = c.color.split(',').map(Number);
    const tint = (k) => rgb.map((v) => Math.round(clamp(v * k, 0, 255))).join(',');
    const blades = Array.from({ length: Math.round(c.n * Math.min(1.2, env.k)) }, () => {
      const shade = rand(0.65, 1.15);
      return {
        x: rand(x0, x1), b: base + rand(-0.02, 0.03), h: between(c.h), w: rand(0.0012, 0.0028),
        ph: rand(0, TAU), lean: rand(-0.25, 0.25), col: `rgba(${tint(shade)},0.85)`, head: `rgba(${tint(shade * 1.15)},0.9)`,
      };
    }).sort((a, b) => a.b - b.b);
    return (ctx, t) => {
      for (const g of blades) {
        const sway = c.wind * (0.3 * Math.sin(t * 1.1 - g.x * 7) + 0.12 * Math.sin(t * 2.7 + g.ph) + 0.15) + g.lean;
        const bx = env.X(g.x), by = env.Y(g.b), h = g.h * env.dh, w = Math.max(1, env.S(g.w));
        const tipX = bx + sway * h * 0.5, tipY = by - h * (1 - 0.15 * Math.abs(sway));
        const cx = bx + sway * h * 0.1, cy = by - h * 0.55;
        ctx.fillStyle = g.col;
        ctx.beginPath();
        ctx.moveTo(bx - w, by);
        ctx.quadraticCurveTo(cx, cy, tipX, tipY);
        ctx.quadraticCurveTo(cx, cy, bx + w, by);
        ctx.fill();
        if (grain) {
          const ang = Math.atan2(tipY - cy, tipX - cx) + 0.5 * Math.sign(sway || 1), L = h * 0.16;
          ctx.fillStyle = g.head;
          ctx.beginPath();
          ctx.ellipse(tipX + Math.cos(ang) * L * 0.5, tipY + Math.sin(ang) * L * 0.5, L * 0.6, w * 2.2, ang, 0, TAU);
          ctx.fill();
        }
      }
    };
  },

  // 飘落物：叶、枫叶、花瓣、柳絮、雪、汗珠、爆竹纸屑。
  // from 出生区域；land 落地 y 范围；water 落入水面后漂浮并泛起涟漪
  fall(env, c) {
    const K = FALL_KINDS[c.kind];
    const size = c.size || K.size, speed = c.speed || K.speed, wind = c.wind || 0, sway = K.sway;
    const make = { leaf: leafSprite, maple: mapleSprite, petal: petalSprite, paper: paperSprite }[c.kind];
    const sprites = c.kind === 'snow' ? [flakeSprite()]
      : c.kind === 'fluff' ? [glowSprite('255,255,250')]
        : c.kind === 'drop' ? [dropSprite()]
          : (c.colors || K.colors).map(([a, b]) => make(a, b));
    const round = c.kind === 'snow' || c.kind === 'fluff';
    // 未指定 from 时从画面顶端出生，并向上风方向多留一段
    const from = () => c.from || [
      env.vis.x0 - 0.05 - Math.max(0, wind) * 4, env.vis.y0 - 0.06,
      env.vis.x1 + 0.05 + Math.max(0, -wind) * 4, env.vis.y0 - 0.01,
    ];
    const ripples = [];
    const spawn = (p, init) => {
      const f = from();
      Object.assign(p, {
        x: rand(f[0], f[2]), y: rand(f[1], f[3]), s: between(size), vy: between(speed), ph: rand(0, TAU),
        rot: rand(0, TAU), vr: rand(-1, 1) * (K.spin || 0), fl: rand(0, TAU), vf: rand(1.2, 3),
        spr: pick(sprites), state: 0, st: 0, age: 0, a: c.kind === 'snow' ? rand(0.6, 0.95) : 1,
        landY: c.land ? between(c.land) : Infinity, waterY: c.water ? rand(c.water[1], c.water[3]) : Infinity,
      });
      if (init) {
        const end = Math.min(p.landY, p.waterY, env.vis.y1);
        const tau = Math.max(0, rand(0, (end - p.y) / p.vy));
        p.x += wind * tau;
        p.y += p.vy * tau;
        p.age = 1;
      }
      return p;
    };
    const count = Math.round(c.n * (c.n > 40 ? env.k : 1));
    const list = Array.from({ length: count }, () => spawn({}, true));
    return (ctx, t, dt) => {
      const W = 1 + (c.gust || 0) * (0.3 * Math.sin(t * 0.21) + 0.9 * Math.pow(Math.max(0, Math.sin(t * 0.47 + 1)), 4));
      for (const p of list) {
        p.age += dt;
        let a = p.a * smooth(0, 0.8, p.age), sy = 1;
        if (p.state === 0) {
          if (c.kind === 'drop') p.vy += 0.2 * dt;
          p.x += (wind * W + Math.sin(t * 1.3 + p.ph) * sway) * dt;
          p.y += (p.vy + Math.sin(t * 2.1 + p.ph) * sway * 0.8) * dt;
          p.rot += p.vr * dt;
          p.fl += p.vf * dt;
          if (p.y > p.waterY && c.water && p.x > c.water[0] && p.x < c.water[2]) {
            p.state = 2;
            ripples.push({ x: p.x, y: p.y, r0: 0.002, r1: 0.03, ratio: 0.3, life: 3, age: 0, a: 0.3 });
          } else if (p.y > p.landY) {
            p.state = 1;
          } else if (p.y > env.vis.y1 + 0.05 || p.x < env.vis.x0 - 0.2 || p.x > env.vis.x1 + 0.2) {
            if (round && p.y <= env.vis.y1 + 0.05) p.x = p.x < env.vis.x0 ? p.x + (env.vis.x1 - env.vis.x0) + 0.3 : p.x - (env.vis.x1 - env.vis.x0) - 0.3;
            else { spawn(p, false); continue; }
          }
        } else {
          p.st += dt;
          if (p.state === 2) p.x += 0.003 * dt;
          const life = p.state === 2 ? 7 : 4;
          a *= 1 - smooth(life * 0.4, life, p.st);
          sy = p.state === 2 ? 0.5 : 0.6;
          if (p.st > life) { spawn(p, false); continue; }
        }
        if (a <= 0.01) continue;
        const X = env.X(p.x), Y = env.Y(p.y);
        ctx.globalAlpha = a;
        if (round) {
          const d = env.S(p.s) * 4.4;
          ctx.drawImage(p.spr, X - d / 2, Y - d / 2, d, d);
        } else if (c.kind === 'drop') {
          const d = env.S(p.s) * 2;
          ctx.drawImage(p.spr, X - d / 3, Y - d / 2, (d * 2) / 3, d);
        } else {
          const s = env.S(p.s), cf = Math.cos(p.fl);
          ctx.save();
          ctx.translate(X, Y);
          ctx.rotate(p.rot);
          ctx.scale(Math.sign(cf) * Math.max(0.12, Math.abs(cf)), sy);
          ctx.drawImage(p.spr, -s / 2, -s / 2, s, s);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      if (ripples.length) drawRipples(ctx, env, ripples, dt, rippleStyle(env));
    };
  },

  // 垂柳：从 top 垂下的柳丝，越近梢头摆动越大
  willow(env, c) {
    const strands = Array.from({ length: c.n }, () => ({
      x: rand(c.x[0], c.x[1]), y: c.top + rand(0, 0.06), L: between(c.len), ph: rand(0, TAU), w: rand(0.8, 1.4),
    }));
    const N = 16;
    return (ctx, t) => {
      const gust = 0.6 + 0.4 * Math.sin(t * 0.33) + 0.5 * Math.pow(Math.max(0, Math.sin(t * 0.21 + 2)), 3);
      const ls = env.S(0.0055);
      ctx.globalAlpha = c.a;
      ctx.strokeStyle = ctx.fillStyle = `rgb(${c.color})`;
      ctx.lineCap = 'round';
      for (const s of strands) {
        const L = s.L * env.dh, x0 = env.X(s.x), y0 = env.Y(s.y), pts = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const sw = (Math.sin(t * 0.9 + s.ph - u * 1.8) * 0.5 + 0.35) * gust * u * u * L * 0.18;
          pts.push([x0 + sw, y0 + u * L * (1 - 0.04 * u * gust)]);
        }
        ctx.lineWidth = s.w;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.beginPath();
        for (let i = 2; i <= N; i++) {
          const [x, y] = pts[i], [px, py] = pts[i - 1];
          const ang = Math.atan2(y - py, x - px) + (i % 2 ? 0.5 : -0.5);
          const ex = x + Math.cos(ang) * ls * 0.6, ey = y + Math.sin(ang) * ls * 0.6;
          ctx.moveTo(ex + Math.cos(ang) * ls * 0.7, ey + Math.sin(ang) * ls * 0.7);
          ctx.ellipse(ex, ey, ls * 0.7, ls * 0.22, ang, 0, TAU);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
  },

  // 炊烟 / 烛烟 / 窑烟：缓缓升起、变大、散开
  smoke(env, c) {
    const sprs = [0, 1, 2].map((i) => cloudSprite(c.color, { w: 256, h: 200, seed: 300 + i, a: 0.4 }));
    const puffs = [], rate = c.rate || 1.2;
    let acc = 0;
    const step = (t, dt) => {
      acc += dt * rate;
      while (acc > 1) {
        acc -= 1;
        puffs.push({
          x: c.at[0], y: c.at[1], vx: rand(0.002, 0.008), vy: -rand(0.018, 0.03), s0: c.size, s1: c.size * rand(3, 5),
          life: rand(6, 9), age: 0, spr: pick(sprs), ph: rand(0, TAU),
        });
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt;
        if (p.age >= p.life) { puffs.splice(i, 1); continue; }
        p.x += (p.vx + Math.sin(t * 0.6 + p.ph) * 0.004) * dt;
        p.y += p.vy * dt * (1 - 0.4 * (p.age / p.life));
      }
    };
    for (let i = 0; i < 80; i++) step(i * 0.1, 0.1);
    return (ctx, t, dt) => {
      step(t, dt);
      for (const p of puffs) {
        const k = p.age / p.life;
        const W = env.S(lerp(p.s0, p.s1, Math.sqrt(k))), H = (W * p.spr.height) / p.spr.width;
        ctx.globalAlpha = 0.5 * smooth(0, 0.12, k) * Math.pow(1 - k, 1.2);
        ctx.drawImage(p.spr, env.X(p.x) - W / 2, env.Y(p.y) - H / 2, W, H);
      }
    };
  },

  // 火星：从火堆升起，闪烁熄灭
  embers(env, c) {
    const spr = glowSprite(c.color);
    const spawn = (e, init) => Object.assign(e, {
      x: c.at[0] + rand(-1, 1) * c.spread, y: c.at[1], vx: rand(-0.006, 0.006), life: rand(1.5, 3),
      age: init ? rand(0, 3) : 0, s: rand(0.0015, 0.003), ph: rand(0, TAU),
    });
    const list = Array.from({ length: c.n }, () => spawn({}, true));
    return (ctx, t, dt) => {
      ctx.globalCompositeOperation = 'lighter';
      for (const e of list) {
        e.age += dt;
        if (e.age > e.life) spawn(e, false);
        const k = e.age / e.life;
        const x = e.x + e.vx * e.age + Math.sin(t * 3 + e.ph) * 0.003 * k;
        const y = e.y - (c.rise / HW) * k;
        drawGlow(ctx, spr, env.X(x), env.Y(y), env.S(e.s * 4) * (1 - k * 0.5), (1 - k) * (0.6 + 0.4 * flick(t, e.ph)));
      }
    };
  },

  // 星空：闪烁的星，偶有流星
  stars(env, c) {
    const [x0, y0, x1, y1] = c.area, spr = glowSprite('230,236,255');
    const list = Array.from({ length: c.n }, () => ({
      x: rand(x0, x1), y: y0 + (y1 - y0) * Math.pow(Math.random(), 1.4), s: rand(0.0006, 0.0018),
      a: rand(0.35, 0.9), sp: rand(0.5, 2), ph: rand(0, TAU),
    }));
    let meteor = null, nextM = rand(8, 20);
    return (ctx, t, dt) => {
      ctx.globalCompositeOperation = 'screen';
      for (const s of list) {
        drawGlow(ctx, spr, env.X(s.x), env.Y(s.y), env.S(s.s) * 6, s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph)));
      }
      if (!meteor && t > nextM) {
        meteor = { x: rand(x0 + 0.1, x1), y: rand(y0, (y0 + y1) / 2), age: 0, dir: Math.random() < 0.5 ? 1 : -1 };
        nextM = t + rand(15, 35);
      }
      if (meteor) {
        meteor.age += dt;
        const k = meteor.age / 0.9;
        if (k >= 1) { meteor = null; return; }
        const hx = meteor.x + meteor.dir * 0.12 * k, hy = meteor.y + 0.1 * k;
        const X1 = env.X(hx), Y1 = env.Y(hy), X0 = env.X(hx - meteor.dir * 0.06), Y0 = env.Y(hy - 0.05);
        const g = ctx.createLinearGradient(X0, Y0, X1, Y1);
        g.addColorStop(0, 'rgba(230,236,255,0)');
        g.addColorStop(1, `rgba(230,236,255,${0.8 * Math.sin(Math.PI * k)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1); ctx.stroke();
      }
    };
  },

  // 周期性音效
  sfx(env, c) {
    let next = rand(1.5, c.every[0]);
    return (ctx, t) => {
      if (t > next) { env.sfx(c.name); next = t + between(c.every); }
    };
  },

  // 雨：slant 为水平/垂直比；water 内生成雨点涟漪；splash 内溅起跳珠；cycle 秒为周期起伏
  rain(env, c) {
    const L = c.len || [0.015, 0.035];
    const area = () => c.area || [env.vis.x0 - 0.1, env.vis.y0, env.vis.x1 + 0.1, env.vis.y1];
    const spawn = (d, init) => {
      const [x0, y0, x1, y1] = area();
      return Object.assign(d, {
        x: rand(x0 - c.slant * (y1 - y0) * HW, x1), y: init ? rand(y0, y1) : y0 - rand(0, 0.1),
        v: rand(0.9, 1.3), len: between(L), far: Math.random() < 0.6, k: Math.random(),
      });
    };
    const drops = Array.from({ length: Math.round(c.n * env.k) }, () => spawn({}, true));
    const ripples = [], beads = [], style = rippleStyle(env, c.color && env.theme === 'dark' ? c.color : null);
    return (ctx, t, dt) => {
      const I = c.cycle ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t * TAU) / c.cycle)) : 1;
      const y1 = area()[3];
      ctx.lineCap = 'round';
      for (const pass of [true, false]) {
        ctx.strokeStyle = `rgba(${c.color},${pass ? c.a * 0.65 : c.a})`;
        ctx.lineWidth = (pass ? 0.8 : 1.3) * Math.max(1, env.k);
        ctx.beginPath();
        for (const d of drops) {
          if (d.far !== pass) continue;
          d.y += d.v * dt * (pass ? 0.8 : 1);
          d.x += c.slant * d.v * dt * HW * (pass ? 0.8 : 1);
          if (d.y > y1) spawn(d, false);
          if (d.k > I) continue;
          const X = env.X(d.x), Y = env.Y(d.y), l = d.len * env.dh * (pass ? 0.7 : 1);
          ctx.moveTo(X, Y);
          ctx.lineTo(X - c.slant * l, Y - l);
        }
        ctx.stroke();
      }
      if (c.water && Math.random() < (c.n / 60) * I * dt * 4) {
        const [x0, wy0, x1, wy1] = c.water;
        ripples.push({ x: rand(x0, x1), y: rand(wy0, wy1), r0: 0.001, r1: rand(0.01, 0.022), ratio: 0.3, life: rand(1.2, 1.8), age: 0, a: 0.35 });
      }
      if (c.splash) {
        let n = (c.n / 8) * I * dt;
        while (n > 0) {
          if (Math.random() < n) {
            const [x0, sy0, x1, sy1] = c.splash, x = rand(x0, x1), y = rand(sy0, sy1);
            for (let i = 0; i < 3; i++) beads.push({ x, y, y0: y, vx: rand(-0.03, 0.03), vy: -rand(0.05, 0.11), age: 0 });
            if (Math.random() < 0.4) ripples.push({ x, y, r0: 0.001, r1: 0.018, ratio: 0.3, life: 1, age: 0, a: 0.4 });
          }
          n -= 1;
        }
        ctx.fillStyle = `rgba(${c.color},${Math.min(1, c.a * 2.5)})`;
        ctx.beginPath();
        for (let i = beads.length - 1; i >= 0; i--) {
          const b = beads[i];
          b.age += dt;
          b.vy += 0.6 * dt;
          b.x += b.vx * dt * HW;
          b.y += b.vy * dt;
          if (b.y > b.y0 + 0.002 || b.age > 0.6) { beads.splice(i, 1); continue; }
          const X = env.X(b.x), Y = env.Y(b.y), r = Math.max(0.8, env.S(0.0012));
          ctx.moveTo(X + r, Y);
          ctx.arc(X, Y, r, 0, TAU);
        }
        ctx.fill();
      }
      drawRipples(ctx, env, ripples, dt, style);
    };
  },

  // 水中倒影光带：at = [x, y0, y1]，w 为光带宽度
  reflect(env, c) {
    const [x, y0, y1] = c.at;
    const list = Array.from({ length: c.n }, (_, i) => {
      const u = (i + Math.random()) / c.n;
      return { u, y: lerp(y0, y1, Math.pow(u, 1.3)), l: rand(0.3, 1), ph: rand(0, TAU), sp: rand(0.8, 2), off: rand(-0.5, 0.5) };
    });
    return (ctx, t) => {
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgb(${c.color})`;
      for (const d of list) {
        const w = c.w * (0.5 + d.u);
        const cx = x + (d.off * 0.6 + Math.sin(t * 0.8 + d.ph) * 0.25) * w;
        const half = (w * d.l * (0.6 + 0.4 * Math.sin(t * d.sp + d.ph))) / 2;
        ctx.globalAlpha = c.a * (0.5 + 0.5 * Math.sin(t * d.sp * 1.3 + d.ph)) * (1 - 0.5 * d.u);
        ctx.lineWidth = Math.max(1, env.S(0.0016) * (0.7 + d.u));
        ctx.beginPath();
        ctx.moveTo(env.X(cx - half), env.Y(d.y));
        ctx.lineTo(env.X(cx + half), env.Y(d.y));
        ctx.stroke();
      }
    };
  },

  // 热浪：把底图对应区域切成细条，左右轻微错动
  heat(env, c) {
    const [x0, y0, x1, y1] = c.area;
    return (ctx, t) => {
      const img = env.img;
      if (!img || !img.naturalWidth) return;
      const iw = img.naturalWidth, ih = img.naturalHeight, Y0 = env.Y(y0), Y1 = env.Y(y1), step = 3;
      for (let y = Y0; y < Y1; y += step) {
        const fy = (y - env.oy) / env.dh, amp = Math.sin((Math.PI * (y - Y0)) / (Y1 - Y0));
        const off = Math.sin(fy * 160 + t * 3.2) * 1.6 * amp * Math.max(1, env.k);
        ctx.globalAlpha = 0.85 * amp;
        ctx.drawImage(img, x0 * iw, fy * ih, (x1 - x0) * iw, (step / env.dh) * ih, env.X(x0) + off, y, env.S(x1 - x0), step);
      }
    };
  },

  // 爆竹：一串连响的火光与火星
  firecracker(env, c) {
    const sparks = [], flashes = [], spr = glowSprite('255,220,140'), core = glowSprite('255,250,220');
    let next = rand(1, 3), pops = 0, popT = 0;
    return (ctx, t, dt) => {
      if (t > next && pops === 0) { pops = Math.floor(rand(6, 12)); popT = t; }
      if (pops > 0 && t > popT) {
        pops--;
        popT = t + rand(0.06, 0.2);
        const x = c.at[0] + rand(-1, 1) * c.spread, y = c.at[1] + rand(-1, 1) * c.spread * 0.6;
        flashes.push({ x, y, age: 0 });
        for (let i = 0; i < 10; i++) {
          const a = rand(0, TAU), v = rand(0.03, 0.09);
          sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 1.5 - 0.03, age: 0, life: rand(0.3, 0.7) });
        }
        env.sfx('firecracker');
        if (pops === 0) next = t + rand(4, 8);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.age += dt;
        if (f.age > 0.25) { flashes.splice(i, 1); continue; }
        drawGlow(ctx, core, env.X(f.x), env.Y(f.y), env.S(0.06) * (1 + f.age * 3), 0.9 * (1 - f.age / 0.25));
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age > s.life) { sparks.splice(i, 1); continue; }
        s.vy += 0.25 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        drawGlow(ctx, spr, env.X(s.x), env.Y(s.y), env.S(0.008), 1 - s.age / s.life);
      }
    };
  },

  // 灯火：一组轻轻摇曳的灯笼或窗光
  lights(env, c) {
    const spr = glowSprite(c.color), ph = c.pts.map(() => rand(0, TAU));
    return (ctx, t) => {
      ctx.globalCompositeOperation = 'lighter';
      c.pts.forEach((p, i) => {
        drawGlow(ctx, spr, env.X(p[0]), env.Y(p[1]), env.S(c.r * 2), c.a * (0.75 + 0.25 * flick(t * 0.5, ph[i])));
      });
    };
  },

  // 闪电：两段式闪光，随后远雷
  flash(env, c) {
    let next = rand(3, c.every[0]), start = -1, thunder = Infinity;
    return (ctx, t) => {
      if (t > next) { start = t; next = t + between(c.every); thunder = t + rand(0.4, 1.5); }
      if (t > thunder) { env.sfx('thunder'); thunder = Infinity; }
      if (start < 0) return;
      const f = t - start;
      const I = f < 0.08 ? 1 : f < 0.16 ? 0.2 : f < 0.26 ? 0.8 : Math.max(0, 0.8 * (1 - (f - 0.26) / 0.5));
      if (I <= 0) { start = -1; return; }
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(${c.color},${0.4 * I})`;
      ctx.fillRect(0, 0, env.W, env.H);
    };
  },

  // 纸鸢：随风起伏的风筝，to 为放线的人手位置（可省略）
  kite(env, c) {
    const ph = rand(0, TAU);
    return (ctx, t) => {
      const x = c.at[0] + Math.sin(t * 0.5 + ph) * 0.012 + Math.sin(t * 1.3) * 0.003;
      const y = c.at[1] + Math.sin(t * 0.8 + ph) * 0.01;
      const X = env.X(x), Y = env.Y(y), S = env.S(c.size), rot = Math.sin(t * 0.9 + ph) * 0.15;
      if (c.to) {
        const tx = env.X(c.to[0]), ty = env.Y(c.to[1]);
        ctx.strokeStyle = 'rgba(60,50,40,0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(X, Y + S * 0.4);
        ctx.quadraticCurveTo((X + tx) / 2 + S, (Y + ty) / 2 + S * 2, tx, ty);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(rot);
      ctx.strokeStyle = `rgba(${c.tail || '200,60,50'},0.8)`;
      ctx.lineWidth = Math.max(1, S * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, S * 0.5);
      for (let i = 1; i <= 12; i++) {
        const u = i / 12;
        ctx.lineTo(Math.sin(t * 3 - u * 5 + ph) * S * 0.25 * u - u * S * 0.6, S * 0.5 + u * S * 2.2);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(${c.color},0.92)`;
      ctx.beginPath();
      ctx.moveTo(0, -S * 0.55); ctx.lineTo(S * 0.4, 0); ctx.lineTo(0, S * 0.5); ctx.lineTo(-S * 0.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,50,30,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -S * 0.55); ctx.lineTo(0, S * 0.5);
      ctx.moveTo(-S * 0.4, 0); ctx.lineTo(S * 0.4, 0);
      ctx.stroke();
      ctx.restore();
    };
  },
};

const FALL_KINDS = {
  leaf: { colors: [['170,190,90', '110,140,50'], ['200,180,80', '150,120,40']], size: [0.008, 0.014], speed: [0.02, 0.04], sway: 0.012, spin: 1.6 },
  maple: { colors: [['236,92,52', '176,30,24'], ['244,140,60', '200,70,30'], ['250,190,80', '214,120,40']], size: [0.012, 0.02], speed: [0.03, 0.055], sway: 0.01, spin: 1.6 },
  petal: { colors: [['255,222,230', '240,165,185'], ['255,238,242', '245,195,210']], size: [0.006, 0.01], speed: [0.015, 0.03], sway: 0.015, spin: 1.2 },
  paper: { colors: [['220,40,30', '160,20,20'], ['235,70,40', '180,30,20']], size: [0.004, 0.007], speed: [0.04, 0.08], sway: 0.02, spin: 4 },
  fluff: { size: [0.002, 0.0035], speed: [0.006, 0.016], sway: 0.02 },
  snow: { size: [0.0012, 0.0035], speed: [0.03, 0.06], sway: 0.006 },
  drop: { size: [0.003, 0.004], speed: [0.12, 0.18], sway: 0 },
};

function drawInsect(ctx, kind, X, Y, S, b, t) {
  ctx.save();
  ctx.translate(X, Y);
  if (kind === 'butterfly') {
    ctx.rotate(0.25 * b.dir);
    const f = 0.2 + 0.8 * Math.abs(Math.sin(t * 11 + b.ph));
    ctx.fillStyle = `rgba(${b.col[0]},0.92)`;
    ctx.strokeStyle = `rgba(${b.col[1]},0.9)`;
    ctx.lineWidth = 1;
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.scale(sd * f, 1);
      ctx.beginPath(); ctx.ellipse(S * 0.32, -S * 0.16, S * 0.34, S * 0.25, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(S * 0.22, S * 0.15, S * 0.21, S * 0.16, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(50,40,30,0.9)';
    ctx.fillRect(-S * 0.03, -S * 0.28, S * 0.06, S * 0.52);
  } else if (kind === 'dragonfly') {
    ctx.scale(b.dir, 1);
    const flap = 0.55 + 0.45 * Math.sin(t * 70 + b.ph);
    ctx.fillStyle = `rgba(235,245,255,${0.3 + 0.25 * flap})`;
    ctx.strokeStyle = 'rgba(80,100,110,0.35)';
    ctx.lineWidth = 0.8;
    for (const [ox, rot] of [[0.18, 0.25], [0.04, -0.15]]) {
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(S * ox, sd * S * 0.2 * flap, S * 0.07, S * 0.22 * flap + S * 0.02, sd * rot, 0, TAU);
        ctx.fill(); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(40,62,72,0.9)';
    ctx.lineWidth = Math.max(1.2, S * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(S * 0.34, 0); ctx.lineTo(-S * 0.62, S * 0.03); ctx.stroke();
    ctx.fillStyle = 'rgba(40,62,72,0.95)';
    ctx.beginPath(); ctx.arc(S * 0.38, 0, S * 0.065, 0, TAU); ctx.fill();
  } else {
    ctx.scale(b.dir, 1);
    const flap = 0.5 + 0.5 * Math.sin(t * 80 + b.ph);
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.25 * flap})`;
    ctx.beginPath(); ctx.ellipse(-S * 0.1, -S * 0.55, S * 0.35, S * 0.55 * flap + S * 0.1, -0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(232,180,40)';
    ctx.beginPath(); ctx.ellipse(0, 0, S * 0.7, S * 0.45, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgb(40,30,20)';
    ctx.fillRect(-S * 0.2, -S * 0.43, S * 0.18, S * 0.86);
    ctx.fillRect(S * 0.25, -S * 0.36, S * 0.15, S * 0.72);
  }
  ctx.restore();
}

function createFx(env, list) {
  const mods = list.map((c) => {
    if (!FX[c.t]) { console.warn('unknown fx', c.t); return null; }
    return FX[c.t](env, c);
  }).filter(Boolean);
  return {
    draw(ctx, t, dt) {
      for (const m of mods) {
        m(ctx, t, dt);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    },
  };
}
