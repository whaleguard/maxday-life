// 맥스데이 라이프 — 앱 진입점: 지도(입구) → 공간 입장, 3인칭 캐릭터 조작, 실시간 동기화, 공간 기능(염주·말씀·찬송·샵·12지신·기계)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BRAND, SPACES, SPACE_ORDER, BUTTON_STYLE, NAME_ADJ, NAME_NOUN, TEXT, PROGRAMS, DEMO_URL, GACHA, ANNEX, CHARACTER, ROOM_CAPACITY , VIDEOS } from './config.js';
import { createRenderer, Labels, disposeObject } from './engine.js';
import { buildInterior } from './scenes.js';
import { buildMap, MAP_SPOTS, DRIVE_IN } from './world/map.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { Character, lookFromSid, OUTFITS } from './character.js';
import { createNet, makeSid } from './net.js';
import { SoundScape, SONG_LIST } from './audio.js';
import { openBible } from './features/bible.js';
import { Beads } from './features/beads.js';
import { ZODIAC, zodiacOfYear, todayWord } from './features/zodiac.js';
import { CATALOG, Points, Owned, Wear, itemName, PAYMENT } from './features/shop.js';
import { ReserveUI } from './features/reserve.js';
import { STORES } from './features/stores.js';

const $ = s => document.querySelector(s);
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- 전역 상태 ---------------- */
const SID = ss.get('mdl_sid') || makeSid(); ss.set('mdl_sid', SID);
const settings = Object.assign({ names: true, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, low: false, npc: true }, JSON.parse(ls.get('mdl_settings') || '{}'));
const isMobile = matchMedia('(pointer:coarse)').matches && Math.min(innerWidth, innerHeight) < 700;
const sound = new SoundScape();
const net = createNet(SID);
const app = {
  mode: 'map', world: null, cam: new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400),
  me: null, peers: new Map(), npcs: [], space: null, room: 0, locked: false, busy: false,
  view: { yaw: 0, pitch: 0.42, dist: 7, tx: 0, ty: 1, tz: 0 }, billboards: [],
};
window.__mdl = app;
let renderer, labels, envTex;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const clock = new THREE.Clock();
let beads, reserve;
const isStore = k => !!STORES[k];
const roomWord = k => k === 'temple' ? '법당' : k === 'playground' ? '놀이방' : isStore(k) ? '매장' : '예배실';

/* ---------------- 시작 ---------------- */
function applyBrand() {
  document.title = `${BRAND.ko} · ${BRAND.title}`;
  const img = $('#brand-logo'); if (img) { img.src = BRAND.logo; img.alt = BRAND.en; }
  const ko = $('#brand-ko'); if (ko) ko.textContent = BRAND.ko;
  const hs = $('#help-spaces'); if (hs) hs.textContent = SPACE_ORDER.map(k => SPACES[k].name).join(' · ');
}
function boot() {
  applyBrand();
  try {
    renderer = createRenderer($('#gl'), settings.low);
    app.renderer = renderer;
    if (isMobile && !settings.low) renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    const pmrem = new THREE.PMREMGenerator(renderer); envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  } catch (e) {
    $('#fatal-text').textContent = '이 브라우저에서 3D 화면을 실행하지 못했어요. 최신 크롬·사파리·엣지에서 열거나, 하드웨어 가속을 켠 뒤 다시 시도해 주세요.';
    $('#fatal').hidden = false; return;
  }
  renderer.domElement.addEventListener('webglcontextlost', ev => { ev.preventDefault(); $('#fatal-text').textContent = '3D 화면이 잠시 멈췄어요. 다시 시도해 주세요.'; $('#fatal').hidden = false; });
  labels = new Labels($('#labels'));
  labels.visibleOthers = settings.names;
  applySettings(); buildEnterButtons(); bindUI();
  beads = new Beads($('#beads'), {
    reduced: settings.reduce,
    onBead: n => { sound.beadClick(); if (n % 27 === 0) Points.add(2, '염주'); },
    onRound: r => { toast(`108염주 ${r}번째를 마쳤어요. 공덕 +15`); Points.add(15, '108염주'); },
  });
  reserve = new ReserveUI({ net, toast, brand: BRAND, onChange: () => refreshTableTags() });
  Points.onChange = (v, d, why) => { $('#pts-n').textContent = v; if (d > 0 && why) pointPop(`+${d} ${why}`); };
  $('#pts-n').textContent = Points.get();
  showMap(true);
  addEventListener('resize', onResize);
  requestAnimationFrame(loop);
  net.on('peer', onPeer); net.on('seat', onSeat); net.on('seatLost', onSeatLost); net.on('candle', onCandle); net.on('event', onEvent); net.on('status', onStatus);
  net.on('overflow', () => { toast(TEXT.full); rejoinNextRoom(); });
  addEventListener('pagehide', () => { try { net.leave(); } catch (e) {} });
  $('#conn-mode').textContent = net.mode === 'server' ? '실시간 연결: 자체 방 서버' : '실시간 연결: 공개 중계(시연용). 운영 시 자체 방 서버로 전환합니다.';
  // 머무는 동안 공덕 포인트 (30초마다 1)
  setInterval(() => { if (app.mode === 'interior' && !document.hidden) Points.add(1); }, 30000);
}

/* ---------------- 지도(입구) ---------------- */
function buildEnterButtons() {
  const grid = $('#enter-grid'); grid.innerHTML = '';
  for (const key of SPACE_ORDER) {
    const sp = SPACES[key], st = BUTTON_STYLE[key];
    const b = document.createElement('button'); b.className = 'enter-btn'; b.dataset.space = key;
    b.style.cssText = `--bg:${st.bg};--fg:${st.fg};--bd:${st.bd};--hv:${st.hv}`;
    b.innerHTML = `<span class="n">${sp.name}</span><span class="d">${sp.btn}</span>`;
    b.setAttribute('aria-label', `${sp.name} (${sp.desc}) — ${sp.btn}`);
    b.onclick = () => focusSpot(key);
    grid.appendChild(b);
  }
}
const MAP_HOME = { pos: [0, 50, 96], look: [0, 5, -16] };
function showMap(first) {
  disposeWorld();
  app.mode = 'map'; app.space = null; app.focus = null;
  document.body.className = 'mode-map' + (settings.reduce ? ' reduce' : '');
  $('#garden-ui').hidden = false; $('#room-ui').hidden = true; $('#spot-card').hidden = true;
  const w = buildMap({ low: settings.low }); w.scene.environment = envTex; app.world = w; setTimeout(setupDriveInVideo, 0);
  collectBillboards();
  // 건물 위 이름 핀 (HTML)
  for (const key of SPACE_ORDER) {
    const sp = MAP_SPOTS[key]; const anchor = new THREE.Object3D(); const b = w.buildings[key];
    anchor.position.set(sp.pos[0], (key === 'temple' ? 9.2 : 0) + sp.pinH, sp.pos[2]); w.scene.add(anchor);
    const d = labels.add('pin-' + key, '', 'pin fixed'); d.innerHTML = `<b>${SPACES[key].name}</b><small>${SPACES[key].desc}</small>`;
    d.style.pointerEvents = 'auto'; d.onclick = () => focusSpot(key); labels.bind('pin-' + key, anchor, 0);
  }
  app.cam.fov = 38; const hm = mapHome(); const dist = Math.hypot(hm.pos[1] - hm.look[1], hm.pos[2] - hm.look[2]); w.scene.fog.near = dist * 1.05; w.scene.fog.far = dist * 2.6; setCamTween(hm, first ? 0 : 1.2);
  sound.setSpace('garden');
  onResize();
  if (!first) fade(false);
}
const mapPan = { x: 0, z: 0 };
function mapHome() { const a = innerWidth / innerHeight; const k = a < 1 ? clamp(0.62 / a, 1, 1.35) : 1; return { pos: [MAP_HOME.pos[0] + mapPan.x, MAP_HOME.pos[1] * k * 0.9, MAP_HOME.pos[2] * k * 0.92 + mapPan.z], look: [MAP_HOME.look[0] + mapPan.x, MAP_HOME.look[1], MAP_HOME.look[2] + mapPan.z] }; }
let camTween = null;
function setCamTween(to, dur) {
  const from = { pos: app.cam.position.toArray(), look: app.camLook ? app.camLook.toArray() : to.look };
  if (!dur) { app.cam.position.set(...to.pos); app.camLook = new THREE.Vector3(...to.look); app.cam.lookAt(app.camLook); camTween = null; return; }
  camTween = { from, to, t: 0, dur: settings.reduce ? 0.01 : dur };
}
function updateCamTween(dt) {
  if (!camTween) return;
  camTween.t += dt; const k = Math.min(1, camTween.t / camTween.dur); const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const P = camTween.from.pos.map((v, i) => v + (camTween.to.pos[i] - v) * e);
  const L = camTween.from.look.map((v, i) => v + (camTween.to.look[i] - v) * e);
  // 날아가는 동안 살짝 위로 호를 그림
  P[1] += Math.sin(e * Math.PI) * 6;
  app.cam.position.set(...P); app.camLook = new THREE.Vector3(...L); app.cam.lookAt(app.camLook);
  if (k >= 1) camTween = null;
}
async function focusSpot(key) {
  if (app.mode !== 'map' || app.busy) return;
  app.focus = key;
  const v = MAP_SPOTS[key].view; const a = innerWidth / innerHeight; const k = a < 1 ? 1.5 : 1.55;
  const dir = new THREE.Vector3(v.pos[0] - v.look[0], v.pos[1] - v.look[1], v.pos[2] - v.look[2]).multiplyScalar(k);
  const look = [v.look[0], v.look[1] - (a < 1 ? 5 : 3.5), v.look[2]];
  setCamTween({ pos: [v.look[0] + dir.x, v.look[1] + dir.y, v.look[2] + dir.z], look }, 1.5);
  document.body.classList.add('focused');
  const sp = SPACES[key], card = $('#spot-card');
  $('#sc-name').textContent = sp.name; $('#sc-desc').textContent = SPOT_DESC[key];
  $('#sc-enter').textContent = isStore(key) ? '들어가서 둘러보기' : sp.btn; $('#sc-enter').onclick = () => askName(key, 0);
  $('#sc-resv').hidden = !isStore(key); $('#sc-resv').onclick = () => { openModal('resv'); reserve.open(key); };
  card.hidden = false; card.dataset.space = key;
  const list = $('#sc-rooms'); list.innerHTML = '<span class="muted small">방 목록을 불러오는 중…</span>';
  try {
    const counts = await withTimeout(net.peekRooms(key), 10000);
    if (app.focus !== key) return;
    const nums = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const max = Math.max(3, ...nums, 0);
    list.innerHTML = '';
    for (let n = 1; n <= Math.min(max + 1, 12); n++) {
      const c = counts[n] || 0; const b = document.createElement('button'); b.className = 'room-chip' + (c >= ROOM_CAPACITY ? ' full' : '');
      b.innerHTML = `<b>${n}번 ${roomWord(key)}</b><span>${c}/${ROOM_CAPACITY}명</span>`;
      b.disabled = c >= ROOM_CAPACITY; b.onclick = () => askName(key, n); list.appendChild(b);
    }
  } catch (e) { list.innerHTML = '<span class="muted small">방 목록을 불러오지 못했어요. 입장하면 빈 방으로 자동 안내돼요.</span>'; }
}
const SPOT_DESC = {
  temple: '산 중턱 고요한 법당. 방석에 앉아 합장·절하기, 염주 돌리기, 다도실에서 차 한 잔.',
  church: '언덕 위 따뜻한 예배당. 기도하기, 성경 말씀 검색, 찬송 듣기, 카페에서 쉬어가기.',
  cathedral: '광장의 석조 성당. 장의자에서 기도, 봉헌초 켜기, 성가 듣기, 성물방.',
  playground: '공원 놀이터. 운세·타로·게임 기계, 랜덤박스, 12지신 마당, 어린이 놀이방.',
  cafe: '창가 바·소파석·홀·단체석이 있는 카페. 미리 둘러보고 원하는 자리를 골라 예약·주문까지.',
  restaurant: '창가·홀·원탁·룸이 있는 한식당. 오픈 주방·셀프바를 둘러보고 자리 예약과 미리 주문.',
};
function unfocus() { app.focus = null; document.body.classList.remove('focused'); $('#spot-card').hidden = true; setCamTween(mapHome(), 1.3); }

