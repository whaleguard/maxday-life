// 공통 재질·절차적 텍스처·소품
import * as THREE from 'three';
import { textTexture } from '../engine.js';

export const loader = new THREE.TextureLoader();
const texCache = new Map();
export function loadTex(url, { repeat = null, srgb = true, aniso = 8 } = {}) {
  const key = url + JSON.stringify(repeat);
  if (texCache.has(key)) return texCache.get(key);
  const t = loader.load(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  texCache.set(key, t);
  return t;
}
export function clearTexCache() { texCache.forEach(t => t.dispose()); texCache.clear(); }

export const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
export const GOLD = () => new THREE.MeshStandardMaterial({ color: '#D9AE55', metalness: 1, roughness: 0.28, envMapIntensity: 1.25 });
export const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
export function place(o, x, y, z, parent) { o.position.set(x, y, z); parent && parent.add(o); return o; }
export function shadow(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }
export function rbox(w, h, d, r, mat, seg = 3) { // 모서리 둥근 상자
  const s = new THREE.Shape(); const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: seg, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, -h / 2 + r, 0);
  return new THREE.Mesh(g, mat);
}
export function sign(lines, w, h, opts) {
  const tex = textTexture(lines, { w: 768, h: Math.round(768 * h / w), ...opts });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.userData.noShadow = true;
  return m;
}

