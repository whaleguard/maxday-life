// 입구 지도: 해 질 무렵의 작은 마을 — 산 중턱 맥스데이사, 언덕 위 맥스데이교회, 광장의 맥스데이성당, 공원의 맥스데이 놀이터
// 작게 보이다가 누르면 카메라가 그 건물로 날아가 크게 보여줌
import * as THREE from 'three';
import { M, GOLD, box, place, shadow, rbox, hanokRoof, grassTex, stoneTex, skyTex, tileRoofTex, lotusLantern } from './common.js';
import { GARDEN, BRAND, SPACES, STREET, SPACE_ORDER } from '../config.js';

export const MAP_SPOTS = {
  temple: { pos: [-30, 0, -40], view: { pos: [-30, 17, -14], look: [-30, 9, -40] }, pinH: 9 },
  church: { pos: [27, 0, -16], view: { pos: [27, 9, 4], look: [27, 4, -16] }, pinH: 10 },
  cathedral: { pos: [12, 0, 12], view: { pos: [12, 8, 34], look: [12, 5, 10] }, pinH: 13 },
  playground: { pos: [-17, 0, 15], view: { pos: [-17, 8, 34], look: [-17, 2, 14] }, pinH: 7 },
  cafe: { pos: [-34, 0, 21], view: { pos: [-34, 7, 36], look: [-34, 2, 20] }, pinH: 6.5 },
  restaurant: { pos: [33, 0, 15], view: { pos: [33, 7, 31], look: [33, 2, 14] }, pinH: 7 },
};
export const FEATURED = SPACE_ORDER[0] === 'foodstreet'; // 미식거리 중심 마을(용마): 지도 가운데 크게
if (SPACES.foodstreet) MAP_SPOTS.foodstreet = FEATURED ? { pos: [-3, 0, -12], view: { pos: [-3, 26, 24], look: [-3, 4, -13] }, pinH: 7 } : { pos: [-12, 0, -11], view: { pos: [-12, 12, 12], look: [-12, 2, -12] }, pinH: 9 };
if (SPACES.arcade) MAP_SPOTS.arcade = { pos: [43, 0, -9], view: { pos: [43, 8, 8], look: [43, 2.5, -10] }, pinH: 7 };
for (const k of Object.keys(MAP_SPOTS)) if (!SPACE_ORDER.includes(k)) delete MAP_SPOTS[k];
const HAS_TEMPLE = SPACE_ORDER.includes('temple');

// 지형 높이
function riverZ(x) { return 3 + Math.sin(x * 0.06) * 4 + Math.sin(x * 0.13) * 1.5; }
export function heightAt(x, z) {
  let h = 0;
  // 뒤쪽 산맥
  const back = Math.max(0, (-z - 22) / 30);
  h += Math.pow(back, 1.6) * 26 * (0.75 + 0.25 * Math.sin(x * 0.09) + 0.15 * Math.sin(x * 0.23 + 1));
  // 절 터(평탄 대지)
  const dt = Math.hypot((x + 30) / 13, (z + 40) / 9);
  if (dt < 1.4) { const k = Math.min(1, Math.max(0, (1.4 - dt) / 0.5)); h = h * (1 - k) + 9.2 * k; }
  // 교회 언덕
  const dc = Math.hypot(x - 27, z + 16);
  h += 3.2 * Math.exp(-dc * dc / 120);
  // 강
  const dr = Math.abs(z - riverZ(x));
  if (dr < 3.2 && z > -20) h -= (1 - dr / 3.2) * 1.4;
  return h;
}

