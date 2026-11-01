// 카페·식당 자리 예약 + 미리 주문
//  - 배치도(2D)에서 날짜·시간·인원을 고르면 이미 예약된 자리가 보이고, 원하는 자리를 골라 예약
//  - 메뉴를 담아 미리 주문 → 포스 연동 형식(toPosOrder)으로 저장
//  - 공유 저장: 실시간 계층(net.resvList / resvSave / resvCancel). 공개 중계에는 이름 일부와 인원만 올리고 연락처는 올리지 않음
import { STORES, slotsOf, won, toPosOrder } from './stores.js';

const $ = s => document.querySelector(s);
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
export const POS = { endpoint: '' }; // 포스 API 주소가 생기면 여기에 넣으면 예약 시 주문서를 POST 로 전송

const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function maskName(n) { n = (n || '').trim(); if (n.length <= 1) return n + '*'; return n[0] + '*'.repeat(Math.min(3, n.length - 1)); }

export function myReservations() { try { return JSON.parse(ls.get('mdl_resv') || '[]'); } catch (e) { return []; } }
function saveMine(list) { ls.set('mdl_resv', JSON.stringify(list)); }

export class ReserveUI {
  constructor({ net, toast, onChange, brand }) {
    this.net = net; this.toast = toast; this.onChange = onChange; this.brand = brand;
    this.store = null; this.date = null; this.time = null; this.size = 2; this.table = null; this.cart = new Map(); this.list = {};
    this.bind();
  }
  bind() {
    $('#rv-date').onchange = e => { this.date = e.target.value; this.refresh(); };
    $('#rv-time').onchange = e => { this.time = e.target.value; this.table = null; this.render(); };
    $('#rv-minus').onclick = () => { this.size = Math.max(1, this.size - 1); this.table = null; this.render(); };
    $('#rv-plus').onclick = () => { this.size = Math.min(10, this.size + 1); this.table = null; this.render(); };
    $('#rv-submit').onclick = () => this.submit();
    document.querySelectorAll('#modal-resv .rv-tab').forEach(b => b.onclick = () => this.tab(b.dataset.tab));
  }
  async open(store, { table = null, tab = 'book' } = {}) {
    this.store = store; const st = STORES[store];
    $('#rv-title').textContent = `${this.brand.short} ${st.title} 예약`;
    $('#rv-hours').textContent = `영업 ${st.open} – ${st.close} · 이용 ${st.dur}분 기준`;
    // 날짜: 오늘부터 14일
    const sel = $('#rv-date'); sel.innerHTML = '';
    const now = new Date();
    for (let i = 0; i < 14; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); const o = document.createElement('option'); o.value = ymd(d); o.textContent = `${d.getMonth() + 1}/${d.getDate()} (${DOW[d.getDay()]})${i === 0 ? ' 오늘' : ''}`; sel.appendChild(o); }
    this.date = sel.value = ymd(now);
    this.fillTimes();
    this.table = null; this.cart = new Map();
    $('#modal-resv').hidden = false;
    this.tab(tab);
    this.renderMenu();
    await this.refresh();
    if (table) this.pick(table);
  }
  fillTimes() {
    const sel = $('#rv-time'); sel.innerHTML = ''; const now = new Date(); const today = this.date === ymd(now); const nowMin = now.getHours() * 60 + now.getMinutes();
    const slots = slotsOf(this.store).filter(t => !today || toMin(t) > nowMin + 20);
    slots.forEach(t => { const o = document.createElement('option'); o.value = o.textContent = t; sel.appendChild(o); });
    if (!slots.length) { const o = document.createElement('option'); o.value = ''; o.textContent = '오늘 예약 마감'; sel.appendChild(o); }
    this.time = sel.value || null;
  }
  async refresh() {
    this.fillTimes();
    $('#rv-plan').classList.add('loading');
    try { this.list = await Promise.race([this.net.resvList(this.store, this.date), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000))]); }
    catch (e) { this.list = {}; this.toast('예약 현황을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.'); }
    $('#rv-plan').classList.remove('loading');
    this.render();
  }
  busyTables(time) { // 같은 테이블, 이용시간(90분) 겹치는 예약
    const st = STORES[this.store]; const out = new Map(); if (!time) return out;
    for (const r of Object.values(this.list)) { if (!r || Math.abs(toMin(r.time) - toMin(time)) >= st.dur) continue; out.set(r.table, r); }
    return out;
  }
  render() {
    const st = STORES[this.store]; const sp = this.store === 'cafe' ? { w: 16, d: 14 } : { w: 18, d: 16 };
    $('#rv-size').textContent = `${this.size}명`;
    const busy = this.busyTables(this.time);
    // SVG 배치도 (위에서 본 모습, 앞쪽=입구)
    const S = 40, W = sp.w * S, H = sp.d * S, X = x => (x + sp.w / 2) * S, Z = z => (z + sp.d / 2) * S;
    let svg = `<svg viewBox="-10 -10 ${W + 20} ${H + 46}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${st.title} 배치도">`;
    svg += `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#f6efe2" stroke="#8a7a66" stroke-width="4"/>`;
    if (st.windows === 'right') svg += `<rect x="${W - 6}" y="${S * 0.6}" width="10" height="${H - S * 1.2}" fill="#9cc3e6"/><text x="${W - 14}" y="${H / 2}" font-size="20" fill="#5a7a96" text-anchor="middle" transform="rotate(90 ${W - 14} ${H / 2})">통창</text>`;
    svg += `<rect x="${W / 2 - 50}" y="${H - 4}" width="100" height="10" fill="#C9AE73"/><text x="${W / 2}" y="${H + 32}" font-size="22" fill="#6b5a3a" text-anchor="middle">입구</text>`;
    const fxColor = { counter: '#c9a27a', case: '#e6d2b0', selfbar: '#d6e6d0', restroom: '#dfe4ea', kitchen: '#e2ddd3', room: 'none', bench: '#c9a27a', plant: '#9fc29a' };
    for (const f of st.fixtures) {
      const x = X(f.x - f.w / 2), y = Z(f.z - f.d / 2);
      svg += `<rect x="${x}" y="${y}" width="${f.w * S}" height="${f.d * S}" rx="6" fill="${fxColor[f.kind]}" stroke="${f.kind === 'room' ? '#8a7a66' : '#b8ab96'}" stroke-width="${f.kind === 'room' ? 4 : 2}" ${f.kind === 'room' ? 'stroke-dasharray="10 6"' : ''}/>`;
      if (f.label) svg += `<text x="${X(f.x)}" y="${Z(f.z) + (f.kind === 'room' ? -f.d * S / 2 + 24 : 7)}" font-size="${f.kind === 'room' ? 20 : 17}" fill="#5b4a36" text-anchor="middle">${f.label}</text>`;
    }
    for (const t of st.tables) {
      const b = busy.get(t.id); const tooSmall = t.cap < this.size; const sel = this.table === t.id;
      const fill = sel ? '#C9AE73' : b ? '#c7c2ba' : tooSmall ? '#efe9de' : '#8fc49a';
      const stroke = sel ? '#7a5a1a' : b ? '#9a948a' : '#4f8a5d';
      const x = X(t.x - t.w / 2), y = Z(t.z - t.d / 2);
      svg += `<g class="rv-t${b || tooSmall ? ' off' : ''}" data-id="${t.id}">`;
      svg += t.round ? `<circle cx="${X(t.x)}" cy="${Z(t.z)}" r="${t.w / 2 * S + 6}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>` : `<rect x="${x - 6}" y="${y - 6}" width="${t.w * S + 12}" height="${t.d * S + 12}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
      svg += `<text x="${X(t.x)}" y="${Z(t.z) + 2}" font-size="17" font-weight="700" fill="#233335" text-anchor="middle">${t.id}</text><text x="${X(t.x)}" y="${Z(t.z) + 20}" font-size="13" fill="#3e4c4d" text-anchor="middle">${b ? '예약됨' : t.cap + '인'}</text>`;
      // 투명 터치 영역 (작은 테이블도 누르기 쉽게)
      svg += `<rect x="${X(t.x) - 34}" y="${Z(t.z) - 30}" width="68" height="60" fill="transparent"/></g>`;
    }
    svg += '</svg>';
    $('#rv-plan').innerHTML = svg;
    $('#rv-plan').querySelectorAll('.rv-t').forEach(g => g.onclick = () => this.pick(g.dataset.id));
    const free = st.tables.filter(t => !busy.get(t.id) && t.cap >= this.size).length;
    $('#rv-free').textContent = this.time ? `${this.date.slice(5).replace('-', '/')} ${this.time} · ${this.size}명 — 예약 가능한 자리 ${free}곳` : '예약 가능한 시간이 없어요. 다른 날짜를 골라 주세요.';
    const t = st.tables.find(x => x.id === this.table);
    $('#rv-pick').innerHTML = t ? `<b>${t.id}</b> · ${t.zone} · 최대 ${t.cap}명` : '<span class="muted">배치도에서 초록색 자리를 눌러 고르세요.</span>';
    this.renderCart();
  }
  pick(id) {
    const st = STORES[this.store]; const t = st.tables.find(x => x.id === id); if (!t) return;
    const b = this.busyTables(this.time).get(id);
    if (b) { this.toast(`${id} 자리는 ${b.time}에 예약되어 있어요. 다른 자리나 시간을 골라 주세요.`); return; }
    if (t.cap < this.size) { this.toast(`${id} 자리는 최대 ${t.cap}명이에요.`); return; }
    this.table = id; this.render();
    $('#rv-step2').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  renderMenu() {
    const st = STORES[this.store]; const box = $('#rv-menu'); box.innerHTML = '';
    for (const c of st.menu) {
      const h = document.createElement('h4'); h.textContent = c.cat; box.appendChild(h);
      for (const [name, price] of c.items) {
        const row = document.createElement('div'); row.className = 'rv-item';
        row.innerHTML = `<span class="nm">${name}</span><span class="pr">${won(price)}</span><span class="qty"><button aria-label="${name} 빼기">−</button><b>0</b><button aria-label="${name} 담기">＋</button></span>`;
        const [minus, plus] = row.querySelectorAll('button'); const q = row.querySelector('b');
        const upd = d => { const n = Math.max(0, (this.cart.get(name)?.[2] || 0) + d); if (n) this.cart.set(name, [name, price, n]); else this.cart.delete(name); q.textContent = n; this.renderCart(); };
        minus.onclick = () => upd(-1); plus.onclick = () => upd(1);
        box.appendChild(row);
      }
    }
  }
  renderCart() {
    const items = [...this.cart.values()]; const total = items.reduce((s, [, p, q]) => s + p * q, 0);
    $('#rv-cart').textContent = items.length ? `미리 주문 ${items.reduce((s, i) => s + i[2], 0)}개 · ${won(total)}` : '미리 주문 없이 자리만 예약할 수도 있어요.';
    $('#rv-submit').disabled = !this.table || !this.time;
    $('#rv-submit').textContent = this.table ? `${this.table} 자리 예약하기${total ? ' + 주문' : ''}` : '자리를 먼저 골라 주세요';
  }
  async submit() {
    const name = $('#rv-name').value.trim(); const phone = $('#rv-phone').value.trim(); const memo = $('#rv-memo').value.trim();
    if (name.length < 2) { this.toast('예약자 이름을 적어 주세요.'); $('#rv-name').focus(); return; }
    if (phone && !/^[0-9\-\s]{9,14}$/.test(phone)) { this.toast('연락처는 숫자로 적어 주세요.'); return; }
    const st = STORES[this.store]; const t = st.tables.find(x => x.id === this.table);
    const items = [...this.cart.values()]; const total = items.reduce((s, [, p, q]) => s + p * q, 0);
    const rec = { id: 'R' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(), store: this.store, date: this.date, time: this.time, table: t.id, zone: t.zone, size: this.size, name, phone, memo, items, total, createdAt: new Date().toISOString() };
    $('#rv-submit').disabled = true; $('#rv-submit').textContent = '자리를 확인하고 있어요…';
    let r;
    try { r = await this.net.resvSave({ id: rec.id, store: rec.store, date: rec.date, time: rec.time, table: rec.table, size: rec.size, nm: maskName(name), items: items.length }, st.dur); }
    catch (e) { r = { ok: false, reason: 'error' }; }
    if (!r.ok) { this.toast(r.reason === 'taken' ? '방금 다른 분이 먼저 예약했어요. 다른 자리를 골라 주세요.' : '예약을 저장하지 못했어요. 다시 시도해 주세요.'); await this.refresh(); return; }
    const mine = myReservations(); mine.unshift(rec); saveMine(mine);
    if (POS.endpoint) { try { await fetch(POS.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(toPosOrder(rec)) }); } catch (e) {} }
    this.toast(`${t.id} 자리 예약 완료! ${rec.date.slice(5).replace('-', '/')} ${rec.time}`);
    this.cart = new Map(); this.table = null; this.renderMenu();
    await this.refresh(); this.tab('mine'); this.onChange && this.onChange();
  }
  tab(k) {
    document.querySelectorAll('#modal-resv .rv-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
    $('#rv-book').hidden = k !== 'book'; $('#rv-mine').hidden = k !== 'mine';
    if (k === 'mine') this.renderMine();
  }
  renderMine() {
    const box = $('#rv-mine'); const list = myReservations().filter(r => r.store === this.store);
    if (!list.length) { box.innerHTML = '<p class="muted">아직 예약이 없어요.</p>'; return; }
    box.innerHTML = '';
    for (const r of list) {
      const div = document.createElement('div'); div.className = 'rv-card';
      div.innerHTML = `<div class="rv-card-h"><b>${r.date.slice(5).replace('-', '/')} ${r.time} · ${r.table}</b><span>${r.zone} · ${r.size}명</span></div>
        <div class="small">${r.items.length ? r.items.map(([n, , q]) => `${n} ×${q}`).join(', ') + ' · ' + won(r.total) : '미리 주문 없음'}</div>
        <div class="tiny muted">예약번호 ${r.id} · 예약자 ${r.name}${r.memo ? ' · ' + r.memo : ''}</div>
        <div class="row"><button class="btn small-btn rv-pos">포스 전송 내용</button><button class="btn small-btn rv-cancel">예약 취소</button></div><pre class="rv-json" hidden></pre>`;
      div.querySelector('.rv-pos').onclick = () => { const p = div.querySelector('.rv-json'); p.hidden = !p.hidden; p.textContent = JSON.stringify(toPosOrder(r), null, 2); };
      div.querySelector('.rv-cancel').onclick = async () => {
        await this.net.resvCancel({ store: r.store, date: r.date, time: r.time, table: r.table, id: r.id });
        saveMine(myReservations().filter(x => x.id !== r.id)); this.toast('예약을 취소했어요.'); this.renderMine(); this.refresh(); this.onChange && this.onChange();
      };
      box.appendChild(div);
    }
  }
}
