// 장면 구성: 정원(갈림길) + 맥스데이사 / 맥스데이교회 / 맥스데이성당 / 맥스데이 놀이터
// 외부 3D 파일 없이 기본 도형으로 로우폴리 디오라마를 만듦 (GPT 디자인 기준 v1.1~v1.3)
import * as THREE from 'three';
import { SPACES, GARDEN, PLAYGROUND, TEMPLE_MACHINE, XMAS_TREE, ANNEX, PROGRAMS, GACHA } from './config.js';
import { NavGrid, textTexture } from './engine.js';
import { M as CM, GOLD, rbox, loadTex, woodFloorTex, stoneTex, plasterTex, dancheongTex, plantPot, lotusLantern, candleStick } from './world/common.js';
import { starGeo } from './character.js';
import { buildFoodStreet, buildArcade } from './world/street.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...o });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
function place(o, x, y, z, parent) { o.position.set(x, y, z); parent && parent.add(o); return o; }
function shadow(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }

function sign(lines, w, h, opts) {
  const tex = textTexture(lines, { w: 768, h: Math.round(768 * h / w), ...opts });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.userData.noShadow = true;
  return m;
}

/* ================= 공통: 키오스크 기계 ================= */
export function buildMachine(def, { garden = false, quiet = false } = {}) {
  const g = new THREE.Group();
  const p = PROGRAMS[def.prog] || { name: def.prog };
  const kind = def.type || 'adult';
  const accent = new THREE.Color(def.color);
  if (kind === 'gacha') {
    const base = box(0.9, 0.95, 0.8, M('#F0E7D8')); place(base, 0, 0.475, 0, g);
    const band = box(0.92, 0.18, 0.82, M(def.color)); place(band, 0, 0.85, 0, g);
    const slot = box(0.3, 0.2, 0.05, M('#455D60')); place(slot, 0, 0.35, 0.41, g);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 16), M('#E8D9B8', { metalness: 0.3, roughness: 0.4 })); knob.rotation.x = Math.PI / 2; place(knob, 0, 0.65, 0.42, g); g.userData.knob = knob;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.05, transmission: 0.4 })); place(dome, 0, 1.28, 0, g);
    const caps = ['#E9A26D', '#78B8BD', '#ACA0D2', '#F1CE79', '#DDA7B7', '#A2C89B'];
    const capG = new THREE.SphereGeometry(0.075, 10, 8);
    const capsGroup = new THREE.Group(); place(capsGroup, 0, 1.2, 0, g); g.userData.caps = capsGroup;
    for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 0.08 + (i % 3) * 0.06; place(new THREE.Mesh(capG, M(caps[i % caps.length], { roughness: 0.4 })), Math.cos(a) * r, (i % 4) * 0.06 - 0.05, Math.sin(a) * r, capsGroup); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.08, 16), M(def.color)); place(top, 0, 1.6, 0, g);
    const s = sign(['랜덤박스', '무료 뽑기'], 0.82, 0.3, { bg: def.color, fg: '#25383C', sub: '#25383C', radius: 26 }); place(s, 0, 1.0, 0.411, g);
    g.userData.height = 1.65;
  } else {
    const kids = kind === 'kids';
    const W = kids ? 0.75 : 0.9, Dp = kids ? 0.65 : 0.75, H = garden ? 1.65 : kids ? 1.25 : 1.85;
    const body = box(W, H - 0.35, Dp, M(kids ? '#FFF0D1' : '#F0E7D8')); place(body, 0, 0.35 + (H - 0.35) / 2, 0, g);
    const foot = box(W + 0.02, 0.35, Dp + 0.02, M(kids ? def.color : '#455D60')); place(foot, 0, 0.175, 0, g);
    const sw = kids ? 0.56 : 0.66, sh = kids ? 0.48 : garden ? 0.62 : 0.78, sy = kids ? 0.83 : garden ? 1.0 : 1.12;
    const bezel = box(sw + 0.08, sh + 0.08, 0.03, M('#2b3638')); place(bezel, 0, sy, Dp / 2 + 0.005, g);
    const scrTex = textTexture([p.name, p.sub || ''], { w: 384, h: Math.round(384 * sh / sw), bg: '#B9E5DD', fg: '#21403D', sub: '#3e6460', radius: 10 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: scrTex, emissive: '#B9E5DD', emissiveMap: scrTex, emissiveIntensity: quiet ? 0.2 : 0.35, roughness: 0.3 }));
    place(screen, 0, sy, Dp / 2 + 0.022, g); g.userData.screen = screen;
    const shelf = box(W * 0.8, 0.04, 0.16, M('#455D60')); place(shelf, 0, sy - sh / 2 - 0.14, Dp / 2 + 0.07, g);
    const s = sign(p.name.length > 7 ? [p.name.slice(0, Math.ceil(p.name.length / 2)), p.name.slice(Math.ceil(p.name.length / 2))] : [p.name], 0.82, 0.22, { bg: def.color, fg: '#25383C', sub: '#25383C', radius: 20 });
    place(s, 0, H + 0.14, Dp / 2 - 0.05, g);
    const post = box(0.86, 0.26, 0.04, M(def.color)); place(post, 0, H + 0.14, Dp / 2 - 0.08, g);
    g.userData.height = H + 0.3;
  }
  // 선택 외곽선
  const out = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0 }));
  out.scale.set(1.0, g.userData.height, 0.9); out.position.y = g.userData.height / 2; g.userData.outline = out;
  shadow(g, true, true); g.add(out);
  g.userData.machine = { prog: def.prog, id: def.id || def.prog, type: kind === 'gacha' ? 'gacha' : 'program', name: kind === 'gacha' ? '랜덤박스' : p.name };
  return g;
}

/* ================= 내부 공간 ================= */
export function buildInterior(key, { low, reduced }) {
  const sp = SPACES[key]; const ax = ANNEX[key] || null;
  const scene = new THREE.Scene();
  const { w, d, h } = sp.room;
  const X0 = ax && ax.side < 0 ? ax.x0 : -w / 2, X1 = ax && ax.side > 0 ? ax.x1 : w / 2;
  const Z0 = -d / 2, Z1 = d / 2;
  const tone = { temple: ['#1a1310', '#2a1d16'], church: ['#2b241c', '#3a3026'], cathedral: ['#151a22', '#232a35'], playground: ['#2a3336', '#3a4548'], cafe: ['#2b241c', '#3a3026'], restaurant: ['#241c17', '#33281f'], foodstreet: ['#0E1F4D', '#16224a'], arcade: ['#140f24', '#1d1830'] }[key];
  const outdoor = !!sp.outdoor;
  scene.background = new THREE.Color(tone[0]);
  scene.fog = new THREE.Fog(tone[0], 22, 48);

  // 조명: 반구광 + 주광(그림자) + 공간별 포인트
  const hemi = new THREE.HemisphereLight(sp.amb[0], '#3a2a20', sp.amb[1] * 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(sp.sun[0], sp.sun[1] * 0.9); sun.position.set(-6, 12, 8);
  sun.castShadow = !low; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -14, near: 0.5, far: 50 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  scene.add(sun); scene.add(sun.target);
  if (ax) { const l = new THREE.PointLight(ax.light[0], ax.light[1] * 9, 12, 1.4); l.position.set(...ax.light[2]); scene.add(l); }

  // 바닥
  const floorTex = key === 'temple' ? woodFloorTex('#4a2f20', { planks: 6, repeat: [w / 3, d / 3], light: 0.1 })
    : key === 'church' ? woodFloorTex('#9a7754', { planks: 8, repeat: [w / 3, d / 3], seed: 4 })
    : key === 'cathedral' ? stoneTex('#bdb7ab', { tiles: 4, repeat: [w / 2, d / 2] })
    : key === 'cafe' ? woodFloorTex('#b88a5e', { planks: 12, repeat: [w / 3, d / 3], seed: 31, light: 0.1 })
    : key === 'restaurant' ? stoneTex('#8f7d6b', { tiles: 3, repeat: [w / 1.6, d / 1.6], grout: '#6f5f50' })
    : woodFloorTex('#d7c3a0', { planks: 10, repeat: [w / 3, d / 3], seed: 12, light: 0.08 });
  const floorMat = STORES[key] ? photoMat(key === 'cafe' ? 'parquet' : 'terrazzo', w / (key === 'cafe' ? 2.2 : 2.6), d / (key === 'cafe' ? 2.2 : 2.6), { roughness: key === 'cafe' ? 0.45 : 0.32, nor: true, color: key === 'cafe' ? '#e8d8c4' : '#ffffff' })
    : new THREE.MeshStandardMaterial({ map: floorTex, roughness: key === 'cathedral' ? 0.55 : 0.62, metalness: 0, envMapIntensity: 0.6 });
  const mainFloor = box(w, 0.3, d, floorMat); mainFloor.position.set(0, -0.15, 0); mainFloor.receiveShadow = true; if (!outdoor) scene.add(mainFloor);
  // 벽
  const wallMat = STORES[key] ? new THREE.MeshStandardMaterial({ map: plasterTex(key === 'cafe' ? '#efe7da' : '#eadfcb', { repeat: [3, 2], amt: 0.035 }), roughness: 0.93 }) : new THREE.MeshStandardMaterial({ map: key === 'playground' ? wallpaperTex() : plasterTex(sp.wall, { repeat: [3, 2], amt: key === 'temple' ? 0.07 : 0.04 }), roughness: 0.92 });
  const wt = 0.3;
  const back = box(X1 - X0 + wt * 2, h, wt, wallMat); back.position.set((X0 + X1) / 2, h / 2, Z0 - wt / 2); back.receiveShadow = true; if (!outdoor) scene.add(back);
  const left = box(wt, h, d, wallMat); left.position.set(X0 - wt / 2, h / 2, 0); left.receiveShadow = true; if (!outdoor) scene.add(left);
  const right = box(wt, h, d, wallMat); right.position.set(X1 + wt / 2, h / 2, 0); right.receiveShadow = true; if (!outdoor) scene.add(right);
  // 징두리(벽 아랫단 목재/석재)
  const wains = M(key === 'temple' ? '#5a3524' : key === 'church' || key === 'cafe' ? '#7a5a40' : key === 'restaurant' ? '#5b3f2a' : key === 'cathedral' ? '#9f998d' : '#e6d2b0');
  if (!STORES[key] && !outdoor && key !== 'arcade') for (const [x, z, ww, dd] of [[(X0 + X1) / 2, Z0 + 0.02, X1 - X0, 0.06], [X0 + 0.02, 0, 0.06, d], [X1 - 0.02, 0, 0.06, d]]) { const b = box(ww, 1.0, dd, wains); b.position.set(x, 0.5, z); b.receiveShadow = true; scene.add(b); }
  // 천장 (앞쪽 2/3 은 카메라 시야 확보를 위해 열어 둠)
  const ceil = box(X1 - X0 + wt * 2, 0.25, d * 0.45, M(sp.ceil)); ceil.position.set((X0 + X1) / 2, h + 0.12, Z0 + d * 0.225); if (!outdoor) scene.add(ceil);
  const plinth = box(X1 - X0 + wt * 2, 0.6, d + wt, M('#1b1512')); plinth.position.set((X0 + X1) / 2, -0.6, -wt / 2); if (!outdoor) scene.add(plinth);

  const obstacles = []; const obs = (cx, cz, sx, sz) => obstacles.push([cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2]);
  const seats = []; const machines = []; const clickables = []; const anim = []; const props = {};
  let candles = null;

  if (key === 'temple') buildTempleInterior(scene, obs, anim, w, d, h, clickables, props);
  if (key === 'church') buildChurchInterior(scene, obs, anim, w, d, h, clickables, props);
  if (key === 'cathedral') candles = buildCathedralInterior(scene, obs, anim, w, d, h, clickables, props);
  if (key === 'church' || key === 'cathedral') { const tr = xmasTree(XMAS_TREE[key]); scene.add(tr.group); obs(XMAS_TREE[key].x, XMAS_TREE[key].z, XMAS_TREE[key].r * 2, XMAS_TREE[key].r * 2); anim.push(tr.update); }

  // 본당 좌석 20석 (5행×4열)
  if (sp.seatX) {
    let idx = 0;
    for (let r = 0; r < sp.seatZ.length; r++) for (let c = 0; c < sp.seatX.length; c++) {
      const x = sp.seatX[c], z = sp.seatZ[r];
      const seat = { idx: idx++, x, z, ry: Math.PI, type: sp.seatType, zone: 'main' };
      if (sp.seatType === 'cushion') {
        const m = rbox(0.86, 0.12, 0.86, 0.05, M('#6f7375', { roughness: 0.95 })); m.position.set(x, 0.06, z); m.receiveShadow = true; m.castShadow = true; scene.add(m);
        const pad = rbox(0.66, 0.06, 0.66, 0.025, M('#8a8e90', { roughness: 1 })); pad.position.set(x, 0.135, z); pad.receiveShadow = true; scene.add(pad);
        seat.y = 0.12; seat.approach = [x, z + 0.55];
      }
      if (sp.seatType === 'chair') { const m = chair(0.7, 0.7, 0.34, sp.seatColor); m.position.set(x, 0, z); m.rotation.y = Math.PI; scene.add(m); obs(x, z + 0.05, 0.6, 0.5); seat.y = 0.34; seat.approach = [x, z - 0.6]; }
      if (sp.seatType === 'pew') { seat.y = 0.34; seat.approach = [x, z - 0.62]; }
      seats.push(seat);
    }
    if (sp.seatType === 'pew') for (const z of sp.seatZ) for (const s of [-1, 1]) { const p = pew(2.8, 0.75, 0.34, sp.seatColor); p.position.set(s * 2.0, 0, z); p.rotation.y = Math.PI; scene.add(p); obs(s * 2.0, z + 0.12, 2.8, 0.5); }
  }
  if (key === 'playground') buildPlaygroundInterior(scene, obs, seats, machines, clickables, anim, reduced);
  if (STORES[key]) props.tables = buildStoreInterior(scene, key, obs, seats, clickables, anim, w, d, h, props);
  if (key === 'foodstreet') buildFoodStreet(scene, { w, d, obs, seats, clickables, anim, props, addScreen, low });
  if (key === 'arcade') buildArcade(scene, { w, d, h, obs, seats, machines, clickables, anim, props, buildMachine });
  // 영상 스크린
  const SCR = { church: { x: 4.8, y: 3.7, z: -d / 2 + 0.08, w: 2.4, h: 1.35 }, cathedral: { x: 4.6, y: 3.6, z: -d / 2 + 0.08, w: 2.4, h: 1.35 }, cafe: { x: -w / 2 + 0.08, y: 2.45, z: -4.0, ry: Math.PI / 2, w: 2.2, h: 1.24 }, restaurant: { x: -w / 2 + 0.08, y: 2.45, z: 3.2, ry: Math.PI / 2, w: 2.4, h: 1.35 } }[key];
  if (SCR) props.screen = addScreen(scene, key, SCR, clickables, anim);
  if (key === 'temple') { const m = buildMachine({ ...TEMPLE_MACHINE, type: 'adult' }, { quiet: true }); m.position.set(TEMPLE_MACHINE.x, 0, TEMPLE_MACHINE.z); scene.add(m); obs(TEMPLE_MACHINE.x, TEMPLE_MACHINE.z, 0.9, 0.75); machines.push(m); clickables.push(m); m.userData.approach = [TEMPLE_MACHINE.x, TEMPLE_MACHINE.z + 1.2]; m.userData.face = 0; }
  // 샵 (절·교회·성당)
  if (SHOPS[key]) { const s = shopStall(SHOPS[key]); scene.add(s.group); obs(...s.obs); clickables.push(s.group); props.shop = s.group; s.group.userData.approach = s.approach; s.group.userData.face = s.face; }
  let annexRect = null;
  if (ax) annexRect = buildAnnex(scene, key, ax, obs, seats, d, h);

  shadow(scene, !low, true);
  const nav = new NavGrid([[X0, Z0, X1, Z1 + 0.3]], obstacles, 0.25, 0.3);
  if (ax) { const bx = ax.side > 0 ? ax.x0 : ax.x1; nav.block([bx - 0.06, Z0, bx + 0.06, ANNEX.door.z0], 0.3); nav.block([bx - 0.06, ANNEX.door.z1, bx + 0.06, Z1 + 0.5], 0.3); }
  for (const s of seats) nav.unblockAt(s.approach[0], s.approach[1], 0.2);
  for (const m of machines) if (m.userData.approach) nav.unblockAt(m.userData.approach[0], m.userData.approach[1], 0.2);
  if (props.shop) nav.unblockAt(props.shop.userData.approach[0], props.shop.userData.approach[1], 0.2);
  for (const o of [props.photo, ...(props.booths || [])]) if (o && o.userData.approach) nav.unblockAt(o.userData.approach[0], o.userData.approach[1], 0.2);
  if (props.lectern) nav.unblockAt(props.lectern.userData.approach[0], props.lectern.userData.approach[1], 0.2);
  if (candles) nav.unblockAt(candles.access[0], candles.access[1], 0.2);

  const ringGeo = new THREE.RingGeometry(0.3, 0.38, 32);
  for (const s of seats) {
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#E8CF8F', transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, (s.y || 0) + 0.03, s.z); ring.renderOrder = 2; scene.add(ring); s.ring = ring;
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.0, 10), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(s.x, 0.5, s.z); hit.userData.seatIdx = s.idx; scene.add(hit); clickables.push(hit); s.hit = hit;
  }
  const floorHit = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, d + 0.6), new THREE.MeshBasicMaterial({ visible: false })); floorHit.rotation.x = -Math.PI / 2; floorHit.position.set((X0 + X1) / 2, 0.001, 0.3); floorHit.userData.floor = true; scene.add(floorHit);
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 24), new THREE.MeshBasicMaterial({ color: '#F4F0E7', transparent: true, opacity: 0, depthWrite: false })); marker.rotation.x = -Math.PI / 2; marker.position.y = 0.02; scene.add(marker);

  return {
    scene, kind: 'interior', key, nav, seats, machines, clickables, candles, floorHit, marker, annexRect, props, sun,
    spawn: sp.spawn, bounds: [X0, Z0, X1, Z1], roomH: h,
    update(t, dt) { anim.forEach(f => f(t, dt, reduced)); if (marker.material.opacity > 0) marker.material.opacity = Math.max(0, marker.material.opacity - dt * 0.6); },
  };
}

