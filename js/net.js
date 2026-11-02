// 실시간 연결 계층
//  - WsAdapter  : 자체 서버(server/server.js) — 서버가 입장·좌석·촛불을 판정(권장, 운영용)
//  - MqttAdapter: 공개 MQTT 중계 — 서버 없이 GitHub Pages에서 동작. 좌석·촛불은 브로커 수신 순서(retained 최종값)로 판정
// 두 어댑터는 같은 이벤트를 냅니다: peer, seat, candle, event, status
import { ROOM_CAPACITY, MQTT_BROKERS, MQTT_NS, WS_SERVER } from './config.js';

const now = () => Date.now();
const STALE_MS = 30000;      // 이 시간 동안 소식이 없으면 접속 종료로 간주
const HEARTBEAT_MS = 8000;
const GARBAGE_MS = 120000;   // 오래된 retained 흔적 정리

class Emitter {
  constructor() { this.h = {}; }
  on(e, f) { (this.h[e] ||= []).push(f); return () => this.off(e, f); }
  off(e, f) { this.h[e] = (this.h[e] || []).filter(x => x !== f); }
  emit(e, ...a) { (this.h[e] || []).forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); }
}

export function makeSid() {
  const a = new Uint8Array(8); crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ */
/* MQTT                                                                */
/* ------------------------------------------------------------------ */
let mqttLib = null;
async function loadMqtt() {
  if (mqttLib) return mqttLib;
  const m = await import('https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.esm.js');
  mqttLib = m.default || m;
  return mqttLib;
}

export class MqttAdapter extends Emitter {
  constructor(sid, opts = {}) {
    super();
    this.sid = sid; this.mode = 'mqtt';
    this.brokers = opts.brokers || MQTT_BROKERS;
    this.client = null; this.base = null; this.room = 0; this.space = null;
    this.peers = new Map();   // sid -> {state, seen}
    this.seats = new Map();   // idx -> {sid, t}
    this.candles = new Map(); // idx -> {sid, name, t, exp, req}
    this.state = null; this.hb = null; this.gc = null; this.closing = false;
    this.connected = false; this.brokerIdx = 0;
  }

  async _connect() {
    const mqtt = await loadMqtt();
    let lastErr;
    for (let k = 0; k < this.brokers.length; k++) {
      const i = (this.brokerIdx + k) % this.brokers.length;
      const url = this.brokers[i];
      try {
        const client = await new Promise((res, rej) => {
          const c = mqtt.connect(url, {
            clientId: 'mdl_' + this.sid + '_' + Math.random().toString(16).slice(2, 6),
            clean: true, keepalive: 20, connectTimeout: 7000, reconnectPeriod: 0,
            will: { topic: `${MQTT_NS}/bye`, payload: JSON.stringify({ sid: this.sid }), qos: 0, retain: false },
          });
          const t = setTimeout(() => { c.end(true); rej(new Error('timeout')); }, 8000);
          c.once('connect', () => { clearTimeout(t); res(c); });
          c.once('error', e => { clearTimeout(t); c.end(true); rej(e); });
        });
        this.brokerIdx = i; this.client = client; this.brokerUrl = url;
        client.on('message', (topic, buf) => this._onMessage(topic, buf));
        client.on('close', () => this._onClose());
        client.subscribe(`${MQTT_NS}/bye`);
        this.connected = true;
        return;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('연결 실패');
  }

  _sub(base) {
    return new Promise(res => this.client.subscribe([`${base}/p/+`, `${base}/s/+`, `${base}/c/+`, `${base}/e`], { qos: 0 }, () => res()));
  }
  _unsub(base) { try { this.client.unsubscribe([`${base}/p/+`, `${base}/s/+`, `${base}/c/+`, `${base}/e`]); } catch (e) {} }

  freshPeers() {
    const t = now(); const out = [];
    for (const [sid, p] of this.peers) if (t - p.seen < STALE_MS && sid !== this.sid) out.push(sid);
    return out;
  }

  // 방 목록: 공간의 모든 방 접속 인원 (retained 현재 상태 기준)
  async resvList(store, date) { if (!this.ws || this.ws.readyState !== 1) await this._open(); const r = await this._req({ type: 'resvList', store, date }); return r.list || {}; }
  async resvSave(rec) { if (!this.ws || this.ws.readyState !== 1) await this._open(); return this._req({ type: 'resvSave', rec }); }
  async boardList(key) { if (!this.ws || this.ws.readyState !== 1) await this._open(); const r = await this._req({ type: 'boardList', key }); return r.list || []; }
  async acct(op, data) { if (!this.ws || this.ws.readyState !== 1) await this._open(); return this._req({ type: 'acct', op, ...data }); }
  async boardPost(key, item) { if (!this.ws || this.ws.readyState !== 1) await this._open(); return this._req({ type: 'boardPost', key, item }); }
  async resvCancel(rec) { if (!this.ws || this.ws.readyState !== 1) await this._open(); return this._req({ type: 'resvCancel', rec: { ...rec, sid: this.sid } }); }
  async peekRooms(space) {
    if (!this.client || !this.connected) await this._connect();
    const counts = {}; const seen = new Set(); const pat = `${MQTT_NS}/r/${space}/+/p/+`;
    const handler = (topic, buf) => {
      const m = topic.match(new RegExp(`^${MQTT_NS}/r/${space}/(\\d+)/p/(.+)$`)); if (!m) return;
      const s = buf.toString(); if (!s) return;
      try { const st = JSON.parse(s); if (now() - (st.t || 0) > STALE_MS) return; } catch (e) { return; }
      const key = m[1] + '/' + m[2]; if (seen.has(key)) return; seen.add(key);
      counts[m[1]] = (counts[m[1]] || 0) + 1;
    };
    this.client.on('message', handler);
    await new Promise(r => this.client.subscribe(pat, () => r()));
    await new Promise(r => setTimeout(r, 1200));
    this.client.removeListener('message', handler);
    try { if (!this.base || !this.base.startsWith(`${MQTT_NS}/r/${space}/`)) this.client.unsubscribe(pat); } catch (e) {}
    return counts;
  }

  /* ---- 키-값 저장 (계정·수강 기록 데모용, retained) ---- */
  async kvGet(key) {
    if (!this.client || !this.connected) await this._connect();
    const topic = `${MQTT_NS}/kv/${key}`;
    return new Promise(res => {
      let done = false; const fin = v => { if (done) return; done = true; this.client.removeListener('message', h); try { this.client.unsubscribe(topic); } catch (e) {} res(v); };
      const h = (t, buf) => { if (t !== topic) return; const s = buf.toString(); if (!s) return fin(null); try { fin(JSON.parse(s)); } catch (e) { fin(null); } };
      this.client.on('message', h); this.client.subscribe(topic, () => setTimeout(() => fin(null), 1500));
    });
  }
  async kvPut(key, val) {
    if (!this.client || !this.connected) await this._connect();
    await new Promise(r => this.client.publish(`${MQTT_NS}/kv/${key}`, JSON.stringify(val), { retain: true, qos: 1 }, () => r()));
    return { ok: true };
  }
  async acct(op, data) { return { ok: false, local: true }; } // MQTT 모드: 계정 판정은 account.js 가 직접(데모)
  /* ---- 게시판 (강의 질문 등, retained = 공유 저장) ---- */
  async boardList(key) {
    if (!this.client || !this.connected) await this._connect();
    const pre = `${MQTT_NS}/board/${key}/`; const pat = pre + '+'; const out = {};
    const handler = (topic, buf) => { if (!topic.startsWith(pre)) return; const id = topic.slice(pre.length); const s = buf.toString(); if (!s) { delete out[id]; return; } try { out[id] = JSON.parse(s); } catch (e) {} };
    this.client.on('message', handler);
    await new Promise(r => this.client.subscribe(pat, () => r()));
    await new Promise(r => setTimeout(r, 1300));
    this.client.removeListener('message', handler);
    try { this.client.unsubscribe(pat); } catch (e) {}
    return Object.values(out).sort((a, b) => a.t - b.t);
  }
  async boardPost(key, item) {
    if (!this.client || !this.connected) await this._connect();
    const rec = { id: String(item.id).slice(0, 40), text: String(item.text).slice(0, 300), nm: String(item.nm || '').slice(0, 12), at: +item.at || 0, re: item.re || '', likes: +item.likes || 0, t: now() };
    this.client.publish(`${MQTT_NS}/board/${key}/${rec.id}`, JSON.stringify(rec), { retain: true, qos: 1 });
    return { ok: true };
  }
  /* ---- 카페·식당 예약 (retained = 공유 저장) ---- */
  async resvList(store, date) {
    if (!this.client || !this.connected) await this._connect();
    const pat = `${MQTT_NS}/resv/${store}/${date}/+/+`; const out = {};
    const handler = (topic, buf) => {
      if (!topic.startsWith(`${MQTT_NS}/resv/${store}/${date}/`)) return;
      const [time, table] = topic.split('/').slice(-2); const k = time + '|' + table; const s = buf.toString();
      if (!s) { delete out[k]; return; }
      try { out[k] = { ...JSON.parse(s), time, table }; } catch (e) {}
    };
    this.client.on('message', handler);
    await new Promise(r => this.client.subscribe(pat, () => r()));
    await new Promise(r => setTimeout(r, 1300));
    this.client.removeListener('message', handler);
    try { this.client.unsubscribe(pat); } catch (e) {}
    return out;
  }
  async resvSave(rec, dur = 90) {
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const cur = await this.resvList(rec.store, rec.date);
    if (Object.values(cur).some(r => r.table === rec.table && Math.abs(toMin(r.time) - toMin(rec.time)) < dur)) return { ok: false, reason: 'taken' };
    const topic = `${MQTT_NS}/resv/${rec.store}/${rec.date}/${rec.time}/${rec.table}`;
    this.client.publish(topic, JSON.stringify({ ...rec, sid: this.sid, t: now() }), { retain: true, qos: 1 });
    await new Promise(r => setTimeout(r, 700));
    const after = await this.resvList(rec.store, rec.date);
    const mine = after[rec.time + '|' + rec.table];
    if (!mine || mine.id !== rec.id) return { ok: false, reason: 'taken' };
    return { ok: true };
  }
  async resvCancel(rec) {
    if (!this.client || !this.connected) await this._connect();
    this.client.publish(`${MQTT_NS}/resv/${rec.store}/${rec.date}/${rec.time}/${rec.table}`, '', { retain: true, qos: 1 });
    await new Promise(r => setTimeout(r, 300));
    return { ok: true };
  }

  // 방 고르기: 1번 방부터 정원(20명)이 찬 방은 건너뜀
  async join(space, state, roomHint) {
    this.closing = false; this.space = space; this.state = state;
    if (!this.client || !this.connected) await this._connect();
    let full = false;
    for (let room = roomHint > 0 ? roomHint : 1; room <= 60; room++) {
      this._reset();
      const base = `${MQTT_NS}/r/${space}/${room}`;
      this.base = base; this.room = room;
      await this._sub(base);
      await new Promise(r => setTimeout(r, 1300)); // retained 수신 대기
      if (this.freshPeers().length >= ROOM_CAPACITY) { full = true; this._unsub(base); continue; }
      this.joinAt = now();
      this.state = { ...state, joinAt: this.joinAt };
      this._publishState();
      this._startTimers();
      this.emit('status', 'connected');
      return { room, full };
    }
    throw new Error('빈 방이 없습니다');
  }

  _reset() {
    for (const sid of this.peers.keys()) this.emit('peer', sid, null);
    this.peers.clear(); this.seats.clear(); this.candles.clear();
  }

  _startTimers() {
    clearInterval(this.hb); clearInterval(this.gc);
    this.hb = setInterval(() => this._publishState(), HEARTBEAT_MS);
    this.gc = setInterval(() => this._sweep(), 3000);
  }

  _sweep() {
    const t = now();
    for (const [sid, p] of [...this.peers]) {
      if (t - p.seen > STALE_MS) { this.peers.delete(sid); this.emit('peer', sid, null); this._refreshSeatsOf(sid); }
    }
    // 정원 초과 경합: 늦게 들어온 순서로 다음 방 안내
    const list = [...this.freshPeers().map(s => [s, this.peers.get(s).state.joinAt || 0]), [this.sid, this.joinAt]];
    if (list.length > ROOM_CAPACITY) {
      list.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
      const rank = list.findIndex(x => x[0] === this.sid);
      if (rank >= ROOM_CAPACITY) this.emit('overflow');
    }
    for (const [idx, c] of [...this.candles]) if (c.exp < t) { this.candles.delete(idx); this.emit('candle', idx, null); }
  }

  _refreshSeatsOf(sid) {
    for (const [idx, s] of this.seats) if (s.sid === sid) this.emit('seat', idx, this.seatOwner(idx));
  }

  _claimValid(idx, c) {
    if (c.sid === this.sid) return !!(this.state && this.state.seat === idx);
    const p = this.peers.get(c.sid);
    if (p && now() - p.seen < STALE_MS && p.state.seat === idx) return true;
    return now() - (c.recv || 0) < 6000;
  }

  seatOwner(idx) {
    const s = this.seats.get(idx); if (!s) return null;
    if (s.sid === this.sid) return this.state && this.state.seat === idx ? s.sid : null;
    const p = this.peers.get(s.sid);
    if (!p || now() - p.seen > STALE_MS) return null;
    if (p.state.seat !== idx) return null;
    return s.sid;
  }

  _onMessage(topic, buf) {
    const str = buf.toString();
    if (topic === `${MQTT_NS}/bye`) {
      try { const { sid } = JSON.parse(str); this._dropPeer(sid, true); } catch (e) {}
      return;
    }
    if (!this.base || !topic.startsWith(this.base + '/')) return;
    const rest = topic.slice(this.base.length + 1);
    const [kind, id] = rest.split('/');
    if (kind === 'p') {
      if (id === this.sid) return;
      if (!str) { this._dropPeer(id); return; }
      let st; try { st = JSON.parse(str); } catch (e) { return; }
      if (now() - (st.t || 0) > GARBAGE_MS) { this.client.publish(topic, '', { retain: true }); return; }
      if (now() - (st.t || 0) > STALE_MS + 10000) return;
      const prev = this.peers.get(id);
      if (prev && (st.seq || 0) < (prev.state.seq || 0)) return;
      this.peers.set(id, { state: st, seen: now() });
      this.emit('peer', id, st);
      // 좌석 표시 갱신
      for (const idx of this.seats.keys()) this.emit('seat', idx, this.seatOwner(idx));
    } else if (kind === 's') {
      // 좌석: 비어 있던 자리에 브로커 순서상 먼저 도착한 사람이 주인 (모든 접속자가 같은 순서로 받으므로 결과가 같음)
      const idx = +id;
      if (!str) { this.seats.delete(idx); this.emit('seat', idx, null); return; }
      let s; try { s = JSON.parse(str); } catch (e) { return; }
      const cur = this.seats.get(idx);
      if (cur && cur.sid !== s.sid && this._claimValid(idx, cur)) {
        if (cur.sid === this.sid) this.claimSeat(idx);            // 내 자리 재확인 → 새로 들어오는 사람도 올바른 주인을 받음
        if (s.sid === this.sid) this.emit('seatLost', idx);       // 내 요청이 늦게 도착 → 선점 실패
        return;
      }
      this.seats.set(idx, { ...s, recv: now() });
      if (s.sid !== this.sid && this.state && this.state.seat === idx && !(cur && cur.sid === this.sid)) this.emit('seatLost', idx);
      this.emit('seat', idx, this.seatOwner(idx));
    } else if (kind === 'c') {
      const idx = +id;
      if (!str) { this.candles.delete(idx); this.emit('candle', idx, null); return; }
      let c; try { c = JSON.parse(str); } catch (e) { return; }
      if (c.exp < now()) { this.candles.delete(idx); this.emit('candle', idx, null); return; }
      this.candles.set(idx, c); this.emit('candle', idx, c);
    } else if (kind === 'e') {
      let ev; try { ev = JSON.parse(str); } catch (e) { return; }
      if (ev.sid === this.sid) return;
      this.emit('event', ev);
    }
  }

  _dropPeer(sid, clearRetained) {
    if (!this.peers.has(sid)) return;
    this.peers.delete(sid); this.emit('peer', sid, null); this._refreshSeatsOf(sid);
    if (clearRetained && this.client && this.base) {
      // 가장 작은 sid 를 가진 접속자가 흔적 정리 (중복 정리 방지)
      const all = [this.sid, ...this.freshPeers()].sort();
      if (all[0] === this.sid) {
        this.client.publish(`${this.base}/p/${sid}`, '', { retain: true });
        for (const [idx, s] of this.seats) if (s.sid === sid) this.client.publish(`${this.base}/s/${idx}`, '', { retain: true });
      }
    }
  }

  _publishState() {
    if (!this.client || !this.base || !this.state || !this.connected) return;
    this.state.t = now();
    this.client.publish(`${this.base}/p/${this.sid}`, JSON.stringify(this.state), { retain: true, qos: 0 });
  }

  setState(patch) {
    this.state = { ...this.state, ...patch, seq: (this.state?.seq || 0) + 1 };
    this._publishState();
  }

  claimSeat(idx) {
    if (!this.client) return;
    this.client.publish(`${this.base}/s/${idx}`, JSON.stringify({ sid: this.sid, t: now() }), { retain: true });
  }
  releaseSeat(idx) {
    const s = this.seats.get(idx);
    if (s && s.sid === this.sid && this.client) this.client.publish(`${this.base}/s/${idx}`, '', { retain: true });
  }

  // 촛불: 비어 있으면 점등 요청 → 700ms 뒤 retained 최종값이 내 요청인지 확인
  lightCandle(idx, name, ttlMin) {
    return new Promise(res => {
      const cur = this.candles.get(idx);
      if (cur && cur.exp > now()) return res({ ok: false, reason: 'taken' });
      const req = makeSid();
      const t = now();
      this.client.publish(`${this.base}/c/${idx}`, JSON.stringify({ sid: this.sid, name, t, exp: t + ttlMin * 60000, req }), { retain: true });
      setTimeout(() => {
        const c = this.candles.get(idx);
        res(c && c.req === req ? { ok: true } : { ok: false, reason: 'taken' });
      }, 900);
    });
  }

  emitEvent(ev) {
    if (!this.client || !this.base) return;
    this.client.publish(`${this.base}/e`, JSON.stringify({ ...ev, sid: this.sid, t: now() }));
  }

  _onClose() {
    const was = this.connected; this.connected = false;
    clearInterval(this.hb); clearInterval(this.gc);
    if (this.closing) return;
    if (was) this._reconnectLoop();
  }

  async _reconnectLoop() {
    this.emit('status', 'reconnecting');
    const started = now();
    while (!this.closing && now() - started < 25000) {
      try {
        this.client = null;
        await this._connect();
        const base = this.base;
        await this._sub(base);
        this._publishState();
        if (this.state && this.state.seat >= 0) this.claimSeat(this.state.seat);
        this._startTimers();
        this.emit('status', 'connected');
        return;
      } catch (e) { await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!this.closing) this.emit('status', 'failed');
  }

  async retry() { this.closing = false; await this._reconnectLoop(); }

  leave() {
    this.closing = true;
    clearInterval(this.hb); clearInterval(this.gc);
    const c = this.client; const base = this.base;
    if (c && base) {
      try {
        if (this.state && this.state.seat >= 0) this.releaseSeat(this.state.seat);
        c.publish(`${base}/p/${this.sid}`, '', { retain: true });
        c.publish(`${MQTT_NS}/bye`, JSON.stringify({ sid: this.sid }));
        this._unsub(base);
      } catch (e) {}
    }
    this._reset();
    this.base = null; this.state = null;
    // 연결은 유지(다음 공간 입장 시 재사용). 완전히 닫을 땐 close()
  }

  close() { this.leave(); try { this.client && this.client.end(true); } catch (e) {} this.client = null; this.connected = false; }
  simulateDrop() { try { this.client && this.client.stream && this.client.stream.destroy(); } catch (e) {} }
}

/* ------------------------------------------------------------------ */
/* 자체 WebSocket 서버 (server/server.js)                               */
/* ------------------------------------------------------------------ */
export class WsAdapter extends Emitter {
  constructor(sid, url) {
    super();
    this.sid = sid; this.url = url; this.mode = 'server';
    this.ws = null; this.state = null; this.space = null; this.room = 0;
    this.seats = new Map(); this.candles = new Map(); this.peers = new Map();
    this.pending = new Map(); this.closing = false;
  }
  _open() {
    return new Promise((res, rej) => {
      const ws = new WebSocket(this.url);
      const t = setTimeout(() => { try { ws.close(); } catch (e) {} rej(new Error('timeout')); }, 8000);
      ws.onopen = () => { clearTimeout(t); this.ws = ws; res(); };
      ws.onerror = () => { clearTimeout(t); rej(new Error('ws error')); };
      ws.onmessage = e => this._onMessage(JSON.parse(e.data));
      ws.onclose = () => this._onClose(ws);
    });
  }
  _send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  _req(o) {
    const id = makeSid();
    return new Promise((res, rej) => {
      this.pending.set(id, res);
      this._send({ ...o, id });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('응답 없음')); } }, 8000);
    });
  }
  async join(space, state, room) {
    this.closing = false; this.space = space; this.state = state;
    if (!this.ws || this.ws.readyState !== 1) await this._open();
    const r = await this._req({ type: 'join', sid: this.sid, space, state, room: room || 0 });
    if (!r.ok) throw new Error(r.reason || 'join 실패');
    this.room = r.room;
    this._applySnapshot(r.snapshot);
    this.emit('status', 'connected');
    return { room: r.room, full: r.redirected };
  }
  _applySnapshot(s) {
    for (const sid of this.peers.keys()) this.emit('peer', sid, null);
    this.peers.clear(); this.seats.clear(); this.candles.clear();
    for (const [sid, st] of Object.entries(s.peers || {})) if (sid !== this.sid) { this.peers.set(sid, { state: st }); this.emit('peer', sid, st); }
    for (const [idx, sid] of Object.entries(s.seats || {})) { this.seats.set(+idx, { sid }); this.emit('seat', +idx, sid); }
    for (const [idx, c] of Object.entries(s.candles || {})) { this.candles.set(+idx, c); this.emit('candle', +idx, c); }
  }
  seatOwner(idx) { const s = this.seats.get(idx); return s ? s.sid : null; }
  async peekRooms(space) { if (!this.ws || this.ws.readyState !== 1) await this._open(); const r = await this._req({ type: 'rooms', space }); return r.counts || {}; }
  _onMessage(m) {
    if (m.id && this.pending.has(m.id)) { const f = this.pending.get(m.id); this.pending.delete(m.id); f(m); return; }
    switch (m.type) {
      case 'peer':
        if (m.sid === this.sid) return;
        if (m.state) this.peers.set(m.sid, { state: m.state }); else this.peers.delete(m.sid);
        this.emit('peer', m.sid, m.state || null); break;
      case 'seat':
        if (m.sid) this.seats.set(m.idx, { sid: m.sid }); else this.seats.delete(m.idx);
        this.emit('seat', m.idx, m.sid || null); break;
      case 'seatLost': this.emit('seatLost', m.idx); break;
      case 'candle':
        if (m.data) this.candles.set(m.idx, m.data); else this.candles.delete(m.idx);
        this.emit('candle', m.idx, m.data || null); break;
      case 'event': if (m.ev.sid !== this.sid) this.emit('event', m.ev); break;
    }
  }
  setState(patch) { this.state = { ...this.state, ...patch, seq: (this.state?.seq || 0) + 1 }; this._send({ type: 'state', state: this.state }); }
  claimSeat(idx) { this._send({ type: 'seat', idx }); }
  releaseSeat(idx) { this._send({ type: 'unseat', idx }); }
  async lightCandle(idx, name) { try { const r = await this._req({ type: 'candle', idx, name, req: makeSid() }); return r; } catch (e) { return { ok: false, reason: 'error' }; } }
  emitEvent(ev) { this._send({ type: 'event', ev: { ...ev, sid: this.sid } }); }
  freshPeers() { return [...this.peers.keys()]; }
  _onClose(ws) {
    if (ws !== this.ws) return;
    this.ws = null;
    if (this.closing) return;
    this._reconnectLoop();
  }
  async _reconnectLoop() {
    this.emit('status', 'reconnecting');
    const started = now();
    while (!this.closing && now() - started < 25000) {
      try {
        await this._open();
        const r = await this._req({ type: 'join', sid: this.sid, space: this.space, state: this.state, room: this.room, resume: true });
        if (r.ok) {
          this.room = r.room; this._applySnapshot(r.snapshot);
          if (this.state && this.state.seat >= 0) this.claimSeat(this.state.seat);
          this.emit('status', 'connected'); return;
        }
      } catch (e) { await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!this.closing) this.emit('status', 'failed');
  }
  async retry() { this.closing = false; await this._reconnectLoop(); }
  leave() {
    this.closing = true;
    this._send({ type: 'leave' });
    for (const sid of this.peers.keys()) this.emit('peer', sid, null);
    this.peers.clear(); this.seats.clear(); this.candles.clear();
    this.state = null;
    this.closing = false;
  }
  close() { this.closing = true; try { this.ws && this.ws.close(); } catch (e) {} this.ws = null; }
  simulateDrop() { try { this.ws && this.ws.close(); } catch (e) {} }
}

export function createNet(sid) {
  const q = new URLSearchParams(location.search);
  const server = q.get('server') || WS_SERVER;
  if (server) return new WsAdapter(sid, server);
  const broker = q.get('broker');
  return new MqttAdapter(sid, broker ? { brokers: [broker] } : {});
}
