// 렌더러·카메라·경로탐색·이름표 등 공통 엔진
import * as THREE from 'three';

export function createRenderer(canvas, low) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance', alpha: false });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.95;
  r.shadowMap.enabled = !low;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

// 직교 카메라를 주어진 점들이 화면(insets 제외 영역)에 들어오도록 맞춤
export function fitOrtho(cam, pos, look, points, vw, vh, insets) {
  cam.position.set(...pos); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...look)); cam.updateMatrixWorld();
  const inv = cam.matrixWorldInverse;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const v = new THREE.Vector3();
  for (const p of points) { v.set(p[0], p[1], p[2]).applyMatrix4(inv); minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); }
  const availW = Math.max(50, vw - insets.left - insets.right), availH = Math.max(50, vh - insets.top - insets.bottom);
  const needW = maxX - minX, needH = maxY - minY;
  const scale = Math.max(needW / availW, needH / availH); // 월드 단위/픽셀
  const halfW = vw * scale / 2, halfH = vh * scale / 2;
  // 콘텐츠 중심을 가용 영역 중심에 오게 오프셋
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const offX = (insets.left - insets.right) / 2 * scale, offY = (insets.bottom - insets.top) / 2 * scale;
  cam.left = cx - halfW - offX; cam.right = cx + halfW - offX;
  cam.top = cy + halfH - offY; cam.bottom = cy - halfH - offY;
  cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix();
  return scale;
}