// 실사 재질 (Poly Haven CC0 사진 텍스처) — assets/tex/store/
function photoMat(name, rx = 1, ry = 1, { nor = false, roughness = 0.6, color = '#ffffff', metalness = 0, ns = 0.6 } = {}) {
  const map = loadTex(`assets/tex/store_${name}_diff.jpg`, { repeat: [rx, ry] });
  const o = { map, roughness, metalness, color, envMapIntensity: 0.7 };
  if (nor) { o.normalMap = loadTex(`assets/tex/store_${name}_nor.jpg`, { repeat: [rx, ry], srgb: false }); o.normalScale = new THREE.Vector2(ns, ns); }
  return new THREE.MeshStandardMaterial(o);
}
function chair(w, d, sh, color) {
  const g = new THREE.Group(); const m = M(color, { roughness: 0.6 });
  const seat = rbox(w * 0.86, 0.07, d * 0.8, 0.025, m); seat.position.y = sh; g.add(seat);
  const cush = rbox(w * 0.78, 0.05, d * 0.7, 0.02, M('#a7563f', { roughness: 0.9 })); cush.position.y = sh + 0.055; g.add(cush);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, sh, 8), m), sx * w * 0.36, sh / 2, sz * d * 0.32, g);
  const backr = rbox(w * 0.86, 0.55, 0.05, 0.02, m); backr.position.set(0, sh + 0.3, -d * 0.38); backr.rotation.x = -0.08; g.add(backr);
  return g;
}
function pew(w, d, sh, color) {
  const g = new THREE.Group(); const m = M(color, { roughness: 0.55 });
  const seat = rbox(w, 0.08, d * 0.62, 0.03, m); seat.position.set(0, sh, 0.05); g.add(seat);
  const backr = rbox(w, 0.6, 0.07, 0.025, m); backr.position.set(0, sh + 0.32, -d * 0.3); backr.rotation.x = -0.1; g.add(backr);
  for (const sx of [-1, 1]) { const end = new THREE.Mesh(gableEnd(d * 0.85, sh + 0.75), m); end.position.set(sx * (w / 2 - 0.04), 0, 0); end.rotation.y = Math.PI / 2; g.add(end); }
  const kneeler = rbox(w * 0.94, 0.08, 0.16, 0.03, M('#6b2f2f', { roughness: 0.95 })); kneeler.position.set(0, 0.14, -d * 0.62); g.add(kneeler);
  const shelf = rbox(w * 0.96, 0.04, 0.14, 0.015, m); shelf.position.set(0, sh + 0.5, -d * 0.4); g.add(shelf);
  return g;
}
function gableEnd(d, h) {
  const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(d / 2, h * 0.75); s.quadraticCurveTo(d / 2, h, 0, h); s.quadraticCurveTo(-d / 2, h, -d / 2, h * 0.8); s.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }); g.translate(0, 0, -0.035); return g;
}
function plant(scene, x, z, y = 0, hgt = 0.8, r = 0.3) { const p = plantPot(hgt, r); p.position.set(x, y, z); scene.add(p); return p; }

/* ---------------- 맥스데이사 법당 ---------------- */
function buildTempleInterior(scene, obs, anim, w, d, h, clickables, props) {
  const wood = M('#5c2f22', { roughness: 0.55 }), red = M('#7d3324', { roughness: 0.6 });
  // 탱화 벽화 (GPT 생성 원본)
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshStandardMaterial({ map: loadTex('assets/tex/temple_mural.jpg'), roughness: 0.9 }));
  mural.position.set(0, 3.25, -d / 2 + 0.02); mural.receiveShadow = true; scene.add(mural);
  const frameM = M('#3c2219', { roughness: 0.5 });
  for (const [x, y, ww, hh] of [[0, 6.3, 12.4, 0.2], [0, 0.2, 12.4, 0.2], [-6.1, 3.25, 0.2, 6.2], [6.1, 3.25, 0.2, 6.2]]) place(box(ww, hh, 0.12, frameM), x, y, -d / 2 + 0.06, scene);
  // 단청 띠 (천장 아래)
  const dc = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.55), new THREE.MeshStandardMaterial({ map: dancheongTex({ repeat: [w / 2.2, 1] }), roughness: 0.8 }));
  dc.position.set(0, h - 0.3, -d / 2 + 0.035); scene.add(dc);
  for (const s of [-1, 1]) { const sd = dc.clone(); sd.position.set(s * (w / 2 - 0.04), h - 0.3, 0); sd.rotation.y = -s * Math.PI / 2; sd.scale.x = d / w; scene.add(sd); }
  // 불단 (수미단): 단청 앞판 + 계단식
  const dais = new THREE.Group(); dais.position.set(0, 0, -6.1); scene.add(dais);
  place(rbox(6.4, 0.5, 2.4, 0.04, red), 0, 0.25, 0, dais);
  place(rbox(5.4, 0.55, 2.0, 0.04, wood), 0, 0.77, -0.1, dais);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.42), new THREE.MeshStandardMaterial({ map: dancheongTex({ repeat: [2.2, 1] }), roughness: 0.7 })); front.position.set(0, 0.77, 0.905); dais.add(front);
  const front2 = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.36), new THREE.MeshStandardMaterial({ map: dancheongTex({ repeat: [2.6, 1] }), roughness: 0.7 })); front2.position.set(0, 0.25, 1.205); dais.add(front2);
  obs(0, -6.1, 6.6, 2.6);
  // 광배 (3D, 불꽃 모양 금장)
  const halo = new THREE.Group(); halo.position.set(0, 3.0, -7.0); scene.add(halo);
  const hs = new THREE.Shape(); hs.moveTo(0, 2.3); hs.bezierCurveTo(0.9, 1.6, 1.65, 0.9, 1.6, -0.2); hs.bezierCurveTo(1.55, -1.3, 0.9, -1.9, 0, -1.95); hs.bezierCurveTo(-0.9, -1.9, -1.55, -1.3, -1.6, -0.2); hs.bezierCurveTo(-1.65, 0.9, -0.9, 1.6, 0, 2.3);
  const haloM = new THREE.MeshStandardMaterial({ color: '#C9A45A', metalness: 0.9, roughness: 0.35, emissive: '#5a3a10', emissiveIntensity: 0.25 });
  halo.add(new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 3 }), haloM));
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshStandardMaterial({ color: '#8e2f22', roughness: 0.7 })); inner.position.set(0, 0.95, 0.1); halo.add(inner);
  for (const [r, y] of [[0.66, 0.95], [1.25, -0.25]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 64), haloM); ring.position.set(0, y, 0.11); halo.add(ring); }
  const body = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshStandardMaterial({ color: '#2f5f55', roughness: 0.8 })); body.position.set(0, -0.25, 0.09); halo.add(body);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), haloM); const rx = Math.sin(a) * 1.45, ry = Math.cos(a) * 1.75 + 0.05; f.position.set(rx, ry, 0.08); f.rotation.z = -a; halo.add(f); }
  // 불상: GPT 생성 금동 좌불상 (배경 제거) — 법당 정면을 향해 세움
  const btex = loadTex('assets/tex/buddha.webp');
  const bh = 3.3, bw = bh * (787 / 1067);
  const buddha = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshStandardMaterial({ map: btex, transparent: true, alphaTest: 0.35, roughness: 0.45, metalness: 0.25, emissive: '#3a2508', emissiveMap: btex, emissiveIntensity: 0.55 }));
  buddha.position.set(0, 1.05 + bh / 2, -6.55); buddha.userData.noShadow = true; scene.add(buddha); props.buddha = buddha;
  const spot = new THREE.SpotLight('#FFE1A8', 30, 12, 0.45, 0.6, 1.2); spot.position.set(0, 6.2, -2.5); spot.target = buddha; scene.add(spot);
  // 공양 탁자: 촛대·향로·꽃병·과일
  const table = new THREE.Group(); table.position.set(0, 0, -4.35); scene.add(table);
  place(rbox(2.6, 0.08, 0.75, 0.03, M('#5a2a1e', { roughness: 0.45 })), 0, 0.78, 0, table);
  for (const sx of [-1.15, 1.15]) for (const sz of [-0.3, 0.3]) place(box(0.08, 0.76, 0.08, M('#4a2219')), sx, 0.38, sz, table);
  place(box(2.4, 0.3, 0.02, new THREE.MeshStandardMaterial({ map: dancheongTex({ repeat: [1, 1] }) })), 0, 0.62, 0.38, table);
  for (const sx of [-0.95, 0.95]) { const c = candleStick(0.42); c.position.set(sx, 0.82, 0); table.add(c); anim.push((t, dt, red) => { if (!red) c.userData.flame.scale.y = 1 + Math.sin(t * 9 + sx * 5) * 0.12; }); }
  const burner = new THREE.Mesh(new THREE.LatheGeometry([0, 0.12, 0.17, 0.16, 0.14].map((r, i) => new THREE.Vector2(r || 0.001, i * 0.05)), 20), GOLD()); burner.position.set(0, 0.82, 0); table.add(burner);
  for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), M('#7a3a2a')); st.position.set(-0.04 + i * 0.04, 1.15, 0); table.add(st); }
  for (const sx of [-0.5, 0.5]) { const vase = new THREE.Mesh(new THREE.LatheGeometry([0.05, 0.09, 0.07, 0.04, 0.06].map((r, i) => new THREE.Vector2(r, i * 0.07)), 18), new THREE.MeshStandardMaterial({ color: '#cfe3df', roughness: 0.25 })); vase.position.set(sx, 0.82, -0.15); table.add(vase); for (let k = 0; k < 5; k++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M(['#F2A6A0', '#F7F2E8', '#F6D46E'][k % 3])); fl.position.set(sx + (k - 2) * 0.04, 1.18 + (k % 2) * 0.06, -0.15); table.add(fl); } }
  for (const sx of [-0.25, 0.25]) { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.06, 16), GOLD()); bowl.position.set(sx, 0.85, 0.18); table.add(bowl); for (let k = 0; k < 5; k++) place(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M(['#d9533c', '#e8a33a', '#c4b04a'][k % 3], { roughness: 0.4 })), sx + (k % 3 - 1) * 0.06, 0.9 + Math.floor(k / 3) * 0.06, 0.18 + (k % 2) * 0.03, table); }
  obs(0, -4.35, 2.7, 0.8);
  // 기둥 (단청 머리)
  for (const z of [-4.5, -0.5, 3.5]) for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, h, 20), M('#6a2a1c', { roughness: 0.5 })); col.position.set(s * 5.4, h / 2, z); scene.add(col); obs(s * 5.4, z, 0.6, 0.6);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 20, 1, true), new THREE.MeshStandardMaterial({ map: dancheongTex({ repeat: [1.5, 1] }), side: THREE.DoubleSide })); cap.position.set(s * 5.4, h - 0.6, z); scene.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.18, 16), M('#9a9488')); base.position.set(s * 5.4, 0.09, z); scene.add(base);
  }
  // 천장 대들보
  for (const z of [-4.5, -0.5]) { const beam = rbox(11.2, 0.4, 0.36, 0.05, M('#5c2f22')); beam.position.set(0, h - 0.5, z); scene.add(beam); }
  // 연등 행렬 (오색 연등)
  const cols = ['#F2A6A0', '#F6D46E', '#9FD1B6', '#F7F2E8', '#A9C4E8', '#E58A8A'];
  const lanterns = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
    const l = lotusLantern(cols[(r * 3 + c) % cols.length], 0.2); const x = -4.4 + c * 1.1, z = -3.2 + r * 1.9, y = h - 1.35 - (c % 2) * 0.12;
    l.position.set(x, y, z); scene.add(l); lanterns.push(l);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, h - y - 0.2, 4), M('#d9c27a')); str.position.set(x, (h + y) / 2 + 0.05, z); scene.add(str);
  }
  anim.push((t, dt, red) => { if (!red) lanterns.forEach((l, i) => { l.rotation.y = t * 0.2 + i; l.position.x += Math.sin(t * 0.8 + i) * 0.0004; }); });
  const lglow = new THREE.PointLight('#FFC88A', 6, 14, 1.6); lglow.position.set(0, h - 1.6, -0.5); scene.add(lglow);
  // 창살 창 + 벽등
  const lat = new THREE.MeshStandardMaterial({ color: '#E8C99A', emissive: '#E8B878', emissiveIntensity: 0.45 }), bar = M('#4a2a1d');
  [-2.5, 1.5, 5.2].forEach(z => { for (const s of [-1, 1]) { const x = s * (w / 2 - 0.05); const p = box(0.04, 1.6, 1.5, lat); p.position.set(x, 2.4, z); scene.add(p); for (let k = -3; k <= 3; k++) { const b1 = box(0.05, 1.6, 0.035, bar); b1.position.set(x - s * 0.02, 2.4, z + k * 0.21); scene.add(b1); const b2 = box(0.05, 0.035, 1.5, bar); b2.position.set(x - s * 0.02, 2.4 + k * 0.22, z); scene.add(b2); } } });
  // 법고·목탁 받침 (오른쪽 앞)
  const drum = new THREE.Group(); drum.position.set(4.3, 0, -3.6); scene.add(drum);
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.7, 24), M('#8a2f22')), 0, 0.85, 0, drum).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) place(new THREE.Mesh(new THREE.CircleGeometry(0.4, 24), M('#e9dcc0')), s * 0.355, 0.85, 0, drum).rotation.y = s * Math.PI / 2;
  for (const s of [-0.3, 0.3]) place(box(0.08, 0.6, 0.6, M('#4a2219')), s, 0.3, 0, drum);
  obs(4.3, -3.6, 1.0, 0.8);
  const mok = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), M('#A8692F', { roughness: 0.35 })); mok.scale.set(1.2, 0.85, 1); mok.position.set(-4.3, 0.62, -3.6); scene.add(mok);
  place(rbox(0.5, 0.5, 0.5, 0.04, M('#5a2a1e')), -4.3, 0.25, -3.6, scene); obs(-4.3, -3.6, 0.6, 0.6);
  // 향 연기
  const smoke = []; for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#e8e2d8', transparent: true, opacity: 0.18, depthWrite: false })); s.userData.noShadow = true; scene.add(s); smoke.push(s); }
  anim.push((t, dt, red) => { smoke.forEach((s, i) => { const k = ((t * 0.25 + i / 8) % 1); s.position.set(Math.sin(t + i) * 0.08 * k, 1.35 + k * 1.6, -4.35); s.scale.setScalar(1 + k * 3); s.material.opacity = red ? 0 : 0.16 * (1 - k); }); });
}

