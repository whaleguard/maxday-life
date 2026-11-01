// 공통 캐릭터 v2 — 큰 머리·작은 몸(1.30m), 표정(눈 깜빡임·감은 눈·미소·볼터치), 복장(승복+가사/한복/정장/일상복), 손 소품
// 모든 공간에서 같은 뼈대(관절 그룹)와 포즈 체계를 재사용
import * as THREE from 'three';
import { CHARACTER, GACHA } from './config.js';

const D = THREE.MathUtils.degToRad;
const matCache = new Map();
function mat(color, opts = {}) {
  const k = color + JSON.stringify(opts);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...opts }));
  return matCache.get(k);
}
export function disposeCharacterCache() { matCache.forEach(m => m.dispose()); matCache.clear(); GEO.dispose(); }

const GEO = {
  _g: null,
  get g() {
    if (!this._g) {
      const robePts = [];
      [[0.0, 0.43], [0.15, 0.42], [0.175, 0.36], [0.18, 0.24], [0.2, 0.1], [0.235, -0.08], [0.26, -0.22], [0.25, -0.24], [0.0, -0.24]].forEach(([r, y]) => robePts.push(new THREE.Vector2(r, y)));
      const hanbokPts = [];
      [[0.0, 0.43], [0.15, 0.42], [0.17, 0.33], [0.2, 0.2], [0.26, 0.0], [0.3, -0.2], [0.29, -0.23], [0.0, -0.23]].forEach(([r, y]) => hanbokPts.push(new THREE.Vector2(r, y)));
      this._g = {
        head: new THREE.SphereGeometry(0.30, 40, 30),
        scalp: new THREE.SphereGeometry(0.303, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42),
        hair: new THREE.SphereGeometry(0.318, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
        fringe: new THREE.SphereGeometry(0.317, 24, 10, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.18, Math.PI * 0.22),
        eye: new THREE.SphereGeometry(1, 16, 12),
        hl: new THREE.SphereGeometry(0.008, 8, 6),
        closed: new THREE.TorusGeometry(0.022, 0.0055, 6, 14, Math.PI),
        mouth: new THREE.TorusGeometry(0.03, 0.0065, 6, 16, Math.PI),
        brow: new THREE.CapsuleGeometry(0.006, 0.03, 2, 6),
        cheek: new THREE.CircleGeometry(0.036, 18),
        ear: new THREE.SphereGeometry(0.055, 12, 10),
        nose: new THREE.SphereGeometry(0.014, 8, 6),
        torso: new THREE.CapsuleGeometry(0.16, 0.14, 6, 18),
        robe: new THREE.LatheGeometry(robePts, 28),
        kasaSkirt: new THREE.LatheGeometry(robePts.map(v => new THREE.Vector2(v.x * 1.07 + (v.x > 0 ? 0.004 : 0), v.y)), 24, Math.PI * 0.15, Math.PI * 0.5),
        hanbok: new THREE.LatheGeometry(hanbokPts, 28),
        sleeve: new THREE.CylinderGeometry(0.07, 0.115, 0.2, 14, 1, true),
        upper: new THREE.CapsuleGeometry(0.056, 0.1, 4, 12),
        lower: new THREE.CapsuleGeometry(0.054, 0.08, 4, 12),
        hand: new THREE.SphereGeometry(0.062, 16, 12),
        thigh: new THREE.CapsuleGeometry(0.068, 0.05, 4, 12),
        shin: new THREE.CapsuleGeometry(0.064, 0.03, 4, 12),
        shoe: new THREE.SphereGeometry(0.075, 14, 10),
        kasa: new THREE.TorusGeometry(0.2, 0.058, 10, 48),
        kasaPanel: new THREE.BoxGeometry(0.17, 0.32, 0.03),
        collar: new THREE.TorusGeometry(0.12, 0.02, 6, 24, Math.PI),
        tie: new THREE.BoxGeometry(0.045, 0.18, 0.012),
        cup: new THREE.CylinderGeometry(0.04, 0.032, 0.07, 14),
        shadow: new THREE.CircleGeometry(0.34, 24),
      };
    }
    return this._g;
  },
  dispose() { if (this._g) Object.values(this._g).forEach(g => g.dispose()); this._g = null; },
};

const POSES = {
  stand: {},
  chair: { pelvisY: 0.40, hip: -90, knee: 90, torso: 4, sh: 8, el: 25 },
  bench: { pelvisY: 0.41, hip: -90, knee: 90, torso: 3, sh: 6, el: 20 },
  cushion: { pelvisY: 0.19, hip: -100, knee: 135, spread: 28, torso: 2, sh: 12, el: 45, shIn: 8 },
  palms: { sh: -55, shIn: 40, el: 95 },
  pray: { head: 18, torso: 8, sh: -40, shIn: 34, el: 102 },
  drink: { sh: -20, shIn: 18, el: 120, head: -4 },
  kneel: { pelvisY: 0.36, hip: -8, knee: 120, torso: 4, sh: 0, el: 10 },
  bowDown: { pelvisY: 0.30, hip: -12, knee: 125, torso: 75, head: 25, sh: -95, shIn: 10, el: 20 },
  use: { sh: -58, el: 42, head: -6 },
  beads: { sh: -30, shIn: 28, el: 105, head: 10 },
  read: { sh: -42, shIn: 26, el: 100, head: 16 },
};
const KEYS = ['pelvisY', 'hip', 'knee', 'spread', 'torso', 'head', 'sh', 'shIn', 'el'];
function full(p) { return Object.assign({ pelvisY: 0.30, hip: 0, knee: 0, spread: 0, torso: 0, head: 0, sh: 0, shIn: 0, el: 0 }, p); }
function mix(a, b) { return full({ ...a, ...b }); }

// 복장 목록 (샵과 공유)
export const OUTFITS = {
  monk: { name: '승복(회색)', kind: 'monk', top: '#9AA0A2', bottom: '#8C9294', accent: '#E2B54C', shoes: '#F1EEE6' },
  monkBrown: { name: '승복(갈색)', kind: 'monk', top: '#8A7259', bottom: '#7a6550', accent: '#C9963F', shoes: '#F1EEE6' },
  hanbokBlue: { name: '한복(쪽빛)', kind: 'hanbok', top: '#F4EBD8', bottom: '#4F6E95', accent: '#B8463F', shoes: '#F1EEE6' },
  hanbokPink: { name: '한복(분홍)', kind: 'hanbok', top: '#F7E1C8', bottom: '#D98FA1', accent: '#4F7A6B', shoes: '#F1EEE6' },
  suitNavy: { name: '정장(남색)', kind: 'suit', top: '#2F3D57', bottom: '#2A3449', accent: '#A63D40', shirt: '#F4F1EA', shoes: '#2a2421' },
  suitGray: { name: '정장(회색)', kind: 'suit', top: '#6B6F75', bottom: '#5c6066', accent: '#3E5C7A', shirt: '#F4F1EA', shoes: '#2a2421' },
  casualA: { name: '일상복(베이지)', kind: 'casual', top: '#D2B887', bottom: '#5C6570', accent: '#F4EEE2', shoes: '#ECE6DA' },
  casualB: { name: '일상복(세이지)', kind: 'casual', top: '#8FA89B', bottom: '#626057', accent: '#F4EEE2', shoes: '#ECE6DA' },
  casualC: { name: '일상복(로즈)', kind: 'casual', top: '#B3939C', bottom: '#555F72', accent: '#F4EEE2', shoes: '#ECE6DA' },
  cardigan: { name: '니트 가디건', kind: 'casual', top: '#C98F5E', bottom: '#4C5560', accent: '#F4EEE2', shoes: '#ECE6DA' },
};
export const HAND_ITEMS = { beads: '염주', moktak: '목탁', rosary: '묵주', bible: '성경책', hymnal: '찬송가책', candle: '초', lantern: '연등', lotus: '연꽃' };

export function lookFromSid(sid, spaceKey, prefs = {}) {
  let h = 0; for (const c of sid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const skin = CHARACTER.skin[h % 3];
  let outfit = spaceKey === 'temple' ? (prefs.outfitTemple || 'monk') : (prefs.outfit || ['casualA', 'casualB', 'casualC'][(h >> 3) % 3]);
  const sk = OUTFITS[outfit]?.kind === 'monk' ? ['#E2AE84', '#D49C72', '#C88C62'][h % 3] : skin;
  return { skin: sk, outfit, hand: prefs.hand || '', hairTone: ['#3f322c', '#4a3a30', '#2e2724'][(h >> 5) % 3] };
}

export class Character {
  constructor(look, { reducedMotion = false } = {}) {
    this.look = look; this.reduced = reducedMotion;
    this.root = new THREE.Group();
    this.own = [];
    this.build();
    this.cur = full({}); this.lower = 'stand'; this.upper = null;
    this.walking = false; this.walkT = 0; this.breathT = Math.random() * 4;
    this.bow = null; this.transition = 0.6; this.accId = ''; this.blinkT = 1 + Math.random() * 3; this.smileK = 0;
    this.root.userData.character = this;
  }

  build() {
    const g = GEO.g, look = this.look, of = OUTFITS[look.outfit] || OUTFITS.casualA;
    this.of = of;
    const own = (o) => { this.own.push(o); return o; };
    const skinM = mat(look.skin, { roughness: 0.62 });
    this.pelvis = new THREE.Group(); this.pelvis.position.y = 0.30; this.root.add(this.pelvis);
    this.torsoPivot = new THREE.Group(); this.pelvis.add(this.torsoPivot);
    const topM = mat(of.top, { roughness: 0.9 }), botM = mat(of.bottom, { roughness: 0.9 });
    const torso = new THREE.Mesh(g.torso, topM); torso.position.y = 0.21; torso.scale.set(1.16, 1, 0.82); this.torsoMesh = torso; this.torsoPivot.add(torso);
    this.skirt = null; this.drape = null;
    if (of.kind === 'monk' || of.kind === 'hanbok') {
      const skirt = new THREE.Mesh(of.kind === 'monk' ? g.robe : g.hanbok, of.kind === 'monk' ? topM : botM); skirt.position.y = 0.02; skirt.scale.z = 0.86; this.pelvis.add(skirt); this.skirt = skirt;
    }
    if (of.kind === 'monk') {
      const kasaM = mat(of.accent, { roughness: 0.7 });
      // 가사: 왼쪽 어깨→오른쪽 허리로 두르는 넓은 띠 + 허리 아래로 늘어진 자락
      const kasa = new THREE.Mesh(g.kasa, kasaM); kasa.scale.set(0.96, 1.22, 0.84); kasa.rotation.set(0, 0, D(36)); kasa.position.set(0.0, 0.2, 0); this.torsoPivot.add(kasa);
      const drape = new THREE.Mesh(g.kasaSkirt, mat(of.accent, { roughness: 0.7, side: THREE.DoubleSide })); drape.scale.set(1, 0.78, 0.86); drape.position.set(0.0, 0.05, 0); this.pelvis.add(drape); this.drape = drape;
      const collar = new THREE.Mesh(g.collar, mat('#F1EEE6')); collar.rotation.set(D(-70), 0, Math.PI); collar.position.set(0, 0.36, 0.04); collar.scale.set(1, 1, 0.8); this.torsoPivot.add(collar);
    }
    if (of.kind === 'hanbok') {
      const ribbon = new THREE.Mesh(own(new THREE.BoxGeometry(0.06, 0.16, 0.02)), mat(of.accent)); ribbon.position.set(0.05, 0.26, 0.135); ribbon.rotation.z = 0.25; this.torsoPivot.add(ribbon);
      const band = new THREE.Mesh(own(new THREE.TorusGeometry(0.175, 0.02, 6, 28)), mat(of.accent)); band.rotation.x = Math.PI / 2; band.scale.y = 0.82; band.position.y = 0.32; this.torsoPivot.add(band);
      const collar = new THREE.Mesh(g.collar, mat('#FFFFFF')); collar.rotation.set(D(-70), 0, Math.PI); collar.position.set(0, 0.36, 0.04); this.torsoPivot.add(collar);
    }
    if (of.kind === 'suit') {
      const shirt = new THREE.Mesh(own(new THREE.PlaneGeometry(0.12, 0.2)), mat(of.shirt)); shirt.position.set(0, 0.28, 0.141); this.torsoPivot.add(shirt);
      const tie = new THREE.Mesh(g.tie, mat(of.accent)); tie.position.set(0, 0.27, 0.146); this.torsoPivot.add(tie);
      for (const s of [-1, 1]) { const lap = new THREE.Mesh(own(new THREE.BoxGeometry(0.05, 0.2, 0.012)), topM); lap.position.set(0.055 * s, 0.27, 0.147); lap.rotation.z = -0.35 * s; this.torsoPivot.add(lap); }
    }
    if (of.kind === 'casual') { const collar = new THREE.Mesh(g.collar, mat(of.accent)); collar.rotation.set(D(-70), 0, Math.PI); collar.position.set(0, 0.36, 0.04); this.torsoPivot.add(collar); }
    // 머리
    this.headPivot = new THREE.Group(); this.headPivot.position.y = 0.40; this.torsoPivot.add(this.headPivot);
    const head = new THREE.Mesh(g.head, skinM); head.position.y = 0.31; this.headPivot.add(head);
    if (of.kind === 'monk') { const sc = new THREE.Mesh(g.scalp, mat(new THREE.Color(look.skin).lerp(new THREE.Color('#8d9093'), 0.22).getStyle(), { roughness: 0.55 })); sc.position.y = 0.31; sc.rotation.x = -0.2; this.headPivot.add(sc); }
    else {
      const hm = mat(look.hairTone || CHARACTER.hair, { roughness: 0.55 });
      const hair = new THREE.Mesh(g.hair, hm); hair.position.y = 0.31; hair.rotation.x = -0.32; this.headPivot.add(hair);
      const fr = new THREE.Mesh(g.fringe, hm); fr.position.y = 0.31; fr.rotation.x = -0.05; this.headPivot.add(fr);
    }
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(g.ear, skinM); ear.scale.set(0.55, 0.9, 0.7); ear.position.set(0.29 * s, 0.30, 0.01); this.headPivot.add(ear); }
    const face = new THREE.Group(); face.position.set(0, 0.31, 0); this.headPivot.add(face);
    const eyeM = mat('#1b1716', { roughness: 0.25 }), hlM = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 });
    this.eyes = []; this.closedEyes = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Group(); e.position.set(0.098 * s, 0.0, 0.272); e.rotation.y = 0.33 * s; face.add(e);
      const ball = new THREE.Mesh(g.eye, eyeM); ball.scale.set(0.028, 0.04, 0.016); e.add(ball);
      const hl = new THREE.Mesh(g.hl, hlM); hl.position.set(-0.008, 0.014, 0.013); e.add(hl);
      this.eyes.push(e);
      const c = new THREE.Mesh(g.closed, eyeM); c.position.set(0.098 * s, -0.005, 0.276); c.rotation.set(0, 0.33 * s, Math.PI); c.visible = false; face.add(c); this.closedEyes.push(c);
      if (of.kind !== 'monk') { const b = new THREE.Mesh(g.brow, mat(look.hairTone || '#3f322c')); b.rotation.set(0, 0.33 * s, Math.PI / 2 + 0.12 * s); b.position.set(0.098 * s, 0.075, 0.262); face.add(b); }
      const ck = new THREE.Mesh(g.cheek, own(new THREE.MeshBasicMaterial({ color: '#F08F84', transparent: true, opacity: 0.32, depthWrite: false }))); ck.position.set(0.155 * s, -0.06, 0.248); ck.rotation.y = 0.55 * s; face.add(ck);
    }
    const nose = new THREE.Mesh(g.nose, mat(new THREE.Color(look.skin).multiplyScalar(0.94).getStyle())); nose.position.set(0, -0.03, 0.3); face.add(nose);
    this.mouth = new THREE.Mesh(g.mouth, mat('#8a3f36', { roughness: 0.5 })); this.mouth.position.set(0, -0.09, 0.283); this.mouth.rotation.set(-0.2, 0, Math.PI); face.add(this.mouth);
    this.accSlot = new THREE.Group(); this.accSlot.position.y = 0.6; this.headPivot.add(this.accSlot);
    this.arms = [-1, 1].map(s => {
      const sh = new THREE.Group(); sh.rotation.order = 'YXZ'; sh.position.set(0.215 * s, 0.34, 0); this.torsoPivot.add(sh);
      const up = new THREE.Mesh(g.upper, topM); up.position.y = -0.10; sh.add(up);
      if (of.kind === 'monk' || of.kind === 'hanbok') { const sl = new THREE.Mesh(g.sleeve, mat(of.kind === 'monk' ? of.top : of.top, { roughness: 0.9, side: THREE.DoubleSide })); sl.position.y = -0.2; sh.add(sl); }
      const el = new THREE.Group(); el.position.y = -0.20; sh.add(el);
      const lo = new THREE.Mesh(g.lower, of.kind === 'casual' ? skinM : topM); lo.position.y = -0.09; el.add(lo);
      const hand = new THREE.Mesh(g.hand, skinM); hand.position.y = -0.19; el.add(hand);
      return { sh, el, s, hand };
    });
    this.cup = new THREE.Mesh(g.cup, mat('#F4EEE2')); this.cup.position.set(0, -0.21, 0.05); this.cup.visible = false; this.arms[1].el.add(this.cup);
    this.handSlot = new THREE.Group(); this.handSlot.position.set(0, -0.22, 0.04); this.arms[0].el.add(this.handSlot);
    this.legs = [-1, 1].map(s => {
      const hp = new THREE.Group(); hp.rotation.order = 'YXZ'; hp.position.set(0.095 * s, 0, 0); this.pelvis.add(hp);
      const th = new THREE.Mesh(g.thigh, botM); th.position.y = -0.08; hp.add(th);
      const kn = new THREE.Group(); kn.position.y = -0.16; hp.add(kn);
      const sn = new THREE.Mesh(g.shin, botM); sn.position.y = -0.065; kn.add(sn);
      const shoe = new THREE.Mesh(g.shoe, mat(of.shoes || '#ECE6DA', { roughness: 0.5 })); shoe.scale.set(0.85, 0.55, 1.35); shoe.position.set(0, -0.13, 0.035); kn.add(shoe);
      return { hp, kn, s };
    });
    const shd = new THREE.Mesh(g.shadow, own(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })));
    shd.rotation.x = -Math.PI / 2; shd.position.y = 0.012; this.root.add(shd);
    this.root.traverse(o => { if (o.isMesh && o !== shd) { o.castShadow = true; } });
    this.handId = undefined; this.setHand(look.hand || '');
  }

  rebuild(look) {
    const pos = this.root.position.clone(), rot = this.root.rotation.y, acc = this.accId, calm = this.accCalm;
    this.clearParts(); this.look = look; this.build(); this.accId = ''; this.setAccessory(acc, { calm });
    this.root.position.copy(pos); this.root.rotation.y = rot;
  }
  clearParts() {
    this.setAccessory(''); this.setHand('');
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.own.forEach(o => o.dispose && o.dispose()); this.own = [];
  }

  setLower(kind) { if (this.lower !== kind) { this.lower = kind; this.transition = kind === 'cushion' ? 0.75 : kind === 'stand' ? 0.7 : 0.65; } }
  setUpper(kind) { if (this.upper !== kind) { this.upper = kind; this.transition = kind === 'palms' ? 0.5 : 0.6; } }
  startBow(onDone) { this.bow = { t: 0, onDone }; }
  get bowing() { return !!this.bow; }
  smile(sec = 2) { this.smileK = sec; }

  setHand(id) {
    if (this.handId === id) return; this.handId = id;
    while (this.handSlot && this.handSlot.children.length) { const c = this.handSlot.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    if (!id || !this.handSlot) return;
    this.handSlot.add(buildHandItem(id));
  }

  setAccessory(id, { calm = false } = {}) {
    if (this.accId === id && this.accCalm === calm) return;
    this.accId = id; this.accCalm = calm;
    while (this.accSlot && this.accSlot.children.length) { const c = this.accSlot.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    if (!id) return;
    const it = GACHA.items.find(i => i.id === id); if (!it) return;
    this.accSlot.add(buildAccessory(it, calm));
  }

  update(dt, t) {
    let target;
    if (this.bow) {
      this.bow.t += dt; const b = this.bow.t;
      const sit = full(POSES.cushion), kn = full(POSES.kneel), dn = full(POSES.bowDown);
      const L = (a, c, k) => { const o = {}; k = smooth(k); for (const key of KEYS) o[key] = a[key] + (c[key] - a[key]) * k; return o; };
      if (b < 0.8) target = L(sit, kn, b / 0.8);
      else if (b < 2.0) target = L(kn, dn, (b - 0.8) / 1.2);
      else if (b < 3.2) target = dn;
      else if (b < 4.8) target = L(dn, sit, (b - 3.2) / 1.6);
      else { target = sit; const f = this.bow.onDone; this.bow = null; f && f(); }
      Object.assign(this.cur, target);
    } else {
      target = mix(POSES[this.lower] || {}, this.upper ? POSES[this.upper] : {});
      const k = 1 - Math.exp(-dt * (4.6 / Math.max(0.2, this.transition)));
      for (const key of KEYS) this.cur[key] += (target[key] - this.cur[key]) * k;
    }
    const c = this.cur;
    let bob = 0, swing = 0;
    if (this.walking) { this.walkT += dt / 0.8; const ph = this.walkT * Math.PI * 2; swing = Math.sin(ph); bob = Math.abs(Math.sin(ph)) * 0.025; } else this.walkT = 0;
    this.pelvis.position.y = c.pelvisY + bob;
    this.torsoPivot.rotation.x = D(c.torso);
    this.torsoPivot.rotation.z = this.walking ? swing * 0.03 : 0;
    this.headPivot.rotation.x = D(c.head);
    for (const a of this.arms) {
      a.sh.rotation.x = D(c.sh) + (this.walking ? D(18) * swing * -a.s : 0);
      a.sh.rotation.z = D(5) * a.s;
      a.sh.rotation.y = -D(c.shIn) * a.s;
      a.el.rotation.x = -D(c.el); a.el.rotation.z = 0;
    }
    for (const l of this.legs) {
      const wl = this.walking ? D(22) * swing * l.s : 0;
      l.hp.rotation.x = D(c.hip) + wl;
      l.hp.rotation.y = D(c.spread) * l.s;
      l.kn.rotation.x = D(c.knee) + (this.walking ? Math.max(0, -wl) * 0.8 : 0);
    }
    if (this.skirt) { const sitK = Math.min(1, Math.max(0, -c.hip / 90)); this.skirt.scale.set(1 + sitK * 0.25, 1 - sitK * 0.45, 0.86 + sitK * 0.9); this.skirt.position.z = sitK * 0.09; if (this.drape) { this.drape.scale.set(1 + sitK * 0.25, 0.78 * (1 - sitK * 0.45), 0.86 + sitK * 0.9); this.drape.position.z = sitK * 0.09; } }
    this.cup.visible = this.upper === 'drink';
    if (this.upper === 'drink' && !this.reduced) {
      const sip = (Math.sin(t * 0.9) + 1) / 2;
      this.arms[1].sh.rotation.x = D(-20 - sip * 35); this.arms[1].el.rotation.x = -D(120 + sip * 15);
      this.arms[0].sh.rotation.x = D(-10); this.arms[0].el.rotation.x = -D(60);
    }
    if (this.upper === 'beads' && !this.reduced) this.arms[0].el.rotation.z = Math.sin(t * 3) * 0.06;
    const closed = this.bow || this.upper === 'pray' || this.upper === 'palms' || this.upper === 'beads';
    let blink = false;
    if (!closed && !this.reduced) { this.blinkT -= dt; if (this.blinkT < 0) { blink = true; if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3.5; } }
    const shut = !!(closed || blink);
    this.eyes.forEach(e => e.visible = !shut); this.closedEyes.forEach(e => e.visible = shut);
    if (this.smileK > 0) this.smileK -= dt;
    const sm = this.smileK > 0 ? 1.45 : closed ? 0.8 : 1;
    this.mouth.scale.set(sm, sm, 1);
    if (!this.reduced) { this.breathT += dt; const br = 1 + Math.sin(this.breathT * Math.PI / 2) * 0.008; this.torsoMesh.scale.set(1.16 * br, br, 0.82 * br); }
    if (this.accSlot.children[0] && !this.accCalm && !this.reduced) this.accSlot.children[0].rotation.y = Math.sin(t * 0.8) * 0.15;
  }

  dispose() { this.clearParts(); this.root.removeFromParent(); }
}

function smooth(k) { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); }