/* ---------------- 이름 ---------------- */
const BANNED = ['시발', '씨발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새', '좆', '존나', '미친', '섹스', '야동', '느금', '니애미', '애미', '애비', '지랄', '꺼져', '죽어', 'fuck', 'shit', 'sex', 'bitch', 'admin', '관리자', '운영자', '스님', '목사', '신부', '수녀', '전도사'];
function randomName() { return NAME_ADJ[Math.floor(Math.random() * NAME_ADJ.length)] + ' ' + NAME_NOUN[Math.floor(Math.random() * NAME_NOUN.length)]; }
function validName(n) {
  n = n.replace(/\s+/g, ' ').trim();
  if (n.length < 2) return [null, '이름은 2자 이상으로 적어 주세요.'];
  if (n.length > 12) return [null, '이름은 12자까지 쓸 수 있어요.'];
  const flat = n.toLowerCase().replace(/[\s._\-~!@#$%^&*()0-9]/g, '');
  if (BANNED.some(b => flat.includes(b))) return [null, '사용할 수 없는 표현이 있어요. 다른 이름을 골라 주세요.'];
  if (/[<>]/.test(n)) return [null, '사용할 수 없는 문자가 있어요.'];
  return [n, ''];
}
let pending = null;
function askName(key, room) {
  if (app.busy) return;
  pending = { key, room };
  $('#name-space').textContent = `${SPACES[key].name} · ${room ? room + '번 방' : '빈 방 자동 안내'}`;
  $('#name-input').value = ss.get('mdl_name') || randomName();
  $('#name-err').textContent = '';
  openModal('name');
  setTimeout(() => { const i = $('#name-input'); i.focus(); i.select(); }, 30);
}
function confirmName() {
  const [n, err] = validName($('#name-input').value);
  if (!n) { $('#name-err').textContent = err; return; }
  ss.set('mdl_name', n); closeModal('name');
  enterSpace(pending.key, n, pending.room);
}

/* ---------------- 입장 ---------------- */
let lastEnter = null;
async function enterSpace(key, name, roomHint) {
  if (app.busy) return;
  app.busy = true; lastEnter = { key, name, roomHint };
  await fade(true);
  showLoading(TEXT.loading);
  disposeWorld();
  let world;
  try { world = buildInterior(key, { low: settings.low, reduced: settings.reduce }); }
  catch (e) { console.error(e); showLoading('공간을 불러오지 못했어요.', true); app.busy = false; return; }
  world.scene.environment = envTex;
  app.world = world; app.mode = 'interior'; app.space = key;
  document.body.className = 'mode-room' + (settings.reduce ? ' reduce' : '');
  $('#garden-ui').hidden = true; $('#room-ui').hidden = false; $('#spot-card').hidden = true;
  $('#room-name').textContent = SPACES[key].name; $('#room-no').textContent = '';
  collectBillboards();
  const wear = Wear.get();
  const look = lookFromSid(SID, key, { outfit: wear.outfit, outfitTemple: wear.outfitTemple, hand: wear.hand });
  const me = { sid: SID, name, look, acc: ls.get('mdl_acc') || '', x: world.spawn[0], z: world.spawn[2] + 0.3, ry: Math.PI, seat: -1, act: 'stand', path: null, pendingSeat: -1 };
  me.char = new Character(look, { reducedMotion: settings.reduce });
  me.char.setAccessory(me.acc, { calm: key !== 'playground' });
  me.char.root.position.set(me.x, 0, me.z); me.char.root.rotation.y = me.ry;
  world.scene.add(me.char.root);
  labels.add(SID, name, 'me'); labels.bind(SID, me.char.root, 1.72);
  app.me = me;
  app.view = { yaw: 0, pitch: 0.26, dist: isMobile || innerWidth < 640 ? 8.6 : 7.4, tx: me.x, ty: 1.5, tz: me.z - 2 };
  app.cam.fov = innerWidth < 640 ? 54 : 46; onResize();
  updateFollowCam(1, true);
  renderer.compile(world.scene, app.cam);
  showLoading(TEXT.joining);
  try {
    const res = await withTimeout(net.join(key, publicState(), roomHint), 15000);
    app.room = res.room; if (res.full) toast(TEXT.full);
  } catch (e) {
    console.warn('join failed', e);
    showLoading(TEXT.failed, true); app.busy = false; return; // 실패를 입장 완료로 처리하지 않음
  }
  $('#room-no').textContent = `${app.room}번 ${roomWord(key)}`;
  if (isStore(key)) refreshTableTags();
  updatePeopleCount(); hideLoading();
  sound.setSpace(SPACES[key].music);
  spawnNpcs();
  await fade(false);
  app.busy = false;
  if (Points.daily()) toast('오늘 첫 방문 공덕 +30');
  walkTo([world.spawn[0], world.spawn[2] - 2.2]);
  renderActions(); showHintOnce(key);
}
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
async function rejoinNextRoom() { if (!app.space || !app.me) return; const key = app.space, name = app.me.name, next = app.room + 1; net.leave(); await enterSpace(key, name, next); }
function leaveToMap() {
  if (app.busy) return;
  closeAllModals(); beads.close(); sound.stopSong();
  try { net.leave(); } catch (e) {}
  fade(true).then(() => { hideLoading(); showMap(); });
}
function disposeWorld() {
  for (const [sid, p] of app.peers) { p.char.dispose(); labels.remove(sid); }
  app.peers.clear();
  app.npcs.forEach(n => { n.char.dispose(); labels.remove(n.id); }); app.npcs = [];
  if (app.me) { app.me.char.dispose(); labels.remove(SID); app.me = null; }
  if (app.world) { const env = app.world.scene.environment; app.world.scene.environment = null; disposeObject(app.world.scene); app.world.scene.environment = env; app.world = null; }
  labels.clear(); app.billboards = [];
  if (renderer) renderer.renderLists.dispose();
}
function collectBillboards() { app.billboards = []; app.world.scene.traverse(o => { if (o.userData.billboard) app.billboards.push(o); }); }

/* ---------------- 공개 상태 ---------------- */
function publicState() {
  const m = app.me;
  return { name: m.name, look: m.look, acc: m.acc, x: +m.x.toFixed(2), z: +m.z.toFixed(2), ry: +m.ry.toFixed(2), path: m.path ? m.path.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)]) : null, seat: m.seat >= 0 ? m.seat : m.pendingSeat, act: m.act };
}
function publish() { if (app.me && app.mode === 'interior') net.setState(publicState()); }