/* ---------------- 맥스데이교회 예배당 ---------------- */
function buildChurchInterior(scene, obs, anim, w, d, h, clickables, props) {
  // 강단 뒤 나무 패널 벽
  const panelTex = woodFloorTex('#8a6446', { planks: 14, repeat: [3, 1], seed: 21 }); panelTex.rotation = Math.PI / 2;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, h - 0.2), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.6 })); panel.position.set(0, h / 2, -d / 2 + 0.03); scene.add(panel);
  // 빛나는 십자가 (뒤 간접조명)
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.8), new THREE.MeshBasicMaterial({ color: '#FFE8B8', transparent: true, opacity: 0.35, depthWrite: false })); glow.position.set(0, 3.9, -d / 2 + 0.05); glow.userData.noShadow = true; scene.add(glow);
  const cross = new THREE.Group(); cross.position.set(0, 3.9, -d / 2 + 0.16); scene.add(cross);
  const cm = M('#6e4a32', { roughness: 0.45 });
  place(rbox(0.26, 2.8, 0.16, 0.03, cm), 0, 0, 0, cross); place(rbox(1.5, 0.26, 0.16, 0.03, cm), 0, 0.55, 0, cross);
  const cl = new THREE.PointLight('#FFE0A8', 8, 6, 1.5); cl.position.set(0, 4, -d / 2 + 1.0); scene.add(cl);
  // 강단
  const stage = new THREE.Group(); stage.position.set(0, 0, -6.4); scene.add(stage);
  place(rbox(6.2, 0.36, 2.6, 0.04, M('#7a5a40', { roughness: 0.5 })), 0, 0.18, 0, stage);
  place(rbox(3, 0.18, 0.5, 0.03, M('#7a5a40')), 0, 0.09, 1.5, stage);
  const carpet = box(5.4, 0.01, 2.2, M('#8a2f2f', { roughness: 1 })); carpet.position.set(0, 0.365, 0); stage.add(carpet);
  obs(0, -6.4, 6.2, 2.6);
  // 강대상
  const pul = new THREE.Group(); pul.position.set(0, 0.36, -6.0); scene.add(pul);
  place(rbox(0.9, 1.05, 0.6, 0.05, M('#6b4a32', { roughness: 0.45 })), 0, 0.52, 0, pul);
  place(rbox(1.0, 0.06, 0.7, 0.02, M('#5a3c28')), 0, 1.07, -0.02, pul).rotation.x = 0.2;
  const crossM = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 0.8, roughness: 0.3 })); crossM.position.set(0, 0.62, 0.305); pul.add(crossM);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), M('#F3ECDD')); book.position.set(0, 1.12, 0); book.rotation.x = 0.2; pul.add(book);
  // 피아노
  const piano = new THREE.Group(); piano.position.set(3.8, 0.36, -6.6); piano.rotation.y = -0.4; scene.add(piano);
  place(rbox(1.5, 1.2, 0.6, 0.04, M('#1d1a19', { roughness: 0.2, metalness: 0.1 })), 0, 0.6, 0, piano);
  place(box(1.3, 0.04, 0.22, M('#F4F1EA')), 0, 0.75, 0.38, piano);
  for (let i = 0; i < 10; i++) place(box(0.05, 0.03, 0.12, M('#1d1a19')), -0.58 + i * 0.13, 0.78, 0.34, piano);
  // 성경 말씀대 (말씀 검색)
  const lect = lectern('#6b4a32'); lect.position.set(-3.6, 0, 4.0); lect.rotation.y = 0.5; scene.add(lect); obs(-3.6, 4.0, 0.7, 0.7);
  lect.userData.feature = 'bible'; lect.userData.approach = [-3.0, 4.9]; clickables.push(lect); props.lectern = lect;
  lect.add(featureTag('성경 말씀', 1.75));
  // 찬송 (오르간 옆 악보대)
  const hymn = lectern('#7a5a40', '#5b2f36'); hymn.position.set(3.6, 0, 4.0); hymn.rotation.y = -0.5; scene.add(hymn); obs(3.6, 4.0, 0.7, 0.7);
  hymn.userData.feature = 'hymn'; hymn.userData.approach = [3.0, 4.9]; clickables.push(hymn); props.hymn = hymn;
  hymn.add(featureTag('찬송 듣기', 1.75));
  // 아치창 + 햇살
  const glass = new THREE.MeshStandardMaterial({ color: '#E8F2EE', emissive: '#FFF4D8', emissiveIntensity: 0.9 }), frame = M('#82664E');
  [-3.5, 0.5, 4.5].forEach(z => { for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.02); const sh = new THREE.Shape(); sh.moveTo(-0.6, 0); sh.lineTo(-0.6, 1.7); sh.absarc(0, 1.7, 0.6, Math.PI, 0, true); sh.lineTo(0.6, 0); sh.lineTo(-0.6, 0);
    const g = new THREE.Mesh(new THREE.ShapeGeometry(sh), glass); g.position.set(x, 1.6, z); g.rotation.y = -s * Math.PI / 2; scene.add(g);
    for (const yy of [1.6, 2.5]) { const f = box(0.06, 0.06, 1.25, frame); f.position.set(x, yy, z); scene.add(f); }
    const f2 = box(0.06, 2.3, 0.06, frame); f2.position.set(x, 2.75, z); scene.add(f2);
    if (s < 0) { const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), new THREE.MeshBasicMaterial({ color: '#FFF1CF', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.set(x + 2.4, 1.8, z + 0.6); beam.rotation.set(0, Math.PI / 2, -0.75); beam.userData.noShadow = true; scene.add(beam); }
  } });
  // 화환·가랜드 (크리스마스)
  for (const s of [-1, 1]) { const wr = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 10, 28), M('#3f6b4f')); wr.position.set(s * 3.3, 4.6, -d / 2 + 0.12); scene.add(wr); const bow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), M('#AC3A3A')); bow.position.set(s * 3.3, 4.2, -d / 2 + 0.2); scene.add(bow); }
  for (const s of [-1, 1]) plant(scene, s * 2.7, -6.9, 0.36, 0.9, 0.32);
  // 펜던트 조명
  for (const z of [-2.5, 1.5]) for (const s of [-1, 1]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: '#FFF3D6', emissive: '#FFE2A8', emissiveIntensity: 1.2 })); lamp.position.set(s * 2.4, h - 1.6, z); lamp.userData.noShadow = true; scene.add(lamp); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), M('#2a2422')); cord.position.set(s * 2.4, h - 0.85, z); scene.add(cord); }
  const pl = new THREE.PointLight('#FFE2B0', 7, 16, 1.5); pl.position.set(0, h - 1.4, -0.5); scene.add(pl);
}