export function buildMap({ low }) {
  const scene = new THREE.Scene();
  scene.background = skyTex([[0, '#24304A'], [0.45, '#7E6382'], [0.75, '#D59A86'], [1, '#F2C79A']]);
  scene.fog = new THREE.Fog('#B8909A', 130, 280);
  const sun = new THREE.DirectionalLight('#FFCF98', 3.2); sun.position.set(-60, 38, 25);
  sun.castShadow = !low; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 60, bottom: -60, near: 1, far: 200 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  scene.add(sun, new THREE.HemisphereLight('#E9C7B0', '#2f3a2f', 0.55));
  const anim = [];
  // 지형
  const tg = new THREE.PlaneGeometry(220, 180, 140, 115); tg.rotateX(-Math.PI / 2);
  const p = tg.attributes.position; const col = [];
  const cGrass = new THREE.Color('#6a7f55'), cDry = new THREE.Color('#8c8a5c'), cRock = new THREE.Color('#7a7466'), cForest = new THREE.Color('#3f5a42');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y);
    const c = cGrass.clone();
    if (y > 4 && z < -22) c.lerp(cForest, Math.min(1, (y - 4) / 8));
    if (y > 16) c.lerp(cRock, Math.min(1, (y - 16) / 10));
    c.lerp(cDry, Math.max(0, Math.sin(x * 0.11) * Math.sin(z * 0.07)) * 0.35);
    col.push(c.r, c.g, c.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex('#cfd6c0', { repeat: [40, 32] }), roughness: 0.95 }));
  terrain.receiveShadow = true; scene.add(terrain);
  // 강물
  const wg = new THREE.PlaneGeometry(220, 7, 110, 1); wg.rotateX(-Math.PI / 2);
  const wp = wg.attributes.position; for (let i = 0; i < wp.count; i++) { const x = wp.getX(i); wp.setZ(i, wp.getZ(i) + riverZ(x)); wp.setY(i, -0.55); }
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: '#4f7f9e', roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.92, envMapIntensity: 1.6 }));
  scene.add(water); anim.push((t) => { water.material.color.setHSL(0.57, 0.33, 0.44 + Math.sin(t * 0.5) * 0.02); });
  // 길
  const roadMat = new THREE.MeshStandardMaterial({ color: '#cdbb9c', roughness: 0.95 });
  const road = (pts, w = 2.6) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const N = Math.max(20, Math.round(curve.getLength() * 1.5));
    const pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, c = curve.getPoint(t), d = curve.getTangent(t); const nx = -d.z, nz = d.x;
      for (const s of [-1, 1]) { const x = c.x + nx * s * w / 2, z = c.z + nz * s * w / 2; pos.push(x, Math.max(heightAt(x, z), -0.2) + 0.06, z); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, roadMat); m.receiveShadow = true; scene.add(m);
    // 강을 건너는 곳에 다리
    let last = -1;
    for (let i = 0; i <= N; i++) { const t = i / N, c = curve.getPoint(t); if (Math.abs(c.z - riverZ(c.x)) < 0.6 && c.z > -20 && i - last > 8) { last = i; const d = curve.getTangent(t); const br = rbox(w + 1.0, 0.3, 8, 0.08, M('#9c8466')); br.position.set(c.x, 0.15, c.z); br.rotation.y = Math.atan2(d.x, d.z); scene.add(shadow(br)); for (const s of [-1, 1]) { const rail = box(0.12, 0.55, 8, M('#6e5a44')); rail.position.set((w / 2 + 0.4) * s, 0.4, 0); br.add(rail); } } }
    return curve;
  };
  road([[0, 70], [0, 40], [1, 26], [0, 20]], 3.2);
  road([[0, 20], [-8, 18], [-17, 21]]);
  road([[0, 20], [6, 18], [12, 19]]);
  road([[1, 26], [16, 12], [24, 0], [27, -9]]);
  if (HAS_TEMPLE) road([[0, 20], [-6, 4], [-14, -6], [-22, -14], [-28, -24]], 2.2);
  else road([[0, 20], [-6, 4], [-12, -5]], 2.2);
  road([[-17, 21], [-26, 24], [-34, 26]], 2.2);
  road([[12, 19], [22, 20], [33, 20]], 2.2);
  // 절 돌계단 (산길)
  const stairs = new THREE.Group(); if (HAS_TEMPLE) scene.add(stairs);
  for (let i = 0; i < 26; i++) { const t = i / 25; const z = -24 - t * 10, x = -28 - t * 2; const y = heightAt(x, z); const s = rbox(2.6, 0.3, 0.6, 0.05, M('#a8a293')); s.position.set(x, y + 0.1, z); stairs.add(s); }
  shadow(stairs);

  const clickables = [], buildings = {};
  const reg = (key, g) => { g.traverse(o => { o.userData.space = key; }); scene.add(g); clickables.push(g); buildings[key] = g; };
  if (MAP_SPOTS.temple) reg('temple', templeComplex());
  if (MAP_SPOTS.church) reg('church', churchBuilding());
  if (MAP_SPOTS.cathedral) reg('cathedral', cathedralBuilding());
  if (MAP_SPOTS.playground) reg('playground', playgroundPark(anim));
  if (MAP_SPOTS.cafe) reg('cafe', cafeBuilding());
  if (MAP_SPOTS.restaurant) reg('restaurant', restaurantBuilding());
  if (MAP_SPOTS.foodstreet) reg('foodstreet', foodStreetMap(anim));
  if (MAP_SPOTS.arcade) reg('arcade', arcadeBuilding(anim));
  const di = driveIn(anim); scene.add(di); clickables.push(di);
  // 12지신 석상 — 절로 올라가는 돌계단 양옆 (누르면 띠별 운세)
  if (HAS_TEMPLE) ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'sheep', 'monkey', 'rooster', 'dog', 'pig'].forEach((id, i) => {
    const side = i % 2 ? 1 : -1, t = 0.02 + Math.floor(i / 2) * 0.165; const z = -24 - t * 10, x = -28 - t * 2 + side * 2.15; const y = heightAt(x, z);
    const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
    place(rbox(0.9, 0.45, 0.9, 0.06, M('#9d9686', { roughness: 0.95 })), 0, 0.22, 0, g);
    place(rbox(0.7, 0.12, 0.7, 0.04, M('#b6af9f', { roughness: 0.9 })), 0, 0.5, 0, g);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.85), new THREE.MeshStandardMaterial({ map: new THREE.TextureLoader().load(`assets/tex/zodiac/${id}.webp`, t2 => { t2.colorSpace = THREE.SRGBColorSpace; }), transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide }));
    st.position.y = 0.56 + 0.92; st.userData.billboard = true; g.add(st);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.6, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.3; g.add(hit);
    g.userData.zodiac = id; clickables.push(g); shadow(g);
  });
  // 숲·나무 (인스턴싱으로 그리기 호출 최소화)
  const rand = mulberry(42);
  const pines = [];
  for (let i = 0; i < 190; i++) {
    const x = (rand() - 0.5) * 210, z = -22 - rand() * 64; const h = heightAt(x, z);
    if (HAS_TEMPLE && Math.hypot((x + 30) / 13, (z + 40) / 9) < 1.3) continue;
    if (inFeat(x, z, 2)) continue;
    if (HAS_TEMPLE && Math.abs(x + 28) < 3.5 && z > -37) continue;
    if (Math.hypot(x - 27, z + 16) < 8) continue;
    if (Math.abs(x - DRIVE_IN.pos[0]) < 17 && z > DRIVE_IN.pos[2] - 6) continue;
    pines.push([x, h - 0.1, z, 3 + rand() * 3.5, rand() * 3]);
  }
  scene.add(instancedPines(pines));
  const rounds = [];
  for (let i = 0; i < 70; i++) {
    const x = (rand() - 0.5) * 150, z = -18 + rand() * 70; const h = heightAt(x, z);
    if (nearAny(x, z, 9) || Math.abs(x) < 3 || Math.abs(z - riverZ(x)) < 3.5) continue;
    rounds.push([x, h, z, 2.6 + rand() * 1.6, rand() < 0.3 ? 1 : 0, rand() * 6]);
  }
  const rt = instancedRoundTrees(rounds); scene.add(rt.group);
  anim.push((tt, red) => { if (!red) rt.sway(tt); });
  // 마을 집
  const roofCols = ['#8a4b3c', '#4b6372', '#6b5a4a', '#516b55', '#7a5a7a'];
  const houses = [[34, 6], [40, -4], [38, 16], [24, 22], [30, 30], [44, 26], [-34, 8], [-40, 18], [-30, 28], [-6, 34], [8, 34], [-44, 2], [46, 8], [-24, -2], [16, -4]];
  houses.forEach(([x, z], i) => { if (nearAny(x, z, 8)) return; const hs = house(roofCols[i % roofCols.length], i); hs.position.set(x, heightAt(x, z), z); hs.rotation.y = Math.atan2(-x * 0.2, 40 - z) * 0.3 + (i % 3 - 1) * 0.3; scene.add(hs); });
  // 가로등
  const lamps = [];
  [[-1.8, 34], [1.8, 28], [-3, 22], [3, 21], [-10, 17], [8, 16], [18, 8], [23, -2]].forEach(([x, z]) => { const l = streetLamp(); l.position.set(x, heightAt(x, z), z); scene.add(l); lamps.push(l); });
  anim.push((t, red) => { if (red) return; lamps.forEach((l, i) => l.userData.glow.material.emissiveIntensity = 1.6 + Math.sin(t * 2 + i) * 0.15); });
  // 정원 운세 기계 (마을 입구)
  // 구름
  const cloudM = new THREE.MeshStandardMaterial({ color: '#f6dccf', roughness: 1, transparent: true, opacity: 0.85 });
  const clouds = [];
  for (let i = 0; i < 9; i++) { const c = new THREE.Group(); for (let k = 0; k < 5; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2 + rand() * 2.2, 12, 8), cloudM); s.position.set(k * 2.6 - 5, rand() * 1.2, rand() * 2); s.scale.y = 0.55; c.add(s); } c.position.set(-90 + rand() * 180, 34 + rand() * 12, -80 + rand() * 50); scene.add(c); clouds.push(c); }
  anim.push((t, red, dt) => { if (red) return; clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.05); if (c.position.x > 110) c.position.x = -110; }); });
  // 새
  return {
    scene, clickables, buildings, kind: 'map', anim,
    update(t, red, dt = 0.016) { anim.forEach(f => f(t, red, dt)); },
  };
}