/* ---------------- 이동 ---------------- */
function walkTo(dest, onArrive) {
  const me = app.me, w = app.world; if (!me || !w) return false;
  const path = w.nav.path([me.x, me.z], dest);
  if (!path || path.length < 1) { toast('그쪽으로는 갈 수 없어요.'); return false; }
  me.path = path.slice(1).length ? path.slice(1) : [dest];
  me.onArrive = onArrive || null;
  me.act = 'walk'; me.char.walking = true; me.char.setLower('stand'); me.char.setUpper(null);
  publish(); renderActions();
  return true;
}
function stepAlong(ent, dt, speed = CHARACTER.walkSpeed) {
  if (!ent.path || !ent.path.length) return false;
  const [tx, tz] = ent.path[0]; const dx = tx - ent.x, dz = tz - ent.z, dist = Math.hypot(dx, dz); const step = speed * dt;
  if (dist > 0.001) ent.ry = lerpAngle(ent.ry, Math.atan2(dx, dz), Math.min(1, dt * 10));
  if (dist <= step) { ent.x = tx; ent.z = tz; ent.path.shift(); if (!ent.path.length) { ent.path = null; return true; } }
  else { ent.x += dx / dist * step; ent.z += dz / dist * step; }
  return false;
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
function cancelWalk() {
  const me = app.me; if (!me) return;
  me.path = null; me.onArrive = null; me.char.walking = false; me.act = 'stand';
  if (me.pendingSeat >= 0) { net.releaseSeat(me.pendingSeat); me.pendingSeat = -1; }
  publish(); renderActions();
}

/* ---------------- 좌석 ---------------- */
function seatOwner(idx) { return net.seatOwner ? net.seatOwner(idx) : null; }
function seatById(idx) { return app.world?.seats?.find(s => s.idx === idx); }
function trySit(idx) {
  const me = app.me, s = seatById(idx); if (!me || !s) return;
  const owner = seatOwner(idx);
  if (owner && owner !== SID) { toast(TEXT.taken); highlightSeats(true); return; }
  if (me.seat >= 0) standUp(true);
  if (me.pendingSeat >= 0 && me.pendingSeat !== idx) net.releaseSeat(me.pendingSeat);
  me.pendingSeat = idx; net.claimSeat(idx);
  vacateNpc(idx);
  walkTo(s.approach, () => { if (me.pendingSeat === idx) sitDown(s); });
}
function lowerFor(s) { return s.type === 'cushion' ? 'cushion' : s.type === 'bench' ? 'bench' : s.type === 'stool' ? 'stool' : s.type === 'sofa' ? 'sofa' : 'chair'; }
// 3D 매장 안 '예약석' 팻말: 지금부터 90분 안에 예약된 테이블
async function refreshTableTags() {
  const w = app.world; if (!w || !w.props?.tables || !isStore(app.space)) return;
  const d = new Date(); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const nowM = d.getHours() * 60 + d.getMinutes();
  let list = {}; try { list = await withTimeout(net.resvList(app.space, date), 8000); } catch (e) { return; }
  if (app.world !== w) return;
  const busy = new Set(Object.values(list).filter(r => { const [h, mm] = r.time.split(':').map(Number); const t = h * 60 + mm; return t - nowM < 90 && nowM - t < 90; }).map(r => r.table));
  w.props.tables.forEach(t => { t.tag.visible = busy.has(t.id); });
}
function sitDown(s) {
  const me = app.me;
  me.pendingSeat = -1; me.seat = s.idx; me.x = s.x; me.z = s.z; me.ry = s.ry;
  me.char.walking = false;
  me.char.setLower(lowerFor(s)); me.char.setUpper(null);
  me.act = 'sit';
  if (s.zone === 'main') app.view.yawTarget = 0; // 앉으면 정면(불단·강단·제대)을 보도록
  publish(); renderActions(); highlightSeats(false);
}
function standUp(silent) {
  const me = app.me; if (!me || me.seat < 0) return;
  const s = seatById(me.seat); net.releaseSeat(me.seat);
  me.seat = -1; me.act = 'stand'; me.char.bow = null; me.char.setUpper(null); me.char.setLower('stand');
  if (beads && !$('#beads').hidden) beads.close();
  if (s) { me.x = s.approach[0]; me.z = s.approach[1]; }
  if (!silent) { publish(); renderActions(); }
}
function onSeatLost(idx) {
  const me = app.me; if (!me) return;
  if (me.pendingSeat === idx) { me.pendingSeat = -1; me.path = null; me.onArrive = null; me.char.walking = false; me.act = 'stand'; toast(TEXT.taken); highlightSeats(true); publish(); renderActions(); }
  else if (me.seat === idx) { me.seat = -1; standUp(); toast(TEXT.taken); highlightSeats(true); }
}
function onSeat(idx) { refreshSeatRings(); if (idx !== undefined) vacateNpc(idx); }
let seatHi = 0;
function highlightSeats(on) { seatHi = on ? 4 : 0; refreshSeatRings(); }
function refreshSeatRings() {
  const w = app.world; if (!w || !w.seats) return;
  const standing = app.me && app.me.seat < 0;
  for (const s of w.seats) {
    const owner = seatOwner(s.idx);
    const free = !owner;
    s.ring.material.opacity = standing && free && app.me?.pendingSeat !== s.idx ? (seatHi > 0 ? 0.95 : 0.5) : 0;
  }
}

/* ---------------- 행동 ---------------- */
function inAnnex() { const me = app.me, r = app.world?.annexRect; if (!me || !r) return false; return me.x >= r[0] && me.x <= r[2] && me.z >= r[1] && me.z <= r[3]; }
function doAction(a) {
  const me = app.me; if (!me || app.locked) return;
  switch (a) {
    case 'palms': me.act = me.act === 'palms' ? 'sit' : 'palms'; me.char.setUpper(me.act === 'palms' ? 'palms' : null); if (me.act === 'palms') Points.add(1, '합장'); break;
    case 'bow':
      if (me.char.bowing) return;
      me.act = 'bow'; me.char.setUpper(null);
      me.char.startBow(() => { if (me.act === 'bow') { me.act = 'sit'; me.bowedOnce = true; Points.add(3, '절'); publish(); renderActions(); } });
      break;
    case 'pray': me.act = me.act === 'pray' ? 'sit' : 'pray'; me.char.setUpper(me.act === 'pray' ? 'pray' : null); if (me.act === 'pray') Points.add(2, '기도'); break;
    case 'beads':
      if (me.act === 'beads') { me.act = 'sit'; me.char.setUpper(null); beads.close(); }
      else { me.act = 'beads'; me.char.setUpper('beads'); beads.open(+(ss.get('mdl_beads') || 0)); }
      break;
    case 'drink': {
      if (me.act === 'drink') return;
      const ax = ANNEX[app.space]; const sec = ax?.drinkSec || (app.space === 'restaurant' ? 4 : 3);
      me.act = 'drink'; me.char.setUpper('drink');
      clearTimeout(me.drinkTimer);
      me.drinkTimer = setTimeout(() => { if (me.act === 'drink') { me.act = 'sit'; me.char.setUpper(null); me.char.smile(2); publish(); renderActions(); } }, sec * 1000);
      break;
    }
    case 'stand': standUp(); return;
    case 'cancel': cancelWalk(); return;
    case 'candles': { const c = app.world.candles; if (c) walkTo(c.access, () => { me.act = 'stand'; me.ry = Math.PI / 2; publish(); renderActions(); toast('빈 초를 눌러 촛불을 켜세요.'); }); return; }
    case 'bible': goFeature('lectern', () => openBibleModal()); return;
    case 'hymn': goFeature('hymn', () => openHymns()); return;
    case 'shop': goFeature('shop', () => openShop()); return;
    case 'resv': openModal('resv'); reserve.open(app.space); return;
    case 'mine': openModal('resv'); reserve.open(app.space, { tab: 'mine' }); return;
  }
  publish(); renderActions();
}
function goFeature(prop, fn) {
  const me = app.me; const o = app.world?.props?.[prop];
  if (!o || !o.userData.approach) { fn(); return; }
  if (me.seat >= 0) standUp(true);
  const ap = o.userData.approach;
  if (Math.hypot(me.x - ap[0], me.z - ap[1]) < 0.5) fn(); else walkTo(ap, () => { me.act = 'stand'; const p = o.getWorldPosition(new THREE.Vector3()); me.ry = Math.atan2(p.x - me.x, p.z - me.z); publish(); renderActions(); fn(); });
}
function renderActions() {
  const me = app.me, hint = $('#ab-hint'), box = $('#ab-btns');
  box.innerHTML = ''; hint.textContent = '';
  if (!me || app.mode !== 'interior') return;
  const B = (label, a, cls = '') => { const b = document.createElement('button'); b.className = 'act ' + cls; b.textContent = label; b.onclick = () => doAction(a); box.appendChild(b); return b; };
  const seat = seatById(me.seat);
  if (me.act === 'walk') { hint.textContent = '이동 중이에요.'; B('이동 취소', 'cancel', 'sub'); return; }
  if (isStore(app.space)) {
    if (me.seat < 0) { hint.textContent = '둘러보고 마음에 드는 테이블을 누르면 그 자리로 예약할 수 있어요.'; B('자리 예약', 'resv'); B('메뉴·미리 주문', 'resv'); B('내 예약', 'mine', 'sub'); return; }
    const lbl = app.space === 'cafe' ? '커피 마시기' : '식사하기';
    B(me.act === 'drink' ? (app.space === 'cafe' ? '마시는 중…' : '식사 중…') : lbl, 'drink', me.act === 'drink' ? 'on' : '').disabled = me.act === 'drink';
    B('이 자리 예약', 'resv'); B('일어나기', 'stand', 'sub'); return;
  }
  if (me.seat < 0) {
    const hints = { temple: '빈 방석을 눌러 앉으세요. 화면을 끌면 둘러볼 수 있어요.', church: '빈 의자를 눌러 앉으세요. 말씀대·찬송대·서점도 눌러 보세요.', cathedral: '장의자에 앉거나 봉헌초를 켜 보세요.', playground: '기계·랜덤박스·12지신 석상을 눌러 보세요.' };
    hint.textContent = hints[app.space] || '';
    if (app.space === 'cathedral') B('봉헌초로 가기', 'candles');
    if (app.space === 'church' || app.space === 'cathedral') { B('성경 말씀', 'bible'); B(app.space === 'church' ? '찬송 듣기' : '성가 듣기', 'hymn'); }
    if (app.world.props?.shop) B(app.space === 'temple' ? '불교용품' : app.space === 'church' ? '서점' : '성물방', 'shop', 'sub');
    return;
  }
  if (seat && seat.zone === 'annex') {
    const ax = ANNEX[app.space];
    B(me.act === 'drink' ? (ax.action === 'tea' ? '차 마시는 중…' : '커피 마시는 중…') : ax.actionLabel, 'drink', me.act === 'drink' ? 'on' : '').disabled = me.act === 'drink';
    B('일어나기', 'stand', 'sub'); return;
  }
  if (seat && seat.zone === 'rest') { hint.textContent = '잠시 쉬어가세요.'; B('일어나기', 'stand', 'sub'); return; }
  if (app.space === 'temple') {
    if (me.act === 'bow') { B('절하는 중…', 'bow', 'on').disabled = true; B('일어나기', 'stand', 'sub'); return; }
    B(me.act === 'palms' ? '합장 마치기' : '합장', 'palms', me.act === 'palms' ? 'on' : '');
    B(me.bowedOnce ? '한 번 더 절하기' : '절하기', 'bow');
    B(me.act === 'beads' ? '염주 내려놓기' : '염주 돌리기', 'beads', me.act === 'beads' ? 'on' : '');
    B('일어나기', 'stand', 'sub'); return;
  }
  B(me.act === 'pray' ? '기도 마치기' : '기도하기', 'pray', me.act === 'pray' ? 'on' : '');
  B('성경 말씀', 'bible');
  B('일어나기', 'stand', 'sub');
}

/* ---------------- 촛불 ---------------- */
async function tryCandle(idx) {
  const me = app.me, c = app.world?.candles; if (!me || !c) return;
  const near = Math.hypot(me.x - c.access[0], me.z - c.access[1]) < 1.2;
  if (net.candles?.get(idx) && net.candles.get(idx).exp > Date.now()) { toast('이미 켜진 초예요. 빈 초를 골라 주세요.'); return; }
  const light = async () => {
    if (me.lightingCandle) return; me.lightingCandle = true;
    me.act = 'candle'; me.char.setUpper('use'); me.ry = Math.PI / 2; publish();
    const r = await net.lightCandle(idx, me.name, SPACES.cathedral.candles.ttlMin);
    me.lightingCandle = false;
    setTimeout(() => { if (me.act === 'candle') { me.act = 'stand'; me.char.setUpper(null); publish(); renderActions(); } }, 1200);
    if (r.ok) { toast('촛불을 켰어요. 10분 동안 밝혀져요.'); sound.ui('candle'); Points.add(3, '봉헌초'); me.char.smile(2); onCandle(idx, net.candles?.get(idx) || { exp: Date.now() + 600000 }); }
    else toast('다른 분이 먼저 켜셨어요. 다른 초를 골라 주세요.');
  };
  if (me.seat >= 0) standUp(true);
  if (near) light(); else walkTo(c.access, light);
}
function onCandle(idx, data) { const c = app.world?.candles; if (!c) return; const s = c.slots[idx]; if (s) s.flame.visible = !!(data && data.exp > Date.now()); }

/* ---------------- 기계·12지신·말씀대·샵 ---------------- */
function useObject(obj) {
  const me = app.me; const ud = obj.userData;
  const open = () => {
    if (ud.zodiac) { me.act = 'stand'; openZodiac(ud.zodiac); publish(); renderActions(); return; }
    if (ud.feature === 'bible') return openBibleModal();
    if (ud.feature === 'hymn') return openHymns();
    if (ud.feature === 'shop') return openShop();
    const info = ud.machine; if (!info) return;
    me.act = 'machine'; me.char.setUpper('use'); me.machine = info.id;
    if (ud.face !== undefined) me.ry = ud.face + Math.PI;
    publish();
    if (info.type === 'gacha') openGacha(obj); else openProgram(info.prog);
  };
  if (!ud.approach) { open(); return; }
  if (me.seat >= 0) standUp(true);
  const ap = ud.approach;
  if (Math.hypot(me.x - ap[0], me.z - ap[1]) < 0.45) open(); else walkTo(ap, () => { me.act = 'stand'; const p = obj.getWorldPosition(new THREE.Vector3()); me.ry = Math.atan2(p.x - me.x, p.z - me.z); renderActions(); open(); });
}
function endMachine() { const me = app.me; if (!me || me.act !== 'machine') return; me.act = 'stand'; me.char.setUpper(null); me.machine = null; publish(); renderActions(); }
function openProgram(prog) {
  const p = PROGRAMS[prog]; const url = DEMO_URL + encodeURIComponent(prog);
  $('#prog-title').textContent = p ? `${p.name} · ${p.sub}` : prog;
  $('#prog-newtab').href = url;
  const f = $('#prog-frame'); $('#prog-loading').hidden = false;
  f.onload = () => { $('#prog-loading').hidden = true; };
  f.src = url; openModal('program');
}
// 영상 스크린: 유튜브 링크를 넣으면 재생 (브랜드 설정 BRAND.videos 또는 이 기기에서 붙여넣기)
const VIDEO_TITLE = { church: '예배·설교 영상', cathedral: '미사 영상', cafe: '카페 영상', restaurant: '식당 영상', drivein: '자동차 극장 · 광고' };
const VIDEO_SEARCH = { church: '주일예배 설교', cathedral: '매일미사', cafe: '카페 브이로그', restaurant: '한식당', drivein: '광고' };
function ytId(s) { s = (s || '').trim(); const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : /^[\w-]{11}$/.test(s) ? s : ''; }
function openVideo(kind) {
  const key = 'mdl_video_' + (BRAND.short || '') + '_' + kind;
  const id = ytId(ls.get(key) || (BRAND.videos || {})[kind] || VIDEOS[kind] || '');
  $('#vd-title').textContent = VIDEO_TITLE[kind] || '영상';
  const frame = $('#vd-frame'), empty = $('#vd-empty');
  if (id) { frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`; frame.hidden = false; empty.hidden = true; }
  else { frame.src = 'about:blank'; frame.hidden = true; empty.hidden = false; }
  $('#vd-search').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(VIDEO_SEARCH[kind] || '');
  $('#vd-save').onclick = () => { const v = ytId($('#vd-url').value); if (!v) { toast('유튜브 영상 링크를 붙여넣어 주세요.'); return; } ls.set(key, v); openVideo(kind); if (kind === 'drivein') setupDriveInVideo(); };
  $('#vd-url').value = '';
  $('#vd-reset').hidden = !ls.get(key); $('#vd-reset').onclick = () => { ls.set(key, ''); openVideo(kind); if (kind === 'drivein') setupDriveInVideo(); };
  openModal('video');
}
// 지도 자동차 극장: 유튜브 링크가 있으면 접속하자마자 스크린에서 바로(소리 끔) 재생
let driveCss = null;
function setupDriveInVideo() {
  const id = ytId(ls.get('mdl_video_' + (BRAND.short || '') + '_drivein') || (BRAND.videos || {}).drivein || VIDEOS.drivein || '');
  if (driveCss) { driveCss.r.domElement.remove(); driveCss = null; }
  if (!id || !DRIVE_IN.mesh || settings.low) return;
  const r = new CSS3DRenderer(); r.setSize(innerWidth, innerHeight);
  Object.assign(r.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '1' });
  document.body.insertBefore(r.domElement, $('#labels'));
  const div = document.createElement('div'); div.style.width = '1900px'; div.style.height = '1040px'; div.style.background = '#000'; div.style.pointerEvents = 'none';
  const f = document.createElement('iframe'); f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0&modestbranding=1`;
  f.allow = 'autoplay; encrypted-media'; Object.assign(f.style, { width: '100%', height: '100%', border: '0', pointerEvents: 'none' }); div.appendChild(f);
  const o = new CSS3DObject(div); DRIVE_IN.mesh.updateWorldMatrix(true, false); DRIVE_IN.mesh.matrixWorld.decompose(o.position, o.quaternion, new THREE.Vector3()); o.scale.setScalar(0.01);
  const scene = new THREE.Scene(); scene.add(o);
  driveCss = { r, scene };
  addEventListener('resize', () => r.setSize(innerWidth, innerHeight));
}
function openBibleModal() { openModal('bible'); openBible().catch(e => { console.error(e); $('#bb-out').innerHTML = '<p class="muted">말씀을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>'; }); if (app.me) { app.me.char.setUpper('read'); app.me.act = app.me.seat >= 0 ? 'sit' : 'stand'; } }
function openHymns() {
  const list = $('#hymn-list'); list.innerHTML = '';
  const inst = app.space === 'cathedral' ? 'organ' : 'celesta';
  SONG_LIST.filter(s => s.space.includes(app.space)).forEach(s => {
    const b = document.createElement('button'); b.className = 'hymn-item';
    b.innerHTML = `<span class="play">▶</span><span class="t"><b>${s.title}</b><small>${s.no} · ${s.year}</small></span>`;
    b.onclick = async () => {
      list.querySelectorAll('.hymn-item').forEach(x => x.classList.remove('on')); b.classList.add('on');
      $('#hymn-now').textContent = `♪ ${s.title} 연주 중`;
      await sound.playSong(s.key, inst, () => { b.classList.remove('on'); $('#hymn-now').textContent = ''; });
      syncSoundUI();
    };
    list.appendChild(b);
  });
  $('#hymn-stop').onclick = () => { sound.stopSong(); list.querySelectorAll('.hymn-item').forEach(x => x.classList.remove('on')); $('#hymn-now').textContent = ''; };
  openModal('hymn');
}
function openZodiac(id) {
  const z = ZODIAC.find(x => x.id === id); const w = todayWord(id);
  $('#zd-img').src = `assets/tex/zodiac/${id}.webp`; $('#zd-name').textContent = `${z.ko}띠 · ${z.ji}`;
  const ys = []; const yNow = new Date().getFullYear(); for (let y = yNow; y >= 1930; y--) if (zodiacOfYear(y).id === id) ys.push(y);
  $('#zd-years').textContent = ys.slice(0, 8).join(' · ') + ' …년생';
  $('#zd-trait').textContent = z.trait;
  $('#zd-word').innerHTML = `<b>오늘의 한마디</b> ${w.word}<br><span class="muted small">행운의 방향 ${w.lucky} · 색 ${w.color} · 숫자 ${w.num}</span>`;
  $('#zd-more').onclick = () => { closeModal('zodiac'); openProgram('unse'); };
  openModal('zodiac'); Points.add(1, '12지신');
}
function findMyZodiac() { const y = +$('#zd-year').value; if (y > 1900 && y < 2100) openZodiac(zodiacOfYear(y).id); }

/* ---------------- 샵 ---------------- */
function openShop() {
  const items = CATALOG[app.space] || []; const grid = $('#shop-grid'); grid.innerHTML = '';
  $('#shop-title').textContent = { temple: '불교용품', church: '기독교 서점', cathedral: '성물방' }[app.space] || '샵';
  $('#shop-pts').textContent = Points.get();
  const wear = Wear.get();
  for (const it of items) {
    const owned = Owned.has(it.id); const nm = itemName(it);
    const worn = it.type === 'outfit' ? (app.space === 'temple' ? (wear.outfitTemple || 'monk') : wear.outfit) === it.ref : wear.hand === it.ref;
    const card = document.createElement('div'); card.className = 'shop-item' + (worn ? ' on' : '');
    const sw = it.type === 'outfit' ? `<span class="sw" style="background:linear-gradient(135deg,${OUTFITS[it.ref].top} 0 55%,${OUTFITS[it.ref].accent} 55% 70%,${OUTFITS[it.ref].bottom} 70%)"></span>` : `<span class="sw ico">${HAND_ICON[it.ref] || '✦'}</span>`;
    card.innerHTML = `${sw}<b>${nm}</b><small>${it.type === 'outfit' ? '복장' : '손에 드는 용품'}</small>`;
    const btn = document.createElement('button'); btn.className = 'btn small-btn ' + (owned ? '' : 'primary');
    btn.textContent = owned ? (worn ? '착용 중' : '착용하기') : (it.price ? `공덕 ${it.price}` : '받기');
    btn.disabled = owned && worn;
    btn.onclick = () => {
      if (!owned) { if (it.price && !Points.spend(it.price)) { toast(`공덕이 ${it.price - Points.get()} 부족해요. 머물고 기도하면 쌓여요.`); return; } Owned.add(it.id); toast(`${nm}을(를) 샀어요.`); }
      if (it.type === 'outfit') Wear.set(app.space === 'temple' ? { outfitTemple: it.ref } : { outfit: it.ref }); else Wear.set({ hand: wear.hand === it.ref && owned ? '' : it.ref });
      applyWear(); openShop();
    };
    card.appendChild(btn); grid.appendChild(card);
  }
  $('#shop-note').textContent = PAYMENT.enabled ? '' : '지금은 공덕 포인트로 체험할 수 있어요. 공간에 머물기(30초 +1)·기도·절·염주·촛불로 쌓여요. 실제 결제는 추후 연결 예정입니다.';
  openModal('shop');
}
const HAND_ICON = { beads: '📿', moktak: '🪵', rosary: '📿', bible: '📖', hymnal: '📕', candle: '🕯', lantern: '🏮', lotus: '🪷' };
function applyWear() {
  const me = app.me; if (!me) return; const w = Wear.get();
  const look = lookFromSid(SID, app.space, { outfit: w.outfit, outfitTemple: w.outfitTemple, hand: w.hand });
  if (look.outfit !== me.look.outfit) { me.char.rebuild(look); me.char.setAccessory(me.acc, { calm: app.space !== 'playground' }); labels.bind(SID, me.char.root, 1.72); }
  me.char.setHand(look.hand); me.look = look; me.char.smile(1.5); publish();
}

/* ---------------- 랜덤박스 ---------------- */
let gachaMachine = null, gachaCool = 0, gachaRolling = false;
function inventory() { try { return JSON.parse(ls.get('mdl_inv') || '[]'); } catch (e) { return []; } }
function openGacha(obj) {
  gachaMachine = obj;
  $('#gacha-result').hidden = true; $('#capsule').className = 'capsule'; $('#capsule').style.display = '';
  $('#gacha-odds').textContent = GACHA.tiers.map(t => `${t.name} ${Math.round(t.p * 100)}%`).join(' · ') + ' — 등급 안에서 3종 중 하나';
  $('#gacha-draw').textContent = '뽑기'; $('#gacha-draw').disabled = false;
  openModal('gacha');
}
function drawGacha() {
  if (gachaRolling || Date.now() < gachaCool) return;
  gachaRolling = true; $('#gacha-draw').disabled = true;
  let r = Math.random(), tier = GACHA.tiers[0];
  for (const t of GACHA.tiers) { if (r < t.p) { tier = t; break; } r -= t.p; }
  const pool = GACHA.items.filter(i => i.tier === tier.key); const item = pool[Math.floor(Math.random() * pool.length)];
  const cap = $('#capsule'); $('#gacha-result').hidden = true; cap.style.display = ''; cap.className = 'capsule shake';
  if (gachaMachine) gachaMachine.userData.spin = GACHA.animSec;
  net.emitEvent({ type: 'gacha', machine: gachaMachine?.userData.machine?.id, tier: tier.key });
  sound.ui('gacha');
  setTimeout(() => {
    cap.className = 'capsule open';
    const inv = inventory(); const dup = inv.includes(item.id);
    if (!dup) { inv.push(item.id); ls.set('mdl_inv', JSON.stringify(inv)); }
    const res = $('#gacha-result');
    res.innerHTML = `<span class="tier" style="background:${tier.color}">${tier.name}</span><div class="sw" style="background:linear-gradient(135deg,${item.c[0]},${item.c[1] || item.c[0]})"></div><div class="nm">${item.name}</div>${dup ? '<div class="dup">이미 가지고 있어요</div>' : ''}`;
    const wear = document.createElement('button'); wear.className = 'btn primary'; wear.textContent = '착용하기'; wear.onclick = () => { equip(item.id); closeModal('gacha'); };
    const keep = document.createElement('button'); keep.className = 'btn'; keep.textContent = '보관하기'; keep.onclick = () => toast('내 소품에 보관했어요.');
    const row = document.createElement('div'); row.className = 'row'; row.style.justifyContent = 'center'; row.append(wear, keep); res.appendChild(row);
    setTimeout(() => { cap.style.display = 'none'; res.hidden = false; }, settings.reduce ? 0 : 350);
    gachaRolling = false; gachaCool = Date.now() + GACHA.cooldownSec * 1000;
    $('#gacha-draw').textContent = '한 번 더 뽑기';
    setTimeout(() => { $('#gacha-draw').disabled = false; }, GACHA.cooldownSec * 1000);
    if (app.me) app.me.char.smile(2.5);
  }, GACHA.animSec * 1000);
}
function equip(id) {
  ls.set('mdl_acc', id || '');
  if (app.me) { app.me.acc = id || ''; app.me.char.setAccessory(app.me.acc, { calm: app.space !== 'playground' }); publish(); }
  toast(id ? `${GACHA.items.find(i => i.id === id)?.name}을(를) 착용했어요.` : '소품을 벗었어요.');
  renderAcc();
}
function renderAcc() {
  const inv = inventory(), cur = ls.get('mdl_acc') || '', grid = $('#acc-grid'); grid.innerHTML = '';
  const none = document.createElement('button'); none.className = 'acc-item' + (cur ? '' : ' on'); none.innerHTML = '<span class="dot" style="background:#ddd"></span>착용 안 함'; none.onclick = () => equip(''); grid.appendChild(none);
  for (const it of GACHA.items) {
    const has = inv.includes(it.id); const tier = GACHA.tiers.find(t => t.key === it.tier);
    const b = document.createElement('button'); b.className = 'acc-item' + (has ? '' : ' locked') + (cur === it.id ? ' on' : '');
    b.innerHTML = `<span class="dot" style="background:linear-gradient(135deg,${it.c[0]},${it.c[1] || it.c[0]})"></span>${has ? it.name : '???'}<span class="tiny" style="color:${tier.color}">${tier.name}</span>`;
    if (has) b.onclick = () => equip(it.id);
    grid.appendChild(b);
  }
}

/* ---------------- 다른 접속자 ---------------- */
const SITTING = ['sit', 'pray', 'palms', 'bow', 'drink', 'beads'];
function onPeer(sid, st) {
  if (!app.world || app.mode !== 'interior') return;
  let p = app.peers.get(sid);
  if (!st) { if (p) { p.char.dispose(); labels.remove(sid); app.peers.delete(sid); } updatePeopleCount(); refreshSeatRings(); return; }
  if (!p) {
    const look = st.look && st.look.skin ? st.look : lookFromSid(sid, app.space);
    const ch = new Character(look, { reducedMotion: settings.reduce });
    p = { sid, char: ch, x: st.x, z: st.z, ry: st.ry || 0, path: null, seq: -1, act: 'stand', look };
    ch.root.position.set(st.x, 0, st.z); app.world.scene.add(ch.root);
    labels.add(sid, st.name || '손님'); labels.bind(sid, ch.root, 1.72);
    app.peers.set(sid, p);
  }
  const newSeq = (st.seq || 0) !== p.seq; p.seq = st.seq || 0;
  labels.setText(sid, st.name || '손님');
  if (st.look && st.look.outfit && st.look.outfit !== p.look.outfit) { p.char.rebuild(st.look); labels.bind(sid, p.char.root, 1.72); }
  if (st.look) { p.look = st.look; p.char.setHand(st.look.hand || ''); }
  p.char.setAccessory(st.acc || '', { calm: app.space !== 'playground' });
  const b = app.world.bounds; const inside = (x, z) => x >= b[0] - 0.5 && x <= b[2] + 0.5 && z >= b[1] - 0.5 && z <= b[3] + 1;
  if (st.act === 'walk' && st.path && newSeq) {
    p.path = st.path.filter(q => inside(q[0], q[1])); p.char.walking = true;
    if (Math.hypot(p.x - st.x, p.z - st.z) > 4) { p.x = st.x; p.z = st.z; }
  } else if (st.act !== 'walk') {
    p.path = null; p.char.walking = false;
    const seat = st.seat >= 0 && st.act !== 'stand' ? seatById(st.seat) : null;
    const sitting = seat && SITTING.includes(st.act);
    if (sitting) { p.x = seat.x; p.z = seat.z; p.ry = seat.ry; }
    else if (inside(st.x, st.z)) { if (Math.hypot(p.x - st.x, p.z - st.z) > 0.05) { p.path = [[st.x, st.z]]; p.char.walking = Math.hypot(p.x - st.x, p.z - st.z) > 0.3; p.endRy = st.ry; } else p.ry = st.ry; }
    p.char.setLower(sitting ? lowerFor(seat) : 'stand');
    const up = { pray: 'pray', palms: 'palms', drink: 'drink', machine: 'use', candle: 'use', beads: 'beads' }[st.act] || null;
    if (st.act === 'bow' && p.act !== 'bow' && !p.char.bowing) p.char.startBow();
    if (st.act !== 'bow') p.char.setUpper(up);
  }
  p.act = st.act;
  updatePeopleCount(); refreshSeatRings();
}
function onEvent(ev) {
  if (ev.type === 'gacha' && app.world?.machines) {
    const m = app.world.machines.find(o => o.userData.machine?.id === ev.machine);
    if (m) m.userData.spin = GACHA.animSec;
    if (app.peers.get(ev.sid) && ev.tier && ev.tier !== 'common') { const t = GACHA.tiers.find(x => x.key === ev.tier); toast(`누군가 랜덤박스에서 ${t?.name || ''} 소품을 뽑았어요!`); }
  }
}
function updatePeopleCount() { $('#people-n').textContent = String(1 + app.peers.size); }

/* ---------------- 체험용 방문객 (실제 접속자 아님 · 인원에 포함하지 않음) ---------------- */
function spawnNpcs() {
  app.npcs.forEach(n => { n.char.dispose(); labels.remove(n.id); }); app.npcs = [];
  if (!settings.npc || !app.world) return;
  const key = app.space; const want = { temple: 7, church: 5, cathedral: 5, playground: 6 }[key] || 0;
  const free = app.world.seats.filter(s => s.zone !== 'rest' || key === 'playground');
  const used = new Set();
  for (let i = 0; i < want; i++) {
    const cand = free.filter(s => !used.has(s.idx) && !seatOwner(s.idx)); if (!cand.length) break;
    const s = cand[Math.floor(Math.random() * cand.length)]; used.add(s.idx);
    const id = 'npc' + i; const look = lookFromSid('npc-' + key + i, key);
    const ch = new Character(look, { reducedMotion: settings.reduce });
    const n = { id, char: ch, seat: s.idx, x: s.x, z: s.z, ry: s.ry, t: Math.random() * 8, act: 'sit' };
    ch.setLower(lowerFor(s));
    ch.root.position.set(s.x, 0, s.z); ch.root.rotation.y = s.ry; app.world.scene.add(ch.root);
    labels.add(id, NAME_ADJ[(i * 5 + 3) % 12] + ' ' + NAME_NOUN[(i * 7 + 2) % 12] + ' · 체험', 'npc'); labels.bind(id, ch.root, 1.72);
    app.npcs.push(n);
  }
}
function vacateNpc(idx) {
  const n = app.npcs.find(x => x.seat === idx); if (!n) return;
  const cand = app.world.seats.filter(s => !seatOwner(s.idx) && !app.npcs.some(o => o.seat === s.idx) && s.idx !== app.me?.pendingSeat && s.idx !== app.me?.seat);
  if (!cand.length) { n.char.dispose(); labels.remove(n.id); app.npcs = app.npcs.filter(x => x !== n); return; }
  const s = cand[Math.floor(Math.random() * cand.length)]; n.seat = s.idx; n.x = s.x; n.z = s.z; n.ry = s.ry; n.char.bow = null;
  n.char.setLower(lowerFor(s));
}
function updateNpcs(dt, t) {
  for (const n of app.npcs) {
    n.t -= dt;
    if (n.t < 0) {
      n.t = 6 + Math.random() * 10; const s = seatById(n.seat);
      if (s && (s.zone === 'annex' || s.zone === 'dine')) n.char.setUpper(n.char.upper === 'drink' ? null : 'drink');
      else if (app.space === 'temple') { const r = Math.random(); if (r < 0.3 && !n.char.bowing) n.char.startBow(); else n.char.setUpper(r < 0.65 ? 'palms' : r < 0.8 ? 'beads' : null); }
      else if (app.space === 'church' || app.space === 'cathedral') n.char.setUpper(Math.random() < 0.6 ? 'pray' : null);
    }
    n.char.root.position.set(n.x, 0, n.z); n.char.root.rotation.y = n.ry; n.char.update(dt, t);
  }
}

/* ---------------- 연결 상태 ---------------- */
function onStatus(s) {
  if (app.mode !== 'interior') return;
  const band = $('#conn-band');
  if (s === 'connected') { band.hidden = true; setLocked(false); publish(); return; }
  if (s === 'reconnecting') { band.hidden = false; $('#conn-text').textContent = TEXT.reconnecting; $('#conn-actions').hidden = true; setLocked(true); return; }
  if (s === 'failed') { band.hidden = false; $('#conn-text').textContent = TEXT.failed; $('#conn-actions').hidden = false; setLocked(true); }
}
function setLocked(on) { app.locked = on; document.body.classList.toggle('locked', on); if (on && app.me) { app.me.path = null; app.me.char.walking = false; } }

/* ---------------- 입력: 탭(이동·선택) / 끌기(둘러보기) / 휠·핀치(확대) ---------------- */
const ptrs = new Map(); let gesture = null;
function onPointerDown(e) {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) gesture = { x0: e.clientX, y0: e.clientY, moved: false, yaw: app.view.yaw, pitch: app.view.pitch, px: mapPan.x, pz: mapPan.z };
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { pinch: Math.hypot(a.x - b.x, a.y - b.y), dist: app.view.dist, moved: true }; }
}
function onPointerMove(e) {
  if (!ptrs.has(e.pointerId)) { hover(e); return; }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!gesture) return;
  if (gesture.pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); app.view.dist = clamp(gesture.dist * gesture.pinch / d, 3.2, 13); return; }
  const dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
  if (Math.hypot(dx, dy) > 10) gesture.moved = true;
  if (gesture.moved && app.mode === 'map' && !app.focus && !camTween) { const k = 0.09; mapPan.x = clamp(gesture.px - dx * k, -42, 42); mapPan.z = clamp(gesture.pz - dy * k, -18, 14); app.mapUser = true; setCamTween(mapHome(), 0); return; }
  if (gesture.moved && app.mode === 'interior') { app.view.yaw = clamp(gesture.yaw - dx * 0.006, -1.3, 1.3); app.view.pitch = clamp(gesture.pitch + dy * 0.004, 0.12, 0.95); app.view.yawTarget = undefined; }
}
function onPointerUp(e) {
  const had = ptrs.has(e.pointerId); ptrs.delete(e.pointerId);
  if (!had || !gesture) return;
  if (!gesture.moved && ptrs.size === 0) handleTap(e.clientX, e.clientY);
  if (ptrs.size === 0) gesture = null;
}
function onWheel(e) { if (app.mode !== 'interior') return; e.preventDefault(); app.view.dist = clamp(app.view.dist * (1 + Math.sign(e.deltaY) * 0.08), 3.2, 13); }
function hover(e) {
  if (!app.world || e.pointerType !== 'mouse') return;
  const h = pick(e.clientX, e.clientY, app.world.clickables)[0];
  renderer.domElement.style.cursor = h ? 'pointer' : app.mode === 'interior' ? 'crosshair' : 'grab';
}
function pick(x, y, objects) { pointer.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); raycaster.setFromCamera(pointer, app.cam); return raycaster.intersectObjects(objects, true); }
function findUp(o, key) { while (o) { if (o.userData && o.userData[key] !== undefined) return o; o = o.parent; } return null; }
function handleTap(x, y) {
  if (!app.world || app.busy) return;
  if (app.mode === 'map') {
    const hit = pick(x, y, app.world.clickables)[0];
    if (hit && findUp(hit.object, 'screen')) { openVideo('drivein'); return; }
    if (hit) { const b = findUp(hit.object, 'space'); if (b) { if (app.focus === b.userData.space) askName(b.userData.space, 0); else focusSpot(b.userData.space); } }
    return;
  }
  if (app.locked || !app.me) return;
  if (app.me.char.bowing) { toast('절을 마친 뒤 움직일 수 있어요.'); return; }
  const w = app.world;
  const hits = pick(x, y, [...w.clickables, w.floorHit]);
  for (const h of hits) {
    const seatO = findUp(h.object, 'seatIdx'); if (seatO) { trySit(seatO.userData.seatIdx); return; }
    const cand = findUp(h.object, 'candleIdx'); if (cand) { tryCandle(cand.userData.candleIdx); return; }
    const scn = findUp(h.object, 'screen'); if (scn) { openVideo(scn.userData.screen); return; }
    const tb = findUp(h.object, 'tableId'); if (tb) { openModal('resv'); reserve.open(app.space, { table: tb.userData.tableId }); return; }
    const z = findUp(h.object, 'zodiac'); if (z) { useObject(z); return; }
    const f = findUp(h.object, 'feature'); if (f) { useObject(f); return; }
    const m = findUp(h.object, 'machine'); if (m) { useObject(m); return; }
    if (h.object.userData.floor) {
      const p = h.point;
      if (!w.nav.isWalkable(p.x, p.z)) {
        const near = w.nav.nearestFree(...w.nav.toCell(p.x, p.z)); if (!near) return;
        const [nx, nz] = w.nav.toWorld(...near); if (Math.hypot(nx - p.x, nz - p.z) > 1.2) { toast('그곳은 관람 영역이에요.'); return; }
      }
      if (app.me.seat >= 0) standUp(true);
      if (app.me.pendingSeat >= 0) { net.releaseSeat(app.me.pendingSeat); app.me.pendingSeat = -1; }
      walkTo([p.x, p.z]); w.marker.position.set(p.x, 0.02, p.z); w.marker.material.opacity = 0.9;
      return;
    }
  }
}
function onKey(e) {
  if (e.key === 'Escape') { const open = [...document.querySelectorAll('.modal:not([hidden])')].pop(); if (open) closeModal(open.id.replace('modal-', '')); else if (!$('#beads').hidden) doAction('beads'); else if (app.focus) unfocus(); return; }
  if (app.mode !== 'interior' || !app.me || app.locked || document.querySelector('.modal:not([hidden])') || !$('#beads').hidden) return;
  const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (!dir) return; e.preventDefault();
  if (app.me.seat >= 0 || app.me.char.bowing) return;
  const c = Math.cos(app.view.yaw), s = Math.sin(app.view.yaw);
  const dx = dir[0] * c + dir[1] * s, dz = -dir[0] * s + dir[1] * c;
  const tx = app.me.x + dx, tz = app.me.z + dz;
  if (app.world.nav.isWalkable(tx, tz)) walkTo([tx, tz]);
}

