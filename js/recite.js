'use strict';

// 开关按钮的文字；窄屏下 CSS 隐藏 .st，只靠按钮底色表示开/关
function toggleLabel(name, on) {
  return `${name}<span class="st"> · ${on ? '开' : '关'}</span>`;
}

// 诗词朗诵：播放预先生成的神经网络语音（assets/voice），并按 VOICE 时间轴逐句回调。
const Recite = {
  on: localStorage.getItem('poem.recite') === '1',
  audio: new Audio(),
  id: null,
  timer: null,
  raf: 0,
  part: -1,

  toggle() {
    this.on = !this.on;
    localStorage.setItem('poem.recite', this.on ? '1' : '0');
    if (!this.on) this.stop();
    return this.on;
  },

  // onPart(k)：k = 0 题目，1 作者，2+i 第 i 句，-1 读完
  play(id, { delay = 0, onPart = () => {} } = {}) {
    this.stop();
    const v = VOICE[id];
    if (!this.on || !v) return;
    this.id = id;
    this.onPart = onPart;
    this.audio.src = `assets/voice/${id}.mp3`;
    this.audio.preload = 'auto';
    this.timer = setTimeout(() => {
      this.audio.currentTime = 0;
      this.audio.play().then(() => {
        Sound.duck(true);
        this.track();
      }).catch(() => {});
    }, delay * 1000);
    this.audio.onended = () => this.finish();
  },

  track() {
    const v = VOICE[this.id];
    const tick = () => {
      if (this.audio.paused) return;
      const t = this.audio.currentTime;
      let k = -1;
      for (let i = 0; i < v.t.length; i++) if (t >= v.t[i] - 0.05) k = i;
      if (k !== this.part) { this.part = k; this.onPart(k); }
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  },

  finish() {
    cancelAnimationFrame(this.raf);
    if (this.part !== -1 && this.onPart) this.onPart(-1);
    this.part = -1;
    Sound.duck(false);
  },

  stop() {
    clearTimeout(this.timer);
    this.audio.pause();
    this.finish();
    this.id = null;
  },
};