const inFeat = (x, z, m = 0) => FEATURED && Math.abs(x + 3) < 19 + m && Math.abs(z + 12) < 15 + m;
function nearAny(x, z, r) { return inFeat(x, z, r * 0.3) || Object.values(MAP_SPOTS).some(s => Math.hypot(s.pos[0] - x, s.pos[2] - z) < r + 4) || (Math.abs(x - DRIVE_IN.pos[0]) < 16 + r * 0.5 && z > DRIVE_IN.pos[2] - 5 - r * 0.5 && z < DRIVE_IN.pos[2] + 18 + r * 0.5); }
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function house(roofCol, seed) {
  const g = new THREE.Group(); const w = 3.6 + (seed % 3) * 0.6, d = 3.2, h = 2.2;
  place(box(w, h, d, M(['#efe3cf', '#e6d6bd', '#f1e8da'][seed % 3])), 0, h / 2, 0, g);
  const roof = new THREE.Mesh(gable(w + 0.5, d + 0.6, 1.3), new THREE.MeshStandardMaterial({ map: tileRoofTex(roofCol, { repeat: [3, 2] }), roughness: 0.8 })); roof.position.y = h; g.add(roof);
  const win = new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffbf6a', emissiveIntensity: 1.1 });
  place(box(0.6, 0.6, 0.06, win), -w * 0.25, h * 0.55, d / 2 + 0.02, g); place(box(0.6, 0.6, 0.06, win), w * 0.25, h * 0.55, d / 2 + 0.02, g);
  place(box(0.7, 1.2, 0.06, M('#6b4a35')), 0, 0.6, d / 2 + 0.02, g);
  return shadow(g);
}
export function gable(w, d, h) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  // UV: 경사면 타일용
  const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getZ(i) / 2, (pos.getY(i) + Math.abs(pos.getX(i))) / 2);
  return g;
}
function streetLamp() {
  const g = new THREE.Group();
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3, 8), M('#2f3436', { metalness: 0.5, roughness: 0.4 })), 0, 1.5, 0, g);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffc06a', emissiveIntensity: 1.6 })); glow.position.y = 3.1; g.add(glow); g.userData.glow = glow;
  place(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 8), M('#2f3436')), 0, 3.35, 0, g);
  return shadow(g);
}

/* ---------- 맥스데이사 (산사): 일주문 + 대웅전 + 범종각 + 석등 + 탑 ---------- */
function templeComplex() {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.temple.pos; const y0 = 9.2;
  g.position.set(cx, y0, cz);
  const wood = M('#7a3f2c'), red = M('#8B433E'), wall = M('#E9DEC6');
  // 기단
  place(rbox(14, 1.0, 9, 0.08, new THREE.MeshStandardMaterial({ map: stoneTex('#b9b2a2', { tiles: 6, repeat: [3, 2] }), roughness: 0.9 })), 0, 0.5, 0, g);
  // 대웅전
  const hall = new THREE.Group(); hall.position.set(0, 1.0, -0.5); g.add(hall);
  place(box(10.4, 3.2, 6.2, wall), 0, 1.6, 0, hall);
  for (let i = 0; i < 6; i++) { const x = -5 + i * 2; const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.4, 14), wood); col.position.set(x, 1.7, 3.15); hall.add(col); }
  for (let i = 0; i < 5; i++) { const x = -4 + i * 2; const door = box(1.7, 2.6, 0.08, M('#9a5a3a')); door.position.set(x, 1.4, 3.12); hall.add(door); for (let k = 0; k < 4; k++) { const lat = box(1.5, 0.05, 0.1, M('#c99a5a')); lat.position.set(x, 0.5 + k * 0.6, 3.17); hall.add(lat); } }
  place(box(10.8, 0.5, 6.6, new THREE.MeshStandardMaterial({ color: '#2f6f62' })), 0, 3.4, 0, hall);
  place(box(10.9, 0.14, 6.7, red), 0, 3.15, 0, hall);
  const roof = hanokRoof(14.5, 10.4, 2.9, { color: '#3d4b49', upturn: 0.9 }); roof.position.set(0, 3.6, 0); hall.add(roof);
  // 현판
  const plaque = box(1.8, 0.6, 0.1, M('#2f3a36')); plaque.position.set(0, 3.42, 3.42); hall.add(plaque);
  const pl2 = box(1.6, 0.44, 0.02, new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 0.6, roughness: 0.35 })); pl2.position.set(0, 3.42, 3.48); hall.add(pl2);
  // 범종각
  const bell = new THREE.Group(); bell.position.set(5.6, 1.0, 3.2); g.add(bell);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 2.2, 10), wood); c.position.set(sx * 0.9, 1.1, sz * 0.9); bell.add(c); }
  const bellRoof = hanokRoof(3.2, 3.2, 1.1, { color: '#3d4b49', upturn: 0.5 }); bellRoof.position.y = 2.25; bell.add(bellRoof);
  const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.0, 18), new THREE.MeshStandardMaterial({ color: '#5d6a5c', metalness: 0.8, roughness: 0.4 })); bl.position.y = 1.45; bell.add(bl);
  // 석탑
  const pag = new THREE.Group(); pag.position.set(-4.8, 1.0, 3.0); g.add(pag);
  const stoneM = M('#b2ab9c');
  place(box(1.4, 0.4, 1.4, stoneM), 0, 0.2, 0, pag);
  for (let i = 0; i < 3; i++) { const s = 1 - i * 0.2; place(box(0.8 * s, 0.6 * s, 0.8 * s, stoneM), 0, 0.7 + i * 0.85, 0, pag); const r = hanokRoof(1.4 * s, 1.4 * s, 0.22, { color: '#a59f90', upturn: 0.12, seg: 12 }); r.position.y = 1.0 + i * 0.85 + 0.0 * s; pag.add(r); }
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.8, 8), GOLD()), 0, 3.6, 0, pag);
  // 연등 줄
  const cols = ['#F2A6A0', '#F6D46E', '#9FD1B6', '#F7F2E8', '#A9C4E8'];
  for (let i = 0; i < 11; i++) { const l = lotusLantern(cols[i % 5], 0.2); l.position.set(-5 + i, 3.0 - Math.sin(i / 10 * Math.PI) * 0.4, 5.0); g.add(l); }
  // 석등
  for (const sx of [-1.6, 1.6]) { const sl = new THREE.Group(); sl.position.set(sx, 1.0, 4.0); place(box(0.4, 0.8, 0.4, stoneM), 0, 0.4, 0, sl); place(box(0.6, 0.5, 0.6, new THREE.MeshStandardMaterial({ color: '#c8c0ad', emissive: '#ffb860', emissiveIntensity: 0.7 })), 0, 1.05, 0, sl); place(new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 8), stoneM), 0, 1.5, 0, sl); g.add(sl); }
  // 일주문 (계단 아래)
  const gate = new THREE.Group(); gate.position.set(2.0, heightAt(cx + 2, cz + 16) - y0, 16); g.add(gate);
  for (const sx of [-1.4, 1.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.6, 12), wood); c.position.set(sx, 1.8, 0); gate.add(c); }
  place(box(3.6, 0.5, 0.6, new THREE.MeshStandardMaterial({ color: '#2f6f62' })), 0, 3.5, 0, gate);
  const gr = hanokRoof(5.2, 2.2, 1.0, { color: '#3d4b49', upturn: 0.6 }); gr.position.y = 3.75; gate.add(gr);
  return shadow(g);
}