/* ---------------- UI 바인딩 ---------------- */
function bindUI() {
  const c = renderer.domElement;
  c.addEventListener('pointerdown', onPointerDown); c.addEventListener('pointermove', onPointerMove);
  c.addEventListener('pointerup', onPointerUp); c.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); gesture = null; });
  c.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKey);
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.open; if (k === 'acc') renderAcc(); if (k === 'sound') syncSoundUI(); openModal(k); }));
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id.replace('modal-', '')); });
    m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m.id.replace('modal-', ''))));
  });
  $('#name-ok').onclick = confirmName;
  $('#name-reroll').onclick = () => { $('#name-input').value = randomName(); $('#name-err').textContent = ''; };
  $('#name-input').addEventListener('keydown', e => { if (e.key === 'Enter') confirmName(); });
  $('#exit-btn').onclick = leaveToMap;
  $('#sc-back').onclick = unfocus;
  $('#load-home').onclick = () => { hideLoading(); try { net.leave(); } catch (e) {} app.busy = false; showMap(); };
  $('#load-retry').onclick = () => { hideLoading(); app.busy = false; if (lastEnter) enterSpace(lastEnter.key, lastEnter.name, lastEnter.roomHint); };
  $('#conn-retry').onclick = () => { $('#conn-text').textContent = TEXT.reconnecting; $('#conn-actions').hidden = true; net.retry(); };
  $('#conn-home').onclick = () => { $('#conn-band').hidden = true; setLocked(false); leaveToMap(); };
  $('#gacha-draw').onclick = drawGacha;
  $('#hint-ok').onclick = () => { $('#hint').hidden = true; };
  $('#bd-close').onclick = () => doAction('beads');
  $('#zd-find').onclick = findMyZodiac; $('#zd-year').addEventListener('keydown', e => { if (e.key === 'Enter') findMyZodiac(); });
  $('#snd-on').onchange = async e => { await sound.setOn(e.target.checked); if (app.space) sound.setSpace(SPACES[app.space].music); syncSoundUI(); };
  $('#snd-amb').oninput = e => sound.setVolumes(+e.target.value, sound.music);
  $('#snd-mus').oninput = e => sound.setVolumes(sound.amb, +e.target.value);
  $('#set-names').checked = settings.names; $('#set-reduce').checked = settings.reduce; $('#set-low').checked = settings.low; $('#set-npc').checked = settings.npc;
  $('#set-names').onchange = e => { settings.names = e.target.checked; labels.visibleOthers = settings.names; saveSettings(); };
  $('#set-reduce').onchange = e => { settings.reduce = e.target.checked; saveSettings(); applySettings(); };
  $('#set-npc').onchange = e => { settings.npc = e.target.checked; saveSettings(); if (app.mode === 'interior') spawnNpcs(); };
  $('#set-low').onchange = e => { settings.low = e.target.checked; saveSettings(); toast('저사양 모드는 다음 장면부터 적용돼요.'); renderer.shadowMap.enabled = !settings.low; renderer.setPixelRatio(settings.low ? 1 : Math.min(devicePixelRatio, isMobile ? 1.6 : 2)); onResize(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && sound.ctx) sound.ctx.suspend(); else if (sound.on && sound.ctx) sound.ctx.resume(); });
}
function saveSettings() { ls.set('mdl_settings', JSON.stringify(settings)); }
function applySettings() { document.body.classList.toggle('reduce', !!settings.reduce); if (app.me) app.me.char.reduced = settings.reduce; for (const [, p] of app.peers) p.char.reduced = settings.reduce; if (beads) beads.reduced = settings.reduce; }
function syncSoundUI() { $('#snd-on').checked = sound.on; $('#snd-amb').value = sound.amb; $('#snd-mus').value = sound.music; const ico = sound.on ? '🔊' : '🔇'; $('#snd-ico-g').textContent = ico; $('#snd-ico-r').textContent = ico; }

