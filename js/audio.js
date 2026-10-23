'use strict';

// 全部声音由 WebAudio 实时合成，不依赖音频文件。
const Sound = {
  ctx: null,
  on: false,
  master: null,
  sfxBus: null,
  amb: null,
  scene: null,

  init() {
    const c = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);

    const verb = c.createConvolver();
    verb.buffer = this.impulse(3.5, 2.6);
    verb.connect(this.master);
    this.sfxBus = c.createGain();
    this.sfxBus.connect(this.master);
    const send = c.createGain();
    send.gain.value = 0.55;
    this.sfxBus.connect(send);
    send.connect(verb);

    this.white = this.noiseBuffer('white');
    this.brown = this.noiseBuffer('brown');
  },

  noiseBuffer(type) {
    const c = this.ctx, len = c.sampleRate * 6;
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    const fade = 2048;
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
    }
    return b;
  },

  impulse(sec, decay) {
    const c = this.ctx, len = c.sampleRate * sec, b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  },

  toggle() {
    if (!this.ctx) this.init();
    this.ctx.resume();
    this.on = !this.on;
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.on ? this.level() : 0, t, 0.4);
    if (this.on && !this.amb && this.scene) this.setScene(this.scene);
    return this.on;
  },

  level() { return this.ducked ? 0.3 : 0.9; },

  // 朗诵时压低环境声
  duck(on) {
    this.ducked = on;
    if (!this.ctx || !this.on) return;
    const g = this.master.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(this.level(), t, on ? 0.25 : 0.8);
  },

  setScene(scene) {
    this.scene = scene;
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    if (this.amb) {
      const old = this.amb;
      old.out.gain.setTargetAtTime(0, t, 0.5);
      setTimeout(() => old.stop(), 3500);
      this.amb = null;
    }
    if (!this.on) return;
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(this.master);
    out.gain.setTargetAtTime(1, t + 0.3, 1.2);
    const srcs = [];
    const build = AMBIENTS[scene.sound];
    if (build) build(this, out, srcs);
    this.amb = {
      out,
      stop() {
        srcs.forEach((s) => { try { s.stop(); } catch (e) { /* already stopped */ } });
        out.disconnect();
      },
    };
  },

  noise(type, out, srcs, { lp, hp, bp, q = 0.7, gain = 0.1 } = {}) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = type === 'brown' ? this.brown : this.white;
    s.loop = true;
    let node = s, filter = null;
    const add = (kind, f, Q) => {
      const b = c.createBiquadFilter();
      b.type = kind; b.frequency.value = f; if (Q) b.Q.value = Q;
      node.connect(b); node = b; filter = b;
    };
    if (hp) add('highpass', hp);
    if (lp) add('lowpass', lp);
    if (bp) add('bandpass', bp, q);
    const g = c.createGain();
    g.gain.value = gain;
    node.connect(g);
    g.connect(out);
    s.start(c.currentTime, Math.random() * 5);
    srcs.push(s);
    return { gain: g, filter };
  },

  lfo(param, freq, depth, srcs) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = freq;
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
    srcs.push(o);
  },

  // 稀疏的随机脉冲，循环播放即成柴火噼啪
  crackle(out, srcs, gain) {
    const c = this.ctx;
    if (!this.crackleBuf) {
      const len = c.sampleRate * 5, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < 70; i++) {
        const at = (Math.random() * (len - 800)) | 0, amp = 0.3 + Math.random() * 0.7, n = 60 + ((Math.random() * 500) | 0);
        for (let j = 0; j < n; j++) d[at + j] += (Math.random() * 2 - 1) * amp * Math.pow(1 - j / n, 3);
      }
      this.crackleBuf = b;
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.crackleBuf;
    s.loop = true;
    f.type = 'highpass'; f.frequency.value = 900;
    g.gain.value = gain;
    s.connect(f).connect(g).connect(out);
    s.start();
    srcs.push(s);
  },

  // 一个带包络的音：type 波形，f 频率，t0 起点，d 时长，a 音量
  tone(type, f, t0, d, a, { attack = 0.01, vib = 0, dest } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 5.5; lg.gain.value = f * vib;
      l.connect(lg).connect(o.frequency);
      l.start(t0); l.stop(t0 + d + 0.1);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(a, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(dest || this.sfxBus);
    o.start(t0);
    o.stop(t0 + d + 0.05);
    return o;
  },

  burst(t0, d, a, { bp, lp, hp, q = 1, type = 'white' } = {}) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = type === 'brown' ? this.brown : this.white;
    let node = s;
    for (const [kind, f] of [['bandpass', bp], ['lowpass', lp], ['highpass', hp]]) {
      if (!f) continue;
      const b = c.createBiquadFilter();
      b.type = kind; b.frequency.value = f; b.Q.value = kind === 'bandpass' ? q : 0.7;
      node.connect(b); node = b;
    }
    g.gain.setValueAtTime(a, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    node.connect(g).connect(this.sfxBus);
    s.start(t0, Math.random() * 4);
    s.stop(t0 + d + 0.05);
  },

  sfx(name) {
    if (!this.on || !this.ctx) return;
    const fn = SFX[name];
    if (fn) fn(this);
  },
};