/* ---------- 맥스데이교회 (언덕 위 붉은 벽돌 예배당) ---------- */
function churchBuilding() {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.church.pos; g.position.set(cx, heightAt(cx, cz), cz);
  const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.9 });
  place(box(7, 4.2, 10, brick), 0, 2.1, 0, g);
  const roof = new THREE.Mesh(gable(7.8, 10.8, 3.0), new THREE.MeshStandardMaterial({ map: tileRoofTex('#4c5866', { repeat: [5, 3] }), roughness: 0.75 })); roof.position.y = 4.2; g.add(roof);
  // 종탑
  const tw = new THREE.Group(); tw.position.set(0, 0, 5.2); g.add(tw);
  place(box(2.4, 7.4, 2.4, brick), 0, 3.7, 0, tw);
  place(box(2.0, 1.6, 2.6, new THREE.MeshStandardMaterial({ color: '#2a2622' })), 0, 6.0, 0, tw);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.2, 4), new THREE.MeshStandardMaterial({ map: tileRoofTex('#4c5866', { repeat: [2, 3] }) })); spire.rotation.y = Math.PI / 4; spire.position.y = 9.5; tw.add(spire);
  const cross = new THREE.Group(); place(box(0.14, 1.2, 0.14, GOLD()), 0, 0, 0, cross); place(box(0.7, 0.14, 0.14, GOLD()), 0, 0.2, 0, cross); cross.position.y = 12.2; tw.add(cross);
  place(box(1.3, 2.2, 0.1, M('#5b3a26')), 0, 1.1, 1.22, tw);
  const arch = new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffb860', emissiveIntensity: 1.0 });
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) place(archMesh(0.8, 1.8, arch), s * 3.52, 1.6, -3 + i * 3, g).rotation.y = s * Math.PI / 2;
  place(archMesh(0.6, 1.2, arch), 0, 3.8, 1.22, tw);
  // 계단
  for (let i = 0; i < 4; i++) place(box(3.2, 0.2, 0.5, M('#b8b0a2')), 0, 0.1 + i * 0.0, 7.0 + i * 0.5, g).position.y = 0.1 - i * 0.1;
  return shadow(g);
}
function brickTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d8cfc2'; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 16; r++) for (let k = 0; k < 9; k++) { const x = k * 32 - (r % 2) * 16, y = r * 16; g.fillStyle = `hsl(${12 + Math.random() * 8},${40 + Math.random() * 15}%,${46 + Math.random() * 10}%)`; g.fillRect(x + 1, y + 1, 30, 14); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); return t;
}
export function archMesh(w, h, mat) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  return new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), mat);
}

/* ---------- 맥스데이성당 (광장의 석조 성당: 정면 장미창 + 종탑) ---------- */
function cathedralBuilding() {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.cathedral.pos; g.position.set(cx, 0, cz); g.scale.setScalar(0.78);
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex('#c9c1b2', { tiles: 8, repeat: [3, 3], grout: '#a69e8f' }), roughness: 0.9 });
  // 광장
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshStandardMaterial({ map: stoneTex('#d6cdbc', { tiles: 10, repeat: [4, 4] }), roughness: 0.95 })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.05, 6); g.add(plaza);
  place(box(9, 6.5, 13, stone), 0, 3.25, -2, g);
  const roof = new THREE.Mesh(gable(9.6, 13.6, 4.6), new THREE.MeshStandardMaterial({ map: tileRoofTex('#3d4a5c', { repeat: [5, 4] }) })); roof.position.set(0, 6.5, -2); g.add(roof);
  // 정면 파사드
  const fac = new THREE.Group(); fac.position.set(0, 0, 4.6); g.add(fac);
  place(box(9.6, 9, 1.2, stone), 0, 4.5, 0, fac);
  const tri = new THREE.Mesh(gable(9.6, 1.2, 3.4), stone); tri.position.y = 9; fac.add(tri);
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), new THREE.MeshStandardMaterial({ color: '#c9a0d8', emissive: '#a26cc0', emissiveIntensity: 0.9 })); rose.position.set(0, 7.0, 0.62); fac.add(rose);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const sp = box(0.06, 1.5, 0.04, M('#3a3530')); sp.position.set(Math.cos(a) * 0.75, 7.0 + Math.sin(a) * 0.75, 0.66); sp.rotation.z = a + Math.PI / 2; fac.add(sp); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.12, 8, 32), stone); ring.position.set(0, 7.0, 0.62); fac.add(ring);
  const door = archMesh(2.0, 3.4, M('#5a3e2c')); door.position.set(0, 0, 0.6); fac.add(door);
  const glass = new THREE.MeshStandardMaterial({ color: '#b9a5e0', emissive: '#7b5cb0', emissiveIntensity: 0.8 });
  for (const s of [-1, 1]) { place(archMesh(0.8, 2.4, glass), s * 2.8, 3.2, 0.61, fac); }
  // 버팀벽
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const b = box(0.6, 5.5, 1.0, stone); b.position.set(s * 4.8, 2.75, -7 + i * 3.4); g.add(b); place(archMesh(0.9, 3.2, glass), s * 4.52, 1.8, -5.3 + i * 3.4, g).rotation.y = s * Math.PI / 2; }
  // 종탑 1개
  const tw = new THREE.Group(); tw.position.set(4.0, 0, 4.4); g.add(tw);
  place(box(2.6, 13, 2.6, stone), 0, 6.5, 0, tw);
  for (const s of [-1, 1]) place(archMesh(0.9, 2.0, M('#2a2622')), s * 0.0, 10.0, 1.31, tw);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.9, 6, 8), new THREE.MeshStandardMaterial({ map: tileRoofTex('#3d4a5c', { repeat: [3, 3] }) })); spire.position.y = 16; tw.add(spire);
  const cross = new THREE.Group(); place(box(0.15, 1.3, 0.15, GOLD()), 0, 0, 0, cross); place(box(0.75, 0.15, 0.15, GOLD()), 0, 0.22, 0, cross); cross.position.y = 19.6; tw.add(cross);
  // 광장 분수
  const ft = new THREE.Group(); ft.position.set(0, 0, 10); g.add(ft);
  place(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.5, 24), stone), 0, 0.25, 0, ft);
  place(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.05, 24), new THREE.MeshStandardMaterial({ color: '#7fa0b8', roughness: 0.1, metalness: 0.3 })), 0, 0.48, 0, ft);
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.2, 12), stone), 0, 0.9, 0, ft);
  return shadow(g);
}