/* ---------------- 0.25m 격자 경로탐색 ---------------- */
export class NavGrid {
  // rect: 보행 가능 영역 [x0,z0,x1,z1], 장애물 사각형 목록 (캐릭터 반경 0.3m 확장)
  constructor(walkRects, obstacles, cell = 0.25, radius = 0.3) {
    this.cell = cell;
    const xs = walkRects.flatMap(r => [r[0], r[2]]), zs = walkRects.flatMap(r => [r[1], r[3]]);
    this.x0 = Math.min(...xs); this.z0 = Math.min(...zs);
    this.w = Math.ceil((Math.max(...xs) - this.x0) / cell) + 1;
    this.h = Math.ceil((Math.max(...zs) - this.z0) / cell) + 1;
    this.grid = new Uint8Array(this.w * this.h); // 1 = 막힘
    this.grid.fill(1);
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      const x = this.x0 + i * cell, z = this.z0 + j * cell;
      if (walkRects.some(r => x >= r[0] + radius && x <= r[2] - radius && z >= r[1] + radius && z <= r[3] - radius)) this.grid[j * this.w + i] = 0;
    }
    for (const o of obstacles) this.block(o, radius);
  }
  block(o, radius = 0.3) { // o: [x0,z0,x1,z1]
    const c = this.cell;
    const i0 = Math.floor((o[0] - radius - this.x0) / c), i1 = Math.ceil((o[2] + radius - this.x0) / c);
    const j0 = Math.floor((o[1] - radius - this.z0) / c), j1 = Math.ceil((o[3] + radius - this.z0) / c);
    for (let j = Math.max(0, j0); j <= Math.min(this.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.w - 1, i1); i++) this.grid[j * this.w + i] = 1;
  }
  unblockAt(x, z, r = 0.35) { // 좌석 접근점 확보
    const c = this.cell;
    for (let j = Math.floor((z - r - this.z0) / c); j <= Math.ceil((z + r - this.z0) / c); j++)
      for (let i = Math.floor((x - r - this.x0) / c); i <= Math.ceil((x + r - this.x0) / c); i++)
        if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.grid[j * this.w + i] = 0;
  }
  toCell(x, z) { return [Math.round((x - this.x0) / this.cell), Math.round((z - this.z0) / this.cell)]; }
  toWorld(i, j) { return [this.x0 + i * this.cell, this.z0 + j * this.cell]; }
  free(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h && !this.grid[j * this.w + i]; }
  nearestFree(i, j) {
    if (this.free(i, j)) return [i, j];
    for (let r = 1; r < 40; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
      if (this.free(i + di, j + dj)) return [i + di, j + dj];
    }
    return null;
  }
  isWalkable(x, z) { const [i, j] = this.toCell(x, z); return this.free(i, j); }
  path(from, to) {
    let s = this.nearestFree(...this.toCell(from[0], from[1])), g = this.nearestFree(...this.toCell(to[0], to[1]));
    if (!s || !g) return null;
    const W = this.w, N = W * this.h;
    const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const si = s[1] * W + s[0], gi = g[1] * W + g[0];
    const heap = [[0, si]]; gs[si] = 0;
    const hf = (i) => { const x = i % W, y = (i / W) | 0; const dx = Math.abs(x - g[0]), dy = Math.abs(y - g[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    let iter = 0;
    while (heap.length && iter++ < 60000) {
      const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1;
      if (cur === gi) break;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy; if (!this.free(nx, ny)) continue;
        if (dx && dy && (!this.free(cx + dx, cy) || !this.free(cx, cy + dy))) continue; // 모서리 대각선 통과 금지
        const ni = ny * W + nx; if (closed[ni]) continue;
        const ng = gs[cur] + (dx && dy ? 1.414 : 1);
        if (ng < gs[ni]) { gs[ni] = ng; came[ni] = cur; push(ng + hf(ni), ni); }
      }
    }
    if (came[gi] === -1 && si !== gi) return null;
    const cells = []; for (let c = gi; c !== -1; c = came[c]) { cells.push(c); if (c === si) break; }
    cells.reverse();
    let pts = cells.map(c => this.toWorld(c % W, (c / W) | 0));
    pts = this.smooth(pts);
    return pts;
  }
  lineFree(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.ceil(d / (this.cell * 0.5));
    for (let k = 0; k <= n; k++) { const t = k / Math.max(1, n); if (!this.isWalkable(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
    return true;
  }
  smooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]]; let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.lineFree(pts[i], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    return out;
  }
}

/* ---------------- 이름표 (HTML 오버레이) ---------------- */
export class Labels {
  constructor(container) { this.el = container; this.map = new Map(); this.v = new THREE.Vector3(); this.visibleOthers = true; }
  add(id, text, cls = '') { const d = document.createElement('div'); d.className = 'nametag ' + cls; d.textContent = text; this.el.appendChild(d); this.map.set(id, { d, obj: null, h: 1.75 }); return d; }
  bind(id, obj, h = 1.75) { const l = this.map.get(id); if (l) { l.obj = obj; l.h = h; } }
  setText(id, t) { const l = this.map.get(id); if (l) l.d.textContent = t; }
  remove(id) { const l = this.map.get(id); if (l) { l.d.remove(); this.map.delete(id); } }
  clear() { for (const id of [...this.map.keys()]) this.remove(id); }
  update(cam, w, h, selfId) {
    for (const [id, l] of this.map) {
      if (!l.obj) continue;
      const hide = id !== selfId && !this.visibleOthers && !l.d.classList.contains('fixed');
      l.obj.getWorldPosition(this.v); this.v.y += l.h; this.v.project(cam);
      const x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
      l.d.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      l.d.style.display = hide || this.v.z > 1 ? 'none' : '';
    }
  }
}

export function disposeObject(root) {
  if (root.background && root.background.isTexture) root.background.dispose();
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) { const v = m[k]; if (v && v.isTexture) v.dispose(); } m.dispose(); });
  });
}

// 캔버스 텍스트 → 텍스처 (간판)
export function textTexture(lines, { w = 512, h = 160, bg = '#F4F0E7', fg = '#233335', sub = '#5b6b6c', border = null, radius = 24, font = 'Noto Sans KR' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; roundRect(g, 0, 0, w, h, radius); g.fill();
  if (border) { g.strokeStyle = border; g.lineWidth = 6; roundRect(g, 3, 3, w - 6, h - 6, radius); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (lines.length === 1) { g.fillStyle = fg; g.font = `700 ${Math.round(h * 0.40)}px "${font}", sans-serif`; fitText(g, lines[0], w * 0.9, h * 0.40, 700, font); g.fillText(lines[0], w / 2, h / 2 + 2); }
  else { g.fillStyle = fg; fitText(g, lines[0], w * 0.9, h * 0.34, 700, font); g.fillText(lines[0], w / 2, h * 0.38); g.fillStyle = sub; fitText(g, lines[1], w * 0.9, h * 0.2, 500, font); g.fillText(lines[1], w / 2, h * 0.74); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function fitText(g, text, maxW, size, weight, font) { let s = size; do { g.font = `${weight} ${Math.round(s)}px "${font}", sans-serif`; s *= 0.94; } while (g.measureText(text).width > maxW && s > 8); }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