const AMBIENTS = {
  // 静夜：极轻的夜风
  night(A, out, s) {
    const w = A.noise('brown', out, s, { lp: 360, gain: 0.09 });
    A.lfo(w.gain.gain, 0.07, 0.045, s);
  },
  // 春晨：檐下余雨 + 微风
  spring(A, out, s) {
    A.noise('white', out, s, { hp: 3800, lp: 9000, gain: 0.010 });
    const w = A.noise('brown', out, s, { lp: 520, gain: 0.05 });
    A.lfo(w.gain.gain, 0.09, 0.025, s);
  },
  // 寒江：空旷的风
  snow(A, out, s) {
    const w = A.noise('brown', out, s, { bp: 460, q: 0.6, gain: 0.16 });
    A.lfo(w.filter.frequency, 0.05, 220, s);
    A.lfo(w.gain.gain, 0.08, 0.08, s);
  },
  // 瀑布：轰鸣 + 水雾
  fall(A, out, s) {
    A.noise('white', out, s, { hp: 120, lp: 1100, gain: 0.15 });
    A.noise('brown', out, s, { lp: 180, gain: 0.42 });
    const h = A.noise('white', out, s, { bp: 2600, q: 0.8, gain: 0.022 });
    A.lfo(h.gain.gain, 0.3, 0.01, s);
  },
  // 山行：林间秋风
  autumn(A, out, s) {
    const w = A.noise('brown', out, s, { bp: 820, q: 0.5, gain: 0.10 });
    A.lfo(w.gain.gain, 0.11, 0.07, s);
    A.lfo(w.filter.frequency, 0.07, 300, s);
  },
  // 夜泊：船边水声
  river(A, out, s) {
    const w = A.noise('brown', out, s, { lp: 320, gain: 0.12 });
    A.lfo(w.gain.gain, 0.23, 0.05, s);
  },
  // 溪水潺潺
  stream(A, out, s) {
    const b = A.noise('white', out, s, { bp: 1900, q: 0.7, gain: 0.022 });
    A.lfo(b.gain.gain, 2.3, 0.008, s);
    A.lfo(b.filter.frequency, 0.37, 500, s);
    A.noise('brown', out, s, { lp: 420, gain: 0.05 });
  },
  // 原野长风
  wind(A, out, s) {
    const w = A.noise('brown', out, s, { bp: 620, q: 0.5, gain: 0.15 });
    A.lfo(w.filter.frequency, 0.06, 260, s);
    A.lfo(w.gain.gain, 0.09, 0.08, s);
  },
  // 大漠：低沉的风与细沙
  desert(A, out, s) {
    const w = A.noise('brown', out, s, { bp: 380, q: 0.6, gain: 0.15 });
    A.lfo(w.gain.gain, 0.05, 0.07, s);
    const h = A.noise('white', out, s, { hp: 4200, gain: 0.005 });
    A.lfo(h.gain.gain, 0.07, 0.003, s);
  },
  // 篝火：低频火声 + 噼啪
  campfire(A, out, s) {
    A.noise('brown', out, s, { lp: 220, gain: 0.08 });
    A.crackle(out, s, 0.05);
    const w = A.noise('brown', out, s, { bp: 420, q: 0.6, gain: 0.06 });
    A.lfo(w.gain.gain, 0.06, 0.03, s);
  },
  // 冷雨
  rain(A, out, s) {
    A.noise('white', out, s, { bp: 2600, q: 0.4, gain: 0.045 });
    A.noise('white', out, s, { lp: 900, gain: 0.04 });
    A.noise('brown', out, s, { lp: 300, gain: 0.05 });
  },
  // 细雨
  drizzle(A, out, s) {
    const r = A.noise('white', out, s, { hp: 3000, lp: 8000, gain: 0.016 });
    A.lfo(r.gain.gain, 0.1, 0.005, s);
    A.noise('brown', out, s, { lp: 400, gain: 0.03 });
  },
  // 林间：树叶沙沙
  forest(A, out, s) {
    const w = A.noise('brown', out, s, { lp: 500, gain: 0.04 });
    A.lfo(w.gain.gain, 0.08, 0.02, s);
    const l = A.noise('white', out, s, { bp: 3200, q: 0.5, gain: 0.006 });
    A.lfo(l.gain.gain, 0.13, 0.004, s);
  },
  // 屋内：几近无声
  interior(A, out, s) {
    A.noise('brown', out, s, { lp: 150, gain: 0.035 });
  },
  // 盛夏：远处蝉声连绵
  summer(A, out, s) {
    A.noise('brown', out, s, { lp: 400, gain: 0.035 });
    const c = A.ctx, o = c.createOscillator(), am = c.createOscillator(), amg = c.createGain(), g = c.createGain(), bp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 4600;
    am.frequency.value = 48; amg.gain.value = 0.5;
    g.gain.value = 0.5;
    am.connect(amg).connect(g.gain);
    bp.type = 'bandpass'; bp.frequency.value = 4800; bp.Q.value = 3;
    const v = c.createGain();
    v.gain.value = 0.006;
    o.connect(bp).connect(g).connect(v).connect(out);
    A.lfo(v.gain, 0.08, 0.004, s);
    o.start(); am.start();
    s.push(o, am);
  },
  // 风浪
  waves(A, out, s) {
    const w = A.noise('brown', out, s, { lp: 500, gain: 0.16 });
    A.lfo(w.gain.gain, 0.12, 0.11, s);
    const h = A.noise('white', out, s, { bp: 900, q: 0.6, gain: 0.025 });
    A.lfo(h.gain.gain, 0.12, 0.02, s);
  },
  // 新春：暖风
  festival(A, out, s) {
    const w = A.noise('brown', out, s, { lp: 380, gain: 0.05 });
    A.lfo(w.gain.gain, 0.1, 0.02, s);
  },
  // 暴雨与闷雷
  storm(A, out, s) {
    A.noise('white', out, s, { lp: 3200, gain: 0.08 });
    A.noise('white', out, s, { bp: 1400, q: 0.5, gain: 0.04 });
    const r = A.noise('brown', out, s, { lp: 140, gain: 0.22 });
    A.lfo(r.gain.gain, 0.05, 0.12, s);
  },
};