/* ---------- 맥스데이 놀이터 (공원: 동그란 건물 + 미끄럼틀·그네·회전목마) ---------- */
function playgroundPark(anim) {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.playground.pos; g.position.set(cx, 0, cz);
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(10, 40), new THREE.MeshStandardMaterial({ color: '#8fb07a', roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.04; g.add(lawn);
  // 건물 (둥근 지붕)
  const hall = new THREE.Group(); hall.position.set(0, 0, -3); g.add(hall);
  place(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3.2, 32), M('#F2E6CF')), 0, 1.6, 0, hall);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5F8D89', roughness: 0.6 })); dome.position.y = 3.2; dome.scale.y = 0.6; hall.add(dome);
  const stripes = ['#E9A26D', '#F1CE79', '#78B8BD', '#DDA7B7'];
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const s = box(0.25, 0.4, 0.05, M(stripes[i % 4])); s.position.set(Math.cos(a) * 4.05, 3.0, Math.sin(a) * 4.05); s.lookAt(0, 3, 0); hall.add(s); }
  const door = archMesh(1.6, 2.4, M('#D79B65')); door.position.set(0, 0, 4.0); hall.add(door);
  const win = new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: '#ffcf7a', emissiveIntensity: 1.0 });
  for (const a of [-0.6, 0.6]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), win); w.position.set(Math.sin(a) * 4.02, 1.9, Math.cos(a) * 4.02); w.rotation.y = a; hall.add(w); }
  const flag = new THREE.Group(); flag.position.y = 5.8; hall.add(flag); place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), M('#8a7a6a')), 0, 0, 0, flag); const fl = box(0.9, 0.5, 0.03, M('#E9A26D')); fl.position.set(0.45, 0.5, 0); flag.add(fl);
  // 미끄럼틀
  const slide = new THREE.Group(); slide.position.set(-6, 0, 2.5); g.add(slide);
  place(box(1.4, 1.8, 1.4, M('#78B8BD')), 0, 0.9, 0, slide); const ch = box(0.9, 0.08, 3.0, M('#F1CE79')); ch.position.set(0, 0.95, 2.1); ch.rotation.x = 0.55; slide.add(ch);
  // 그네
  const sw = new THREE.Group(); sw.position.set(6, 0, 3); g.add(sw);
  for (const s of [-1.3, 1.3]) { const p = box(0.12, 2.4, 0.12, M('#DDA7B7')); p.position.set(s, 1.2, 0); p.rotation.z = s > 0 ? 0.12 : -0.12; sw.add(p); }
  place(box(2.8, 0.12, 0.12, M('#DDA7B7')), 0, 2.35, 0, sw);
  const seats = [];
  for (const s of [-0.6, 0.6]) { const piv = new THREE.Group(); piv.position.set(s, 2.3, 0); sw.add(piv); place(box(0.03, 1.7, 0.03, M('#666')), 0, -0.85, 0, piv); place(box(0.5, 0.06, 0.3, M('#E9A26D')), 0, -1.7, 0, piv); seats.push(piv); }
  anim.push((t, red) => { if (!red) seats.forEach((p, i) => p.rotation.x = Math.sin(t * 1.6 + i * 1.3) * 0.35); });
  // 회전목마
  const car = new THREE.Group(); car.position.set(0, 0, 5.5); g.add(car);
  place(new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.25, 24), M('#F2E6CF')), 0, 0.12, 0, car);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.0, 16), M('#E9A26D')); top.position.y = 2.6; car.add(top);
  place(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 10), GOLD()), 0, 1.3, 0, car);
  const horses = new THREE.Group(); car.add(horses);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), GOLD()); pole.position.set(Math.cos(a) * 1.5, 1.3, Math.sin(a) * 1.5); horses.add(pole); const h = rbox(0.25, 0.4, 0.7, 0.1, M(stripes[i % 4])); h.position.set(Math.cos(a) * 1.5, 0.9, Math.sin(a) * 1.5); h.rotation.y = -a; horses.add(h); }
  anim.push((t, red) => { if (!red) horses.rotation.y = t * 0.35; });
  // 12지신 석상 원형 (작게)
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 4, 10), M('#b8b2a6')); s.position.set(Math.cos(a) * 8.5, 0.45, Math.sin(a) * 8.5); g.add(s); }
  return shadow(g);
}

function instancedPines(list) {
  const g = new THREE.Group(); const n = list.length;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.18, 1, 7), M('#5b4232'), n);
  const cols = ['#2f5a43', '#3a6a4c', '#466f4f', '#3a6a4c'];
  const cones = cols.map((c, i) => new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 9), M(c, { flatShading: true }), n));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  list.forEach(([x, y, z, h, r], k) => {
    m.compose(p.set(x, y + h * 0.27, z), q.identity(), sc.set(h / 4, h * 0.55, h / 4)); trunk.setMatrixAt(k, m);
    cones.forEach((c, i) => { q.setFromEuler(e.set(0, r + i, 0)); m.compose(p.set(x, y + h * (0.38 + i * 0.16), z), q, sc.set(h * (0.32 - i * 0.06), h * 0.34, h * (0.32 - i * 0.06))); c.setMatrixAt(k, m); });
  });
  [trunk, ...cones].forEach(o => { o.castShadow = true; o.receiveShadow = true; g.add(o); });
  return g;
}
function instancedRoundTrees(list) {
  const g = new THREE.Group(); const n = list.length;
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.16, 1, 7), M('#6a4d3a'), n);
  const palettes = [['#5d7a4f', '#6f8a55', '#8a8a52'], ['#b8834e', '#c99a58', '#9a6b3c']];
  const blobGeo = new THREE.IcosahedronGeometry(1, 1);
  const blobs = [0, 1, 2].map(i => new THREE.InstancedMesh(blobGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }), n));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  const offs = [[0, 0.62, 0, 0.3], [0.25, 0.55, 0.12, 0.24], [-0.2, 0.75, -0.1, 0.22]];
  const base = [];
  list.forEach(([x, y, z, h, pal], k) => {
    m.compose(p.set(x, y + h * 0.25, z), q.identity(), sc.set(1, h * 0.5, 1)); trunk.setMatrixAt(k, m);
    blobs.forEach((b, i) => { const [ox, oy, oz, r] = offs[i]; m.compose(p.set(x + ox * h, y + oy * h, z + oz * h), q.identity(), sc.setScalar(r * h)); b.setMatrixAt(k, m); b.setColorAt(k, col.set(palettes[pal][i])); });
    base.push([x, y, z, h]);
  });
  [trunk, ...blobs].forEach(o => { o.castShadow = true; o.receiveShadow = true; g.add(o); });
  return { group: g, sway: () => {} };
}