/* ---------------- 맥스데이성당 ---------------- */
function buildCathedralInterior(scene, obs, anim, w, d, h, clickables, props) {
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex('#c2bcb0', { tiles: 3, repeat: [1, 2] }), roughness: 0.85 });
  // 제단 구역
  const sanct = new THREE.Group(); sanct.position.set(0, 0, -7); scene.add(sanct);
  place(rbox(7, 0.4, 3, 0.04, stone), 0, 0.2, 0, sanct);
  place(rbox(3.4, 0.2, 0.6, 0.03, stone), 0, 0.1, 1.75, sanct);
  const red = box(6.4, 0.01, 2.6, M('#7a1f2a', { roughness: 1 })); red.position.set(0, 0.405, 0); sanct.add(red);
  obs(0, -7, 7, 3);
  // 제대 (흰 대리석 + 제대포)
  const altar = new THREE.Group(); altar.position.set(0, 0.4, -6.8); scene.add(altar);
  place(rbox(2.4, 0.9, 1.0, 0.04, M('#ECE6DA', { roughness: 0.35 })), 0, 0.45, 0, altar);
  place(box(2.5, 0.03, 1.1, M('#FBF8F1')), 0, 0.91, 0, altar);
  const cloth = box(2.52, 0.4, 0.02, M('#FBF8F1')); cloth.position.set(0, 0.72, 0.56); altar.add(cloth);
  const em = box(0.5, 0.3, 0.01, new THREE.MeshStandardMaterial({ color: '#C9AE73', metalness: 0.8, roughness: 0.3 })); em.position.set(0, 0.68, 0.575); altar.add(em);
  for (const sx of [-0.85, 0.85]) { const c = candleStick(0.45); c.position.set(sx, 0.93, -0.1); altar.add(c); anim.push((t, dt, r) => { if (!r) c.userData.flame.scale.y = 1 + Math.sin(t * 9 + sx * 3) * 0.12; }); }
  const chalice = new THREE.Mesh(new THREE.LatheGeometry([0.07, 0.02, 0.015, 0.03, 0.07, 0.065].map((r, i) => new THREE.Vector2(r, i * 0.04)), 18), GOLD()); chalice.position.set(0, 0.93, 0); altar.add(chalice);
  // 십자고상 (GPT 생성 이미지, 배경 제거)
  const ctex = loadTex('assets/tex/crucifix.webp'); const ch = 3.3, cw = ch * 551 / 956;
  const cr = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), new THREE.MeshStandardMaterial({ map: ctex, transparent: true, alphaTest: 0.35, roughness: 0.55, emissive: '#2a1d10', emissiveMap: ctex, emissiveIntensity: 0.5 }));
  cr.position.set(0, 4.15, -d / 2 + 0.1); cr.userData.noShadow = true; scene.add(cr);
  const crl = new THREE.SpotLight('#FFF0D0', 25, 10, 0.4, 0.7, 1.2); crl.position.set(0, 7.5, -4); crl.target = cr; scene.add(crl);
  // 뒤벽 장미창 (스테인드글라스)
  const roseTex = loadTex('assets/tex/stained.jpg');
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ map: roseTex, emissive: '#ffffff', emissiveMap: roseTex, emissiveIntensity: 1.0 }));
  rose.geometry.attributes.uv.array.forEach((v, i, arr) => { arr[i] = i % 2 ? 0.52 + v * 0.44 : 0.08 + v * 0.84; });
  rose.position.set(0, h - 1.55, -d / 2 + 0.04); rose.userData.noShadow = true; scene.add(rose);
  const roseRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.12, 10, 48), stone); roseRing.position.copy(rose.position); roseRing.position.z += 0.05; scene.add(roseRing);
  for (let k = 0; k < 8; k++) { const sp = box(0.05, 2.5, 0.05, M('#3a3530')); sp.position.copy(rose.position); sp.position.z += 0.06; sp.rotation.z = k / 8 * Math.PI; scene.add(sp); }
  // 제대 뒤 아치 벽감
  const niche = new THREE.Shape(); niche.moveTo(-2.2, 0); niche.lineTo(-2.2, 3.6); niche.absarc(0, 3.6, 2.2, Math.PI, 0, true); niche.lineTo(2.2, 0); niche.lineTo(-2.2, 0);
  const nm = new THREE.Mesh(new THREE.ShapeGeometry(niche), M('#d9d0bf', { roughness: 0.9 })); nm.position.set(0, 0.4, -d / 2 + 0.02); scene.add(nm);
  const nf = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.14, 8, 32, Math.PI), stone); nf.position.set(0, 4.0, -d / 2 + 0.06); scene.add(nf);
  for (const s of [-1, 1]) place(box(0.28, 3.6, 0.2, stone), s * 2.2, 2.2, -d / 2 + 0.06, scene);
  // 고딕 기둥 + 아치
  for (const z of [-3.6, 0.4, 3.6]) for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, h, 16), stone); c.position.set(s * 5.6, h / 2, z); scene.add(c); obs(s * 5.6, z, 0.68, 0.68);
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 16), stone), s * 5.6, 0.15, z, scene);
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.35, 16), stone), s * 5.6, h - 2.4, z, scene);
  }
  for (const s of [-1, 1]) for (const [za, zb] of [[-3.6, 0.4], [0.4, 3.6]]) {
    const span = zb - za; const arch = new THREE.Mesh(new THREE.TorusGeometry(span / 2, 0.18, 8, 24, Math.PI), stone); arch.position.set(s * 5.6, h - 2.2, (za + zb) / 2); arch.rotation.y = Math.PI / 2; scene.add(arch);
  }
  // 스테인드글라스 (GPT 생성 이미지가 있으면 사용, 없으면 색 조각)
  const sgTex = loadTex('assets/tex/stained.jpg');
  [-5, -0.5, 4].forEach((z, wi) => { for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.02); const sh = new THREE.Shape(); sh.moveTo(-0.7, 0); sh.lineTo(-0.7, 2.5); sh.absarc(0, 2.5, 0.7, Math.PI, 0, true); sh.lineTo(0.7, 0); sh.lineTo(-0.7, 0);
    const geo = new THREE.ShapeGeometry(sh); const uv = geo.attributes.uv, pp = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) + 0.7) / 1.4, pp.getY(i) / 3.2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: sgTex, emissive: '#ffffff', emissiveMap: sgTex, emissiveIntensity: 1.1, side: THREE.DoubleSide }));
    m.position.set(x, 2.2, z); m.rotation.y = -s * Math.PI / 2; m.userData.noShadow = true; scene.add(m);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 6, 20, Math.PI), stone); fr.position.set(x, 4.7, z); fr.rotation.y = Math.PI / 2; scene.add(fr);
    const lightCol = ['#7c93d6', '#d47b8c', '#e8c46b'][wi];
    if (s > 0) { const pl = new THREE.PointLight(lightCol, 3, 6, 1.5); pl.position.set(x - 1.2, 2.5, z); scene.add(pl); }
  } });
  // 봉헌초 구역 (4행×6열 = 24자리) — 단 위에 붉은 유리 잔 촛불
  const cd = SPACES.cathedral.candles;
  const table = rbox(cd.size[0], cd.size[2], cd.size[1], 0.03, M('#4a3426', { roughness: 0.5 })); table.position.set(cd.table[0], cd.size[2] / 2, cd.table[2]); scene.add(table); obs(cd.table[0], cd.table[2], cd.size[0], cd.size[1]);
  for (let r = 0; r < 4; r++) place(box(cd.size[0] - 0.1, 0.04, 0.16, M('#3a2a1e')), cd.table[0], cd.size[2] + 0.02 + r * 0.0, cd.table[2] - 0.27 + r * 0.18, scene);
  const slots = [];
  const candleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12), cupGeo = new THREE.CylinderGeometry(0.048, 0.042, 0.075, 14), flameGeo = new THREE.ConeGeometry(0.022, 0.075, 10);
  const cupM = new THREE.MeshStandardMaterial({ color: '#b02a2a', transparent: true, opacity: 0.78, roughness: 0.15 });
  let i = 0;
  for (let r = 0; r < cd.rows; r++) for (let c = 0; c < cd.cols; c++) {
    const x = cd.table[0] - (cd.cols - 1) / 2 * cd.dx + c * cd.dx, z = cd.table[2] - (cd.rows - 1) / 2 * cd.dz + r * cd.dz, y = cd.size[2] + 0.03;
    place(new THREE.Mesh(cupGeo, cupM), x, y + 0.035, z, scene);
    place(new THREE.Mesh(candleGeo, M('#F3E2BB')), x, y + 0.05, z, scene);
    const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: '#FFC76A', transparent: true, opacity: 0.95 })); flame.position.set(x, y + 0.16, z); flame.visible = false; scene.add(flame);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.17), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(x, y + 0.15, z); hit.userData.candleIdx = i; scene.add(hit); clickables.push(hit);
    slots.push({ idx: i, flame, pos: [x, y, z], seed: Math.random() * 10 }); i++;
  }
  const glow = new THREE.PointLight('#FFC76A', 0, 5, 1.6); glow.position.set(cd.table[0], 1.5, cd.table[2]); scene.add(glow);
  const label = sign(['봉헌초', '빈 초를 눌러 촛불을 켜세요'], 1.6, 0.42, { bg: '#F4F0E7', fg: '#233335', sub: '#5b6b6c', radius: 24 }); label.position.set(cd.table[0], 1.6, cd.table[2] - 0.55); scene.add(label);
  anim.push((t, dt, red) => { let lit = 0; for (const s of slots) if (s.flame.visible) { lit++; if (!red) { const k = 1 + Math.sin(t * 9 + s.seed) * 0.12 + Math.sin(t * 23 + s.seed) * 0.05; s.flame.scale.set(1, k, 1); } } glow.intensity = Math.min(4, lit * 0.45); });
  // 성모상 (GPT 생성 이미지, 배경 제거) — 왼쪽 앞 작은 제단
  const mary = new THREE.Group(); mary.position.set(-4.4, 0, -6.6); scene.add(mary);
  place(rbox(0.9, 0.8, 0.8, 0.05, stone), 0, 0.4, 0, mary);
  const mtex = loadTex('assets/tex/mary.webp'); const mh = 2.3;
  const mm = new THREE.Mesh(new THREE.PlaneGeometry(mh * 0.283, mh), new THREE.MeshStandardMaterial({ map: mtex, transparent: true, alphaTest: 0.35, roughness: 0.5, emissive: '#2a2a30', emissiveMap: mtex, emissiveIntensity: 0.45 }));
  mm.position.set(0, 0.8 + mh / 2, 0.1); mm.userData.noShadow = true; mary.add(mm);
  obs(-4.4, -6.6, 0.9, 0.8);
  const ml = new THREE.SpotLight('#FFF0D8', 10, 6, 0.5, 0.6, 1.4); ml.position.set(-3.6, 4.2, -4.6); ml.target = mm; scene.add(ml);
  for (let k = 0; k < 5; k++) { const c = candleStick(0.1, false); c.position.set(-4.75 + k * 0.17, 0.8, -6.2); scene.add(c); }
  // 말씀대 & 성가 (성당도)
  const lect = lectern('#4a3426'); lect.position.set(-3.7, 0, 5.4); lect.rotation.y = 0.5; scene.add(lect); obs(-3.7, 5.4, 0.7, 0.7);
  lect.userData.feature = 'bible'; lect.userData.approach = [-3.1, 6.3]; clickables.push(lect); props.lectern = lect; lect.add(featureTag('성경 말씀', 1.75));
  const hymn = lectern('#4a3426', '#5b2f36'); hymn.position.set(-6.3, 0, 1.9); hymn.rotation.y = 1.2; scene.add(hymn); obs(-6.3, 1.9, 0.7, 0.7);
  hymn.userData.feature = 'hymn'; hymn.userData.approach = [-5.4, 2.4]; clickables.push(hymn); props.hymn = hymn; hymn.add(featureTag('성가 듣기', 1.75));
  const pl = new THREE.PointLight('#E2E8FF', 5, 18, 1.4); pl.position.set(0, h - 2, 0); scene.add(pl);
  return { slots, access: [cd.access[0], cd.access[2]] };
}

function lectern(woodCol, bookCol = '#3b2a24') {
  const g = new THREE.Group(); const m = M(woodCol, { roughness: 0.45 });
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.06, 18), m), 0, 0.03, 0, g);
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.0, 12), m), 0, 0.53, 0, g);
  const top = rbox(0.6, 0.05, 0.45, 0.02, m); top.position.set(0, 1.05, 0); top.rotation.x = 0.35; g.add(top);
  const book = new THREE.Group(); book.position.set(0, 1.09, 0.01); book.rotation.x = 0.35; g.add(book);
  for (const s of [-1, 1]) { const pg = box(0.22, 0.02, 0.3, M('#F6F0E2')); pg.position.set(s * 0.115, 0.01, 0); pg.rotation.z = -s * 0.08; book.add(pg); }
  const cov = box(0.48, 0.012, 0.32, M(bookCol)); cov.position.y = -0.005; book.add(cov);
  return shadow(g);
}
function featureTag(text, y) {
  const s = sign([text], 1.1, 0.3, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 22 }); s.position.y = y; s.userData.billboard = true; return s;
}

// 샵 진열대
export const SHOPS = {
  temple: { title: '불교용품', sub: '승복·염주·목탁', pos: [5.4, 6.2], face: -Math.PI / 2, col: '#7d3324', goods: ['#C9894B', '#A8692F', '#E2B54C', '#9AA0A2'] },
  church: { title: '기독교 서점', sub: '성경·찬송가·복장', pos: [-5.6, 6.6], face: Math.PI / 2, col: '#5b4433', goods: ['#3b2a24', '#5b2f36', '#2F3D57', '#D2B887'] },
  cathedral: { title: '성물방', sub: '묵주·초·성경', pos: [5.0, 8.4], face: -Math.PI / 2, col: '#4a3426', goods: ['#6b4a6e', '#F3E2BB', '#3b2a24', '#8aa6c8'] },
};
function shopStall(cfg) {
  const g = new THREE.Group(); g.position.set(cfg.pos[0], 0, cfg.pos[1]); g.rotation.y = cfg.face;
  const wood = M(cfg.col, { roughness: 0.5 });
  place(rbox(2.2, 0.95, 0.7, 0.04, wood), 0, 0.475, 0, g);
  place(rbox(2.3, 0.05, 0.8, 0.02, M('#E8DBC6')), 0, 0.97, 0, g);
  for (const s of [-1, 1]) place(box(0.08, 2.3, 0.08, wood), s * 1.05, 1.15, -0.32, g);
  const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.3, 16, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#F4E6C8', side: THREE.DoubleSide })); awn.rotation.z = Math.PI / 2; awn.position.set(0, 2.25, -0.1); g.add(awn);
  for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.14, 16, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#C9573f', side: THREE.DoubleSide })); st.rotation.z = Math.PI / 2; st.position.set(-1.05 + i * 0.3, 2.25, -0.1); g.add(st); }
  // 진열 상품
  cfg.goods.forEach((c, i) => { const x = -0.75 + i * 0.5; const it = i % 2 ? rbox(0.28, 0.32, 0.2, 0.03, M(c)) : new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), M(c, { roughness: 0.35 })); it.position.set(x, 1.12, 0.05); if (!(i % 2)) it.rotation.x = 1.2; g.add(it); });
  const shelf = rbox(2.0, 0.04, 0.3, 0.015, wood); shelf.position.set(0, 1.6, -0.3); g.add(shelf);
  for (let i = 0; i < 6; i++) place(rbox(0.18, 0.24, 0.14, 0.02, M(cfg.goods[i % 4])), -0.75 + i * 0.3, 1.74, -0.3, g);
  const s = sign([cfg.title, cfg.sub], 1.7, 0.5, { bg: '#F4F0E7', fg: '#233335', sub: '#5b6b6c', border: '#C9AE73', radius: 24 }); s.position.set(0, 2.75, 0.0); g.add(s);
  g.userData.feature = 'shop';
  const cos = Math.cos(cfg.face), sin = Math.sin(cfg.face);
  const approach = [cfg.pos[0] + sin * 1.2, cfg.pos[1] + cos * 1.2];
  const ob = Math.abs(sin) > 0.5 ? [cfg.pos[0], cfg.pos[1], 0.9, 2.4] : [cfg.pos[0], cfg.pos[1], 2.4, 0.9];
  return { group: shadow(g), obs: ob, approach, face: cfg.face };
}

