// v3 — 거래처 확장 공간: 야시장 먹거리 골목(용마미식거리 배치도 기준) + 게임장
// 실제 배치: 교차로 가운데 무대, 1~5번(남쪽 줄)·6~16번(북·동쪽 줄) 먹거리부스, 17~20번 플리마켓, 접객 파라솔, 운영본부
import * as THREE from 'three';
import { STREET, ARCADE } from '../config.js';
import { textTexture } from '../engine.js';
import { rbox, loadTex, plantPot } from './common.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
function place(o, x, y, z, parent) { o.position.set(x, y, z); parent && parent.add(o); return o; }
function sign(lines, w, h, opts) {
  const tex = textTexture(lines, { w: 768, h: Math.round(768 * h / w), ...opts });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  m.userData.noShadow = true; return m;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function billboardImg(url, h, aspect) {
  const t = loadTex(url); const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: 0.8, side: THREE.DoubleSide }));
  m.userData.billboard = true; m.userData.noShadow = true; return m;
}

/* ---------------- 먹거리 골목 ---------------- */
export function buildFoodStreet(scene, { w, d, obs, seats, clickables, anim, props, addScreen, low }) {
  const H = w / 2;
  scene.background = new THREE.Color('#0E1F4D');
  scene.fog = new THREE.Fog('#16224a', 26, 70);
  // 밤하늘 별
  const starG = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2, r = 80; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.6 + 8, Math.sin(a) * Math.cos(e) * r); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: '#dfe6ff', size: 0.35, sizeAttenuation: true, fog: false })));
  // 바닥: 아스팔트 + 보도 + 차선
  const asphalt = canvasTex(512, 512, (g, W, Hh) => { g.fillStyle = '#3b3d43'; g.fillRect(0, 0, W, Hh); for (let i = 0; i < 9000; i++) { const v = 45 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(Math.random() * W, Math.random() * Hh, 1.5, 1.5); } });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping; asphalt.repeat.set(w / 4, d / 4);
  const ground = box(w, 0.3, d, new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 })); ground.position.y = -0.15; ground.receiveShadow = true; scene.add(ground);
  const walkM = M('#8d8a84', { roughness: 0.95 });
  for (const s of [-1, 1]) { // 보도 (도로 가장자리)
    const a = box(1.4, 0.12, d, walkM); a.position.set(s * 5.2, 0.06, 0); a.receiveShadow = true; scene.add(a);
    const b = box(w, 0.12, 1.4, walkM); b.position.set(0, 0.06, s * 5.2); b.receiveShadow = true; scene.add(b);
  }
  const line = M('#d9c46a', { emissive: '#3a3000' });
  for (let z = 6; z < H; z += 2.4) for (const s of [-1, 1]) { const l = box(0.12, 0.01, 1.2, line); l.position.set(0, 0.005, s * z); scene.add(l); }
  for (let x = 6; x < H; x += 2.4) for (const s of [-1, 1]) { const l = box(1.2, 0.01, 0.12, line); l.position.set(s * x, 0.005, 0); scene.add(l); }
  const cw = M('#e8e6e0'); for (const [ax, sg] of [['z', 1], ['z', -1], ['x', 1], ['x', -1]]) for (let k = -3; k <= 3; k++) { const st = box(ax === 'z' ? 0.5 : 1.6, 0.01, ax === 'z' ? 1.6 : 0.5, cw); st.position.set(ax === 'z' ? k * 0.9 : sg * 4.6, 0.006, ax === 'z' ? sg * 4.6 : k * 0.9); scene.add(st); }

  // 네 모서리 건물 블록 (노포 간판·불 켜진 창)
  const shops = STREET.shops;
  const winTex = canvasTex(256, 256, (g, W, Hh) => { g.fillStyle = '#4a4650'; g.fillRect(0, 0, W, Hh); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = Math.random() < 0.65 ? ['#ffd28a', '#ffe7b8', '#f6c27a'][(r + c) % 3] : '#2c2a33'; g.fillRect(c * 64 + 10, r * 64 + 12, 44, 38); } });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  let si = 0;
  for (const qx of [-1, 1]) for (const qz of [-1, 1]) {
    const bx = qx * (5.9 + (H - 5.9) / 2), bz = qz * (5.9 + (H - 5.9) / 2), bw = H - 5.9;
    obs(bx, bz, bw + 0.3, bw + 0.3);
    // 길가를 따라 2~4층 건물 여러 채
    for (const along of ['x', 'z']) {
      for (let k = 0; k < 3; k++) {
        const len = bw / 3 - 0.2, floors = 2 + ((k + si) % 3), hh = floors * 3.1;
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(len / 2.4)), floors);
        const col = ['#6d6159', '#7c6f66', '#5e5a63', '#80705f', '#6a6f75'][(k + si) % 5];
        const bm = [M(col), M(col), M(col), M(col), new THREE.MeshStandardMaterial({ map: t, emissive: '#ffcf8a', emissiveMap: t, emissiveIntensity: 0.55, roughness: 0.8 }), M(col)];
        const b = new THREE.Mesh(new THREE.BoxGeometry(len, hh, 2.6), bm);
        const off = -bw / 2 + len / 2 + 0.1 + k * (len + 0.2);
        if (along === 'x') { b.position.set(bx + off, hh / 2, qz * 6.0 + qz * 1.3); b.rotation.y = qz > 0 ? Math.PI : 0; }
        else { b.position.set(qx * 6.0 + qx * 1.3, hh / 2, bz + off); b.rotation.y = qx > 0 ? -Math.PI / 2 : Math.PI / 2; }
        b.castShadow = !low; b.receiveShadow = true; scene.add(b);
        // 1층 간판
        const name = shops[si % shops.length]; si++;
        const sg = sign([name], Math.min(len - 0.4, 3.4), 0.6, { bg: ['#1f2a44', '#3a1f1a', '#1f3a2e', '#3b2a12'][si % 4], fg: '#ffe2b0', radius: 8 });
        sg.position.set(0, 3.0 - hh / 2, 1.32); b.add(sg);
        const awn = box(len - 0.3, 0.08, 0.9, M(['#c0392b', '#e67e22', '#2e86de', '#16a085'][si % 4])); awn.position.set(0, 2.4 - hh / 2, 1.7); awn.rotation.x = 0.25; b.add(awn);
      }
    }
  }

  // 천막 부스
  const tentTop = (col) => { const g = new THREE.ConeGeometry(1.62, 1.0, 4, 1, true); g.rotateY(Math.PI / 4); return new THREE.Mesh(g, M(col, { side: THREE.DoubleSide, roughness: 0.7 })); };
  const booths = [];
  const makeBooth = (b, x, z, ry, market) => {
    const [no, name, menu, price] = b;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const tcol = market ? '#F2C230' : '#F07A1A', poleM = M('#dcdcdc', { metalness: 0.6, roughness: 0.35 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(box(0.06, 2.4, 0.06, poleM), sx * 1.1, 1.2, sz * 1.1, g);
    const top = tentTop(tcol); top.position.y = 2.9; g.add(top);
    const val = box(2.3, 0.35, 0.03, M(tcol)); val.position.set(0, 2.25, 1.13); g.add(val);
    const back = box(2.2, 2.2, 0.03, M(market ? '#fff3c4' : '#fff1e2', { side: THREE.DoubleSide })); back.position.set(0, 1.15, -1.1); g.add(back);
    // 매대
    const counter = rbox(2.1, 0.9, 0.7, 0.04, M('#f4efe6')); counter.position.set(0, 0.45, 0.65); g.add(counter);
    const skirt = box(2.12, 0.6, 0.02, M(tcol)); skirt.position.set(0, 0.35, 1.01); g.add(skirt);
    // 상품·음식
    const foodCols = market ? ['#c0c7d0', '#e7d6f2', '#b5e3d6', '#f2d0c0'] : ['#d8873a', '#f4e1b8', '#b4542c', '#e9c46a', '#7a3a1a'];
    for (let i = 0; i < 6; i++) { const it = market ? rbox(0.22, 0.08, 0.18, 0.03, M(foodCols[i % 4])) : new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.07, 14), M(foodCols[i % 5], { roughness: 0.5 })); it.position.set(-0.75 + i * 0.3, 0.95, 0.6 + (i % 2) * 0.12); g.add(it); }
    if (!market && (no % 3 === 0)) { const steam = []; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false })); g.add(s); steam.push(s); } anim.push((t, dt, red) => steam.forEach((s, i) => { const k = (t * 0.5 + i / 4) % 1; s.position.set(-0.4 + i * 0.25, 1.05 + k * 0.9, 0.6); s.scale.setScalar(1 + k * 2); s.material.opacity = red ? 0 : 0.16 * (1 - k); })); }
    // 번호 + 이름 간판 (앞)
    const nm = name.length > 9 ? name.replace(/\s*\(.*\)/, '') : name;
    const sg = sign([`${no}  ${nm}`], 2.2, 0.34, { bg: '#ffffff', fg: '#3a1a08', radius: 10 }); sg.position.set(0, 2.25, 1.16); g.add(sg);
    const mn = sign([menu.length > 16 ? menu.slice(0, 16) + '…' : menu], 2.0, 0.26, { bg: market ? '#7a5a00' : '#7a2e0e', fg: '#fff3dc', radius: 8 }); mn.position.set(0, 0.5, 1.03); g.add(mn);
    // 백열등
    const bulbM = new THREE.MeshBasicMaterial({ color: '#ffd38a' });
    for (const sx of [-0.6, 0.6]) { const bl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bulbM); bl.position.set(sx, 2.05, 0.4); g.add(bl); }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.3; g.add(hit);
    g.userData.booth = no; clickables.push(g);
    const fx = Math.sin(ry), fz = Math.cos(ry);
    g.userData.approach = [x + fx * 1.75, z + fz * 1.75]; g.userData.face = ry;
    const ax = Math.abs(Math.sin(ry)) > 0.5; obs(x, z, ax ? 2.4 : 2.4, ax ? 2.4 : 2.4);
    booths.push(g);
  };
  const F = STREET.food, MK = STREET.market;
  F.slice(0, 5).forEach((b, i) => makeBooth(b, 3.6, 6.5 + i * 2.25, -Math.PI / 2, false));   // 남쪽 줄 1~5 (강릉한우마크나인 앞)
  F.slice(5, 10).forEach((b, i) => makeBooth(b, 3.6, -6.5 - i * 2.25, -Math.PI / 2, false)); // 북쪽 줄 6~10 (포남보양탕 방면)
  F.slice(10, 14).forEach((b, i) => makeBooth(b, 6.9 + i * 2.4, -3.6, 0, false));              // 동쪽 북편 11~14
  F.slice(14, 16).forEach((b, i) => makeBooth(b, 11.7 + i * 2.4, 3.6, Math.PI, false));        // 동쪽 남편 15~16
  MK.forEach((b, i) => makeBooth(b, -6.9 - i * 2.4, -3.6, 0, true));                              // 서쪽 17~20 플리마켓 (만양맛값 방면)

  // 접객 파라솔 (피크닉 테이블 = 앉는 자리)
  let idx = 0;
  const parasol = (x, z) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const woodM = M('#d98a3a', { roughness: 0.6 }), legM = M('#555', { metalness: 0.5 });
    place(box(1.0, 0.06, 1.9, woodM), 0, 0.74, 0, g);
    for (const sx of [-1, 1]) { place(box(0.32, 0.05, 1.9, woodM), sx * 0.78, 0.44, 0, g); for (const sz of [-0.8, 0.8]) place(box(0.05, 0.74, 0.05, legM), sx * 0.4, 0.37, sz, g); }
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8), M('#eee', { metalness: 0.5 })), 0, 1.3, 0, g);
    const can = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 8, 1, true), M('#F07A1A', { side: THREE.DoubleSide, roughness: 0.7 })); can.position.y = 2.5; g.add(can);
    const lt = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe0a8' })); lt.position.y = 2.15; g.add(lt);
    obs(x, z, 1.1, 2.0);
    for (const sx of [-1, 1]) for (const sz of [-0.45, 0.45]) { const ry = sx < 0 ? Math.PI / 2 : -Math.PI / 2; seats.push({ idx: idx++, x: x + sx * 0.78, z: z + sz, ry, y: 0.46, type: 'bench', zone: 'dine', approach: [x + sx * 1.45, z + sz] }); }
  };
  for (const z of [8.2, 11.6, 15.0]) parasol(-2.4, z);
  for (const z of [-8.2, -11.6, -15.0]) parasol(-2.4, z);

  // 무대 (교차로 가운데) + 대형 스크린 (버스킹·공연 영상)
  const stage = new THREE.Group(); scene.add(stage);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.1, 0.5, 32), M('#2a2a30', { roughness: 0.6 })); plat.position.y = 0.25; stage.add(plat);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(2.02, 0.04, 6, 48), new THREE.MeshBasicMaterial({ color: '#ffb347' })); edge.rotation.x = Math.PI / 2; edge.position.y = 0.5; stage.add(edge);
  const truss = M('#c9ccd1', { metalness: 0.7, roughness: 0.3 });
  for (const sx of [-1.8, 1.8]) place(box(0.16, 4.2, 0.16, truss), sx, 2.1, -1.2, stage);
  place(box(3.8, 0.16, 0.16, truss), 0, 4.2, -1.2, stage);
  { const sl = new THREE.SpotLight('#ffd9a0', 10, 9, 0.7, 0.6, 1.2); sl.position.set(0, 4.1, 1.5); sl.target.position.set(0, 0.5, 0); stage.add(sl, sl.target); }
  obs(0, 0, 4.2, 4.2);
  const scr = addScreen(scene, 'stage', { x: 0, y: 2.6, z: -1.05, w: 3.2, h: 1.8 }, clickables, anim); props.screen = scr;
  const st = sign(['골목어게인 무대', '버스킹 · DJ 음악다방 · 거리노래방'], 2.6, 0.5, { bg: '#0E1F4D', fg: '#ffd38a', sub: '#ffe9c4', radius: 14 }); st.position.set(0, 0.85, 2.12); stage.add(st);

  // 운영본부 (파란 천막) · 놀아존 체험 · 바람길 쉼터
  const hq = new THREE.Group(); hq.position.set(7.0, 0, 3.7); scene.add(hq);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) place(box(0.06, 2.3, 0.06, M('#ddd', { metalness: 0.5 })), sx * 1.1, 1.15, sz * 1.0, hq);
  const hqt = tentTop('#2E5BFF'); hqt.position.y = 2.8; hq.add(hqt);
  place(rbox(2.0, 0.8, 0.6, 0.04, M('#f4f4f4')), 0, 0.4, 0, hq);
  const hs = sign(['운영본부', '안내 · 물품보관 · 분실물'], 2.0, 0.42, { bg: '#2E5BFF', fg: '#ffffff', sub: '#dfe6ff', radius: 10 }); hs.position.set(0, 2.15, 1.05); hq.add(hs);
  obs(7.0, 3.7, 2.4, 2.2);
  const play = new THREE.Group(); play.position.set(-7.6, 0, 3.8); scene.add(play);
  place(rbox(3.0, 0.75, 1.0, 0.04, M('#f6efe2')), 0, 0.375, 0, play);
  for (let i = 0; i < 4; i++) { const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.12, 16), M('#c0392b', { roughness: 0.5 })); bowl.position.set(-1.1 + i * 0.73, 0.82, 0); play.add(bowl); }
  const ps = sign(['놀아존 · 김치 담그기 체험', '감자옹심이 빚기 · 외국인 체험'], 3.0, 0.5, { bg: '#1f6f4a', fg: '#ffffff', sub: '#e0f5e9', radius: 10 }); ps.position.set(0, 1.7, 0.2); play.add(ps);
  obs(-7.6, 3.8, 3.2, 1.2);
  const rest = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    const yurt = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.6, 20, 1, true, Math.PI * 0.15, Math.PI * 1.7), M('#f3eee4', { side: THREE.DoubleSide })); yurt.position.y = 0.8; g.add(yurt);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 20), M('#e7e0d2')); roof.position.y = 2.05; g.add(roof);
    const heat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 12), M('#555', { metalness: 0.6 })); heat.position.set(0, 0.8, 0); g.add(heat);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12), new THREE.MeshBasicMaterial({ color: '#ff8a3a' })); glow.position.y = 1.5; g.add(glow);
    obs(x, z, 3.0, 3.0); };
  rest(-11.4, 4.0); rest(-15.0, 4.0);
  const rs = sign(['용마 바람길 쉼터', '파라솔 · 난방 · 몽골텐트'], 2.6, 0.48, { bg: '#0E1F4D', fg: '#ffffff', sub: '#c8d2ff', radius: 10 }); rs.position.set(-13.2, 2.9, 5.6); rs.userData.billboard = true; scene.add(rs);

  // 남쪽 입구 아치 + 로고 + 마스코트 용지·마루
  const gate = new THREE.Group(); gate.position.set(0, 0, H - 0.2); scene.add(gate);
  for (const sx of [-4.6, 4.6]) place(box(0.35, 4.6, 0.35, M('#0E1F4D')), sx, 2.3, 0, gate);
  const ban = box(9.6, 1.4, 0.2, M('#0E1F4D')); ban.position.y = 4.3; gate.add(ban);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ map: loadTex('assets/tex/yongma_logo-yongma-white.webp'), transparent: true, toneMapped: false }));
  logo.position.set(0, 4.3, -0.12); logo.rotation.y = Math.PI; gate.add(logo);
  const logo2 = logo.clone(); logo2.position.z = 0.12; logo2.rotation.y = 0; gate.add(logo2);
  const gb = new THREE.MeshBasicMaterial({ color: '#ffd38a' }); for (let i = 0; i <= 16; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), gb); b.position.set(-4.7 + i * (9.4 / 16), 3.55, -0.12); gate.add(b); }
  const yong = billboardImg('assets/tex/yongma_mascot-yong.webp', 1.7, 600 / 669); yong.position.set(-4.2, 0.85, 4.5); scene.add(yong);
  const ma = billboardImg('assets/tex/yongma_mascot-ma.webp', 1.8, 600 / 850); ma.position.set(4.3, 0.9, 4.6); scene.add(ma);
  obs(-4.2, 4.5, 0.8, 0.6); obs(4.3, 4.6, 0.8, 0.6);
  const ys = sign(['용지 & 마루', '용마거리 마스코트'], 1.6, 0.36, { bg: '#ffffff', fg: '#7a2e0e', sub: '#a0522d', radius: 12 }); ys.position.set(-4.2, 1.95, 4.55); ys.userData.billboard = true; scene.add(ys);
  // 배치도 안내판
  const map = new THREE.Group(); map.position.set(-4.2, 0, 10.5); map.rotation.y = Math.PI / 2; scene.add(map);
  place(box(0.1, 1.6, 0.1, M('#333')), 0, 0.8, 0, map);
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.62), new THREE.MeshBasicMaterial({ map: loadTex('assets/tex/yongma_booth-layout.webp'), toneMapped: false })); mp.position.set(0, 1.9, 0.07); map.add(mp);
  place(box(1.3, 1.72, 0.06, M('#0E1F4D')), 0, 1.9, 0.02, map);
  map.userData.feature = 'boothmap'; clickables.push(map); obs(-4.2, 10.5, 0.4, 1.4); map.userData.approach = [-3.2, 10.5]; map.userData.face = Math.PI / 2;

  // 스트링 조명 (골목을 가로지르는 전구 줄)
  const bulbs = []; const add = (a, b, n, sag) => { for (let i = 0; i <= n; i++) { const t = i / n; bulbs.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]); } };
  for (let z = 6.5; z < H - 1; z += 2.6) for (const s of [-1, 1]) add([-5.3, 4.6, s * z], [5.3, 4.6, s * (z + 1.3)], 14, 0.7);
  for (let x = 6.5; x < H - 1; x += 2.6) for (const s of [-1, 1]) add([s * x, 4.6, -5.3], [s * (x + 1.3), 4.6, 5.3], 14, 0.7);
  for (const s of [-1, 1]) add([-5.3, 4.8, s * 5.3], [5.3, 4.8, -s * 5.3], 20, 1.0);
  const bi = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), bulbs.length);
  const mtx = new THREE.Matrix4(); bulbs.forEach((p, i) => { mtx.makeTranslation(p[0], p[1], p[2]); bi.setMatrixAt(i, mtx); }); bi.userData.noShadow = true; scene.add(bi);
  const cols = [new THREE.Color('#ffd9a0'), new THREE.Color('#ffb36b'), new THREE.Color('#fff0c8')];
  bulbs.forEach((p, i) => bi.setColorAt(i, cols[i % 3]));
  let acc = 0; anim.push((t, dt, red) => { if (red) return; acc += dt; if (acc < 0.25) return; acc = 0; for (let i = 0; i < bulbs.length; i += 7) bi.setColorAt(i, cols[(i + Math.floor(t * 3)) % 3]); bi.instanceColor.needsUpdate = true; });
  // 따뜻한 빛 (부스 줄마다)
  for (const [x, z] of [[0, 10.5], [0, -10.5], [10.5, 0], [-10.5, 0]]) { const l = new THREE.PointLight('#ffb870', 14, 16, 1.4); l.position.set(x, 4.2, z); scene.add(l); }
  // 가로등
  for (const [x, z] of [[-5.3, 7], [-5.3, -7], [5.3, 9], [-5.3, 13.5], [5.3, -9], [-9.6, -5.3], [9.6, 5.3]]) { const p = new THREE.Group(); p.position.set(x, 0, z); scene.add(p); place(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8), M('#2b2b30', { metalness: 0.5 })), 0, 2.1, 0, p); place(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1d0' })), 0, 4.3, 0, p); obs(x, z, 0.3, 0.3); }
  for (const [x, z] of [[-4.6, -5.2], [4.6, -5.2], [-4.4, 16.0]]) { const pp = plantPot(0.9, 0.3); pp.position.set(x, 0, z); scene.add(pp); obs(x, z, 0.6, 0.6); }
  props.booths = booths;
}