/* ---------------- 절차적 텍스처 (캔버스) ---------------- */
function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// 마루 판자 (색, 판자 수)
export function woodFloorTex(base = '#5a3a26', { planks = 8, seed = 7, repeat = [3, 3], light = 0.12 } = {}) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const r = rnd(seed); const c = new THREE.Color(base);
    const pw = W / planks;
    for (let i = 0; i < planks; i++) {
      let y = 0;
      while (y < H) {
        const len = H * (0.35 + r() * 0.5);
        const k = 1 + (r() - 0.5) * light * 2;
        const col = c.clone().multiplyScalar(k);
        g.fillStyle = col.getStyle(); g.fillRect(i * pw, y, pw, len);
        // 결
        for (let n = 0; n < 26; n++) {
          g.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`; g.lineWidth = 0.6 + r() * 1.4;
          const x = i * pw + r() * pw; g.beginPath(); g.moveTo(x, y);
          g.bezierCurveTo(x + (r() - 0.5) * 8, y + len * 0.3, x + (r() - 0.5) * 8, y + len * 0.7, x + (r() - 0.5) * 6, y + len); g.stroke();
        }
        for (let n = 0; n < 10; n++) { g.strokeStyle = `rgba(255,230,190,${0.03 + r() * 0.04})`; g.lineWidth = 1; const x = i * pw + r() * pw; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + len); g.stroke(); }
        if (r() < 0.25) { g.fillStyle = 'rgba(40,20,10,.18)'; g.beginPath(); g.ellipse(i * pw + pw * (0.3 + r() * 0.4), y + len * r(), 4 + r() * 6, 9 + r() * 10, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(i * pw, y, pw, 2);
        y += len;
      }
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(i * pw, 0, 2, H);
      g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(i * pw + 2, 0, 1, H);
    }
  }, { repeat });
}
// 석재 타일
export function stoneTex(base = '#b8b3a8', { tiles = 4, seed = 3, repeat = [4, 4], grout = '#8f897d' } = {}) {
  return canvasTex(1024, 1024, (g, W, H) => {
    const r = rnd(seed); const c = new THREE.Color(base); const s = W / tiles;
    g.fillStyle = grout; g.fillRect(0, 0, W, H);
    for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
      const col = c.clone().multiplyScalar(0.92 + r() * 0.14);
      g.fillStyle = col.getStyle(); g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      for (let n = 0; n < 220; n++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(i * s + r() * s, j * s + r() * s, 2 + r() * 6, 2 + r() * 6); }
    }
  }, { repeat });
}
// 회벽(미세 얼룩)
export function plasterTex(base = '#e8decb', { seed = 5, repeat = [2, 2], amt = 0.05 } = {}) {
  return canvasTex(512, 512, (g, W, H) => {
    const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let n = 0; n < 900; n++) { g.fillStyle = `rgba(${r() < 0.5 ? '60,40,20' : '255,255,255'},${r() * amt})`; const s = 4 + r() * 40; g.beginPath(); g.arc(r() * W, r() * H, s, 0, Math.PI * 2); g.fill(); }
  }, { repeat });
}
// 잔디
export function grassTex(base = '#5f7552', { seed = 9, repeat = [12, 12] } = {}) {
  return canvasTex(512, 512, (g, W, H) => {
    const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let n = 0; n < 6000; n++) { const c = new THREE.Color(base).multiplyScalar(0.75 + r() * 0.5); g.strokeStyle = c.getStyle(); g.lineWidth = 1 + r(); const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 6); g.stroke(); }
  }, { repeat });
}
// 기와 지붕
export function tileRoofTex(base = '#3b4c4a', { repeat = [6, 3] } = {}) {
  return canvasTex(256, 256, (g, W, H) => {
    const c = new THREE.Color(base); g.fillStyle = c.getStyle(); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) { const grd = g.createLinearGradient(i * 32, 0, i * 32 + 32, 0); grd.addColorStop(0, c.clone().multiplyScalar(0.7).getStyle()); grd.addColorStop(0.5, c.clone().multiplyScalar(1.25).getStyle()); grd.addColorStop(1, c.clone().multiplyScalar(0.7).getStyle()); g.fillStyle = grd; g.fillRect(i * 32, 0, 32, H); }
    for (let j = 0; j < 4; j++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, j * 64 + 60, W, 4); }
  }, { repeat });
}
// 단청 띠 (절차적: 녹청 바탕 + 주홍·노랑 꽃무늬)
export function dancheongTex({ repeat = [4, 1] } = {}) {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#2f6f62'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1d4a43'; g.fillRect(0, 0, W, 18); g.fillRect(0, H - 18, W, 18);
    g.fillStyle = '#d9b44a'; g.fillRect(0, 18, W, 6); g.fillRect(0, H - 24, W, 6);
    const n = 4; const s = W / n;
    for (let i = 0; i < n; i++) {
      const cx = i * s + s / 2, cy = H / 2;
      const ring = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); };
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.fillStyle = k % 2 ? '#c4473a' : '#e7883f'; g.beginPath(); g.ellipse(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, 30, 18, a, 0, Math.PI * 2); g.fill(); }
      ring(46, '#f2e2b8'); ring(36, '#c4473a'); ring(24, '#e9c35a'); ring(12, '#2f6f62');
      for (const sx of [-1, 1]) { g.fillStyle = '#6aa7c2'; g.beginPath(); g.moveTo(cx + sx * 95, cy); g.lineTo(cx + sx * 125, cy - 40); g.lineTo(cx + sx * 125, cy + 40); g.closePath(); g.fill(); g.fillStyle = '#f2e2b8'; g.fillRect(cx + sx * 128 - 3, 24, 6, H - 48); }
    }
  }, { repeat });
}
// 하늘 그라데이션
export function skyTex(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t;
}

/* ---------------- 소품 ---------------- */
export function pineTree(h = 4, seed = 0) {
  const g = new THREE.Group(); const r = rnd(seed + 11);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * h / 4, 0.18 * h / 4, h * 0.55, 7), M('#5b4232')); trunk.position.y = h * 0.27; g.add(trunk);
  const greens = ['#2f5a43', '#3a6a4c', '#466f4f'];
  for (let i = 0; i < 4; i++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(h * (0.32 - i * 0.06), h * 0.34, 9), M(greens[i % 3], { flatShading: true })); cone.position.y = h * (0.38 + i * 0.16); cone.rotation.y = r() * 3; g.add(cone); }
  return shadow(g);
}
export function roundTree(h = 3.2, seed = 0, palette = ['#5d7a4f', '#6f8a55', '#8a8a52']) {
  const g = new THREE.Group(); const r = rnd(seed + 3);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h * 0.5, 7), M('#6a4d3a')); trunk.position.y = h * 0.25; g.add(trunk);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(h * (0.22 + r() * 0.1), 1), M(palette[i % palette.length], { flatShading: true })); b.position.set((r() - 0.5) * h * 0.35, h * (0.55 + r() * 0.25), (r() - 0.5) * h * 0.35); g.add(b); }
  g.userData.sway = r() * 6;
  return shadow(g);
}
export function plantPot(h = 0.8, r = 0.3) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.55, h * 0.42, 16), M('#B39A76', { roughness: 0.6 })); pot.position.y = h * 0.21; g.add(pot);
  for (let i = 0; i < 7; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(r * 0.45, 8, 6), M(i % 2 ? '#5d7f5c' : '#4b6e4c')); const a = i / 7 * Math.PI * 2; leaf.scale.set(0.5, 1.4, 0.5); leaf.position.set(Math.cos(a) * r * 0.35, h * 0.62 + (i % 3) * 0.05, Math.sin(a) * r * 0.35); leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(leaf); }
  return shadow(g);
}
export function lotusLantern(color = '#F2A6A0', r = 0.26) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.7 }));
  body.scale.y = 0.82; g.add(body);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 8, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 })); p.scale.set(0.55, 1.1, 0.3); p.position.set(Math.cos(a) * r * 0.9, r * 0.1, Math.sin(a) * r * 0.9); p.lookAt(0, r * 2, 0); g.add(p); }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), M('#d9c27a')); tail.position.y = -r - 0.17; g.add(tail);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 6), M('#e0b84a')); tassel.position.y = -r - 0.38; g.add(tassel);
  return g;
}
export function candleStick(h = 1.0, gold = true) {
  const g = new THREE.Group(); const m = gold ? GOLD() : M('#7a5a42');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 16), m); base.position.y = 0.03; g.add(base);
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.025 + Math.sin(t * Math.PI * 3) * 0.012 + (1 - t) * 0.02, t * h)); }
  const stem = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), m); g.add(stem);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.05, 14), m); cup.position.y = h; g.add(cup);
  const cdl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 10), M('#F3E2BB')); cdl.position.y = h + 0.12; g.add(cdl);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 8), new THREE.MeshBasicMaterial({ color: '#FFC76A' })); fl.position.y = h + 0.26; g.add(fl); g.userData.flame = fl;
  return g;
}

/* ---------------- 한옥 팔작/우진각 지붕 (처마 곡선 + 추녀 들림) ---------------- */
export function hanokRoof(W, D, H, { color = '#3b4c4a', upturn = 0.55, seg = 40, under = '#6b4a35', texRepeat = null } = {}) {
  const Wh = W / 2, Dh = D / 2;
  const geo = new THREE.PlaneGeometry(W, D, seg, Math.round(seg * D / W)); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const mx = Math.max(Math.abs(x) - (Wh - Dh), 0) / Dh, mz = Math.abs(z) / Dh;
    const m = Math.min(1, Math.max(mx, mz));
    let y = H * Math.pow(1 - m, 1.45);
    const corner = Math.pow(Math.min(1, Math.abs(x) / Wh), 6) * Math.pow(Math.min(1, Math.abs(z) / Dh), 6);
    y += upturn * Math.pow(m, 5) * (0.35 + corner * 2.4);
    p.setY(i, y);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const tex = tileRoofTex(color, { repeat: texRepeat || [W * 1.6, D * 1.2] });
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, roughness: 0.7, side: THREE.FrontSide }));
  const bot = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: under, roughness: 0.9, side: THREE.BackSide }));
  bot.position.y = -0.06; g.add(top, bot);
  // 용마루 + 망와
  const ridgeLen = Math.max(0.4, W - D);
  const ridge = rbox(ridgeLen + 0.4, 0.28, 0.32, 0.06, M('#2d3836')); ridge.position.y = H + 0.06; g.add(ridge);
  for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#2d3836')); end.scale.set(0.8, 1.6, 0.8); end.position.set(s * (ridgeLen / 2 + 0.25), H + 0.1, 0); g.add(end); }
  // 처마 끝 단청 띠
  return shadow(g);
}