function xmasTree(c) {
  const g = new THREE.Group(); g.position.set(c.x, 0, c.z);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.42, c.r * 0.34, 0.4, 14), M(XMAS_TREE.pot)); pot.position.y = 0.2; g.add(pot);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), M(XMAS_TREE.trunk)); trunk.position.y = 0.5; g.add(trunk);
  const layers = [[c.r, 0.62, c.h * 0.36], [c.r * 0.78, 0.62 + c.h * 0.24, c.h * 0.32], [c.r * 0.55, 0.62 + c.h * 0.46, c.h * 0.28]];
  layers.forEach(([r, y, hh], i) => { const cone = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 14), M(XMAS_TREE.leaf[i], { flatShading: true })); cone.position.y = y + hh / 2; g.add(cone); });
  const topY = 0.62 + c.h * 0.46 + c.h * 0.28;
  const star = new THREE.Mesh(starGeo(c.star / 2, c.star / 4.5), new THREE.MeshStandardMaterial({ color: '#DDBB68', emissive: '#DDBB68', emissiveIntensity: 0.6, metalness: 0.4 })); star.position.y = Math.min(c.h, topY) + 0.08; g.add(star);
  const ballG = new THREE.SphereGeometry(c.ballR, 10, 8);
  const pointOn = (k, n) => { const t = (k + 0.5) / n; const y = 0.75 + t * (c.h - 1.1); const rr = c.r * (1 - t * 0.85) * 0.92; const a = k * 2.399; return [Math.cos(a) * rr, y, Math.sin(a) * rr]; };
  for (let k = 0; k < c.balls; k++) { const b = new THREE.Mesh(ballG, M(XMAS_TREE.deco[k % 3], { metalness: 0.3, roughness: 0.4 })); b.position.set(...pointOn(k, c.balls)); g.add(b); }
  const bulbG = new THREE.SphereGeometry(0.028, 8, 6); const bulbs = [];
  for (let k = 0; k < c.lights; k++) { const b = new THREE.Mesh(bulbG, new THREE.MeshStandardMaterial({ color: XMAS_TREE.bulb, emissive: XMAS_TREE.bulb, emissiveIntensity: 1.6 })); const p = pointOn(k + 0.5, c.lights); b.position.set(p[0] * 1.04, p[1] + 0.05, p[2] * 1.04); g.add(b); bulbs.push(b); }
  // 선물 상자
  [['#AC625A', 0.5, 0.3], ['#DDBB68', -0.45, 0.4], ['#5d8a7a', 0.1, 0.62]].forEach(([col, ox, oz], k) => { const s = 0.26 + k * 0.04; const bx = box(s, s, s, M(col)); bx.position.set(ox * c.r * 1.3, s / 2, oz * c.r * 1.3); g.add(bx); const rib = box(s + 0.01, 0.04, 0.05, M('#F3E6C5')); rib.position.set(bx.position.x, s + 0.0, bx.position.z); g.add(rib); });
  return { group: shadow(g), update: () => {} }; // 전구는 고정 점등(설계 기준)
}

function buildPlaygroundInterior(scene, obs, seats, machines, clickables, anim, reduced) {
  const P = PLAYGROUND;
  // 운세 존 바닥 표시
  const zone = (x, z, w, d, col, label) => { const m = box(w, 0.012, d, M(col)); m.position.set(x, 0.006, z); m.receiveShadow = true; scene.add(m); if (label) { const s = sign([label], 2.4, 0.5, { bg: '#F4F0E7', fg: '#233335', radius: 24 }); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.02, z + d / 2 - 0.45); scene.add(s); } };
  zone(0, -7.8, 19, 3.6, '#E9DAF0');
  zone(-9.6, 0, 3.2, 10, '#F7E1CC');
  zone(9.6, -5.5, 2.6, 5, '#F6D9D2');
  // 존 간판 (뒤 벽)
  const wallSign = (txt, x, z, ry = 0, col = '#C9AE73') => { const s = sign([txt], 3.2, 0.7, { bg: '#F4F0E7', fg: '#233335', border: col, radius: 26 }); s.position.set(x, 3.4, z); s.rotation.y = ry; scene.add(s); };
  wallSign('운세 존', 0, -10.84, 0, '#B99BCB');
  wallSign('게임 존', -11.84, 0, Math.PI / 2, '#E9A26D');
  wallSign('랜덤박스', 11.84, -5.5, -Math.PI / 2, '#D98C7D');
  // 기계 배치
  for (const def of P.machines) {
    const m = buildMachine(def, {});
    const ry = def.face === 1 ? Math.PI / 2 : def.face === -1 ? -Math.PI / 2 : 0;
    m.position.set(def.x, 0, def.z); m.rotation.y = ry; scene.add(m); machines.push(m); clickables.push(m);
    const ap = def.face === 1 ? [def.x + 1.2, def.z] : def.face === -1 ? [def.x - 1.2, def.z] : [def.x, def.z + 1.2];
    m.userData.approach = ap; m.userData.face = ry;
    const isK = def.type === 'kids'; obs(def.x, def.z, def.face ? (isK ? 0.65 : 0.8) : (isK ? 0.75 : 0.9), def.face ? (isK ? 0.75 : 0.9) : (isK ? 0.65 : 0.8));
    if (def.type === 'gacha') anim.push((t, dt, red) => { if (!red && m.userData.spin > 0) { m.userData.spin -= dt; m.userData.caps.rotation.y += dt * 9; m.userData.knob.rotation.z += dt * 6; } });
  }
  // 어린이 놀이방 매트 (1m 교차 배치)
  const { c, size, colors } = P.mat;
  for (let ix = 0; ix < size[0]; ix++) for (let iz = 0; iz < size[1]; iz++) { const t = box(0.98, 0.035, 0.98, M(colors[(ix + iz * 2) % 4])); t.position.set(c[0] - size[0] / 2 + 0.5 + ix, 0.0175, c[1] - size[1] / 2 + 0.5 + iz); t.receiveShadow = true; scene.add(t); }
  const fence = M(P.fence);
  const fx1 = c[0] + size[0] / 2, fz0 = c[1] - size[1] / 2, fz1 = c[1] + size[1] / 2;
  // 오른쪽·뒤쪽 낮은 울타리
  for (let z = fz0; z <= fz1; z += 0.5) { const p = box(0.06, 0.55, 0.06, fence); p.position.set(fx1 - 0.1, 0.275, z); scene.add(p); }
  place(box(0.06, 0.06, size[1], fence), fx1 - 0.1, 0.5, c[1], scene);
  for (let x = c[0] - size[0] / 2; x <= fx1; x += 0.5) { const p = box(0.06, 0.55, 0.06, fence); p.position.set(x, 0.275, fz0 - 0.1); scene.add(p); }
  place(box(size[0], 0.06, 0.06, fence), c[0], 0.5, fz0 - 0.1, scene);
  const ks = sign(['어린이 놀이방', '아이 키 높이 기계'], 2.6, 0.7, { bg: '#FFF0D1', fg: '#684C32', sub: '#8a6a4a', border: '#F1CE79', radius: 26 }); ks.position.set(c[0], 2.15, fz0 - 0.15); scene.add(ks);
  // 놀이방 소품: 쌓기 블록·공
  const toys = ['#E9A26D', '#78B8BD', '#F1CE79', '#DDA7B7', '#A2C89B'];
  for (let k = 0; k < 6; k++) { const b = box(0.3, 0.3, 0.3, M(toys[k % 5])); b.position.set(4.2 + (k % 3) * 0.34, 0.185 + Math.floor(k / 3) * 0.3, 6.6); scene.add(b); }
  obs(4.55, 6.6, 1.1, 0.4);
  for (let k = 0; k < 3; k++) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), M(toys[(k + 2) % 5], { roughness: 0.4 })); ball.position.set(8.4 + k * 0.5, 0.25, 7.2 - k * 0.6); scene.add(ball); }
  // 휴식 벤치 3개 × 2인 = 6석
  let idx = 0;
  for (const [x, z] of P.benches) {
    const b = new THREE.Group(); const wood = M('#A17C58'), leg = M('#52645E');
    place(box(2.4, 0.07, 0.65, wood), 0, 0.35, 0, b); place(box(2.4, 0.4, 0.06, wood), 0, 0.6, -0.3, b);
    for (const sx of [-1, 1]) place(box(0.08, 0.35, 0.55, leg), sx * 1.05, 0.175, 0, b);
    b.position.set(x, 0, z); scene.add(b); obs(x, z - 0.05, 2.4, 0.55);
    for (const sx of [-0.6, 0.6]) seats.push({ idx: idx++, x: x + sx, z: z + 0.05, ry: 0, y: 0.35, type: 'bench', zone: 'rest', approach: [x + sx, z + 0.62] });
  }
  // 12지신 석상 원형 마당 (GPT 생성 석상 이미지)
  const zc = [-5.6, -3.4], zr = 2.05;
  const ring = new THREE.Mesh(new THREE.RingGeometry(zr - 0.5, zr + 0.55, 48), M('#cfc6b4', { roughness: 0.95 })); ring.rotation.x = -Math.PI / 2; ring.position.set(zc[0], 0.012, zc[1]); ring.receiveShadow = true; scene.add(ring);
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.3, 24), M('#b9b2a2')); center.position.set(zc[0], 0.15, zc[1]); scene.add(center);
  const zs = sign(['12지신', '내 띠를 눌러 보세요'], 1.3, 0.36, { bg: '#F4F0E7', fg: '#233335', sub: '#5b6b6c', border: '#B99BCB', radius: 22 }); zs.position.set(zc[0], 0.75, zc[1]); zs.userData.billboard = true; scene.add(zs);
  obs(zc[0], zc[1], 1.2, 1.2);
  ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep', 'monkey', 'rooster', 'dog', 'pig'].forEach((id, i) => {
    const a = -Math.PI / 2 + i / 12 * Math.PI * 2; const x = zc[0] + Math.cos(a) * zr, z = zc[1] + Math.sin(a) * zr;
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.22, 18), M('#a39c8d', { roughness: 0.9 })); ped.position.y = 0.11; g.add(ped);
    const tex = loadTex(`assets/tex/zodiac/${id}.webp`);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.0), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide }));
    st.position.y = 0.22 + 0.5; st.userData.billboard = true; st.userData.noShadow = true; g.add(st);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.65; g.add(hit);
    g.userData.zodiac = id; g.userData.approach = [zc[0] + Math.cos(a) * (zr + 0.85), zc[1] + Math.sin(a) * (zr + 0.85)];
    clickables.push(g); obs(x, z, 0.5, 0.5); machines.push(g);
  });
  plant(scene, -11, 9.5, 0, 1.0, 0.35); plant(scene, -11, -9.8, 0, 1.0, 0.35); plant(scene, 11, 9.5, 0, 1.0, 0.35);
  // 천장 가랜드 (뒤쪽)
  const cols = ['#E9A26D', '#78B8BD', '#F1CE79', '#DDA7B7', '#ACA0D2'];
  for (let i = 0; i < 24; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 3), M(cols[i % 5])); f.rotation.x = Math.PI; f.position.set(-11.5 + i, 4.4 - Math.sin((i % 6) / 5 * Math.PI) * 0.3, -10.8); scene.add(f); }
}