export function buildHandItem(id) {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o })); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  switch (id) {
    case 'beads': case 'rosary': {
      const n = id === 'beads' ? 18 : 14; const col = id === 'beads' ? '#C9894B' : '#6b4a6e';
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; add(new THREE.SphereGeometry(0.016, 8, 6), col, Math.cos(a) * 0.07, -0.05 + Math.sin(a) * 0.09, 0.02, { roughness: 0.35 }); }
      if (id === 'rosary') { add(new THREE.BoxGeometry(0.012, 0.06, 0.008), '#d9c27a', 0, -0.17, 0.02, { metalness: 0.7, roughness: 0.3 }); add(new THREE.BoxGeometry(0.04, 0.012, 0.008), '#d9c27a', 0, -0.155, 0.02, { metalness: 0.7, roughness: 0.3 }); }
      break;
    }
    case 'moktak': { const m = add(new THREE.SphereGeometry(0.07, 16, 12), '#A8692F', 0, -0.02, 0.05, { roughness: 0.4 }); m.scale.set(1.1, 0.85, 1); add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), '#7a4a22', 0.05, 0.05, 0.05); break; }
    case 'bible': case 'hymnal': { const b = add(new THREE.BoxGeometry(0.11, 0.15, 0.03), id === 'bible' ? '#3b2a24' : '#5b2f36', 0, -0.03, 0.04); add(new THREE.BoxGeometry(0.1, 0.14, 0.032), '#F3ECDD', 0.004, -0.03, 0.04); if (id === 'bible') { add(new THREE.BoxGeometry(0.012, 0.05, 0.002), '#d9c27a', 0, -0.02, 0.057, { metalness: 0.7 }); add(new THREE.BoxGeometry(0.035, 0.012, 0.002), '#d9c27a', 0, -0.01, 0.057, { metalness: 0.7 }); } b.rotation.x = -0.3; break; }
    case 'candle': { add(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 10), '#F3E2BB', 0, 0.03, 0.04); add(new THREE.ConeGeometry(0.014, 0.045, 8), '#FFC76A', 0, 0.125, 0.04, { emissive: '#FFB347', emissiveIntensity: 1.5 }); add(new THREE.CylinderGeometry(0.04, 0.04, 0.008, 12), '#d9c27a', 0, -0.035, 0.04, { metalness: 0.6 }); break; }
    case 'lantern': { add(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 4), '#5b4433', 0, 0.06, 0.04); const l = add(new THREE.SphereGeometry(0.06, 12, 10), '#F2A6A0', 0, 0.19, 0.04, { emissive: '#F2A6A0', emissiveIntensity: 0.6 }); l.scale.y = 0.8; break; }
    case 'lotus': { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const p = add(new THREE.SphereGeometry(0.03, 8, 6), '#F4B6C2', Math.cos(a) * 0.03, 0.03, 0.04 + Math.sin(a) * 0.03); p.scale.set(0.6, 1.3, 0.4); p.lookAt(0, 0.2, 0.04); } add(new THREE.SphereGeometry(0.018, 8, 6), '#E9C35A', 0, 0.04, 0.04); break; }
  }
  return g;
}