/* ---------- 카페 (유리창 + 테라스) ---------- */
function cafeBuilding() {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.cafe.pos; g.position.set(cx, heightAt(cx, cz), cz);
  const wood = M('#8a5f3f', { roughness: 0.6 });
  place(box(9, 0.3, 7, M('#cdbb9c')), 0, 0.15, 0.5, g);
  place(box(8, 3.4, 5, M('#F2EADB')), 0, 1.85, -0.5, g);
  place(box(8.4, 0.35, 5.4, M('#3a3533')), 0, 3.7, -0.5, g);
  const glass = new THREE.MeshStandardMaterial({ color: '#ffe8bf', emissive: '#ffbf6a', emissiveIntensity: 0.9, roughness: 0.1 });
  for (let i = 0; i < 3; i++) place(box(1.9, 2.2, 0.05, glass), -2.6 + i * 2.6, 1.55, 2.03, g);
  for (let i = 0; i < 4; i++) place(box(0.14, 3.4, 0.14, wood), -3.9 + i * 2.6, 1.85, 2.05, g);
  const aw = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8.2, 16, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#F4E6C8', side: THREE.DoubleSide })); aw.rotation.set(0, 0, Math.PI / 2); aw.position.set(0, 3.05, 2.2); aw.scale.set(1, 0.6, 1); g.add(aw);
  for (let i = 0; i < 9; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.605, 0.605, 0.45, 16, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#5F8D89', side: THREE.DoubleSide })); st.rotation.set(0, 0, Math.PI / 2); st.position.set(-3.6 + i * 0.9, 3.05, 2.2); st.scale.set(1, 0.6, 1); g.add(st); }
  // 테라스 테이블·파라솔
  for (const x of [-2.8, 0, 2.8]) { const t = new THREE.Group(); t.position.set(x, 0.3, 3.4); g.add(t); place(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16), M('#f4eee2')), 0, 0.72, 0, t); place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 8), M('#5a4636')), 0, 1.05, 0, t); place(new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.45, 12), M(['#E9A26D', '#78B8BD', '#DDA7B7'][Math.round(x / 2.8) + 1])), 0, 2.2, 0, t); for (const s of [-1, 1]) place(rbox(0.36, 0.45, 0.36, 0.05, wood), s * 0.65, 0.22, 0, t); }
  return shadow(g);
}
/* ---------- 식당 (한옥풍 지붕 + 등) ---------- */
function restaurantBuilding() {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.restaurant.pos; g.position.set(cx, heightAt(cx, cz), cz);
  place(box(10, 0.4, 7.4, M('#b9b2a2')), 0, 0.2, 0, g);
  place(box(9, 3.0, 6, M('#EFE6D6')), 0, 1.9, 0, g);
  const wood = M('#6b4630', { roughness: 0.6 });
  for (let i = 0; i < 6; i++) place(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 3.0, 12), wood), -4.3 + i * 1.72, 1.9, 3.05, g);
  const win = new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffb860', emissiveIntensity: 0.9 });
  for (let i = 0; i < 4; i++) place(box(1.2, 1.4, 0.05, win), -2.6 + i * 1.72 - (i > 1 ? 0 : 0), 1.9, 3.03, g);
  place(box(1.4, 2.3, 0.06, M('#5b3f2a')), 3.4, 1.55, 3.04, g);
  const roof = hanokRoof(11.6, 8.2, 2.0, { color: '#4a4440', upturn: 0.6 }); roof.position.y = 3.4; g.add(roof);
  for (const x of [-3.6, 0, 3.6]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 12), new THREE.MeshStandardMaterial({ color: '#d9533c', emissive: '#d9533c', emissiveIntensity: 0.7 })); l.position.set(x, 2.9, 3.4); g.add(l); }
  return shadow(g);
}