function buildAnnex(scene, key, ax, obs, seats, d, h) {
  const X0 = ax.x0, X1 = ax.x1, cx = (X0 + X1) / 2, W = X1 - X0;
  const fl = box(W, 0.302, d, M(ax.floor)); fl.position.set(cx, -0.149, 0); fl.receiveShadow = true; scene.add(fl);
  // 구역 벽 색 (뒤·옆 외벽에 덧댐)
  const wm = M(ax.wall);
  const bw = box(W, h - 0.01, 0.05, wm); bw.position.set(cx, h / 2, -d / 2 + 0.02); scene.add(bw);
  const sw = box(0.05, h - 0.01, d, wm); sw.position.set(ax.side > 0 ? X1 - 0.02 : X0 + 0.02, h / 2, 0); scene.add(sw);
  // 경계: 낮은 칸막이 + 문틀(문짝 없음)
  const bx = ax.side > 0 ? X0 : X1, bm = M(ax.border);
  const { z0, z1 } = ANNEX.door;
  const part = (za, zb) => { const L = zb - za; const p = box(ANNEX.partition.t, ANNEX.partition.h, L, bm); p.position.set(bx, ANNEX.partition.h / 2, (za + zb) / 2); scene.add(p); for (let z = za; z <= zb + 0.01; z += 1.5) { const post = box(0.16, ANNEX.partition.h + 0.15, 0.16, bm); post.position.set(bx, (ANNEX.partition.h + 0.15) / 2, Math.min(z, zb)); scene.add(post); } };
  part(-d / 2, z0); part(z1, d / 2);
  for (const z of [z0, z1]) { const post = box(0.12, ANNEX.door.h, 0.12, bm); post.position.set(bx, ANNEX.door.h / 2, z); scene.add(post); }
  const lintel = box(0.14, 0.14, z1 - z0 + 0.12, bm); lintel.position.set(bx, ANNEX.door.h, (z0 + z1) / 2); scene.add(lintel);
  const ds = sign([ax.name], 1.6, 0.42, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 24 }); ds.position.set(bx, ANNEX.door.h + 0.4, (z0 + z1) / 2); ds.rotation.y = ax.side > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(ds);
  const ds2 = ds.clone(); ds2.rotation.y = -ds.rotation.y; scene.add(ds2);
  // 테이블·좌석
  let idx = 20;
  for (const [tx, tz] of ax.tables) {
    if (ax.table.round) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(ax.table.r, ax.table.r, 0.05, 20), M('#E8DBC6')); top.position.set(tx, ax.table.h, tz); scene.add(top);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, ax.table.h, 8), M(ax.wood)); leg.position.set(tx, ax.table.h / 2, tz); scene.add(leg);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.04, 14), M(ax.wood)); base.position.set(tx, 0.02, tz); scene.add(base);
      obs(tx, tz, 1.0, 1.0);
      // 컵 2개
      for (const sx of [-0.25, 0.25]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), M('#F4EEE2')); cup.position.set(tx + sx, ax.table.h + 0.075, tz); scene.add(cup); }
    } else {
      const top = box(ax.table.w, 0.06, ax.table.d, M(ax.wood)); top.position.set(tx, ax.table.h, tz); scene.add(top);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(box(0.08, ax.table.h, 0.08, M(ax.wood)), tx + sx * (ax.table.w / 2 - 0.1), ax.table.h / 2, tz + sz * (ax.table.d / 2 - 0.1), scene);
      obs(tx, tz, ax.table.w, ax.table.d);
      // 찻주전자 + 찻잔 4개
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), M('#6F8973')); pot.scale.y = 0.9; pot.position.set(tx + 0.25, ax.table.h + 0.11, tz); scene.add(pot);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.04, 10), M('#6F8973')); lid.position.set(tx + 0.25, ax.table.h + 0.2, tz); scene.add(lid);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.1, 6), M('#6F8973')); spout.rotation.z = 0.9; spout.position.set(tx + 0.36, ax.table.h + 0.12, tz); scene.add(spout);
      for (const [ox, oz] of [[0.55, 0], [-0.55, 0], [0, 0.3], [0, -0.3]]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.07, 10), M('#DAD2BC')); cup.position.set(tx + ox, ax.table.h + 0.065, tz + oz); scene.add(cup); }
    }
    for (const [ox, oz] of ax.seatOffsets) {
      const sx = tx + ox, sz = tz + oz;
      const ry = Math.atan2(tx - sx, tz - sz); // 테이블을 바라봄
      const seat = { idx: idx++, x: sx, z: sz, ry, zone: 'annex', type: ax.seat.type };
      if (ax.seat.type === 'cushion') { const m = box(ax.seat.size, 0.08, ax.seat.size, M(ax.seat.color)); m.position.set(sx, 0.04, sz); scene.add(m); seat.y = 0.08; seat.approach = [sx - Math.sin(ry) * 0.5, sz - Math.cos(ry) * 0.5]; }
      else { const m = chair(ax.seat.w, ax.seat.d, ax.seat.h, ax.seat.color); m.position.set(sx, 0, sz); m.rotation.y = ry; scene.add(m); obs(sx, sz, 0.45, 0.45); seat.y = ax.seat.h; seat.approach = [sx - Math.sin(ry) * 0.62, sz - Math.cos(ry) * 0.62]; }
      seats.push(seat);
    }
  }
  if (ax.cabinet) { const c = ax.cabinet; const cab = box(c.size[0], c.size[2], c.size[1], M(c.color)); cab.position.set(c.c[0], c.size[2] / 2, c.c[1]); scene.add(cab); obs(c.c[0], c.c[1], c.size[0], c.size[1]); for (let k = -2; k <= 2; k++) { const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.2, 10), M(['#6F8973', '#B58A5B', '#DAD2BC'][(k + 2) % 3])); jar.position.set(c.c[0] + k * 0.42, c.size[2] + 0.1, c.c[1]); scene.add(jar); } const s = sign(['다도실', '따뜻한 차 한 잔'], 1.6, 0.5, { bg: '#344D46', fg: '#F1E5CC', sub: '#d8ccb4', radius: 18 }); s.position.set(c.c[0], 1.8, -d / 2 + 0.08); scene.add(s); }
  if (ax.counter) {
    const c = ax.counter; const body = box(c.size[0], c.size[2], c.size[1], M('#B99C78')); body.position.set(c.c[0], c.size[2] / 2, c.c[1]); scene.add(body);
    place(box(c.size[0] + 0.06, 0.05, c.size[1] + 0.06, M('#E8DBC6')), c.c[0], c.size[2] + 0.025, c.c[1], scene); obs(c.c[0], c.c[1], c.size[0], c.size[1]);
    const mc = box(0.6, 0.55, 0.45, M('#46575B')); mc.position.set(c.c[0] - 0.8, c.size[2] + 0.05 + 0.275, c.c[1]); scene.add(mc);
    place(box(0.3, 0.12, 0.05, M('#c9ae73', { emissive: '#c9ae73', emissiveIntensity: 0.3 })), c.c[0] - 0.8, c.size[2] + 0.45, c.c[1] + 0.23, scene);
    place(box(0.65, 0.03, 0.35, M('#6b5340')), c.c[0] + 0.8, c.size[2] + 0.065, c.c[1], scene);
    for (let k = 0; k < 6; k++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10), M('#F4EEE2')); cup.position.set(c.c[0] + 0.58 + (k % 3) * 0.2, c.size[2] + 0.13, c.c[1] - 0.08 + Math.floor(k / 3) * 0.16); scene.add(cup); }
    const menu = sign(['무료 커피', '잠시 쉬어가세요'], 0.9 * 1.6, 0.6 * 1.0, { bg: '#344D46', fg: '#F1E5CC', sub: '#d8ccb4', radius: 14 }); menu.position.set(c.c[0], 1.7, -d / 2 + 0.08); scene.add(menu);
  }
  for (const [x, z] of ax.plants) { plant(scene, x, z, 0, 0.8, 0.3); obs(x, z, 0.6, 0.6); }
  // 따뜻한 펜던트 조명
  for (const [tx, tz] of ax.tables) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#FFE2B0', { emissive: '#FFD79A', emissiveIntensity: 0.9, side: THREE.DoubleSide })); lamp.rotation.x = Math.PI; lamp.position.set(tx, 2.6, tz); scene.add(lamp); }
  return [Math.min(X0, X1), -d / 2, Math.max(X0, X1), d / 2];
}

function wallpaperTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#F6EEDC'; g.fillRect(0, 0, 512, 512);
  const cols = ['#F1CE79', '#A8D6CA', '#B8D4EB', '#E8B8C5', '#D7C3EA'];
  for (let i = 0; i < 14; i++) { const x = (i * 97) % 512, y = (i * 173) % 512; g.fillStyle = cols[i % 5];
    if (i % 3 === 0) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 9 : 22; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
    else if (i % 3 === 1) { g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.arc(x + 18, y - 6, 20, 0, Math.PI * 2); g.arc(x + 38, y, 15, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.ellipse(x, y, 16, 20, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#c9b89a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + 20); g.quadraticCurveTo(x + 6, y + 40, x - 2, y + 58); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 2); return t;
}

/* ================= 카페·식당 (실제 매장 샘플 구조: 창가·홀·소파·룸·셀프바·화장실·주방) ================= */
import { STORES, chairsOf } from './features/stores.js';
function storeChair(cafe, wood, linen) {
  const g = new THREE.Group(); const metal = M('#1f1d1c', { metalness: 0.6, roughness: 0.4 });
  if (cafe) { // 우드 시트 + 블랙 스틸 다리 (카페 의자)
    place(rbox(0.44, 0.05, 0.42, 0.02, wood), 0, 0.45, 0, g); place(rbox(0.4, 0.05, 0.38, 0.02, linen), 0, 0.49, 0.01, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), metal); l.position.set(sx * 0.19, 0.225, sz * 0.18); l.rotation.z = sx * 0.05; g.add(l); }
    const back = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 20, Math.PI), metal); back.position.set(0, 0.68, -0.19); g.add(back);
    place(rbox(0.36, 0.1, 0.03, 0.01, wood), 0, 0.82, -0.19, g);
  } else { // 원목 등받이 의자 (식당)
    place(rbox(0.44, 0.06, 0.42, 0.02, wood), 0, 0.45, 0, g); place(rbox(0.4, 0.04, 0.38, 0.02, linen), 0, 0.5, 0.01, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(box(0.04, 0.45, 0.04, wood), sx * 0.19, 0.225, sz * 0.18, g);
    for (const sx of [-1, 1]) place(box(0.04, 0.5, 0.04, wood), sx * 0.19, 0.72, -0.18, g);
    for (let k = 0; k < 3; k++) place(box(0.38, 0.05, 0.025, wood), 0, 0.62 + k * 0.12, -0.18, g);
  }
  return g;
}
function pendantLamp(scene, x, z, h, cafe) {
  const y = h - 1.45; const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, h - y, 4), M('#1a1716')), 0, y + (h - y) / 2, 0, g);
  if (cafe) { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.22, 24, 1, true), M('#1f2a2a', { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })); sh.position.y = y + 0.08; g.add(sh); }
  else { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#f3e3c3', emissive: '#ffcf8a', emissiveIntensity: 0.55, side: THREE.DoubleSide, roughness: 1 })); sh.position.y = y + 0.05; g.add(sh); }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); bulb.position.y = y - 0.02; g.add(bulb);
  const sp = new THREE.SpotLight('#ffd8a0', 5, 4.5, 0.75, 0.6, 1.4); sp.position.set(0, y, 0); sp.target.position.set(0, 0, 0); g.add(sp, sp.target);
}
// 벽면 마감·장식 — 실제 매장처럼 (벽돌 포인트 벽, 원목 루버, 액자, 선반, 식물, 굽도리)
function storeDecor(scene, key, w, d, h, anim, obs) {
  const cafe = key === 'cafe'; const X0 = -w / 2, Z0 = -d / 2;
  // 굽도리
  for (const [x, z, ww, dd] of [[0, Z0 + 0.02, w, 0.04], [X0 + 0.02, 0, 0.04, d]]) { const b = box(ww, 0.12, dd, M('#2a2420')); b.position.set(x, 0.06, z); scene.add(b); }
  if (cafe) {
    // 카운터 뒤 화이트 벽돌 포인트 벽
    const br = box(7.4, h, 0.02, photoMat('whitebrick', 3.2, 1.8, { nor: true, roughness: 0.9 })); br.position.set(X0 + 3.7, h / 2, Z0 + 0.01); scene.add(br);
    // 왼쪽 벽: 원목 루버 + 액자 + 선반
    const lv = photoMat('oak', 0.2, 2, { roughness: 0.5 });
    for (let z = -1.0; z <= 5.4; z += 0.16) { const s2 = box(0.05, 2.6, 0.08, lv); s2.position.set(X0 + 0.05, 1.3, z); scene.add(s2); }
    art(scene, X0 + 0.04, 1.75, -4.0 + 5.2, Math.PI / 2, 1.1, 0.8, 0); art(scene, X0 + 0.04, 2.0, 3.7 + 2.0, Math.PI / 2, 0.6, 0.8, 1);
    const sh = rbox(0.25, 0.04, 2.2, 0.01, photoMat('walnut')); sh.position.set(X0 + 0.15, 2.95, 2.3); scene.add(sh);
    for (let i = 0; i < 5; i++) { const p = plantPot(0.32, 0.09); p.position.set(X0 + 0.15, 2.97, 1.4 + i * 0.45); scene.add(p); }
    // 매달린 식물 (창가)
    for (let i = 0; i < 4; i++) { const hp = plantPot(0.35, 0.12); hp.position.set(w / 2 - 0.7, h - 1.0, -4 + i * 2.6); scene.add(hp); place(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 4), M('#7a6a5a')), w / 2 - 0.7, h - 0.45, -4 + i * 2.6, scene); }
    // 노출 천장 덕트·레일 조명
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, w - 1, 20), M('#cfd2d3', { metalness: 0.8, roughness: 0.35 })); duct.rotation.z = Math.PI / 2; duct.position.set(0, h - 0.35, -3.5); scene.add(duct);
    const rail = box(0.05, 0.05, d - 2, M('#1a1716')); rail.position.set(-1.0, h - 0.06, 0); scene.add(rail);
    // 원두 자루·바구니
    for (let i = 0; i < 2; i++) { const bag = rbox(0.5, 0.6, 0.35, 0.12, photoMat('linen', 1, 1, { color: '#bba481' })); bag.position.set(-7.3 + i * 0.6, 0.3, -3.6); scene.add(bag); }
    obs(-7.0, -3.6, 1.2, 0.5);
    // 테이크아웃 픽업대 네온
    const neon = sign(['COFFEE & DESSERT'], 2.6, 0.38, { bg: '#2d3433', fg: '#ffd9a0', radius: 10 }); neon.position.set(X0 + 3.7, 3.55, Z0 + 0.07); scene.add(neon);
  } else {
    // 왼쪽 벽: 원목 판넬 징두리 + 한지 등 + 서예 액자
    const pl = photoMat('planks', 6, 1, { nor: true, roughness: 0.6, color: '#d9c0a0' });
    const wn = box(0.05, 1.2, d - 6, pl); wn.position.set(X0 + 0.03, 0.6, 2.4); scene.add(wn);
    art(scene, X0 + 0.04, 2.1, 0.6, Math.PI / 2, 0.7, 1.0, 2);
    // 뒷벽 붉은 벽돌 포인트
    const br = box(5.2, h, 0.04, photoMat('redbrick', 2.2, 1.9, { nor: true, roughness: 0.9 })); br.position.set(0.6, h / 2, Z0 + 0.03); scene.add(br);
    const nm = sign(['정성 담은 한 끼'], 2.4, 0.42, { bg: '#2a1f1a', fg: '#f3d9a4', radius: 10 }); nm.position.set(0.6, 3.4, Z0 + 0.07); scene.add(nm);
    // 홀–창가 사이 원목 슬랫 칸막이
    const sl = photoMat('oak', 0.2, 2, { roughness: 0.5, color: '#c9a27a' });
    for (const zc of [-1.9, 1.1]) { for (let i = -6; i <= 6; i++) { const s2 = box(0.04, 1.7, 0.04, sl); s2.position.set(6.3, 0.85, zc + i * 0.09); scene.add(s2); } const base = box(0.18, 0.08, 1.2, sl); base.position.set(6.3, 0.04, zc); scene.add(base); obs(6.3, zc, 0.2, 1.2); }
    // 장독대 (입구 옆)
    for (let i = 0; i < 3; i++) { const og = new THREE.Mesh(new THREE.SphereGeometry(0.22 - i * 0.04, 16, 12), M('#5a3a2a', { roughness: 0.35 })); og.scale.y = 1.2; og.position.set(-6.0 + i * 0.5, 0.26 - i * 0.04, 7.3); scene.add(og); }
    obs(-5.5, 7.3, 1.6, 0.6);
  }
}
const ART = [['#e9d8c0', '#c27b5a', '#2d4a4a'], ['#dfe6e0', '#7a9a8a', '#e3b866'], ['#f4ecd8', '#2a2a2a', '#b33a2a']];
function art(scene, x, y, z, ry, w, h, k) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w); const g = c.getContext('2d'); const [bg, a, b] = ART[k % 3];
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  if (k === 2) { g.fillStyle = a; g.font = 'bold 72px serif'; g.textAlign = 'center'; '食爲天'.split('').forEach((ch, i) => g.fillText(ch, 128, 90 + i * 90)); g.fillStyle = b; g.fillRect(170, c.height - 60, 26, 26); }
  else { g.fillStyle = a; g.beginPath(); g.arc(c.width * 0.4, c.height * 0.45, c.width * 0.28, 0, Math.PI * 2); g.fill(); g.fillStyle = b; g.fillRect(c.width * 0.5, c.height * 0.5, c.width * 0.35, c.height * 0.3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; scene.add(grp);
  grp.add(box(w + 0.06, h + 0.06, 0.03, M('#1f1a17')));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); p.position.z = 0.02; grp.add(p);
}
export function buildStoreInterior(scene, key, obs, seats, clickables, anim, w, d, h, props) {
  const st = STORES[key]; const cafe = key === 'cafe';
  const wood = photoMat('walnut', 1, 1, { roughness: 0.45, color: cafe ? '#c9a58a' : '#a88870' }), light = photoMat(cafe ? 'oak' : 'walnut', 1, 1, { roughness: 0.38, color: cafe ? '#ffffff' : '#d8bfa6' });
  const marble = photoMat('marble', 1, 1, { roughness: 0.18 }), leather = photoMat('leather', 1, 1, { roughness: 0.55, nor: true, color: cafe ? '#c48a62' : '#9a6a4a' }), linen = photoMat('linen', 1, 1, { roughness: 0.95, color: cafe ? '#cfc2ad' : '#b9a58c' });
  storeDecor(scene, key, w, d, h, anim, obs);
  // 오른쪽 통창 + 바깥 풍경
  const viewTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9cc3e6'); gr.addColorStop(0.6, '#f3d9b8'); gr.addColorStop(0.61, '#7f9b6a'); gr.addColorStop(1, '#5d7a4f'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 18; i++) { g.fillStyle = ['#4f6e45', '#6b8a55', '#7a9a5c'][i % 3]; g.beginPath(); g.arc(30 + i * 58, 150 - (i % 3) * 8, 26 + (i % 2) * 10, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c9b89a'; g.fillRect(0, 205, 1024, 51);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sv = loadTex(`assets/tex/store_${cafe ? 'street_view' : 'street_view2'}.jpg`); sv.wrapS = THREE.RepeatWrapping; sv.repeat.set(0.42, 1); sv.offset.set(cafe ? 0.33 : 0.05, 0);
  const glassView = new THREE.Mesh(new THREE.PlaneGeometry(d - 1.2, 2.6), new THREE.MeshBasicMaterial({ map: sv || viewTex, color: '#f2f2f2' }));
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(d - 1.2, 2.6), new THREE.MeshPhysicalMaterial({ color: '#dfe9ee', transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, envMapIntensity: 1.5 })); glassPane.position.set(w / 2 - 0.12, 1.85, 0); glassPane.rotation.y = -Math.PI / 2; glassPane.userData.noShadow = true; scene.add(glassPane);
  glassView.position.set(w / 2 - 0.02, 1.85, 0); glassView.rotation.y = -Math.PI / 2; glassView.userData.noShadow = true; scene.add(glassView);
  for (let z = -d / 2 + 0.6; z <= d / 2 - 0.6 + 0.01; z += (d - 1.2) / 5) { const m = box(0.08, 2.7, 0.08, M('#3a3533', { metalness: 0.5, roughness: 0.4 })); m.position.set(w / 2 - 0.06, 1.85, z); scene.add(m); }
  for (const y of [0.52, 3.18]) { const m = box(0.1, 0.08, d - 1.1, M('#3a3533', { metalness: 0.5, roughness: 0.4 })); m.position.set(w / 2 - 0.06, y, 0); scene.add(m); }
  const sunIn = new THREE.DirectionalLight('#FFE9C8', 1.1); sunIn.position.set(w / 2 + 6, 6, 2); sunIn.target.position.set(0, 0, 0); scene.add(sunIn, sunIn.target);
  // 벽 장식: 카페는 메뉴보드·선반, 식당은 한지 등·액자
  // 고정 시설
  for (const f of st.fixtures) {
    if (f.kind === 'counter') {
      const c = rbox(f.w, 1.0, f.d, 0.04, wood); c.position.set(f.x, 0.5, f.z); scene.add(c);
      const top = rbox(f.w + 0.1, 0.06, f.d + 0.1, 0.02, marble); top.position.set(f.x, 1.03, f.z); scene.add(top);
      const kick = box(f.w - 0.1, 0.1, 0.02, M('#1e1a17')); kick.position.set(f.x, 0.05, f.z + f.d / 2 + 0.005); scene.add(kick);
      const strip = box(f.w - 0.1, 0.02, 0.02, new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); strip.position.set(f.x, 0.96, f.z + f.d / 2 + 0.03); scene.add(strip);
      if (cafe) {
        const mach = rbox(0.9, 0.5, 0.5, 0.05, M('#c9cbcc', { metalness: 0.8, roughness: 0.3 })); mach.position.set(f.x - 1.0, 1.32, f.z - 0.1); scene.add(mach);
        for (const s of [-0.2, 0.2]) place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), M('#2b2b2b')), f.x - 1.0 + s, 1.0 + 0.18, f.z + 0.12, scene);
        const grinder = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.45, 14), M('#2b2b2b', { metalness: 0.4 })); grinder.position.set(f.x - 0.2, 1.28, f.z - 0.1); scene.add(grinder);
        const pos = rbox(0.35, 0.28, 0.3, 0.03, M('#1e2224')); pos.position.set(f.x + 1.3, 1.2, f.z + 0.1); pos.rotation.y = -0.4; scene.add(pos);
        for (let i = 0; i < 6; i++) place(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.11, 10), M('#F4EEE2')), f.x + 0.4 + (i % 3) * 0.12, 1.12, f.z - 0.2 + Math.floor(i / 3) * 0.12, scene);
        const board = sign(['MENU', '아메리카노 4,500 · 카페라떼 5,000 · 콜드브루 5,000'], 3.6, 1.1, { bg: '#2d3433', fg: '#F1E5CC', sub: '#d8ccb4', radius: 14 }); board.position.set(f.x, 2.75, -d / 2 + 0.05); scene.add(board);
        const shelf = rbox(3.6, 0.05, 0.25, 0.01, wood); shelf.position.set(f.x, 1.95, -d / 2 + 0.15); scene.add(shelf);
        for (let i = 0; i < 9; i++) place(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 10), M(['#c98a4b', '#f2e6d0', '#5b3f2a'][i % 3])), f.x - 1.6 + i * 0.4, 2.09, -d / 2 + 0.15, scene);
      } else {
        const pos = rbox(0.4, 0.3, 0.32, 0.03, M('#1e2224')); pos.position.set(f.x - 0.5, 1.2, f.z); pos.rotation.y = Math.PI; scene.add(pos);
        const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: '#7fd3c6' })); sc.position.set(f.x - 0.5, 1.22, f.z - 0.165); sc.rotation.y = Math.PI; scene.add(sc);
      }
      obs(f.x, f.z, f.w, f.d);
      const lb = sign([f.label], 1.3, 0.3, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 18 }); lb.position.set(f.x, 1.7, f.z + f.d / 2 + 0.05); if (!cafe) lb.position.y = 1.85; scene.add(lb);
      props.counter = { x: f.x, z: f.z };
    }
    if (f.kind === 'case') {
      const c = rbox(f.w, 0.95, f.d, 0.03, wood); c.position.set(f.x, 0.475, f.z); scene.add(c);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(f.w - 0.06, 0.45, f.d - 0.06), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05 })); glass.position.set(f.x, 1.2, f.z); scene.add(glass);
      for (let i = 0; i < 6; i++) { const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14, 1, false, 0, Math.PI * 1.6), M(['#f2d7a6', '#7a4a2a', '#f4c2c2'][i % 3])); cake.position.set(f.x - 0.55 + (i % 3) * 0.55, 1.03, f.z - 0.15 + Math.floor(i / 3) * 0.3); scene.add(cake); }
      obs(f.x, f.z, f.w, f.d);
    }
    if (f.kind === 'selfbar') {
      const c = rbox(f.w, 0.9, f.d, 0.03, light); c.position.set(f.x, 0.45, f.z); scene.add(c);
      if (cafe) { const disp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 16), new THREE.MeshPhysicalMaterial({ color: '#d9eef5', transparent: true, opacity: 0.55, roughness: 0.05 })); disp.position.set(f.x - 0.6, 1.12, f.z); scene.add(disp); for (let i = 0; i < 3; i++) place(rbox(0.22, 0.14, 0.22, 0.02, M(['#f4eee2', '#c9a27a', '#2d3433'][i])), f.x + 0.05 + i * 0.28, 0.98, f.z, scene); }
      else { for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.1, 16), M('#e9e2d6', { roughness: 0.3 })); b.position.set(f.x - 1.0 + i * 0.5, 0.96, f.z); scene.add(b); place(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(['#c0392b', '#7a9a3c', '#e6b84a', '#8a5a3a', '#d9534f'][i])), f.x - 1.0 + i * 0.5, 1.0, f.z, scene); } }
      obs(f.x, f.z, f.w, f.d);
      const lb = sign([f.label], 1.8, 0.3, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 18 }); lb.position.set(f.x, 1.75, -d / 2 + 0.06); scene.add(lb);
      props.selfbar = { x: f.x, z: f.z };
    }
    if (f.kind === 'restroom' || f.kind === 'kitchen' || f.kind === 'room') {
      const x0 = f.x - f.w / 2, x1 = f.x + f.w / 2, z0 = f.z - f.d / 2, z1 = f.z + f.d / 2;
      const wallM = f.kind === 'kitchen' ? photoMat('kitchen', 2, 1, { roughness: 0.3 }) : f.kind === 'restroom' ? photoMat('wtiles', 1.5, 1.5, { roughness: 0.25, nor: true, ns: 0.4 }) : photoMat('planks', 1.2, 1, { roughness: 0.6, nor: true, color: '#e8d6c0' });
      const H = f.kind === 'room' ? 2.6 : 2.8;
      if (f.kind === 'kitchen') {
        const low = rbox(f.w, 1.0, 0.25, 0.03, M('#5a4636')); low.position.set(f.x, 0.5, z1); scene.add(low);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(f.w, 1.2), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.05 })); gl.position.set(f.x, 1.6, z1); scene.add(gl);
        for (let i = 0; i < 3; i++) { const st2 = rbox(1.5, 0.9, 0.7, 0.03, M('#c9cbcc', { metalness: 0.8, roughness: 0.3 })); st2.position.set(x0 + 1.0 + i * 2.0, 0.45, z0 + 0.5); scene.add(st2); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.25, 16), M('#9aa0a2', { metalness: 0.8, roughness: 0.3 })); pot.position.set(x0 + 1.0 + i * 2.0, 1.03, z0 + 0.5); scene.add(pot); }
        const hood = rbox(f.w - 0.4, 0.4, 0.9, 0.03, M('#b9bcbd', { metalness: 0.8, roughness: 0.35 })); hood.position.set(f.x, 2.6, z0 + 0.5); scene.add(hood);
        const steam = []; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false })); scene.add(s); steam.push(s); }
        anim.push((t, dt, red) => steam.forEach((s, i) => { const k = (t * 0.4 + i / 6) % 1; s.position.set(x0 + 1.0 + (i % 3) * 2.0, 1.15 + k * 1.2, z0 + 0.5); s.scale.setScalar(1 + k * 2.5); s.material.opacity = red ? 0 : 0.18 * (1 - k); }));
        for (const xx of [x0, x1]) { const sw = box(0.12, H, f.d, wallM); sw.position.set(xx, H / 2, f.z); scene.add(sw); }
      } else {
        // 벽 + 문
        const doorW = 0.95;
        const sides = f.kind === 'room' ? [['z', z0], ['z', z1], ['x', x1]] : [['z', z1], ['x', f.x < 0 ? x1 : x0]];
        for (const [ax, v] of sides) {
          const len = ax === 'z' ? f.w : f.d; const cxx = ax === 'z' ? f.x : v, czz = ax === 'z' ? v : f.z;
          const hasDoor = (f.kind === 'restroom' && ax === 'z') || (f.kind === 'room' && ax === 'x');
          if (!hasDoor) { const wl = box(ax === 'z' ? len : 0.12, H, ax === 'z' ? 0.12 : len, wallM); wl.position.set(cxx, H / 2, czz); scene.add(wl); obs(cxx, czz, ax === 'z' ? len : 0.14, ax === 'z' ? 0.14 : len); continue; }
          const nDoors = f.kind === 'restroom' ? 2 : 1;
          // 문 사이 벽 조각
          const segs = []; let a = -len / 2;
          const doorsAt = nDoors === 2 ? [-len / 4, len / 4] : [0];
          for (const dp of doorsAt) { segs.push([a, dp - doorW / 2]); a = dp + doorW / 2; } segs.push([a, len / 2]);
          for (const [s0, s1] of segs) { if (s1 - s0 < 0.05) continue; const L = s1 - s0, mid = (s0 + s1) / 2; const wl = box(ax === 'z' ? L : 0.12, H, ax === 'z' ? 0.12 : L, wallM); wl.position.set(ax === 'z' ? f.x + mid : cxx, H / 2, ax === 'z' ? czz : f.z + mid); scene.add(wl); obs(wl.position.x, wl.position.z, ax === 'z' ? L : 0.14, ax === 'z' ? 0.14 : L); }
          doorsAt.forEach((dp, i) => {
            const dx = ax === 'z' ? f.x + dp : cxx, dz = ax === 'z' ? czz : f.z + dp;
            const top = box(ax === 'z' ? doorW : 0.12, H - 2.1, ax === 'z' ? 0.12 : doorW, wallM); top.position.set(dx, 2.1 + (H - 2.1) / 2, dz); scene.add(top);
            if (f.kind === 'restroom') {
              const door = box(ax === 'z' ? doorW - 0.08 : 0.06, 2.05, ax === 'z' ? 0.06 : doorW - 0.08, M(cafe ? '#7a5a40' : '#5b3f2a')); door.position.set(dx, 1.03, dz); scene.add(door); obs(dx, dz, doorW, 0.2);
              const pic = sign([i ? '여자 화장실' : '남자 화장실'], 0.7, 0.24, { bg: i ? '#E8B8C5' : '#A8C4E8', fg: '#233335', radius: 14 }); pic.position.set(dx, 1.75, dz + 0.05); scene.add(pic);
            }
          });
        }
        if (f.kind === 'room') { const lb = sign(['룸 (최대 8명)'], 1.4, 0.32, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 18 }); lb.position.set(x1 + 0.08, 2.35, f.z); lb.rotation.y = Math.PI / 2; scene.add(lb);
          const fl = box(f.w - 0.1, 0.02, f.d - 0.1, M('#a98563')); fl.position.set(f.x, 0.011, f.z); scene.add(fl); }
        if (f.kind === 'restroom') { const lb = sign(['화장실'], 1.0, 0.3, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 18 }); lb.position.set(f.x, H + 0.25, z1 + 0.08); scene.add(lb); obs(f.x, f.z, f.w - 0.3, f.d - 0.3); }
      }
      if (f.kind === 'kitchen') { obs(f.x, f.z, f.w, f.d); const lb = sign([f.label], 1.4, 0.32, { bg: '#F4F0E7', fg: '#233335', border: '#C9AE73', radius: 18 }); lb.position.set(f.x, 2.95, z1 + 0.05); scene.add(lb); }
    }
    if (f.kind === 'bench') { const b = rbox(f.w, 0.42, f.d, 0.05, wood); b.position.set(f.x, 0.21, f.z); scene.add(b); obs(f.x, f.z, f.w, f.d); const lb = sign([f.label], 0.9, 0.26, { bg: '#F4F0E7', fg: '#233335', radius: 14 }); lb.position.set(f.x, 1.2, f.z - 0.2); scene.add(lb); }
    if (f.kind === 'plant') { plant(scene, f.x, f.z, 0, 1.2, 0.38); obs(f.x, f.z, f.w, f.d); }
  }
  // 테이블 + 의자 (의자 = 앉을 수 있는 자리)
  let idx = 0; const tables = [];
  for (const t of st.tables) {
    const g = new THREE.Group(); g.position.set(t.x, 0, t.z); scene.add(g);
    const th = t.chairs === 'bar' ? 1.05 : 0.74;
    const top = t.round ? new THREE.Mesh(new THREE.CylinderGeometry(t.w / 2, t.w / 2, 0.05, 28), light) : rbox(t.w, 0.05, t.d, 0.02, light);
    top.position.y = th; g.add(top);
    if (t.round) { place(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, th, 10), M('#2b2b2b')), 0, th / 2, 0, g); place(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.03, 16), M('#2b2b2b')), 0, 0.015, 0, g); }
    else for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(box(0.05, th, 0.05, wood), sx * (t.w / 2 - 0.08), th / 2, sz * (t.d / 2 - 0.08), g);
    // 식기
    const settings = Math.min(t.cap, 4);
    for (let i = 0; i < (cafe ? 0 : settings); i++) { const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.015, 16), M('#F7F4EE', { roughness: 0.3 })); plate.position.set((i % 2 ? 0.18 : -0.18) * Math.min(1, t.w), th + 0.035, (i < 2 ? -0.15 : 0.15) * Math.min(1, t.d)); g.add(plate); }
    if (!cafe) { const box2 = rbox(0.22, 0.1, 0.1, 0.01, wood); box2.position.set(0, th + 0.075, 0); g.add(box2); for (let k = 0; k < 4; k++) place(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 5), M('#c9cbcc', { metalness: 0.9, roughness: 0.2 })), -0.06 + k * 0.04, th + 0.14, 0, g);
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12), new THREE.MeshPhysicalMaterial({ color: '#cfe6ee', transparent: true, opacity: 0.55, roughness: 0.05 })); bottle.position.set(0.2 * Math.min(1, t.w), th + 0.145, 0); g.add(bottle);
      const tis = rbox(0.14, 0.08, 0.1, 0.01, M('#f6f3ec')); tis.position.set(-0.22 * Math.min(1, t.w), th + 0.065, 0); g.add(tis); }
    else { const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 10), new THREE.MeshPhysicalMaterial({ color: '#d8ece6', transparent: true, opacity: 0.6, roughness: 0.05 })); vase.position.set(0, th + 0.085, 0); g.add(vase); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M(['#e8a0a8', '#f2d27a', '#ffffff'][idx % 3])); fl.position.set(0, th + 0.19, 0); g.add(fl);
      if (idx % 3 === 1) for (const sx of [-0.15, 0.15]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 14), M('#f7f4ee', { roughness: 0.25 })); cup.position.set(sx * Math.min(1, t.w * 1.4), th + 0.065, 0.08); g.add(cup); const cof = new THREE.Mesh(new THREE.CircleGeometry(0.04, 14), M('#4a2a18', { roughness: 0.2 })); cof.rotation.x = -Math.PI / 2; cof.position.set(cup.position.x, th + 0.1, 0.08); g.add(cof); } }
    // 예약석 표시 팻말 (예약 정보가 들어오면 보임)
    const tag = sign(['예약석'], 0.42, 0.16, { bg: '#C9AE73', fg: '#263532', radius: 10 }); tag.position.set(0, th + 0.13, 0); tag.visible = false; tag.userData.billboard = true; g.add(tag);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.2, 1.2, t.d + 0.2), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.6; hit.userData.tableId = t.id; g.add(hit); clickables.push(hit);
    obs(t.x, t.z, t.w + 0.05, t.d + 0.05);
    for (const [cx, cz, ry] of chairsOf(t)) {
      let m, sy;
      if (t.chairs === 'bar') { m = new THREE.Group(); place(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16), M('#3a3533')), 0, 0.72, 0, m); place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), M('#2b2b2b', { metalness: 0.6 })), 0, 0.36, 0, m); place(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 16), M('#2b2b2b', { metalness: 0.6 })), 0, 0.3, 0, m).rotation.x = Math.PI / 2; sy = 0.75; }
      else if (t.chairs === 'sofa' && Math.abs(ry - Math.PI / 2) < 0.01) { m = new THREE.Group(); place(rbox(0.62, 0.3, 0.66, 0.04, wood), 0, 0.15, 0, m); place(rbox(0.6, 0.16, 0.62, 0.07, leather), 0, 0.38, 0.02, m); place(rbox(0.6, 0.62, 0.2, 0.08, leather), 0, 0.68, -0.27, m); sy = 0.44; }
      else { m = storeChair(cafe, wood, linen); sy = 0.45; }
      m.position.set(cx, 0, cz); m.rotation.y = ry; scene.add(m);
      const seat = { idx: idx++, x: cx, z: cz, ry, y: sy, type: t.chairs === 'bar' ? 'stool' : t.chairs === 'sofa' && Math.abs(ry - Math.PI / 2) < 0.01 ? 'sofa' : 'chair', zone: 'dine', table: t.id };
      seat.approach = [cx - Math.sin(ry) * 0.6, cz - Math.cos(ry) * 0.6];
      seats.push(seat);
    }
    tables.push({ ...t, group: g, tag });
  }
  // 조명
  const pend = cafe ? '#FFE2B0' : '#FFD8A0';
  for (const t of st.tables) { if (t.chairs === 'bar') continue; if (true) { pendantLamp(scene, t.x, t.z, h, cafe); continue; } const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(cafe ? '#2d3433' : '#d9c6a0', { emissive: pend, emissiveIntensity: 0.6, side: THREE.DoubleSide })); lamp.rotation.x = Math.PI; lamp.position.set(t.x, h - 1.3, t.z); scene.add(lamp); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: pend })); bulb.position.set(t.x, h - 1.38, t.z); scene.add(bulb); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.3, 4), M('#2a2422')); cord.position.set(t.x, h - 0.65, t.z); scene.add(cord); }
  const pl = new THREE.PointLight(pend, 6, 16, 1.5); pl.position.set(0, h - 1, 0); scene.add(pl);
  // 입구 매트·간판
  const mat = box(1.6, 0.012, 0.9, M('#8a7766', { roughness: 1 })); mat.position.set(0, 0.006, d / 2 - 0.5); scene.add(mat);
  return tables;
}

