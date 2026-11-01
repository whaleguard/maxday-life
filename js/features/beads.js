// 염주 돌리기 — 화면에 염주가 떠오르고, 넘길 때마다 한 알씩 굴러가며 딸깍 소리 + 횟수(108 단위)
const N = 27; // 단주 27알을 4바퀴 넘기면 108
export class Beads {
  constructor(el, { onBead, onRound, reduced }) {
    this.el = el; this.cv = el.querySelector('canvas'); this.g = this.cv.getContext('2d');
    this.onBead = onBead; this.onRound = onRound; this.reduced = reduced;
    this.count = 0; this.offset = 0; this.target = 0; this.raf = 0; this.drag = null;
    this.cv.addEventListener('pointerdown', e => { this.drag = { y: e.clientY, acc: 0 }; this.cv.setPointerCapture(e.pointerId); });
    this.cv.addEventListener('pointermove', e => { if (!this.drag) return; const dy = e.clientY - this.drag.y; this.drag.y = e.clientY; this.drag.acc += dy; while (this.drag.acc > 26) { this.drag.acc -= 26; this.advance(); } });
    this.cv.addEventListener('pointerup', e => { if (this.drag && Math.abs(this.drag.acc) < 6 && !this.drag.moved) this.advance(); this.drag = null; });
    addEventListener('keydown', e => { if (!this.el.hidden && (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); this.advance(); } });
  }
  open(count = 0) { this.count = count; this.el.hidden = false; this.resize(); this.loop(); this.updateText(); }
  close() { this.el.hidden = true; cancelAnimationFrame(this.raf); }
  advance() {
    this.count++; this.target += 1; this.onBead && this.onBead(this.count);
    if (this.count % 108 === 0) this.onRound && this.onRound(this.count / 108);
    this.updateText();
  }
  updateText() { const t = this.el.querySelector('.bd-count'); t.innerHTML = `<b>${this.count % 108 || (this.count ? 108 : 0)}</b> / 108 <span>${Math.floor(this.count / 108)}번째 108염주</span>`; }
  resize() { const r = this.cv.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); this.cv.width = r.width * d; this.cv.height = r.height * d; this.d = d; }
  loop() {
    cancelAnimationFrame(this.raf);
    const step = () => {
      this.offset += (this.target - this.offset) * (this.reduced ? 1 : 0.18);
      this.draw(); this.raf = requestAnimationFrame(step);
    };
    step();
  }
  draw() {
    const { g, cv } = this; const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, rx = Math.min(W * 0.22, H * 0.16), ry = H * 0.4; const br = Math.min(W, H) * 0.045;
    // 줄
    g.strokeStyle = 'rgba(120,80,40,.5)'; g.lineWidth = 2 * this.d; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    const beads = [];
    for (let i = 0; i < N; i++) {
      const a = ((i - this.offset) / N) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; const depth = Math.cos(a); // 앞(+)/뒤(-)
      beads.push({ x, y, depth, r: br * (0.86 + depth * 0.14) * (i === 0 ? 1.25 : 1), mother: i === 0 });
    }
    beads.sort((a, b) => a.depth - b.depth);
    for (const b of beads) {
      const gr = g.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      const k = 0.75 + b.depth * 0.25;
      gr.addColorStop(0, `rgb(${255 * k | 0},${214 * k | 0},${160 * k | 0})`); gr.addColorStop(0.45, `rgb(${214 * k | 0},${140 * k | 0},${78 * k | 0})`); gr.addColorStop(1, `rgb(${120 * k | 0},${68 * k | 0},${32 * k | 0})`);
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(90,50,20,.25)'; g.lineWidth = 1; g.beginPath(); g.ellipse(b.x, b.y, b.r * 0.9, b.r * 0.35, 0.3, 0, Math.PI * 2); g.stroke();
      if (b.mother) { g.fillStyle = 'rgba(160,40,30,.85)'; g.fillRect(b.x - b.r * 0.15, b.y + b.r * 0.9, b.r * 0.3, b.r * 1.4); }
    }
  }
}
