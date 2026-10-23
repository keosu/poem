'use strict';

(() => {
  const IW = 1536, IH = 1024;
  const AUTO_INTERVAL = 30000;

  const $ = (id) => document.getElementById(id);
  const app = $('app'), view = $('view'), bg = $('bg'), canvas = $('fx');
  const poemEl = $('poem'), captionEl = $('caption'), navEl = $('nav'), veil = $('veil');
  const btnSound = $('btnSound'), btnAuto = $('btnAuto'), btnFs = $('btnFs'), btnRecite = $('btnRecite');
  const catalog = $('catalog'), grid = $('grid');
  const ctx = canvas.getContext('2d');

  const LIST = sceneList();

  const env = {
    W: 0, H: 0, dw: 0, dh: 0, ox: 0, oy: 0, k: 1,
    vis: { x0: 0, x1: 1, y0: 0, y1: 1 },
    theme: 'light', img: bg,
    X(fx) { return this.ox + fx * this.dw; },
    Y(fy) { return this.oy + fy * this.dh; },
    S(f) { return f * this.dw; },
    sfx(name) { Sound.sfx(name); },
    emit(ev) {
      if (ev === 'bell') {
        Sound.sfx('bell');
        const i = LIST[idx].bellLine;
        const line = poemEl.querySelector(`.line[data-i="${i}"]`);
        if (line) { line.classList.remove('ring'); void line.offsetWidth; line.classList.add('ring'); }
      }
    },
  };

  let idx = 0, fx = null, sceneT = 0, busy = false, autoTimer = null;

  function layout() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.max(W / IW, H / IH);
    Object.assign(env, { W, H, dw: IW * s, dh: IH * s });
    env.ox = (W - env.dw) / 2;
    env.oy = (H - env.dh) / 2;
    env.vis = { x0: -env.ox / env.dw, x1: (W - env.ox) / env.dw, y0: -env.oy / env.dh, y1: (H - env.oy) / env.dh };
    env.k = Math.min(1.4, Math.max(0.5, (W * H) / (1600 * 900)));
    if (fx && fx.resize) fx.resize();
    if (LIST[idx]) fitPoem(LIST[idx]);
  }

  // 按行数与最长行字数确定字号：竖排每行一列，列高受屏高限制，列数受左侧留白宽度限制
  function fitPoem(s) {
    const W = innerWidth, H = innerHeight;
    const rows = s.lines.length, len = Math.max(...s.lines.map((l) => l.length));
    const availH = H * 0.8, availW = W * (W < 720 ? 0.9 : 0.44);
    const tf = Math.max(20, Math.min(H * 0.064, 66, availH / (s.title.length * 1.22 + 0.6)));
    const af = Math.max(12, Math.min(H * 0.021, 22));
    const byH = availH / (len * 1.3 + 1.3);
    const byW = (availW - tf * 1.6 - af * 3) / (rows * 2.15);
    const fs = Math.max(14, Math.min(H * 0.047, 50, byH, byW));
    poemEl.style.setProperty('--tf', Math.min(tf, fs * 1.6).toFixed(1) + 'px');
    poemEl.style.setProperty('--af', af.toFixed(1) + 'px');
    poemEl.style.setProperty('--fs', fs.toFixed(1) + 'px');
  }

  function buildPoem(s) {
    poemEl.innerHTML = '';
    fitPoem(s);
    let d = 0.5;
    const col = (cls, text, step) => {
      const el = document.createElement('div');
      el.className = 'col ' + cls;
      for (const ch of text) {
        const sp = document.createElement('span');
        sp.className = 'ch';
        sp.textContent = ch;
        sp.style.setProperty('--d', d.toFixed(2) + 's');
        d += step;
        el.appendChild(sp);
      }
      poemEl.appendChild(el);
      return el;
    };
    col('title', s.title, s.title.length > 7 ? 0.1 : 0.18);
    d += 0.2;
    const author = col('author', `${s.dynasty}·${s.author}`, 0.08);
    const seal = document.createElement('span');
    seal.className = 'seal';
    seal.textContent = s.seal || s.author;
    seal.style.setProperty('--d', (d + 0.2).toFixed(2) + 's');
    author.appendChild(seal);
    d += 0.7;
    const step = s.lines.length > 6 ? 0.1 : 0.14;
    s.lines.forEach((ln, i) => {
      col('line', ln, step).dataset.i = i;
      d += s.lines.length > 6 ? 0.3 : 0.5;
    });
    captionEl.textContent = s.caption;
    captionEl.style.animation = 'none';
    void captionEl.offsetWidth;
    captionEl.style.animation = '';
    captionEl.style.setProperty('--d', (d + 0.4).toFixed(2) + 's');
  }

  // --- 图片按需加载，只预取前后相邻的几首 ---
  const images = new Map();
  function load(i) {
    const s = LIST[(i + LIST.length) % LIST.length];
    if (!images.has(s.id)) {
      const im = new Image();
      im.src = s.img;
      images.set(s.id, im);
    }
    return images.get(s.id);
  }
  function whenLoaded(im, fn) {
    if (im.complete && im.naturalWidth) fn();
    else { im.addEventListener('load', fn, { once: true }); im.addEventListener('error', fn, { once: true }); }
  }
  function prefetch(i) {
    if (shuffleOn) { fillQueue(); queue.slice(0, 2).forEach(load); }
    else [1, -1, 2].forEach((d) => load(i + d));
  }

  // --- 随机模式：预先排好一串乱序，并提前加载接下来两幅图，切换时不卡顿 ---
  let shuffleOn = localStorage.getItem('poem.shuffle') === '1';
  let queue = [];
  const back = [];
  function fillQueue() {
    if (queue.length >= 2) return;
    const rest = LIST.map((_, j) => j).filter((j) => j !== idx && !queue.includes(j));
    for (let j = rest.length - 1; j > 0; j--) { const r = (Math.random() * (j + 1)) | 0; [rest[j], rest[r]] = [rest[r], rest[j]]; }
    queue.push(...rest);
  }
  function next() {
    if (busy) return;
    if (!shuffleOn) return go(idx + 1);
    fillQueue();
    back.push(idx);
    go(queue.shift());
  }
  function prev() {
    if (busy) return;
    if (shuffleOn && back.length) go(back.pop());
    else go(idx - 1);
  }

  function apply(i) {
    idx = i;
    const s = LIST[i];
    if (spriteCache.size > 160) spriteCache.clear();
    bg.src = s.img;
    env.theme = s.theme;
    app.classList.toggle('dark', s.theme === 'dark');
    view.style.transformOrigin = s.origin;
    poemEl.style.setProperty('--py', s.poemTop ? parseFloat(s.poemTop) + 'vh' : '50vh');
    view.classList.remove('kb');
    void view.offsetWidth;
    view.classList.add('kb');
    buildPoem(s);
    sceneT = 0;
    fx = s.create(env);
    navEl.querySelector('.idx').textContent = `${i + 1} / ${LIST.length}`;
    navEl.querySelector('.ttl').textContent = s.title;
    grid.querySelectorAll('.card.on').forEach((c) => c.classList.remove('on'));
    grid.children[i].classList.add('on');
    history.replaceState(null, '', '#' + s.id);
    Sound.setScene(s);
    recite(1.4);
    prefetch(i);
  }

  // 朗诵当前这首，并逐列高亮：0 题目，1 作者，2+ 各句
  function recite(delay) {
    const cols = poemEl.querySelectorAll('.col');
    Recite.play(LIST[idx].id, {
      delay,
      onPart(k) {
        poemEl.classList.toggle('reciting', k >= 0);
        cols.forEach((c, j) => c.classList.toggle('reading', j === k));
      },
    });
  }

  function go(i) {
    i = (i + LIST.length) % LIST.length;
    if (busy || i === idx) return;
    busy = true;
    Recite.stop();
    const im = load(i);
    veil.style.setProperty('--veil', LIST[i].theme === 'dark' ? '#070a12' : '#ece6d8');
    veil.classList.remove('hide');
    setTimeout(() => whenLoaded(im, () => { apply(i); veil.classList.add('hide'); busy = false; }), 900);
    restartAuto();
  }

  function restartAuto() {
    clearInterval(autoTimer);
    if (btnAuto.classList.contains('on')) autoTimer = setInterval(next, AUTO_INTERVAL);
  }

  // --- 目录 ---
  LIST.forEach((s, i) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.innerHTML = `<img loading="lazy" alt="" src="assets/thumb/${s.id}.jpg" />`
      + `<span class="no">${i + 1}</span><b>${s.title}</b><i>${s.dynasty}·${s.author}${s.subtitle ? ' · ' + s.subtitle : ''}</i>`;
    card.onclick = () => { closeCatalog(); go(i); };
    grid.appendChild(card);
  });
  function openCatalog() {
    catalog.classList.add('open');
    const on = grid.children[idx];
    if (on) on.scrollIntoView({ block: 'center' });
  }
  function closeCatalog() { catalog.classList.remove('open'); }
  navEl.onclick = openCatalog;
  $('catClose').onclick = closeCatalog;
  catalog.addEventListener('click', (e) => { if (e.target === catalog) closeCatalog(); });

  $('prev').onclick = prev;
  $('next').onclick = next;

  const btnShuffle = $('btnShuffle');
  const showShuffle = () => {
    btnShuffle.innerHTML = toggleLabel('随机', shuffleOn);
    btnShuffle.classList.toggle('on', shuffleOn);
  };
  showShuffle();
  btnShuffle.onclick = () => {
    shuffleOn = !shuffleOn;
    localStorage.setItem('poem.shuffle', shuffleOn ? '1' : '0');
    queue = [];
    back.length = 0;
    showShuffle();
    prefetch(idx);
  };

  const showRecite = () => {
    btnRecite.innerHTML = toggleLabel('诵', Recite.on);
    btnRecite.classList.toggle('on', Recite.on);
  };
  showRecite();
  btnRecite.onclick = () => {
    Recite.toggle();
    showRecite();
    if (Recite.on) recite(0.2);
  };
  btnSound.onclick = () => {
    const on = Sound.toggle();
    btnSound.innerHTML = toggleLabel('声', on);
    btnSound.classList.toggle('on', on);
  };
  btnAuto.onclick = () => {
    const on = !btnAuto.classList.contains('on');
    btnAuto.classList.toggle('on', on);
    btnAuto.innerHTML = toggleLabel('轮播', on);
    restartAuto();
  };
  btnFs.onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  addEventListener('keydown', (e) => {
    if (catalog.classList.contains('open')) {
      if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') closeCatalog();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') next();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
    else if (e.key === 'x' || e.key === 'X') btnShuffle.click();
    else if (e.key === ' ') { e.preventDefault(); btnAuto.click(); }
    else if (e.key === 's' || e.key === 'S') btnSound.click();
    else if (e.key === 'r' || e.key === 'R') btnRecite.click();
    else if (e.key === 'f' || e.key === 'F') btnFs.click();
    else if (e.key === 'm' || e.key === 'M') openCatalog();
  });

  let idleTimer = null;
  const wake = () => {
    app.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => app.classList.add('idle'), 3500);
  };
  addEventListener('mousemove', wake);
  addEventListener('touchstart', wake, { passive: true });

  let touchX = null;
  addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (touchX == null || catalog.classList.contains('open')) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
    touchX = null;
  });

  addEventListener('resize', layout);

  // --- 启动 ---
  const fromHash = LIST.findIndex((s) => '#' + s.id === location.hash);
  const first = fromHash >= 0 ? fromHash : shuffleOn ? (Math.random() * LIST.length) | 0 : 0;

  // ?t=秒数：直接呈现该时刻的静帧（无遮罩、无逐字动画），用于截图
  const still = parseFloat(new URLSearchParams(location.search).get('t'));

  layout();
  whenLoaded(load(first), () => {
    apply(first);
    if (still >= 0) {
      app.classList.add('still');
      veil.style.display = 'none';
      for (let s = 0; s < still; s += 1 / 30) { sceneT += 1 / 30; fx.draw(ctx, sceneT, 1 / 30); }
      return;
    }
    veil.classList.add('ready');
    setTimeout(() => veil.classList.add('hide'), 300);
    wake();
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, env.W, env.H);
    if (fx) { sceneT += dt; fx.draw(ctx, sceneT, dt); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
