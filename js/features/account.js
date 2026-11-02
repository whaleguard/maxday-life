// 계정 · 수강신청 · 진도(어디까지 봤는지) · 수료
//  - 자체 서버(?server=) 모드: 서버가 비밀번호(scrypt)·세션 토큰·진도를 판정/보관 (운영용)
//  - 공개 MQTT 모드(GitHub Pages 시연): 비밀번호는 PBKDF2(12만 회) 해시로만 저장하고, 진도는 계정별 비밀 키로 보관 (시연용 — 운영 시 자체 서버 사용)
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
async function pbkdf2(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, k, 256));
}
const LS = 'mdl_acct_session';
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };

export class Account {
  constructor(net, ns) { this.net = net; this.ns = ns; this.s = null; this.prog = {}; try { this.s = JSON.parse(ls.get(LS + ns) || 'null'); } catch (e) {} this._saveT = 0; }
  get user() { return this.s; }
  get server() { return this.net.mode !== 'mqtt'; }
  validId(id) { return /^[a-z0-9_]{4,16}$/.test(id); }
  async signup(id, pw, name) {
    id = String(id || '').trim().toLowerCase(); name = String(name || '').trim().slice(0, 12) || id;
    if (!this.validId(id)) return { ok: false, msg: '아이디는 영문 소문자·숫자 4~16자로 정해 주세요.' };
    if (String(pw || '').length < 8) return { ok: false, msg: '비밀번호는 8자 이상으로 정해 주세요.' };
    if (this.server) {
      const r = await this.net.acct('signup', { id, pw, name });
      if (!r.ok) return { ok: false, msg: r.reason === 'taken' ? '이미 쓰는 아이디예요.' : '가입하지 못했어요.' };
      return this._start({ id, name: r.name, token: r.token });
    }
    const key = 'acct/' + await sha(this.ns + ':' + id);
    if (await this.net.kvGet(key)) return { ok: false, msg: '이미 쓰는 아이디예요.' };
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await pbkdf2(pw, salt);
    await this.net.kvPut(key, { name, salt, hash, at: Date.now() });
    return this._start({ id, name, pkey: await sha(id + ':' + hash) });
  }
  async login(id, pw) {
    id = String(id || '').trim().toLowerCase();
    if (!id || !pw) return { ok: false, msg: '아이디와 비밀번호를 입력해 주세요.' };
    if (this.server) {
      const r = await this.net.acct('login', { id, pw });
      if (!r.ok) return { ok: false, msg: '아이디 또는 비밀번호가 맞지 않아요.' };
      return this._start({ id, name: r.name, token: r.token });
    }
    const rec = await this.net.kvGet('acct/' + await sha(this.ns + ':' + id));
    if (!rec) return { ok: false, msg: '아이디 또는 비밀번호가 맞지 않아요.' };
    const hash = await pbkdf2(pw, rec.salt);
    if (hash !== rec.hash) return { ok: false, msg: '아이디 또는 비밀번호가 맞지 않아요.' };
    return this._start({ id, name: rec.name, pkey: await sha(id + ':' + hash) });
  }
  async _start(s) { this.s = s; ls.set(LS + this.ns, JSON.stringify(s)); await this.load(); return { ok: true }; }
  logout() { this.s = null; this.prog = {}; ls.del(LS + this.ns); }
  async load() {
    if (!this.s) return {};
    try {
      if (this.server) { const r = await this.net.acct('progGet', { token: this.s.token }); if (!r.ok) { if (r.reason === 'auth') this.logout(); return {}; } this.prog = r.prog || {}; }
      else this.prog = (await this.net.kvGet('prog/' + this.s.pkey)) || {};
    } catch (e) {}
    return this.prog;
  }
  save(now = false) {
    if (!this.s) return; clearTimeout(this._saveT);
    const run = async () => { try { if (this.server) await this.net.acct('progSave', { token: this.s.token, prog: this.prog }); else await this.net.kvPut('prog/' + this.s.pkey, this.prog); } catch (e) {} };
    if (now) return run(); this._saveT = setTimeout(run, 1500);
  }
  rec(id) { return (this.prog[id] ||= { enrolled: 0, pos: 0, max: 0, seen: [], dur: 0, done: 0 }); }
  enroll(id) { const r = this.rec(id); if (!r.enrolled) { r.enrolled = Date.now(); this.save(true); } return r; }
  isEnrolled(id) { return !!this.prog[id]?.enrolled; }
  // 실제로 본 구간(초 단위 구간 목록)을 합쳐 진도율 계산 — 건너뛰기로는 수료되지 않음
  addSeen(id, a, b, dur) {
    const r = this.rec(id); if (dur) r.dur = Math.round(dur);
    if (b - a > 0.2) { const s = [...r.seen, [Math.floor(a), Math.ceil(b)]].sort((x, y) => x[0] - y[0]); const out = []; for (const [x, y] of s) { const l = out[out.length - 1]; if (l && x <= l[1] + 1) l[1] = Math.max(l[1], y); else out.push([x, y]); } r.seen = out; }
    r.pos = Math.round(b); r.max = Math.max(r.max || 0, r.pos); r.last = Date.now();
    if (!r.done && r.dur && this.pct(id) >= 90) { r.done = Date.now(); this.save(true); return 'done'; }
    this.save(); return null;
  }
  watched(id) { const r = this.prog[id]; return r ? r.seen.reduce((s, [a, b]) => s + (b - a), 0) : 0; }
  pct(id) { const r = this.prog[id]; if (!r || !r.dur) return 0; return Math.min(100, Math.round(this.watched(id) / r.dur * 100)); }
}

// YouTube IFrame API (재생 위치·상태를 읽어 진도 기록)
let ytReady = null;
export function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise(res => { if (window.YT && window.YT.Player) return res(window.YT); const p = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { p && p(); res(window.YT); }; const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); });
  return ytReady;
}