/* ---------------- 게임장 ---------------- */
export function buildArcade(scene, { w, d, h, obs, seats, machines, clickables, anim, props, buildMachine }) {
  const X0 = -w / 2, Z0 = -d / 2;
  // 카펫 (네온 무늬)
  const carpet = canvasTex(512, 512, (g, W, Hh) => { g.fillStyle = '#231a3a'; g.fillRect(0, 0, W, Hh); const c = ['#ff4fa0', '#4fd1ff', '#ffd84f', '#7cff6b', '#b68cff']; for (let i = 0; i < 90; i++) { g.strokeStyle = c[i % 5]; g.globalAlpha = 0.55; g.lineWidth = 3; const x = Math.random() * W, y = Math.random() * Hh, s = 8 + Math.random() * 18; if (i % 3 === 0) { g.beginPath(); g.arc(x, y, s / 2, 0, Math.PI * 2); g.stroke(); } else if (i % 3 === 1) { g.strokeRect(x, y, s, s * 0.6); } else { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.5); g.lineTo(x, y + s); g.stroke(); } } });
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(w / 4, d / 4);
  const fl = box(w, 0.02, d, new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 })); fl.position.y = 0.011; fl.receiveShadow = true; scene.add(fl);
  // 네온 띠 (벽 위·아래)
  const neon = (col) => new THREE.MeshBasicMaterial({ color: col });
  for (const [y, col] of [[h - 0.35, '#ff4fa0'], [0.18, '#4fd1ff']]) { const a = box(w, 0.05, 0.05, neon(col)); a.position.set(0, y, Z0 + 0.05); scene.add(a); for (const s of [-1, 1]) { const b = box(0.05, 0.05, d, neon(col)); b.position.set(s * (w / 2 - 0.05), y, 0); scene.add(b); } }
  const gz = sign(['GAME ZONE'], 5.2, 1.1, { bg: '#16102a', fg: '#ff7ac0', radius: 20 }); gz.position.set(-0.8, 3.3, Z0 + 0.08); scene.add(gz);
  const gz2 = sign(['게임 · 운세 · 뽑기 · 포토부스', '기계를 누르면 바로 플레이'], 4.6, 0.6, { bg: '#16102a', fg: '#9fe8ff', sub: '#ffe08a', radius: 14 }); gz2.position.set(-0.8, 2.45, Z0 + 0.08); scene.add(gz2);
  // 기계
  for (const def of ARCADE.machines) {
    const m = buildMachine(def, {});
    const ry = def.face === 1 ? Math.PI / 2 : def.face === -1 ? -Math.PI / 2 : 0;
    m.position.set(def.x, 0, def.z); m.rotation.y = ry; scene.add(m); machines.push(m); clickables.push(m);
    m.userData.approach = def.face === 1 ? [def.x + 1.2, def.z] : def.face === -1 ? [def.x - 1.2, def.z] : [def.x, def.z + 1.2]; m.userData.face = ry;
    const isK = def.type === 'kids'; obs(def.x, def.z, def.face ? (isK ? 0.65 : 0.8) : (isK ? 0.75 : 0.9), def.face ? (isK ? 0.75 : 0.9) : (isK ? 0.65 : 0.8));
    if (def.type === 'gacha') anim.push((t, dt, red) => { if (!red && m.userData.spin > 0) { m.userData.spin -= dt; m.userData.caps.rotation.y += dt * 9; m.userData.knob.rotation.z += dt * 6; } });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.35, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.set(def.x, 0.03, def.z); scene.add(glow);
  }
  const zs = (txt, x, z, ry, col) => { const s = sign([txt], 2.4, 0.5, { bg: '#16102a', fg: col, radius: 14 }); s.position.set(x, 3.0, z); s.rotation.y = ry; scene.add(s); };
  zs('키즈 존', X0 + 0.08, 0, Math.PI / 2, '#a5d6a7'); zs('인형뽑기 · 랜덤박스', w / 2 - 0.08, -0.8, -Math.PI / 2, '#ff9ac6');
  // 위드메모리 미러포토 부스
  const P = ARCADE.photo; const pb = new THREE.Group(); pb.position.set(P.x, 0, P.z); pb.rotation.y = -Math.PI / 2; scene.add(pb);
  place(rbox(2.2, 2.3, 1.7, 0.06, M('#f5f5f7', { roughness: 0.4 })), 0, 1.15, 0, pb);
  const cur = box(1.0, 1.9, 0.04, M('#ff6e9a', { roughness: 0.9 })); cur.position.set(0.35, 1.0, 0.86); pb.add(cur);
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.2), new THREE.MeshPhysicalMaterial({ color: '#cfd8e0', metalness: 1, roughness: 0.05 })); mir.position.set(-0.55, 1.25, 0.86); pb.add(mir);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff4d6' })); b.position.set(-0.55 + Math.cos(a) * 0.33, 1.25 + Math.sin(a) * 0.66, 0.87); pb.add(b); }
  const ps = sign(['위드메모리 미러포토', '거울 앞에서 찰칵 · mirrorphoto.kr'], 2.1, 0.46, { bg: '#ff6e9a', fg: '#ffffff', sub: '#fff0f6', radius: 12 }); ps.position.set(0, 2.55, 0.86); pb.add(ps);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.4, 1.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.2; pb.add(hit);
  pb.userData.feature = 'photo'; pb.userData.approach = [P.x - 1.6, P.z]; pb.userData.face = -Math.PI / 2; clickables.push(pb); obs(P.x, P.z, 1.8, 2.3); props.photo = pb;
  // 휴게 스툴 (앉는 자리)
  let idx = 0;
  for (const [x, z] of [[-2.5, 3.2], [-0.5, 3.2], [1.5, 3.2], [-2.5, 5.2], [-0.5, 5.2], [1.5, 5.2]]) {
    const s = new THREE.Group(); s.position.set(x, 0, z); scene.add(s);
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), M('#ff4fa0', { roughness: 0.5 })), 0, 0.5, 0, s);
    place(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), M('#ccc', { metalness: 0.7 })), 0, 0.25, 0, s);
    seats.push({ idx: idx++, x, z, ry: Math.PI, y: 0.52, type: 'stool', zone: 'rest', approach: [x, z + 0.55] });
  }
  for (const [x, z] of [[X0 + 0.6, d / 2 - 0.6], [w / 2 - 0.6, Z0 + 0.6]]) { const pp = plantPot(1.0, 0.3); pp.position.set(x, 0, z); scene.add(pp); obs(x, z, 0.6, 0.6); }
  const pl = new THREE.PointLight('#b68cff', 8, 14, 1.4); pl.position.set(0, h - 0.6, 0); scene.add(pl);
  const pl2 = new THREE.PointLight('#ff7ac0', 5, 10, 1.4); pl2.position.set(6, h - 0.8, 4); scene.add(pl2);
}
