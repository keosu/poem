'use strict';

// 看图猜诗：画面逐行显现，显现完毕（或玩家提前喊停）后出现四个选项。
(() => {
  const IW = 1536, IH = 1024;
  const ROWS = 8, STEP = 1100, FULL_PTS = 60, EARLY_PTS = 5;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), full = $('full'), strips = $('strips'), canvas = $('fx'), ctx = canvas.getContext('2d');
  const panel = $('panel'), opts = $('opts'), rowsEl = $('rows');
  const LIST = sceneList();

  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const env = {
    W: 0, H: 0, dw: 0, dh: 0, ox: 0, oy: 0, k: 1,
    vis: { x0: 0, x1: 1, y0: 0, y1: 1 },
    theme: 'light', img: full,
    X(f) { return this.ox + f * this.dw; },
    Y(f) { return this.oy + f * this.dh; },
    S(f) { return f * this.dw; },
    sfx(name) { Sound.sfx(name); },
    emit(ev) { if (ev === 'bell') Sound.sfx('bell'); },
  };

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
  }

  // --- 状态 ---
  let rounds = [], cur = 0, score = 0, revealed = 0, timer = null, phase = 'start', fx = null, sceneT = 0;
  const COUNT = 10;
  let answer = null, choices = [], sel = -1;

  const images = new Map();
  function load(s) {
    if (!images.has(s.id)) { const im = new Image(); im.src = s.img; images.set(s.id, im); }
    return images.get(s.id);
  }
  function whenLoaded(im, fn) {
    if (im.complete && im.naturalWidth) fn();
    else { im.addEventListener('load', fn, { once: true }); im.addEventListener('error', fn, { once: true }); }
  }

  // 干扰项：标题互不相同，优先选同类画面（同明暗、同环境声）以增加难度
  function optionsFor(s) {
    const pool = LIST.filter((x) => x.title !== s.title);
    const similar = shuffle(pool.filter((x) => x.theme === s.theme && x.sound === s.sound));
    const picks = [];
    for (const x of [...similar.slice(0, 2), ...shuffle(pool)]) {
      if (picks.length === 3) break;
      if (!picks.some((p) => p.title === x.title)) picks.push(x);
    }
    return shuffle([s, ...picks]);
  }

  function setView(v) { panel.dataset.v = v; }

  // 把一幅画切成 ROWS 条横带放进 el，各带默认隐藏，加 .on 后显现
  function fillStrips(el, src) {
    el.innerHTML = '';
    for (let i = 0; i < ROWS; i++) {
      const st = document.createElement('div');
      st.className = 'strip' + (i % 2 ? ' rtl' : '');
      st.style.top = (i * 100) / ROWS + '%';
      st.style.height = 100 / ROWS + '%';
      const im = document.createElement('img');
      im.src = src;
      im.style.top = -i * 100 + '%';
      im.style.height = ROWS * 100 + '%';
      st.appendChild(im);
      el.appendChild(st);
    }
  }

  // --- 开始页：画轴里循环演示逐行显现，最后揭晓诗名 ---
  const teaser = $('teaser'), teaserCap = $('teaserCap'), introBg = $('introBg');
  let teaserTimers = [], teaserQueue = [];
  function teaserStop() { teaserTimers.forEach(clearTimeout); teaserTimers = []; }
  function teaserNext() {
    teaserStop();
    if (!teaserQueue.length) teaserQueue = shuffle(LIST);
    const s = teaserQueue.pop();
    const later = (ms, fn) => teaserTimers.push(setTimeout(fn, ms));
    whenLoaded(load(s), () => {
      if (phase !== 'start') return;
      teaser.classList.remove('out');
      teaserCap.classList.remove('show');
      teaserCap.querySelector('.a').textContent = `《${s.title}》${s.dynasty} · ${s.author}`;
      fillStrips(teaser, s.img);
      introBg.classList.remove('on');
      later(300, () => { introBg.src = s.img; introBg.classList.add('on'); });
      for (let i = 0; i < ROWS; i++) later(400 + i * 520, () => teaser.children[i].classList.add('on'));
      const done = 400 + ROWS * 520 + 600;
      later(done, () => teaserCap.classList.add('show'));
      later(done + 2800, () => { teaser.classList.add('out'); teaserCap.classList.remove('show'); });
      later(done + 3700, teaserNext);
    });
  }

  const BEST = 'poem.best.10';
  function showBest() {
    const b = +localStorage.getItem(BEST) || 0;
    $('best').innerHTML = b ? `最高分 <b>${b}</b>` : '';
  }

  function openStart() {
    phase = 'start';
    panel.style.visibility = 'hidden';
    $('end').classList.remove('open');
    $('start').classList.add('open');
    showBest();
    teaserNext();
  }

  function start() {
    teaserStop();
    Recite.stop();
    rounds = shuffle(LIST).slice(0, COUNT).map((s) => ({ s, ok: false, pts: 0 }));
    cur = 0;
    score = 0;
    $('score').textContent = '0';
    $('start').classList.remove('open');
    $('end').classList.remove('open');
    playRound();
  }

  function playRound() {
    const r = rounds[cur], s = r.s;
    phase = 'loading';
    fx = null;
    Recite.stop();
    Sound.setScene({ sound: 'none' });
    stage.classList.remove('done');
    strips.innerHTML = '';
    rowsEl.innerHTML = '<i></i>'.repeat(ROWS);
    $('round').textContent = `第 ${cur + 1} / ${rounds.length} 题`;
    panel.style.visibility = 'hidden';
    if (rounds[cur + 1]) load(rounds[cur + 1].s);
    whenLoaded(load(s), () => {
      full.src = s.img;
      env.theme = s.theme;
      fillStrips(strips, s.img);
      revealed = 0;
      phase = 'reveal';
      panel.style.visibility = '';
      setView('ask');
      revealNext();
    });
  }

  function revealNext() {
    if (phase !== 'reveal') return;
    strips.children[revealed].classList.add('on');
    rowsEl.children[revealed].classList.add('on');
    revealed++;
    if (revealed < ROWS) timer = setTimeout(revealNext, STEP);
    else timer = setTimeout(showOptions, 1300);
  }

  function showOptions() {
    if (phase !== 'reveal') return;
    clearTimeout(timer);
    phase = 'choose';
    answer = rounds[cur].s;
    choices = optionsFor(answer);
    opts.className = 'opts';
    opts.innerHTML = '';
    sel = -1;
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = `<span class="k">${i + 1}</span><b>${c.title}</b><i>${c.dynasty} · ${c.author}</i>`;
      b.onclick = () => pick(i);
      opts.appendChild(b);
    });
    setView('choose');
  }

  function pick(i) {
    if (phase !== 'choose') return;
    phase = 'result';
    const r = rounds[cur], chosen = choices[i], ok = chosen === answer;
    const hidden = ROWS - revealed;
    r.ok = ok;
    r.pts = ok ? FULL_PTS + EARLY_PTS * hidden : 0;
    score += r.pts;
    $('score').textContent = score;
    opts.classList.add('locked');
    opts.children[choices.indexOf(answer)].classList.add('right');
    if (!ok) opts.children[i].classList.add('wrong');
    Sound.sfx(ok ? 'right' : 'wrong');

    // 揭开整幅画并让它动起来
    [...strips.children].forEach((st) => st.classList.add('on'));
    [...rowsEl.children].forEach((d) => d.classList.add('on'));
    stage.classList.add('done');
    sceneT = 0;
    fx = answer.create(env);
    Sound.setScene(answer);

    const v = $('verdict');
    v.className = 'verdict ' + (ok ? 'ok' : 'no');
    v.innerHTML = ok
      ? `答对了 · +${r.pts}${hidden ? `<small>提前 ${hidden} 行猜中</small>` : ''}`
      : `差一点<small>正确答案是《${answer.title}》</small>`;
    buildPoem(answer);
    setTimeout(() => { if (phase === 'result') setView('result'); }, 1300);
    reciteAnswer(1.8);
  }

  function reciteAnswer(delay) {
    const el = $('poem');
    Recite.play(answer.id, {
      delay,
      onPart(k) {
        el.classList.toggle('reciting', k >= 0);
        [...el.children].forEach((c, j) => c.classList.toggle('reading', j === k));
      },
    });
  }

  function buildPoem(s) {
    const el = $('poem');
    el.innerHTML = '';
    let d = 0.2;
    const col = (cls, text, step) => {
      const c = document.createElement('div');
      c.className = cls;
      for (const ch of text) {
        const sp = document.createElement('span');
        sp.className = 'ch';
        sp.textContent = ch;
        sp.style.setProperty('--d', (1.4 + d).toFixed(2) + 's');
        d += step;
        c.appendChild(sp);
      }
      el.appendChild(c);
    };
    col('title', s.title, 0.08);
    col('author', `${s.dynasty}·${s.author}`, 0.04);
    for (const ln of s.lines) { col('line', ln, 0.06); d += 0.15; }
  }

  function next() {
    if (phase !== 'result') return;
    cur++;
    if (cur < rounds.length) playRound();
    else finish();
  }

  function finish() {
    phase = 'end';
    const right = rounds.filter((r) => r.ok).length, max = rounds.length * (FULL_PTS + EARLY_PTS * (ROWS - 1));
    const rate = right / rounds.length;
    const best = +localStorage.getItem(BEST) || 0;
    if (score > best) localStorage.setItem(BEST, score);
    $('endTitle').textContent = (rate === 1 ? '满分！' : rate >= 0.8 ? '好眼力' : rate >= 0.5 ? '不错' : '再接再厉')
      + (score > best && best ? ' · 新纪录' : '');
    $('endStat').textContent = `答对 ${right} / ${rounds.length} 题 · 得分 ${score}（满分 ${max}）`;
    $('recap').innerHTML = rounds.map((r) => `
      <a href="index.html#${r.s.id}" title="去诗画中细看">
        <img loading="lazy" alt="" src="assets/thumb/${r.s.id}.jpg" />
        <span class="mark ${r.ok ? 'ok' : 'no'}">${r.ok ? '&#10003;' : '&#10007;'}</span>
        <b>${r.s.title}</b>
      </a>`).join('');
    $('end').classList.add('open');
  }

  // --- 交互 ---
  $('btnGuess').onclick = showOptions;
  $('btnNext').onclick = next;
  $('btnStart').onclick = start;
  $('btnAgain').onclick = start;

  const btnSound = $('btnSound');
  btnSound.onclick = () => {
    const on = Sound.toggle();
    btnSound.innerHTML = toggleLabel('声', on);
    btnSound.classList.toggle('on', on);
  };

  const btnFs = $('btnFs');
  btnFs.onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  document.addEventListener('fullscreenchange', () => {
    btnFs.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
  });

  const btnRecite = $('btnRecite');
  const showRecite = () => {
    btnRecite.innerHTML = toggleLabel('诵', Recite.on);
    btnRecite.classList.toggle('on', Recite.on);
  };
  showRecite();
  btnRecite.onclick = () => {
    Recite.toggle();
    showRecite();
    if (Recite.on && phase === 'result') reciteAnswer(0.2);
  };

  // 键盘与遥控器：遥控器的方向键/确定键在浏览器里就是 Arrow*/Enter
  const OK = new Set(['Enter', ' ', 'Select']);
  const NEXT = new Set(['ArrowDown', 'ArrowRight']), PREV = new Set(['ArrowUp', 'ArrowLeft']);
  function focusOpt(i) {
    sel = i;
    [...opts.children].forEach((b, j) => b.classList.toggle('focus', j === i));
  }

  addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 's' || k === 'S') { btnSound.click(); return; }
    if (k === 'r' || k === 'R') { btnRecite.click(); return; }
    if (k === 'f' || k === 'F') { btnFs.click(); return; }
    // 由这里统一处理确定键，避免与按钮自身的回车点击重复触发
    if (OK.has(k) || NEXT.has(k) || PREV.has(k)) e.preventDefault();
    if (phase === 'start' || phase === 'end') {
      if (OK.has(k)) start();
    } else if (phase === 'reveal') {
      if (OK.has(k)) showOptions();
    } else if (phase === 'choose') {
      if (/^[1-4]$/.test(k)) pick(+k - 1);
      else if (NEXT.has(k)) focusOpt(sel < 0 ? 0 : (sel + 1) % 4);
      else if (PREV.has(k)) focusOpt(sel < 0 ? 3 : (sel + 3) % 4);
      else if (OK.has(k) && sel >= 0) pick(sel);
    } else if (phase === 'result') {
      if (OK.has(k)) next();
    }
  });

  addEventListener('resize', layout);
  layout();
  setView('ask');
  openStart();

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