const openModals = new Set();
function openModal(k) { const m = $('#modal-' + k); if (!m) return; m.hidden = false; openModals.add(k); }
function closeModal(k) {
  const m = $('#modal-' + k); if (!m) return; m.hidden = true; openModals.delete(k);
  if (k === 'program') { $('#prog-frame').src = 'about:blank'; endMachine(); }
  if (k === 'video') { $('#vd-frame').src = 'about:blank'; }
  if (k === 'gacha') endMachine();
  if (k === 'sound') syncSoundUI();
  if (k === 'bible' && app.me) { app.me.char.setUpper(null); }
}
function closeAllModals() { [...openModals].forEach(closeModal); }
function showLoading(text, failed) { $('#loading').hidden = false; $('#load-text').textContent = text; $('#load-actions').hidden = !failed; $('#load-spin').hidden = !!failed; if (failed) $('#fade').classList.remove('on'); }
function hideLoading() { $('#loading').hidden = true; }
function fade(on) { return new Promise(res => { const f = $('#fade'); if (on) f.classList.add('on'); else f.classList.remove('on'); setTimeout(res, settings.reduce ? 20 : 800); }); }
let toastT = 0;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
function pointPop(t) { const el = document.createElement('div'); el.className = 'pt-pop'; el.textContent = t; $('#pts').appendChild(el); setTimeout(() => el.remove(), 1600); }
function showHintOnce(key) {
  const k = 'mdl_hint2_' + key; if (ls.get(k)) return; ls.set(k, '1');
  const txt = {
    temple: '빈 방석을 누르면 걸어가 앉아요. 합장·절하기·염주 돌리기를 해 보세요. 화면을 끌면 둘러볼 수 있고, 오른쪽 옆 다도실에선 차를 마실 수 있어요.',
    church: '빈 의자를 누르면 앉아요. 말씀대에서 성경 말씀을, 찬송대에서 찬송을 들을 수 있어요. 오른쪽 옆 카페와 서점도 있어요.',
    cathedral: '장의자에 앉아 기도하거나, 오른쪽 앞 봉헌초에서 촛불을 켜세요. 왼쪽 옆에 카페가 있어요.',
    playground: '기계를 누르면 걸어가서 프로그램이 열려요. 12지신 마당에서 내 띠를 눌러 보고, 랜덤박스로 소품도 뽑아 보세요.',
  }[key];
  $('#hint-text').textContent = txt; $('#hint').hidden = false;
}

