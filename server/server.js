// 맥스데이 라이프 실시간 방 서버 (운영용, 서버 권한 판정)
// 실행: cd server && npm install && node server.js   (기본 포트 8787, 환경변수 PORT)
// 클라이언트 접속: https://<사이트>/?server=wss://<도메인>/ws
// 관리자 페이지(admin/): 환경변수 ADMIN_PW=<관리자 비밀번호> 로 켬 (비워 두면 관리자 기능 꺼짐)
// 데이터: 모든 상태는 메모리에만 보관(위치 변경을 DB에 쌓지 않음). 세션은 접속 종료 후 유예 15초 뒤 정리.
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import crypto from 'crypto';

const PORT = +process.env.PORT || 8787;
const CAPACITY = +process.env.ROOM_CAPACITY || 20;
const GRACE_MS = 15000;          // 연결 끊김 유예(재연결 시 좌석 유지)
const CANDLE_TTL_MS = 10 * 60000; // 촛불 10분 뒤 꺼짐
const SPACES = new Set(['temple', 'church', 'cathedral', 'playground']);
const SEAT_COUNT = { temple: 64, church: 64, cathedral: 64, playground: 64 };
const CANDLE_COUNT = 24;

// 카페·식당 예약 (파일에 저장 — 포스 연동 시 여기서 포스 API 로 전달)
const RESV_FILE = process.env.RESV_FILE || './reservations.json';
let resv = {}; try { resv = JSON.parse(fs.readFileSync(RESV_FILE, 'utf8')); } catch (e) {}
const BOARD_FILE = process.env.BOARD_FILE || './boards.json';
let boards = {}; try { boards = JSON.parse(fs.readFileSync(BOARD_FILE, 'utf8')); } catch (e) {}
const saveBoards = () => { try { fs.writeFileSync(BOARD_FILE, JSON.stringify(boards)); } catch (e) { console.error(e); } };
const ACCT_FILE = process.env.ACCT_FILE || './accounts.json';
let accts = { users: {}, prog: {} }; try { accts = JSON.parse(fs.readFileSync(ACCT_FILE, 'utf8')); } catch (e) {}
const saveAccts = () => { try { fs.writeFileSync(ACCT_FILE, JSON.stringify(accts)); } catch (e) { console.error(e); } };
const tokens = new Map(); // token -> id (서버 메모리 세션)
const ADMIN_PW = process.env.ADMIN_PW || ''; // 비워 두면 관리자 기능 꺼짐
const adminTokens = new Map();
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const saveResv = () => { try { fs.writeFileSync(RESV_FILE, JSON.stringify(resv)); } catch (e) { console.error(e); } };
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };

/** rooms: key `${space}:${n}` -> { space, n, members: Map<sid, member>, seats: Map<idx, sid>, candles: Map<idx, data> } */
const rooms = new Map();
const sessions = new Map(); // sid -> member

function roomKey(space, n) { return `${space}:${n}`; }
function getRoom(space, n) {
  const k = roomKey(space, n);
  if (!rooms.has(k)) rooms.set(k, { space, n, members: new Map(), seats: new Map(), candles: new Map() });
  return rooms.get(k);
}
function send(ws, o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function broadcast(room, o, except) { for (const m of room.members.values()) if (m.sid !== except) send(m.ws, o); }

function snapshot(room) {
  const peers = {}; for (const m of room.members.values()) peers[m.sid] = m.state;
  const seats = {}; for (const [i, s] of room.seats) seats[i] = s;
  const candles = {}; const t = Date.now();
  for (const [i, c] of room.candles) if (c.exp > t) candles[i] = c;
  return { peers, seats, candles };
}

function sanitizeState(s) {
  if (!s || typeof s !== 'object') return {};
  const name = String(s.name || '손님').slice(0, 12);
  const num = v => (typeof v === 'number' && isFinite(v) ? Math.max(-30, Math.min(30, v)) : 0);
  return {
    name, look: s.look || {}, acc: typeof s.acc === 'string' ? s.acc.slice(0, 24) : '',
    x: num(s.x), z: num(s.z), ry: num(s.ry),
    path: Array.isArray(s.path) ? s.path.slice(0, 200).map(p => [num(p[0]), num(p[1])]) : null,
    seat: Number.isInteger(s.seat) ? s.seat : -1, act: typeof s.act === 'string' ? s.act.slice(0, 32) : 'stand',
    seq: +s.seq || 0, joinAt: +s.joinAt || Date.now(), t: Date.now(),
  };
}

function removeMember(m, notify = true) {
  const room = m.room; if (!room) return;
  room.members.delete(m.sid);
  for (const [i, s] of [...room.seats]) if (s === m.sid) { room.seats.delete(i); broadcast(room, { type: 'seat', idx: i, sid: null }); }
  if (notify) broadcast(room, { type: 'peer', sid: m.sid, state: null });
  m.room = null;
  if (room.members.size === 0 && room.candles.size === 0) rooms.delete(roomKey(room.space, room.n));
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const out = {}; for (const [k, r] of rooms) out[k] = r.members.size;
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    return res.end(JSON.stringify({ ok: true, rooms: out }));
  }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });

wss.on('connection', ws => {
  let me = null;
  let msgCount = 0; const rate = setInterval(() => { msgCount = 0; }, 1000);
  ws.on('message', raw => {
    if (++msgCount > 30) return; // 초당 30건 제한
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const reply = o => send(ws, { ...o, id: m.id });
    switch (m.type) {
      case 'join': {
        if (!SPACES.has(m.space) || typeof m.sid !== 'string' || m.sid.length > 32) return reply({ ok: false, reason: 'bad' });
        // 재접속(유예 중)이면 기존 세션 이어받기
        let prev = sessions.get(m.sid);
        if (prev && prev.room && m.resume && prev.room.space === m.space) {
          clearTimeout(prev.graceTimer); prev.ws = ws; me = prev;
          me.state = sanitizeState({ ...me.state, ...m.state });
          broadcast(me.room, { type: 'peer', sid: me.sid, state: me.state }, me.sid);
          return reply({ ok: true, room: me.room.n, snapshot: snapshot(me.room) });
        }
        if (prev && prev.room) removeMember(prev); // 방 이동 시 기존 방에서 먼저 퇴장
        let n = m.room > 0 ? m.room : 1, redirected = false;
        for (; n < 1000; n++) { const r = getRoom(m.space, n); if (r.members.size < CAPACITY) break; redirected = true; }
        const room = getRoom(m.space, n);
        me = { sid: m.sid, ws, room, state: sanitizeState(m.state) };
        me.state.seat = -1;
        sessions.set(me.sid, me);
        room.members.set(me.sid, me);
        broadcast(room, { type: 'peer', sid: me.sid, state: me.state }, me.sid);
        return reply({ ok: true, room: n, redirected, snapshot: snapshot(room) });
      }
      case 'resvList': {
        const key = `${m.store}/${m.date}`; const list = {};
        for (const r of Object.values(resv[key] || {})) list[r.time + '|' + r.table] = { time: r.time, table: r.table, size: r.size, nm: r.nm, id: r.id };
        return reply({ ok: true, list });
      }
      case 'resvSave': {
        const r = m.rec || {}; if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || '') || !/^\d{2}:\d{2}$/.test(r.time || '') || !r.table) return reply({ ok: false, reason: 'bad' });
        const key = `${r.store}/${r.date}`; resv[key] ||= {};
        if (Object.values(resv[key]).some(x => x.table === r.table && Math.abs(toMin(x.time) - toMin(r.time)) < 90)) return reply({ ok: false, reason: 'taken' });
        resv[key][r.id] = { id: String(r.id).slice(0, 40), store: r.store, date: r.date, time: r.time, table: String(r.table).slice(0, 10), size: +r.size || 1, nm: String(r.nm || '').slice(0, 8), items: +r.items || 0, sid: m.sid || '', t: Date.now() };
        saveResv(); return reply({ ok: true });
      }
      case 'resvCancel': {
        const r = m.rec || {}; const key = `${r.store}/${r.date}`;
        if (resv[key] && resv[key][r.id]) { delete resv[key][r.id]; saveResv(); }
        return reply({ ok: true });
      }
      case 'acct': { // 계정 · 수강신청 · 진도 (op: signup | login | me | progGet | progSave | admin*)
        const id = String(m.uid || '').toLowerCase();
        if (m.op === 'rosterGet') return reply({ ok: true, roster: (accts.roster || []).map(r => ({ no: r.no, store: r.store })) }); // 가입 화면 점포 선택용(대표자명은 내보내지 않음)
        if (m.op === 'signup') {
          if (!/^[a-z0-9_]{4,16}$/.test(id) || String(m.pw || '').length < 8) return reply({ ok: false, reason: 'bad' });
          if (accts.users[id]) return reply({ ok: false, reason: 'taken' });
          const salt = crypto.randomBytes(16).toString('hex'); const at0 = Date.now(); accts.users[id] = { name: String(m.owner || m.name || id).slice(0, 12), store: String(m.store || '').slice(0, 30), storeNo: String(m.storeNo || '').slice(0, 30), owner: String(m.owner || '').slice(0, 12), salt, hash: hashPw(m.pw, salt), at: at0, last: at0 }; saveAccts();
          const tk = crypto.randomBytes(24).toString('hex'); tokens.set(tk, id); return reply({ ok: true, token: tk, name: accts.users[id].name });
        }
        if (m.op === 'login') {
          const u = accts.users[id]; if (!u || u.off || hashPw(m.pw, u.salt) !== u.hash) return reply({ ok: false, reason: 'wrong' });
          u.last = Date.now(); saveAccts();
          const tk = crypto.randomBytes(24).toString('hex'); tokens.set(tk, id); return reply({ ok: true, token: tk, name: u.name, store: u.store || '' });
        }
        // ---- 관리자 (ADMIN_PW 환경변수로 켬): 회원·진도 조회, 비밀번호 재설정, 아이디 변경, 미가입 대조용 점포 명단 ----
        if (String(m.op || '').startsWith('admin')) {
          if (m.op === 'adminLogin') {
            if (!ADMIN_PW) return reply({ ok: false, reason: 'off' });
            const a = Buffer.from(String(m.pw || '')), b = Buffer.from(ADMIN_PW);
            if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { setTimeout(() => reply({ ok: false, reason: 'wrong' }), 800); return; }
            const tk = crypto.randomBytes(24).toString('hex'); adminTokens.set(tk, Date.now() + 12 * 3600e3); return reply({ ok: true, token: tk });
          }
          const exp = adminTokens.get(String(m.token || '')); if (!exp || exp < Date.now()) return reply({ ok: false, reason: 'auth' });
          const pub = (id, u) => ({ id, name: u.name, store: u.store || '', storeNo: u.storeNo || '', owner: u.owner || '', at: u.at, last: u.last || 0, off: !!u.off });
          if (m.op === 'adminList') return reply({ ok: true, users: Object.entries(accts.users).map(([id, u]) => pub(id, u)), prog: accts.prog, roster: accts.roster || null });
          const tid = String(m.uid || '').toLowerCase(); const u = accts.users[tid];
          if (m.op === 'adminRoster') { if (!Array.isArray(m.roster)) return reply({ ok: false, reason: 'bad' }); accts.roster = m.roster.slice(0, 500).map(r => ({ store: String(r.store || '').slice(0, 30), owner: String(r.owner || '').slice(0, 12), no: String(r.no || '').slice(0, 10) })); saveAccts(); return reply({ ok: true }); }
          if (!u) return reply({ ok: false, reason: 'nouser' });
          const kick = id => { for (const [k, v] of tokens) if (v === id) tokens.delete(k); };
          if (m.op === 'adminSetPw') { if (String(m.pw || '').length < 8) return reply({ ok: false, reason: 'bad' }); u.salt = crypto.randomBytes(16).toString('hex'); u.hash = hashPw(m.pw, u.salt); kick(tid); saveAccts(); return reply({ ok: true }); }
          if (m.op === 'adminEdit') { if (m.store !== undefined) u.store = String(m.store).slice(0, 30); if (m.storeNo !== undefined) u.storeNo = String(m.storeNo).slice(0, 30); if (m.owner !== undefined) { u.owner = String(m.owner).slice(0, 12); u.name = u.owner || u.name; } if (m.off !== undefined) { u.off = !!m.off; if (u.off) kick(tid); } saveAccts(); return reply({ ok: true }); }
          if (m.op === 'adminRename') { const to = String(m.to || '').toLowerCase(); if (!/^[a-z0-9_]{4,16}$/.test(to)) return reply({ ok: false, reason: 'bad' }); if (accts.users[to]) return reply({ ok: false, reason: 'taken' }); accts.users[to] = u; delete accts.users[tid]; if (accts.prog[tid]) { accts.prog[to] = accts.prog[tid]; delete accts.prog[tid]; } kick(tid); saveAccts(); return reply({ ok: true }); }
          if (m.op === 'adminDelete') { delete accts.users[tid]; delete accts.prog[tid]; kick(tid); saveAccts(); return reply({ ok: true }); }
          return reply({ ok: false, reason: 'op' });
        }
        const who = tokens.get(String(m.token || '')); if (!who) return reply({ ok: false, reason: 'auth' });
        if (m.op === 'me') return reply({ ok: true, id: who, name: accts.users[who]?.name });
        if (m.op === 'progGet') return reply({ ok: true, prog: accts.prog[who] || {} });
        if (m.op === 'progSave') { const p = m.prog && typeof m.prog === 'object' ? m.prog : {}; if (JSON.stringify(p).length > 200000) return reply({ ok: false, reason: 'big' }); accts.prog[who] = p; saveAccts(); return reply({ ok: true }); }
        return reply({ ok: false, reason: 'op' });
      }
      case 'boardList': { const b = boards[String(m.key || '').slice(0, 60)] || {}; return reply({ ok: true, list: Object.values(b).sort((x, y) => x.t - y.t).slice(-200) }); }
      case 'boardPost': {
        const k = String(m.key || '').slice(0, 60), it = m.item || {}; if (!k || !it.id || !it.text) return reply({ ok: false });
        boards[k] ||= {}; boards[k][String(it.id).slice(0, 40)] = { id: String(it.id).slice(0, 40), text: String(it.text).slice(0, 300), nm: String(it.nm || '').slice(0, 12), at: +it.at || 0, re: it.re ? String(it.re).slice(0, 40) : '', likes: +it.likes || 0, t: Date.now() };
        saveBoards(); return reply({ ok: true });
      }
      case 'rooms': {
        const counts = {}; for (const r of rooms.values()) if (r.space === m.space && r.members.size) counts[r.n] = r.members.size;
        return reply({ ok: true, counts });
      }
      case 'state': {
        if (!me || !me.room) return;
        const st = sanitizeState(m.state);
        st.seat = me.state.seat; // 좌석은 seat 메시지로만 변경
        me.state = st;
        return broadcast(me.room, { type: 'peer', sid: me.sid, state: st }, me.sid);
      }
      case 'seat': {
        if (!me || !me.room) return;
        const idx = m.idx | 0; if (idx < 0 || idx >= SEAT_COUNT[me.room.space]) return;
        const owner = me.room.seats.get(idx);
        if (owner && owner !== me.sid) return send(ws, { type: 'seatLost', idx });
        for (const [i, s] of [...me.room.seats]) if (s === me.sid && i !== idx) { me.room.seats.delete(i); broadcast(me.room, { type: 'seat', idx: i, sid: null }); }
        me.room.seats.set(idx, me.sid); me.state.seat = idx;
        return broadcast(me.room, { type: 'seat', idx, sid: me.sid });
      }
      case 'unseat': {
        if (!me || !me.room) return;
        if (me.room.seats.get(m.idx) === me.sid) { me.room.seats.delete(m.idx); me.state.seat = -1; broadcast(me.room, { type: 'seat', idx: m.idx, sid: null }); }
        return;
      }
      case 'candle': {
        if (!me || !me.room || me.room.space !== 'cathedral') return reply({ ok: false, reason: 'bad' });
        const idx = m.idx | 0; if (idx < 0 || idx >= CANDLE_COUNT) return reply({ ok: false, reason: 'bad' });
        const t = Date.now(); const cur = me.room.candles.get(idx);
        if (cur && cur.req === m.req) return reply({ ok: true }); // 같은 요청 중복 실행 방지
        if (cur && cur.exp > t) return reply({ ok: false, reason: 'taken' });
        const data = { sid: me.sid, name: me.state.name, t, exp: t + CANDLE_TTL_MS, req: m.req };
        me.room.candles.set(idx, data);
        broadcast(me.room, { type: 'candle', idx, data });
        return reply({ ok: true });
      }
      case 'event': {
        if (!me || !me.room || !m.ev || typeof m.ev.type !== 'string') return;
        return broadcast(me.room, { type: 'event', ev: { ...m.ev, sid: me.sid, t: Date.now() } }, me.sid);
      }
      case 'leave': {
        if (me) { removeMember(me); sessions.delete(me.sid); me = null; }
        return;
      }
    }
  });
  ws.on('close', () => {
    clearInterval(rate);
    if (!me || me.ws !== ws) return;
    const m = me;
    // 유예 후 정리 → 유령 캐릭터·좌석 점유 방지
    m.graceTimer = setTimeout(() => { if (m.ws === ws) { removeMember(m); sessions.delete(m.sid); } }, GRACE_MS);
  });
});

// 촛불 만료 정리
setInterval(() => {
  const t = Date.now();
  for (const room of rooms.values()) for (const [i, c] of [...room.candles]) if (c.exp <= t) { room.candles.delete(i); broadcast(room, { type: 'candle', idx: i, data: null }); }
}, 5000);

server.listen(PORT, () => console.log(`maxday-life room server :${PORT} (ws path /ws)`));