/* ---------- 자동차 극장 (대형 야외 스크린 + 광고) ---------- */
export const DRIVE_IN = { pos: FEATURED ? [27, 0, -33] : [11, 0, -30] };
function driveIn(anim) {
  const g = new THREE.Group(); const [cx, , cz] = DRIVE_IN.pos; g.position.set(cx, heightAt(cx, cz), cz); g.rotation.y = -0.05; g.scale.setScalar(1.3);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(21, 13), new THREE.MeshStandardMaterial({ color: '#5d5c58', roughness: 0.95 })); lot.rotation.x = -Math.PI / 2; lot.position.set(0, 0.07, 4.5); g.add(lot);
  const base = new THREE.Mesh(new THREE.BoxGeometry(21.4, 4, 13.4), new THREE.MeshStandardMaterial({ map: stoneTex('#a59a88', { tiles: 3, repeat: [6, 2] }), roughness: 0.9 })); base.position.set(0, -1.97, 4.5); g.add(base);
  for (let i = -3; i <= 3; i++) { const l = box(0.08, 0.01, 2.6, M('#e8e2d0')); l.position.set(i * 2, 0.08, 6.6); g.add(l); const l2 = l.clone(); l2.position.z = 9.8; g.add(l2); }
  // 스크린 (광고 슬라이드)
  const SW = 19, SH = 10.4, SY = 1.6 + SH / 2;
  for (const s of [-1, 1]) for (const k of [0, 1]) place(box(0.45, SY + SH / 2, 0.45, M('#3a3533')), s * (SW / 2 - 0.4) * (k ? 0.45 : 1), (SY + SH / 2) / 2, -0.5, g);
  const frame = box(SW + 0.7, SH + 0.7, 0.4, M('#2b2b2b')); frame.position.set(0, SY, -0.25); g.add(frame);
  const bulbs = new THREE.MeshBasicMaterial({ color: '#ffd27a' }); for (let i = 0; i <= 24; i++) { const bx = -SW / 2 - 0.2 + i * (SW + 0.4) / 24; for (const by of [SY - SH / 2 - 0.25, SY + SH / 2 + 0.25]) place(new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), bulbs), bx, by, -0.02, g); }
  const c = document.createElement('canvas'); c.width = 1280; c.height = 704; const ctx = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.set(0, SY, -0.04); g.add(scr);
  // 접속하자마자 재생되는 홍보 영상 (라이프카드) — 캔버스 애니메이션
  const logo = new Image(); logo.src = BRAND.logo;
  const SC = [[`${BRAND.en} CARD`, `${BRAND.short} 라이프카드`], ['한 장으로 마을 어디서나', '기도 · 놀이터 · 카페 · 식당'], ['화면을 눌러 크게 보기', '소리와 함께 감상할 수 있어요']];
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  let T = 0, acc = 0;
  const draw = () => {
    const W = 1280, H = 704; const ph = Math.floor(T / 6) % SC.length, lt = T % 6;
    const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0f1d2b'); bg.addColorStop(0.5 + Math.sin(T * 0.4) * 0.2, '#22344f'); bg.addColorStop(1, '#3a2442'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 40; k++) { const px = (k * 211 + T * (20 + k % 5 * 8)) % W, py = (k * 97) % H; ctx.fillStyle = `rgba(255,220,160,${0.08 + (k % 4) * 0.04})`; ctx.beginPath(); ctx.arc(px, py, 2 + k % 3, 0, Math.PI * 2); ctx.fill(); }
    // 카드 (회전 + 빛 반사)
    const cx = 380, cy = 352, cw = 440, ch = 278; const sx = Math.cos(T * 0.9) ; const front = sx > 0;
    ctx.save(); ctx.translate(cx, cy + Math.sin(T * 1.3) * 10); ctx.scale(Math.max(0.04, Math.abs(sx)), 1); ctx.rotate(-0.06);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    const cg = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2); if (front) { cg.addColorStop(0, '#f6e3b0'); cg.addColorStop(0.45, '#c9a45c'); cg.addColorStop(1, '#8a6a2e'); } else { cg.addColorStop(0, '#20303f'); cg.addColorStop(1, '#0d141c'); }
    rr(-cw / 2, -ch / 2, cw, ch, 26); ctx.fillStyle = cg; ctx.fill(); ctx.shadowColor = 'transparent';
    if (front) {
      ctx.fillStyle = '#e8d29a'; rr(-cw / 2 + 36, -30, 62, 48, 8); ctx.fill(); ctx.strokeStyle = '#9a7a3a'; ctx.lineWidth = 2; ctx.stroke();
      if (logo.complete && logo.naturalWidth) { const lh = 64, lw = lh * logo.naturalWidth / logo.naturalHeight; ctx.globalAlpha = 0.95; ctx.drawImage(logo, cw / 2 - lw - 30, -ch / 2 + 26, lw, lh); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#3a2a10'; ctx.font = '800 34px "Noto Sans KR", sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`${BRAND.short} LIFE CARD`, -cw / 2 + 36, ch / 2 - 72);
      ctx.font = '600 22px "Noto Sans KR", sans-serif'; ctx.fillText('MEMBERSHIP', -cw / 2 + 36, ch / 2 - 34);
      const sh = ((T * 0.5) % 1.6 - 0.3) * cw; const sg2 = ctx.createLinearGradient(sh - 80, 0, sh + 80, 0); sg2.addColorStop(0, 'rgba(255,255,255,0)'); sg2.addColorStop(0.5, 'rgba(255,255,255,.45)'); sg2.addColorStop(1, 'rgba(255,255,255,0)'); rr(-cw / 2, -ch / 2, cw, ch, 26); ctx.fillStyle = sg2; ctx.fill();
    } else { ctx.fillStyle = '#c9ae73'; ctx.font = '800 40px "Noto Sans KR", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(BRAND.en, 0, 14); }
    ctx.restore();
    // 문구 (페이드)
    const a = Math.min(1, lt / 0.8, (6 - lt) / 0.8); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'left';
    ctx.fillStyle = '#fff3dc'; let fs = 96; ctx.font = `900 ${fs}px "Noto Sans KR", sans-serif`; while (ctx.measureText(SC[ph][0]).width > 590 && fs > 30) { fs -= 2; ctx.font = `900 ${fs}px "Noto Sans KR", sans-serif`; } ctx.fillText(SC[ph][0], 650, 330 + (1 - a) * 20);
    ctx.fillStyle = '#e9c98a'; ctx.font = '700 50px "Noto Sans KR", sans-serif'; ctx.fillText(SC[ph][1], 650, 410 + (1 - a) * 20); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, H - 8, W, 8); ctx.fillStyle = '#c9ae73'; ctx.fillRect(0, H - 8, W * ((T % 18) / 18), 8);
    tex.needsUpdate = true;
  };
  draw(); anim.push((t, red, dt) => { T += dt || 0.016; acc += dt || 0.016; if (acc > (red ? 0.5 : 0.05)) { acc = 0; draw(); } });
  g.userData.screenMesh = scr; DRIVE_IN.mesh = scr;
  const glow = new THREE.PointLight('#bcd2ff', 8, 24, 1.6); glow.position.set(0, 5, 4); g.add(glow);
  // 줄지어 선 자동차
  const cols = ['#c0392b', '#2e86de', '#f1c40f', '#ecf0f1', '#27ae60', '#8e44ad', '#e67e22', '#34495e', '#d35400', '#16a085'];
  let k = 0;
  for (const z of [6.6, 9.8]) for (let x = -5; x <= 5; x += 2) {
    if ((x + z) % 3 === 0 && k % 4 === 3) { k++; continue; }
    const car = new THREE.Group(); car.position.set(x + 1, 0.07, z); car.rotation.y = Math.PI; g.add(car);
    const bodyM = M(cols[k % cols.length], { roughness: 0.35, metalness: 0.4 });
    place(rbox(1.5, 0.5, 2.9, 0.18, bodyM), 0, 0.5, 0, car);
    place(rbox(1.3, 0.45, 1.5, 0.16, bodyM), 0, 0.95, 0.15, car);
    place(box(1.22, 0.36, 1.42, new THREE.MeshStandardMaterial({ color: '#203040', roughness: 0.1, metalness: 0.5 })), 0, 0.97, 0.15, car);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.9, 0.9]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 14), M('#1b1b1b')); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.28, sz); car.add(w); }
    for (const sx of [-0.5, 0.5]) place(box(0.25, 0.1, 0.05, new THREE.MeshStandardMaterial({ color: '#ff4d4d', emissive: '#ff2a2a', emissiveIntensity: 1.2 })), sx, 0.6, 1.46, car);
    k++;
  }
  const sg = new THREE.Group(); sg.position.set(-7.4, 0, 9); g.add(sg);
  place(box(0.15, 2.4, 0.15, M('#3a3533')), 0, 1.2, 0, sg);
  const sc2 = document.createElement('canvas'); sc2.width = 512; sc2.height = 200; const x2 = sc2.getContext('2d'); x2.fillStyle = '#2a1f1a'; x2.fillRect(0, 0, 512, 200); x2.strokeStyle = '#ffcf7a'; x2.lineWidth = 10; x2.strokeRect(8, 8, 496, 184); x2.fillStyle = '#ffe2a8'; x2.font = '900 78px "Noto Sans KR", sans-serif'; x2.textAlign = 'center'; x2.fillText('자동차 극장', 256, 128);
  const st2 = new THREE.CanvasTexture(sc2); st2.colorSpace = THREE.SRGBColorSpace;
  const sn = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.12), [M('#2a1f1a'), M('#2a1f1a'), M('#2a1f1a'), M('#2a1f1a'), new THREE.MeshBasicMaterial({ map: st2, toneMapped: false }), M('#2a1f1a')]); sn.position.y = 2.6; sg.add(sn);
  g.traverse(o => { o.userData.videoScreen = 'drivein'; });
  return shadow(g);
}