/* ---------------- 카메라 ---------------- */
function onResize() {
  if (!renderer) return;
  renderer.setSize(innerWidth, innerHeight, false);
  app.cam.aspect = innerWidth / innerHeight; app.cam.updateProjectionMatrix();
  if (app.mode === 'map' && !app.focus && !camTween) setCamTween(mapHome(), 0);
}
const _v = new THREE.Vector3();
function updateFollowCam(dt, snap) {
  const me = app.me, v = app.view, w = app.world; if (!me || !w) return;
  if (v.yawTarget !== undefined) { v.yaw += (v.yawTarget - v.yaw) * Math.min(1, dt * 3); if (Math.abs(v.yawTarget - v.yaw) < 0.01) v.yawTarget = undefined; }
  const k = snap ? 1 : 1 - Math.exp(-dt * 5);
  // 내 캐릭터 앞쪽을 조금 더 보여줌
  const fx = -Math.sin(v.yaw) * 1.6, fz = -Math.cos(v.yaw) * 1.6;
  v.tx += (me.x + fx - v.tx) * k; v.tz += (me.z + fz - v.tz) * k; v.ty += (1.5 - v.ty) * k;
  const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  let cx = v.tx + Math.sin(v.yaw) * cp * v.dist, cy = v.ty + sp * v.dist, cz = v.tz + Math.cos(v.yaw) * cp * v.dist;
  const b = w.bounds; cx = clamp(cx, b[0] + 0.4, b[2] - 0.4); cy = clamp(cy, 1.2, (w.roomH || 6) - 0.4); cz = clamp(cz, b[1] + 2, b[3] + 6);
  app.cam.position.set(cx, cy, cz); app.cam.lookAt(_v.set(v.tx, v.ty, v.tz));
  if (w.sun) { w.sun.position.set(me.x - 6, 12, me.z + 8); w.sun.target.position.set(me.x, 0, me.z - 2); }
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3();
function updateBillboards() {
  for (const o of app.billboards) {
    o.getWorldPosition(_p); const yaw = Math.atan2(app.cam.position.x - _p.x, app.cam.position.z - _p.z);
    o.parent.getWorldQuaternion(_q2); _q.setFromEuler(_e.set(0, yaw, 0)); o.quaternion.copy(_q2.invert().multiply(_q));
  }
}
function updateEntity(ent, dt, isMe) {
  const ch = ent.char;
  if (ent.path) {
    if (stepAlong(ent, dt)) {
      ch.walking = false;
      if (ent.endRy !== undefined) { ent.ry = ent.endRy; ent.endRy = undefined; }
      if (isMe) { const f = ent.onArrive; ent.onArrive = null; if (ent.act === 'walk') ent.act = 'stand'; if (f) f(); else { publish(); renderActions(); } }
    }
  }
  ch.root.position.set(ent.x, 0, ent.z);
  ch.root.rotation.y = lerpAngle(ch.root.rotation.y, ent.ry, Math.min(1, dt * 8));
  if (isMe && app.world?.annexRect) { const ia = inAnnex(); if (ia !== ent.inAnnex) { ent.inAnnex = ia; sound.duck(ia); } }
}
let fpsAcc = 0, fpsN = 0;
function loop() {
  requestAnimationFrame(loop);
  if (document.hidden) return;
  const rawDt = clock.getDelta(), dt = Math.min(0.05, rawDt), t = clock.elapsedTime;
  const w = app.world; if (!w) return;
  if (app.mode === 'interior') {
    if (app.me) { updateEntity(app.me, dt, true); app.me.char.update(dt, t); }
    for (const [, p] of app.peers) { updateEntity(p, dt, false); p.char.update(dt, t); }
    updateNpcs(dt, t);
    w.update(t, dt);
    if (seatHi > 0) { seatHi -= dt; if (seatHi <= 0) refreshSeatRings(); }
    updateFollowCam(dt);
  } else {
    w.update(t, settings.reduce, dt); updateCamTween(Math.min(rawDt, 0.25));
    if (!camTween && !app.focus && !settings.reduce && !app.mapUser) { const h = mapHome(); app.cam.position.x = h.pos[0] + Math.sin(t * 0.08) * 4; app.cam.lookAt(app.camLook); }
  }
  updateBillboards();
  renderer.render(w.scene, app.cam);
  if (driveCss) { const on = app.mode === 'map'; driveCss.r.domElement.style.display = on ? '' : 'none'; if (on) driveCss.r.render(driveCss.scene, app.cam); }
  labels.update(app.cam, innerWidth, innerHeight, SID);
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { app.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
}

boot();
// 검수용 훅 (실시간 검증 스크립트에서 사용)
window.__mdlTest = { trySit, tryCandle, doAction, net, seatOwner, enterSpace, leaveToMap, get peers() { return [...app.peers.keys()]; } };
