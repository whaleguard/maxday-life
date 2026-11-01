// 맥스데이 라이프 실시간 방 서버 (운영용, 서버 권한 판정)
// 실행: cd server && npm install && node server.js   (기본 포트 8787, 환경변수 PORT)
// 클라이언트 접속: https://<사이트>/?server=wss://<도메인>/ws
// 데이터: 모든 상태는 메모리에만 보관(위치 변경을 DB에 쌓지 않음). 세션은 접속 종료 후 유예 15초 뒤 정리.
import { WebSocketServer } from 'ws';
import http from 'http';

const PORT = +process.env.PORT || 8787;
const CAPACITY = +process.env.ROOM_CAPACITY || 20;
const GRACE_MS = 15000;          // 연결 끊김 유예(재연결 시 좌석 유지)
const CANDLE_TTL_MS = 10 * 60000; // 촛불 10분 뒤 꺼짐
const SPACES = new Set(['temple', 'church', 'cathedral', 'playground']);
const SEAT_COUNT = { temple: 64, church: 64, cathedral: 64, playground: 64 };
const CANDLE_COUNT = 24;

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