/* ---------- 먹거리 골목 (지도용 축소 모형): 주황 천막 줄 + 파라솔 + 전구 줄 + 입구 아치 ---------- */
function foodStreetMap(anim) {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.foodstreet.pos; g.position.set(cx, heightAt(cx, cz), cz); g.scale.setScalar(FEATURED ? 2.6 : 1.35);
  place(box(13, 0.2, 10, M('#3d3f45', { roughness: 0.95 })), 0, 0.1, 0, g);
  place(box(13, 0.22, 1.0, M('#8d8a84')), 0, 0.11, -4.6, g); place(box(13, 0.22, 1.0, M('#8d8a84')), 0, 0.11, 4.6, g);
  const tent = (x, z, col) => { const t = new THREE.Group(); t.position.set(x, 0.2, z); g.add(t);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(box(0.05, 1.3, 0.05, M('#ddd')), sx * 0.6, 0.65, sz * 0.6, t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.92, 0.6, 4), M(col)); c.rotation.y = Math.PI / 4; c.position.y = 1.6; t.add(c);
    place(box(1.1, 0.5, 0.4, M('#f4efe6')), 0, 0.25, 0.3, t); };
  for (let i = 0; i < 6; i++) { tent(-5 + i * 1.8, -2.6, '#F07A1A'); tent(-5 + i * 1.8, 2.6, i >= 4 ? '#F2C230' : '#F07A1A'); }
  for (const x of [-3.6, 0, 3.6]) { const p = new THREE.Group(); p.position.set(x, 0.2, 0); g.add(p); place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), M('#eee')), 0, 0.75, 0, p); place(new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.3, 8), M('#F07A1A')), 0, 1.5, 0, p); place(box(0.5, 0.05, 0.9, M('#d98a3a')), 0, 0.45, 0, p); }
  // 전구 줄
  const bm = new THREE.MeshBasicMaterial({ color: '#ffd9a0' }); const pts = [];
  for (let k = 0; k < 5; k++) for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([-5.4 + k * 2.6 + t * 1.2, 2.6 - Math.sin(t * Math.PI) * 0.4, -3.8 + t * 7.6]); }
  const bi = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), bm, pts.length); const mt = new THREE.Matrix4(); pts.forEach((p, i) => { mt.makeTranslation(...p); bi.setMatrixAt(i, mt); }); g.add(bi);
  // 입구 아치 + 로고
  const arch = new THREE.Group(); arch.position.set(0, 0.2, 5.1); g.add(arch);
  for (const sx of [-3.2, 3.2]) place(box(0.25, 3.2, 0.25, M('#0E1F4D')), sx, 1.6, 0, arch);
  place(box(6.8, 1.3, 0.15, M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 })), 0, 3.2, 0, arch);
  const lt = new THREE.TextureLoader().load('assets/tex/yongma_logo-yongma-color.webp', t => { t.colorSpace = THREE.SRGBColorSpace; });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.23), new THREE.MeshBasicMaterial({ map: lt, transparent: true, toneMapped: false })); logo.position.set(0, 3.2, 0.09); arch.add(logo);
  const ab = new THREE.MeshBasicMaterial({ color: '#ffd38a' }); for (let i = 0; i <= 12; i++) place(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), ab), -3.3 + i * 0.55, 2.6, 0.1, arch);
  // 마스코트 용지·마루
  for (const [img, x, a] of [['mascot-yong', -4.6, 600 / 669], ['mascot-ma', 4.6, 600 / 850]]) { const t = new THREE.TextureLoader().load(`assets/tex/yongma_${img}.webp`, tt => { tt.colorSpace = THREE.SRGBColorSpace; }); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0 * a, 2.0), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide })); m.position.set(x, 1.2, 5.2); m.userData.billboard = true; g.add(m); }
  const pl = new THREE.PointLight('#ffb870', 10, 14, 1.6); pl.position.set(0, 3.5, 0); g.add(pl);
  if (FEATURED) { // 강조: 하늘로 쏘는 서치라이트 + 떠 있는 대형 로고 간판
    const beams = []; const bm2 = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (const [x, z] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) { const piv = new THREE.Group(); piv.position.set(x, 0.3, z); g.add(piv); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.08, 18, 16, 1, true), bm2); c.position.y = 9; piv.add(c); piv.userData.ph = x * 0.3 + z; beams.push(piv); }
    anim.push((t, red) => beams.forEach(b => { const a = red ? 0 : Math.sin(t * 0.6 + b.userData.ph) * 0.35; b.rotation.set(a, 0, Math.cos(t * 0.5 + b.userData.ph) * 0.35); }));
    const bb = new THREE.Group(); bb.position.set(0, 7.2, 0); g.add(bb);
    place(box(8.2, 3.4, 0.2, M('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5 })), 0, 0, 0, bb);
    const ft = new THREE.TextureLoader().load('assets/tex/yongma_logo-yongma-color.webp', t => { t.colorSpace = THREE.SRGBColorSpace; });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.02), new THREE.MeshBasicMaterial({ map: ft, transparent: true, toneMapped: false })); fl.position.z = 0.14; bb.add(fl);
    const fb = new THREE.MeshBasicMaterial({ color: '#ffd38a' }); for (let i = 0; i <= 22; i++) for (const y of [-1.8, 1.8]) place(new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), fb), -4.2 + i * 0.382, y, 0.14, bb);
    for (const sx of [-3.4, 3.4]) place(box(0.14, 7.2, 0.14, M('#2b2b30')), sx, -3.6, -0.05, bb);
    anim.push((t, red) => { if (!red) bb.position.y = 7.2 + Math.sin(t * 1.2) * 0.12; });
  }
  return shadow(g);
}

/* ---------- 게임장 (네온 건물) ---------- */
function arcadeBuilding(anim) {
  const g = new THREE.Group(); const [cx, , cz] = MAP_SPOTS.arcade.pos; g.position.set(cx, heightAt(cx, cz), cz);
  place(box(9.4, 0.3, 7.4, M('#5a5468')), 0, 0.15, 0.4, g);
  place(box(8.6, 4.4, 5.6, M('#2f2a45', { roughness: 0.6 })), 0, 2.5, -0.4, g);
  place(box(9.0, 0.3, 6.0, M('#1d1830')), 0, 4.85, -0.4, g);
  const neonCols = ['#ff4fa0', '#4fd1ff', '#ffd84f'];
  const strips = [];
  for (let i = 0; i < 3; i++) { const s = place(box(8.7, 0.08, 0.08, new THREE.MeshBasicMaterial({ color: neonCols[i] })), 0, 0.6 + i * 1.75, 2.42, g); strips.push(s); }
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  x.fillStyle = '#16102a'; x.fillRect(0, 0, 512, 160); x.shadowColor = '#ff4fa0'; x.shadowBlur = 24; x.fillStyle = '#ff9ad0'; x.font = '900 88px sans-serif'; x.textAlign = 'center'; x.fillText('GAME', 256, 100); x.shadowBlur = 0; x.fillStyle = '#9fe8ff'; x.font = '700 30px "Noto Sans KR", sans-serif'; x.fillText(SPACES.arcade.name, 256, 145);
  const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
  place(new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.62), new THREE.MeshBasicMaterial({ map: st, toneMapped: false })), 0, 3.9, 2.43, g);
  const door = place(box(2.4, 2.4, 0.05, new THREE.MeshStandardMaterial({ color: '#c9b8ff', emissive: '#7a5cff', emissiveIntensity: 0.9 })), 0, 1.35, 2.42, g);
  for (const sx of [-3.2, 3.2]) place(box(1.6, 1.6, 0.05, new THREE.MeshStandardMaterial({ color: '#ffd0e6', emissive: '#ff4fa0', emissiveIntensity: 0.6 })), sx, 1.6, 2.42, g);
  for (const sx of [-3.8, 3.8]) { const m = new THREE.Group(); m.position.set(sx, 0.3, 3.4); g.add(m); place(box(0.8, 1.6, 0.7, M(sx < 0 ? '#ff6e9a' : '#5ed3c4')), 0, 0.8, 0, m); place(new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: 0.35 })), 0, 1.9, 0, m); }
  const pl = new THREE.PointLight('#b68cff', 8, 12, 1.6); pl.position.set(0, 3, 4); g.add(pl);
  anim.push((t, red) => { if (red) return; strips.forEach((s, i) => s.material.color.set(neonCols[(i + Math.floor(t * 1.5)) % 3])); });
  return shadow(g);
}