// 五声音阶（宫商角徵羽）
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];

const SFX = {
  cricket(A) {
    const c = A.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 4300 + Math.random() * 500;
    g.gain.value = 0;
    o.connect(g).connect(A.sfxBus);
    const n = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const t0 = t + i * 0.075;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.014, t0 + 0.01);
      g.gain.linearRampToValueAtTime(0, t0 + 0.045);
    }
    o.start(t);
    o.stop(t + n * 0.075 + 0.1);
  },

  chirp(A) {
    const c = A.ctx;
    let t = c.currentTime + 0.05;
    const n = 2 + ((Math.random() * 4) | 0);
    const base = 2600 + Math.random() * 1300;
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), g = c.createGain();
      const f0 = base * (0.9 + Math.random() * 0.3), f1 = f0 * (1.2 + Math.random() * 0.45);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.05);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.88, t + 0.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.11);
      o.connect(g).connect(A.sfxBus);
      o.start(t);
      o.stop(t + 0.13);
      t += 0.11 + Math.random() * 0.09;
    }
  },

  caw(A) {
    const c = A.ctx;
    const n = 1 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + 0.05 + i * 0.42;
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(560, t);
      o.frequency.exponentialRampToValueAtTime(390, t + 0.3);
      f.type = 'bandpass'; f.frequency.value = 1150; f.Q.value = 1.6;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.03);
      g.gain.setValueAtTime(0.05, t + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.34);
      o.connect(f).connect(g).connect(A.sfxBus);
      o.start(t);
      o.stop(t + 0.36);
    }
  },

  // 寒山寺钟：非谐和分音 + 轻微拍频，低通模拟远处
  bell(A) {
    const c = A.ctx, t = c.currentTime + 0.05, f = 98;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2000;
    const out = c.createGain();
    out.gain.value = 0.22;
    lp.connect(out).connect(A.sfxBus);
    const partials = [
      [0.5, 0.55, 12], [1, 1, 10], [1.19, 0.5, 7], [1.5, 0.35, 6],
      [2, 0.45, 5], [2.52, 0.25, 3.5], [3.01, 0.2, 2.6], [4.17, 0.12, 1.8], [5.43, 0.07, 1.2],
    ];
    for (const [r, a, d] of partials) {
      for (const det of [0, 0.7]) {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = f * r + det;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(a * 0.5, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(lp);
        o.start(t);
        o.stop(t + d + 0.1);
      }
    }
  },

  // 琵琶：几声拨弦，偶有轮指
  pipa(A) {
    let t = A.ctx.currentTime + 0.05;
    const base = 294, n = 4 + ((Math.random() * 4) | 0);
    let k = (Math.random() * 4) | 0;
    for (let i = 0; i < n; i++) {
      k = clamp(k + pick([-2, -1, 1, 1, 2]), 0, PENTA.length - 1);
      const f = base * PENTA[k], reps = Math.random() < 0.2 ? 4 : 1;
      for (let r = 0; r < reps; r++) {
        A.tone('triangle', f, t + r * 0.06, 1.1, 0.05, { attack: 0.004 });
        A.tone('sine', f * 2, t + r * 0.06, 0.5, 0.02, { attack: 0.004 });
      }
      t += reps > 1 ? 0.4 : pick([0.22, 0.3, 0.45]);
    }
  },

  // 羌笛：悠长的笛音，带颤音与气声
  flute(A) {
    let t = A.ctx.currentTime + 0.1;
    const base = 587, n = 3 + ((Math.random() * 3) | 0);
    let k = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      k = clamp(k + pick([-1, -1, 1, 2, -2]), 0, PENTA.length - 1);
      const d = i === n - 1 ? 1.8 : rand(0.5, 1);
      A.tone('sine', base * PENTA[k], t, d + 0.3, 0.028, { attack: 0.12, vib: 0.006 });
      A.burst(t, d * 0.6, 0.006, { bp: base * PENTA[k] * 2, q: 4 });
      t += d;
    }
  },

  // 猿啼：一串越来越急的上扬长啸
  gibbon(A) {
    const c = A.ctx, n = 3 + ((Math.random() * 3) | 0);
    let t = c.currentTime + 0.1, gap = 0.9;
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), g = c.createGain(), f = 520 + i * 60;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 2.2, t + gap * 0.5);
      o.frequency.exponentialRampToValueAtTime(f * 1.5, t + gap * 0.85);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025, t + gap * 0.3);
      g.gain.exponentialRampToValueAtTime(0.0005, t + gap * 0.9);
      o.connect(g).connect(A.sfxBus);
      o.start(t); o.stop(t + gap);
      t += gap; gap *= 0.8;
    }
  },

  // 蝉鸣：一阵高亢的嘶鸣，渐强后渐弱
  cicada(A) {
    const c = A.ctx, t = c.currentTime + 0.05, d = rand(2.5, 4.5);
    const o = c.createOscillator(), am = c.createOscillator(), amg = c.createGain(), g = c.createGain(), env = c.createGain();
    o.type = 'square'; o.frequency.value = 4300 + Math.random() * 600;
    am.frequency.value = 70 + Math.random() * 30; amg.gain.value = 0.5;
    g.gain.value = 0.5;
    am.connect(amg).connect(g.gain);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = o.frequency.value; bp.Q.value = 4;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.018, t + d * 0.3);
    env.gain.setValueAtTime(0.018, t + d * 0.7);
    env.gain.linearRampToValueAtTime(0, t + d);
    o.connect(bp).connect(g).connect(env).connect(A.sfxBus);
    o.start(t); am.start(t);
    o.stop(t + d); am.stop(t + d);
  },

  // 蜂鸣：由远及近又远去
  buzz(A) {
    const c = A.ctx, t = c.currentTime + 0.05, d = rand(1.5, 2.5);
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(210 + Math.random() * 40, t);
    o.frequency.linearRampToValueAtTime(240 + Math.random() * 40, t + d / 2);
    o.frequency.linearRampToValueAtTime(200, t + d);
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + d / 2);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(f).connect(g).connect(A.sfxBus);
    o.start(t); o.stop(t + d);
  },

  // 子规（杜鹃）：两声一组的啼鸣
  cuckoo(A) {
    let t = A.ctx.currentTime + 0.05;
    const reps = 2 + ((Math.random() * 2) | 0);
    for (let i = 0; i < reps; i++) {
      A.tone('sine', 760, t, 0.28, 0.035, { attack: 0.03 });
      A.tone('sine', 610, t + 0.3, 0.42, 0.035, { attack: 0.03 });
      t += 1.1;
    }
  },

  // 锤凿：几下金石相击
  chisel(A) {
    let t = A.ctx.currentTime + 0.05;
    const n = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      A.burst(t, 0.06, 0.08, { bp: 2400, q: 2 });
      A.tone('sine', 2650 + Math.random() * 300, t, 0.18, 0.012, { attack: 0.002 });
      A.tone('sine', 3900 + Math.random() * 300, t, 0.12, 0.008, { attack: 0.002 });
      t += rand(0.45, 0.6);
    }
  },

  // 爆竹：一声脆响
  firecracker(A) {
    const t = A.ctx.currentTime + 0.01;
    A.burst(t, 0.07, 0.22, { bp: 1500 + Math.random() * 800, q: 0.8 });
    A.burst(t, 0.12, 0.2, { lp: 220, type: 'brown' });
  },

  // 答对：上行的两声清音
  right(A) {
    const t = A.ctx.currentTime + 0.02;
    A.tone('sine', 784, t, 0.5, 0.06, { attack: 0.005 });
    A.tone('sine', 1175, t + 0.12, 0.9, 0.06, { attack: 0.005 });
    A.tone('triangle', 2350, t + 0.12, 0.4, 0.01, { attack: 0.005 });
  },

  // 答错：低沉的一声
  wrong(A) {
    const t = A.ctx.currentTime + 0.02;
    A.tone('triangle', 196, t, 0.6, 0.07, { attack: 0.01 });
    A.tone('triangle', 185, t + 0.05, 0.6, 0.05, { attack: 0.01 });
  },

  // 远雷：滚动的低频轰鸣
  thunder(A) {
    const c = A.ctx, t = c.currentTime + 0.02, d = rand(3, 5);
    const s = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.brown;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(120, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.9, t + 0.15);
    g.gain.setValueAtTime(0.7, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(lp).connect(g).connect(A.sfxBus);
    s.start(t, Math.random() * 3);
    s.stop(t + d);
  },
};
