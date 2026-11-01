// 소리: 외부 음원 없이 WebAudio 로 직접 합성 (저작권 만료곡 선율만 사용)
//  - 절: 목탁 + 스님 독경(음성 합성) + 범종 + 풍경 + 바람·새
//  - 교회: 잔잔한 캐롤(고요한 밤 / 참 반가운 신도여 / 첫 노엘) — 오르골·첼레스타
//  - 성당: 잔잔한 찬송가(나 같은 죄인 살리신 / 기뻐하며 경배하세) — 오르간·합창 패드 + 긴 잔향
//  - 놀이터: 가벼운 오르골 아르페지오
// 처음엔 무음. 음량(환경음/공간 음악)은 공간을 바꿔도 유지(localStorage).

const KEY = 'mdl_sound_v1';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const N = { C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, 'F#4': 66, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79 };

// 선율: [음, 길이(8분음표 단위)] / 화음: 마디별 근음
export const SONG_LIST = [
  { key: 'oldHundredth', title: '만복의 근원 하나님', no: '새찬송가 1장', year: 'L. Bourgeois, 1551', space: ['church', 'cathedral'] },
  { key: 'hymnToJoy', title: '기뻐하며 경배하세', no: '새찬송가 64장', year: 'L. v. Beethoven, 1824', space: ['church', 'cathedral'] },
  { key: 'amazingGrace', title: '나 같은 죄인 살리신', no: '새찬송가 305장', year: '미국 민요 New Britain, 1829', space: ['church', 'cathedral'] },
  { key: 'silentNight', title: '고요한 밤 거룩한 밤', no: '새찬송가 109장', year: 'F. Gruber, 1818', space: ['church', 'cathedral'] },
  { key: 'adeste', title: '참 반가운 신도여', no: '새찬송가 122장', year: 'J. F. Wade, 18세기', space: ['church', 'cathedral'] },
  { key: 'firstNoel', title: '저 들 밖에 한밤중에', no: '새찬송가 123장', year: '영국 전래 캐롤', space: ['church', 'cathedral'] },
];
const SONGS = {
  oldHundredth: { // 만복의 근원 하나님 (Old Hundredth, 1551)
    bpm: 108, melody: [
      ['G4', 4], ['G4', 2], ['F#4', 2], ['E4', 2], ['D4', 2], ['G4', 2], ['A4', 2], ['B4', 4],
      ['B4', 4], ['B4', 2], ['B4', 2], ['A4', 2], ['G4', 2], ['C5', 2], ['B4', 2], ['A4', 4],
      ['G4', 4], ['A4', 2], ['B4', 2], ['A4', 2], ['G4', 2], ['E4', 2], ['F#4', 2], ['G4', 4],
      ['D5', 4], ['B4', 2], ['G4', 2], ['A4', 2], ['C5', 2], ['B4', 2], ['A4', 2], ['G4', 6],
    ], chords: ['G', 'G', 'G', 'D', 'G', 'Em', 'G', 'D', 'G', 'C', 'G', 'G'], bar: 8,
  },
  silentNight: { // 고요한 밤 (F. Gruber, 1818) — 6/8
    bpm: 120, melody: [
      ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6], ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
      ['D5', 4], ['D5', 2], ['B4', 6], ['C5', 4], ['C5', 2], ['G4', 6],
      ['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2], ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
      ['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2], ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
      ['D5', 4], ['D5', 2], ['F5', 3], ['D5', 1], ['B4', 2], ['C5', 6], ['E5', 6],
      ['C5', 3], ['G4', 1], ['E4', 2], ['G4', 3], ['F4', 1], ['D4', 2], ['C4', 12],
    ], chords: ['C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'F', 'C', 'F', 'C', 'G', 'C', 'C', 'C', 'C', 'C'], bar: 6,
  },
  adeste: { // 참 반가운 신도여 (Adeste Fideles, 18세기) — 4/4
    bpm: 120, melody: [
      ['G4', 2], ['G4', 4], ['D4', 2], ['G4', 2], ['A4', 4], ['D4', 4],
      ['B4', 2], ['A4', 2], ['B4', 2], ['C5', 2], ['B4', 4], ['A4', 2], ['G4', 2],
      ['G4', 4], ['F4', 2], ['E4', 2], ['F4', 2], ['G4', 2], ['A4', 2], ['B4', 2],
      ['F4', 4], ['E4', 3], ['D4', 1], ['D4', 8],
    ], chords: ['G', 'G', 'G', 'D', 'C', 'G', 'D', 'D'], bar: 8, key: -5,
  },
  firstNoel: { // 첫 노엘 (전래 캐롤) — 3/4
    bpm: 120, melody: [
      ['E4', 1], ['D4', 1], ['C4', 3], ['D4', 1], ['E4', 1], ['F4', 1], ['G4', 4], ['A4', 1], ['B4', 1],
      ['C5', 2], ['B4', 2], ['A4', 2], ['G4', 4], ['A4', 1], ['B4', 1], ['C5', 2], ['B4', 2], ['A4', 2],
      ['G4', 2], ['A4', 2], ['B4', 2], ['C5', 2], ['G4', 2], ['F4', 2], ['E4', 6],
    ], chords: ['C', 'C', 'G', 'C', 'F', 'C', 'F', 'C', 'G', 'C', 'C', 'C'], bar: 6,
  },
  amazingGrace: { // 나 같은 죄인 살리신 (New Britain, 1829) — 3/4
    bpm: 108, melody: [
      ['D4', 2], ['G4', 4], ['B4', 1], ['G4', 1], ['B4', 4], ['A4', 2], ['G4', 4], ['E4', 2], ['D4', 4], ['D4', 2],
      ['G4', 4], ['B4', 1], ['G4', 1], ['B4', 4], ['A4', 2], ['D5', 10], ['B4', 2],
      ['D5', 4], ['B4', 1], ['G4', 1], ['B4', 4], ['A4', 2], ['G4', 4], ['E4', 2], ['D4', 4], ['D4', 2],
      ['G4', 4], ['B4', 1], ['G4', 1], ['B4', 4], ['A4', 2], ['G4', 10],
    ], chords: ['G', 'G', 'G', 'C', 'G', 'Em', 'G', 'D', 'D', 'G', 'G', 'C', 'G', 'G', 'D', 'G', 'G'], bar: 6, lead: 2, key: -5,
  },
  hymnToJoy: { // 기뻐하며 경배하세 (L. v. Beethoven, 1824) — 4/4
    bpm: 108, melody: [
      ['E4', 2], ['E4', 2], ['F4', 2], ['G4', 2], ['G4', 2], ['F4', 2], ['E4', 2], ['D4', 2],
      ['C4', 2], ['C4', 2], ['D4', 2], ['E4', 2], ['E4', 3], ['D4', 1], ['D4', 4],
      ['E4', 2], ['E4', 2], ['F4', 2], ['G4', 2], ['G4', 2], ['F4', 2], ['E4', 2], ['D4', 2],
      ['C4', 2], ['C4', 2], ['D4', 2], ['E4', 2], ['D4', 3], ['C4', 1], ['C4', 4],
    ], chords: ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'G', 'C'], bar: 8,
  },
};
const CHORD = { C: [48, 52, 55], G: [43, 47, 50], F: [41, 45, 48], D: [50, 54, 57], Em: [40, 43, 47], Am: [45, 48, 52] };

export class SoundScape {
  constructor() {
    let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    this.on = false; // 처음엔 항상 무음
    this.amb = s.amb ?? 0.6; this.music = s.music ?? 0.6;
    this.ctx = null; this.space = null; this.timers = []; this.nodes = [];
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify({ amb: this.amb, music: this.music })); } catch (e) {} }
  _init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
    this.musBus = ctx.createGain(); this.musBus.connect(this.master);
    this.rev = ctx.createConvolver(); this.revGain = ctx.createGain(); this.revGain.gain.value = 0.35;
    this.rev.connect(this.revGain); this.revGain.connect(this.musBus);
    this._applyVol();
  }
  _impulse(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
  _applyVol() { if (!this.ctx) return; const t = this.ctx.currentTime; this.ambBus.gain.setTargetAtTime(this.amb * 0.9, t, 0.1); this.musBus.gain.setTargetAtTime(this.music * 0.8 * (this._duck || 1), t, 0.1); }
  duck(on) { if (!this.ctx) return; this._duck = on ? 0.65 : 1; this.musBus.gain.setTargetAtTime(this.music * 0.8 * this._duck, this.ctx.currentTime, 0.35); }
  setVolumes(amb, music) { this.amb = amb; this.music = music; this.save(); this._applyVol(); }
  async setOn(on) {
    this.on = on;
    if (on) { this._init(); if (!this.ctx) return; await this.ctx.resume(); this.master.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4); if (this.space && !this.timers.length) this._start(this.space); }
    else if (this.ctx) { this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); setTimeout(() => { if (!this.on) this._stop(); }, 600); }
  }
  setSpace(key) {
    if (this.space === key) return;
    this.space = key; this._stop();
    if (this.on && this.ctx) this._start(key);
  }
  _stop() {
    this.timers.forEach(t => clearInterval(t) || clearTimeout(t)); this.timers = [];
    this.nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} try { n.disconnect(); } catch (e) {} }); this.nodes = [];
  }
  _every(ms, f) { const id = setInterval(f, ms); this.timers.push(id); }
  _later(ms, f) { const id = setTimeout(f, ms); this.timers.push(id); }

  _start(key) {
    const revSec = { temple: 4, church: 1.8, cathedral: 3.2, playground: 1.2, garden: 1.6 }[key] || 2;
    this.rev.buffer = this._impulse(revSec);
    this.revGain.gain.value = { church: 0.15, cathedral: 0.25, temple: 0.3 }[key] ?? 0.2;
    if (key === 'temple') { this._wind(0.10); this._birds(); this._moktakChant(); this._bells(); this._chimes(); }
    else if (key === 'church') { this._room(0.05); this._songLoop(['silentNight', 'adeste', 'firstNoel'], 'celesta'); }
    else if (key === 'cathedral') { this._room(0.05); this._songLoop(['amazingGrace', 'hymnToJoy'], 'organ'); }
    else if (key === 'playground') { this._room(0.04); this._musicBox(); }
    else if (key === 'garden') { this._wind(0.07); this._birds(); }
  }

  /* ---------- 환경음 ---------- */
  _noise(sec = 2) {
    const ctx = this.ctx, b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s;
  }
  _wind(level) {
    const ctx = this.ctx, n = this._noise(4), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = level;
    lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(f.frequency);
    n.connect(f); f.connect(g); g.connect(this.ambBus); n.start(); lfo.start();
    this.nodes.push(n, lfo, f, g, lg);
  }
  _room(level) {
    const ctx = this.ctx, n = this._noise(3), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = level;
    n.connect(f); f.connect(g); g.connect(this.ambBus); n.start(); this.nodes.push(n, f, g);
  }
  _birds() {
    const chirp = () => {
      if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + 0.05;
      const k = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1400;
      for (let i = 0; i < k; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), st = t + i * 0.13;
        o.type = 'sine'; o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), st + 0.07);
        g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.035, st + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.11);
        o.connect(g); g.connect(this.ambBus); o.start(st); o.stop(st + 0.12);
      }
    };
    this._later(2500, chirp); this._every(7000, () => { if (Math.random() < 0.65) chirp(); });
  }

  /* ---------- 절 ---------- */
  _moktak(t, vel = 1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.06);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'triangle'; o2.frequency.value = 1530;
    g2.gain.setValueAtTime(0.08 * vel, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); o2.connect(g2); g.connect(this.musBus); g2.connect(this.musBus); g.connect(this.rev);
    o.start(t); o.stop(t + 0.15); o2.start(t); o2.stop(t + 0.05);
  }
  // 스님 독경: 낮은 남성 음성(톱니파 + 성대 진동 + 3개 포먼트) — 목탁 박자에 맞춰 한 음절씩 읊음
  _moktakChant() {
    const ctx = this.ctx;
    const voice = ctx.createOscillator(); voice.type = 'sawtooth'; voice.frequency.value = mtof(45); // A2 근처
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 4.6; vg.gain.value = 0.9; vib.connect(vg); vg.connect(voice.frequency);
    const env = ctx.createGain(); env.gain.value = 0;
    const out = ctx.createGain(); out.gain.value = 0.22;
    const forms = [ctx.createBiquadFilter(), ctx.createBiquadFilter(), ctx.createBiquadFilter()];
    const fg = [1, 0.55, 0.25];
    forms.forEach((f, i) => { f.type = 'bandpass'; f.Q.value = 7 + i * 3; const gg = ctx.createGain(); gg.gain.value = fg[i]; env.connect(f); f.connect(gg); gg.connect(out); this.nodes.push(f, gg); });
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    voice.connect(lp); lp.connect(env); out.connect(this.musBus); out.connect(this.rev);
    voice.start(); vib.start(); this.nodes.push(voice, vib, vg, env, out, lp);
    // 모음 포먼트 (아/어/오/우/이)
    const V = { a: [730, 1090, 2440], eo: [600, 1000, 2400], o: [500, 800, 2380], u: [320, 800, 2240], i: [300, 2100, 2900], e: [480, 1800, 2500], m: [280, 900, 2200] };
    const syll = ['a', 'm', 'a', 'eo', 'o', 'u', 'a', 'i', 'eo', 'o', 'a', 'm', 'u', 'a', 'e', 'o'];
    const bpm = 96, beat = 60 / bpm; // 독경 음절 96/분, 목탁은 2음절마다(48 BPM)
    let next = ctx.currentTime + 0.5, n = 0;
    const base = 45;
    const tick = () => {
      while (next < ctx.currentTime + 1.2) {
        const t = next, pos = n % 18; // 16음절 + 2박 쉼
        const accent = pos % 4 === 0 ? 1 : 0.62;
        if (pos % 2 === 0) this._moktak(t, accent * 0.9);
        if (pos < 16) {
          const v = V[syll[(n + Math.floor(n / 18)) % syll.length]];
          forms.forEach((f, i) => f.frequency.setTargetAtTime(v[i], t, 0.03));
          // 단조로운 읊조림: 구절 끝에서 살짝 내려감
          const p = pos >= 14 ? base - 2 : pos % 8 === 7 ? base - 1 : base;
          voice.frequency.setTargetAtTime(mtof(p), t, 0.05);
          env.gain.setTargetAtTime(0.9, t + 0.01, 0.03);
          env.gain.setTargetAtTime(0.25, t + beat * 0.7, 0.06);
        } else env.gain.setTargetAtTime(0, t, 0.12);
        next += beat; n++;
      }
    };
    tick(); this._every(250, tick);
  }
  _bells() {
    const bell = () => {
      if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + 0.1;
      [[64, 0.20, 14], [128.6, 0.10, 10], [176.6, 0.08, 9], [345, 0.04, 6], [64.6, 0.12, 14]].forEach(([f, a, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(this.musBus); g.connect(this.rev); o.start(t); o.stop(t + d + 0.1);
      });
    };
    this._later(6000, bell); this._every(90000, bell);
  }
  _chimes() {
    const ring = () => {
      if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + 0.05;
      const f0 = [1568, 1760, 2093][Math.floor(Math.random() * 3)];
      [[1, 0.05, 3.2], [2.76, 0.02, 1.6], [5.4, 0.01, 0.8]].forEach(([r, a, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f0 * r;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(this.ambBus); g.connect(this.rev); o.start(t); o.stop(t + d);
      });
    };
    const loop = () => { ring(); if (Math.random() < 0.5) this._later(400, ring); this._later(18000 + Math.random() * 17000, loop); }; this._later(9000, loop);
  }

  /* ---------- 교회·성당 선율 ---------- */
  _note(inst, midi, t, dur, vel = 1) {
    const ctx = this.ctx, f = mtof(midi);
    if (inst === 'celesta') {
      [[1, 0.13], [2, 0.035], [4.02, 0.012]].forEach(([r, a]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * r;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vel, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(1.4, dur * 1.2));
        o.connect(g); g.connect(this.musBus); g.connect(this.rev); o.start(t); o.stop(t + Math.max(1.5, dur * 1.3));
      });
    } else if (inst === 'organ') {
      [[1, 0.06], [2, 0.035], [3, 0.018], [4, 0.012], [0.5, 0.03]].forEach(([r, a]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * r;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vel, t + 0.12); g.gain.setValueAtTime(a * vel, t + dur * 0.85); g.gain.linearRampToValueAtTime(0, t + dur + 0.25);
        o.connect(g); g.connect(this.musBus); g.connect(this.rev); o.start(t); o.stop(t + dur + 0.3);
      });
    } else if (inst === 'pad' || inst === 'choir') {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = inst === 'choir' ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8;
      lp.type = inst === 'choir' ? 'bandpass' : 'lowpass'; lp.frequency.value = inst === 'choir' ? 780 : 900; lp.Q.value = inst === 'choir' ? 1.4 : 0.5;
      const a = (inst === 'choir' ? 0.05 : 0.035) * vel;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.5); g.gain.setValueAtTime(a, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
      o.connect(lp); lp.connect(g); g.connect(this.musBus); g.connect(this.rev); o.start(t); o.stop(t + dur + 0.7);
    } else if (inst === 'box') {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g); g.connect(this.musBus); g.connect(this.rev); o.start(t); o.stop(t + 1);
    }
  }
  _songLoop(list, inst) {
    const ctx = this.ctx; let si = 0; let next = ctx.currentTime + 0.8; let queue = [];
    const enqueue = () => {
      const s = SONGS[list[si % list.length]]; si++;
      const eighth = 60 / s.bpm; const k = s.key || 0;
      let t = next; let units = 0;
      for (const [nm, len] of s.melody) { queue.push({ t, midi: N[nm] + k, dur: len * eighth, inst }); t += len * eighth; units += len; }
      // 화음 반주 (마디마다)
      const lead = s.lead || 0; let ct = next + lead * eighth;
      for (const c of s.chords) {
        if (ct >= t - 0.01) break;
        const notes = CHORD[c].map(m => m + k + (inst === 'organ' ? 0 : 12));
        notes.forEach(m => queue.push({ t: ct, midi: m, dur: s.bar * eighth, inst: inst === 'organ' ? 'choir' : 'pad', vel: 0.8 }));
        ct += s.bar * eighth;
      }
      next = t + 4.5; // 곡 사이 쉼
    };
    const tick = () => {
      if (!queue.length || queue[queue.length - 1].t < ctx.currentTime + 2) { if (next < ctx.currentTime + 4) enqueue(); }
      queue.sort((a, b) => a.t - b.t);
      while (queue.length && queue[0].t < ctx.currentTime + 0.6) { const q = queue.shift(); if (q.t > ctx.currentTime - 0.05) this._note(q.inst, q.midi, q.t, q.dur, q.vel || (q.inst === 'celesta' ? 0.9 : 1)); }
    };
    tick(); this._every(200, tick);
  }
  _musicBox() {
    const ctx = this.ctx; const pent = [60, 62, 64, 67, 69, 72, 74, 76, 79]; let next = ctx.currentTime + 0.5, i = 0;
    const tick = () => {
      while (next < ctx.currentTime + 1) {
        const phrase = Math.floor(i / 8) % 4; const root = [0, 5, 7, 0][phrase];
        if (i % 8 !== 7) this._note('box', pent[(i * 3 + phrase * 2) % pent.length] + (root === 5 ? -7 : root === 7 ? -5 : 0), next, 0.4, 0.9);
        if (i % 4 === 0) this._note('pad', 48 + root, next, 1.6, 0.6);
        next += 0.42; i++;
      }
    };
    tick(); this._every(250, tick);
  }
  // 찬송 듣기: 선택한 곡만 한 번 연주 (끝나면 공간 음악으로 복귀)
  async playSong(key, inst = 'organ', onEnd) {
    if (!this.on) await this.setOn(true);
    if (!this.ctx) return;
    this._stop(); this.solo = key;
    const s = SONGS[key]; if (!s) return;
    const ctx = this.ctx; this.rev.buffer = this._impulse(inst === 'organ' ? 3.2 : 1.8); this.revGain.gain.value = inst === 'organ' ? 0.25 : 0.15;
    const eighth = 60 / s.bpm, k = s.key || 0; let t = ctx.currentTime + 0.4; const t0 = t;
    for (const [nm, len] of s.melody) { this._note(inst, N[nm] + k, t, len * eighth, 1); t += len * eighth; }
    let ct = t0 + (s.lead || 0) * eighth;
    for (const c of s.chords) { if (ct >= t - 0.01) break; CHORD[c].map(m => m + k + (inst === 'organ' ? 0 : 12)).forEach(m => this._note(inst === 'organ' ? 'choir' : 'pad', m, ct, s.bar * eighth, 0.8)); ct += s.bar * eighth; }
    const dur = (t - ctx.currentTime) * 1000 + 1500;
    this.soloTimer = setTimeout(() => { if (this.solo === key) { this.solo = null; const sp = this.space; this.space = null; this.setSpace(sp); onEnd && onEnd(); } }, dur);
    this.timers.push(this.soloTimer);
    return dur;
  }
  stopSong() { if (!this.solo) return; this.solo = null; const sp = this.space; this.space = null; this._stop(); this.setSpace(sp); }
  beadClick() { if (!this.on || !this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + 0.01; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(1850, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.03); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.07); }
  ui(type) { // 짧은 효과음 (가챠 등)
    if (!this.on || !this.ctx) return; const t = this.ctx.currentTime + 0.02;
    if (type === 'gacha') [72, 76, 79, 84].forEach((m, k) => this._note('box', m, t + k * 0.09, 0.3, 1.2));
    if (type === 'candle') this._note('celesta', 84, t, 1.2, 0.6);
  }
  close() { this._stop(); try { this.ctx && this.ctx.close(); } catch (e) {} this.ctx = null; }
}