/* ================= 영상 스크린 (교회 설교·성당 미사·카페/식당 홍보) ================= */
const SCREEN_SLIDES = {
  church: [['오늘의 말씀', '항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라 (살전 5:16-18)'], ['주일 예배', '오전 11시 · 오후 2시'], ['▶ 예배·설교 영상', '화면을 누르면 영상을 볼 수 있어요']],
  cathedral: [['매일 미사', '평일 오전 6시 · 저녁 7시 30분'], ['주님의 평화가 함께', '봉헌초를 켜고 함께 기도해요'], ['▶ 미사 영상', '화면을 누르면 미사 영상을 볼 수 있어요']],
  cafe: [['오늘의 추천', '바닐라라떼 5,500원 · 바스크 치즈케이크 6,500원'], ['자리 예약 · 미리 주문', '원하는 자리를 골라 예약하세요'], ['▶ 매장 영상', '화면을 누르면 영상을 볼 수 있어요']],
  restaurant: [['오늘의 정식', '한우 불고기 정식 16,000원'], ['룸 · 원탁 예약 가능', '단체 모임도 미리 주문까지'], ['▶ 매장 영상', '화면을 누르면 영상을 볼 수 있어요']],
  stage: [['골목어게인', '매주 금·토 버스킹 · DJ 음악다방 · 거리노래방'], ['용마미식거리', '매주 금·토 17:00~22:00 차 없는 거리'], ['▶ 공연 영상', '화면을 누르면 영상을 볼 수 있어요']],
};
export function addScreen(scene, kind, { x, y, z, ry = 0, w = 2.6, h = 1.46 }, clickables, anim) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  const frame = box(w + 0.14, h + 0.14, 0.08, M('#1b1e20', { roughness: 0.35, metalness: 0.3 })); g.add(frame);
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.045; scr.userData.noShadow = true; g.add(scr);
  const slides = SCREEN_SLIDES[kind]; let i = -1;
  const draw = () => {
    i = (i + 1) % slides.length; const [t1, t2] = slides[i]; const W = c.width, H = c.height;
    const gr = ctx.createLinearGradient(0, 0, W, H); const pal = { church: ['#3b2a1e', '#7a5a3a'], cathedral: ['#1f2a44', '#4b3a6b'], cafe: ['#3a2a1e', '#8a5f3f'], restaurant: ['#3a1e1a', '#7a3a2a'], stage: ['#0E1F4D', '#7a2e0e'] }[kind] || ['#222', '#555'];
    gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,230,180,.08)'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(W * (0.1 + k * 0.12), H * 0.85, 40 + k * 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.textAlign = 'center'; ctx.fillStyle = '#F7EBD3'; ctx.font = `700 ${Math.round(H * 0.16)}px "Noto Sans KR", sans-serif`; ctx.fillText(t1, W / 2, H * 0.42);
    ctx.fillStyle = '#E9D6AE'; let fs = H * 0.085; ctx.font = `500 ${Math.round(fs)}px "Noto Sans KR", sans-serif`; while (ctx.measureText(t2).width > W * 0.9 && fs > 14) { fs *= 0.92; ctx.font = `500 ${Math.round(fs)}px "Noto Sans KR", sans-serif`; } ctx.fillText(t2, W / 2, H * 0.62);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(W - 70, H - 60, 30, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(W - 80, H - 76); ctx.lineTo(W - 52, H - 60); ctx.lineTo(W - 80, H - 44); ctx.closePath(); ctx.fill();
    for (let k = 0; k < slides.length; k++) { ctx.fillStyle = k === i ? '#F7EBD3' : 'rgba(247,235,211,.35)'; ctx.beginPath(); ctx.arc(W / 2 - (slides.length - 1) * 14 + k * 28, H - 34, 7, 0, Math.PI * 2); ctx.fill(); }
    tex.needsUpdate = true;
  };
  draw(); let acc = 0; anim.push((t, dt) => { acc += dt; if (acc > 4.5) { acc = 0; draw(); } });
  const glow = new THREE.PointLight('#ffe2b0', 1.2, 4, 2); glow.position.set(0, 0, 0.8); g.add(glow);
  g.userData.videoScreen = kind; clickables.push(g);
  return g;
}