function buildAccessory(it, calm) {
  const g = new THREE.Group();
  const m = (c, emi) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, emissive: !calm && emi ? c : 0x000000, emissiveIntensity: !calm && emi ? 0.25 : 0 });
  const add = (geo, color, x, y, z, emi) => { const o = new THREE.Mesh(geo, m(color, emi)); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const [c1, c2] = it.c;
  switch (it.id) {
    case 'sprout': { add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 6), c1, 0, 0.0, 0); for (const s of [-1, 1]) { const l = add(new THREE.SphereGeometry(0.06, 10, 8), c1, 0.05 * s, 0.07, 0); l.scale.set(1, 0.45, 0.6); l.rotation.z = 0.5 * s; } break; }
    case 'acorn': { const cap = add(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), c1, 0, -0.12, 0); cap.scale.y = 0.6; add(new THREE.CylinderGeometry(0.02, 0.025, 0.07, 6), '#7a5a3a', 0, 0.0, 0); break; }
    case 'flower': { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.SphereGeometry(0.045, 10, 8), c1, 0.18 + Math.cos(a) * 0.05, -0.12, Math.sin(a) * 0.05); } add(new THREE.SphereGeometry(0.03, 8, 6), c2, 0.18, -0.11, 0); break; }
    case 'beret': { const b = add(new THREE.SphereGeometry(0.26, 18, 10), c1, 0.02, -0.12, 0); b.scale.set(1, 0.32, 1); b.rotation.z = -0.15; add(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6), c1, 0, -0.02, 0); break; }
    case 'bunny': { for (const s of [-1, 1]) { const e = add(new THREE.SphereGeometry(0.06, 12, 10), c1, 0.11 * s, 0.1, 0); e.scale.set(0.8, 2.6, 0.5); e.rotation.z = -0.15 * s; const inn = add(new THREE.SphereGeometry(0.035, 8, 6), c2, 0.11 * s, 0.1, 0.022); inn.scale.set(0.8, 3.2, 0.3); inn.rotation.z = -0.15 * s; } break; }
    case 'cloud': { [[0, -0.06, 0, 0.14], [0.12, -0.08, 0, 0.11], [-0.12, -0.08, 0, 0.11], [0, -0.08, 0.1, 0.1]].forEach(([x, y, z, r]) => add(new THREE.SphereGeometry(r, 14, 10), c1, x, y, z)); break; }
    case 'moon': { add(new THREE.CylinderGeometry(0.015, 0.02, 0.08, 6), '#B79F6E', 0, -0.01, 0); const mn = add(new THREE.TorusGeometry(0.09, 0.03, 8, 18, Math.PI * 1.25), c1, 0, 0.1, 0, true); mn.rotation.z = 0.9; break; }
    case 'antenna': { add(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), c1, 0, 0.04, 0); add(starGeo(0.07, 0.03), c2, 0, 0.17, 0, true); break; }
    case 'planet': { add(new THREE.SphereGeometry(0.09, 16, 12), c1, 0, 0.08, 0, true); const r = add(new THREE.TorusGeometry(0.14, 0.012, 6, 28), c2, 0, 0.08, 0); r.rotation.x = 1.2; r.rotation.y = 0.3; break; }
    case 'crown': { add(new THREE.CylinderGeometry(0.17, 0.18, 0.08, 18, 1, true), c1, 0, -0.06, 0, true); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(new THREE.ConeGeometry(0.03, 0.08, 6), c1, Math.cos(a) * 0.17, 0.02, Math.sin(a) * 0.17, true); } add(new THREE.SphereGeometry(0.025, 8, 6), c2, 0, -0.06, 0.18, true); break; }
    case 'ribbon': { for (const s of [-1, 1]) { const r = add(new THREE.TorusGeometry(0.07, 0.022, 8, 18), s < 0 ? c1 : c2, 0.08 * s, -0.04, 0, true); r.scale.set(1.2, 0.8, 1); } add(new THREE.SphereGeometry(0.035, 8, 6), c2, 0, -0.04, 0, true); break; }
    case 'tiara': { const band = add(new THREE.TorusGeometry(0.2, 0.012, 6, 28, Math.PI), c1, 0, -0.12, 0, true); band.rotation.x = -Math.PI / 2 + 0.2; for (const x of [-0.11, 0, 0.11]) add(starGeo(0.045, 0.02), c2, x, -0.05 + (x === 0 ? 0.04 : 0), 0.15, true); break; }
  }
  return g;
}

export function starGeo(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2; const rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: R * 0.35, bevelEnabled: true, bevelThickness: R * 0.08, bevelSize: R * 0.06, bevelSegments: 2 }); geo.center();
  return geo;
}
