// 아카데미 관리자 — 교육 운영 대시보드 (GPT 시안: 플럼 사이드 메뉴 · KPI · 분류별/강의별/추이 차트 · 점포×강의 히트맵 · 미가입 · 최근 활동 · 회원 관리 + 상세 패널)
import { BRAND, LECTURES, STREET, MQTT_NS } from './config.js';
import { createNet, makeSid } from './net.js';
import { AdminApi, tempPassword, lecPct, normStore } from './features/admin.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const B = window.MDL_BRAND || {};
const net = createNet(makeSid());
const api = new AdminApi(net, MQTT_NS, B.adminHash);
const DAY = 864e5, WEEK = 7 * DAY;
const fmtD = t => t ? new Date(t).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '—';
const fmtDT = t => t ? new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtT = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const ago = t => { if (!t) return '—'; const m = Math.floor((Date.now() - t) / 6e4); if (m < 1) return '방금'; if (m < 60) return m + '분 전'; const h = Math.floor(m / 60); if (h < 24) return h + '시간 전'; const d = Math.floor(h / 24); return d === 1 ? '어제' : d + '일 전'; };
let toastT = 0; function toast(m) { const t = $('#ad-toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
const HOME = B.home || new URL('./', document.baseURI).href;
const lecNo = l => l.n || (LECTURES.indexOf(l) + 1);
const lecShort = l => String(l.t || '').replace(/^\d+강\s*·\s*/, '');
const CATS = [...new Set(LECTURES.map(l => l.cat))];

const DEFAULT_ROSTER = [...(STREET.food || []), ...(STREET.market || [])].map(r => ({ no: String(r[0]), store: r[1], owner: '' }));
let D = { users: [], roster: null }, tab = 'dash', sel = null, lecView = 'top';
const roster = () => D.roster && D.roster.length ? D.roster : DEFAULT_ROSTER;

// ---------- 시작 ----------
document.title = `관리자 · ${BRAND.ko}`;
$('#ad-name').textContent = BRAND.ko; $('#ad-logo').src = BRAND.logo; $('#ad-login-logo').src = BRAND.logo; $('#ad-site').href = HOME;
$('#ad-mode').textContent = api.server ? '자체 서버' : '시연 모드';
if (!api.server) { $('#ad-demo').hidden = false; $('#ad-demo').innerHTML = '<b>시연 모드</b> 회원 기록이 공개 중계 서버에 있어요. 비밀번호는 암호화 값만 보관하지만, 실제 점주님을 받기 전에 자체 서버로 옮겨야 합니다.'; }
if (B.org && B.org.name) $('#ad-foot').innerHTML = `<b>교육 주관</b> ${esc(B.org.name)} · 대표 ${esc(B.org.ceo || '')} · 사업자등록번호 ${esc(B.org.bizno || '')} · ${esc(B.org.addr || '')}${B.org.email ? ' · ' + esc(B.org.email) : ''}`;

$('#ad-login-form').onsubmit = async e => {
  e.preventDefault(); const pw = $('#ad-pw').value; if (!pw) return;
  $('#ad-login-go').disabled = true; $('#ad-login-go').textContent = '확인 중…'; $('#ad-login-err').textContent = '';
  let r; try { r = await withTimeout(api.login(pw), 20000); } catch (err) { r = { ok: false, msg: '연결이 늦어요. 잠시 후 다시 시도해 주세요.' }; }
  $('#ad-login-go').disabled = false; $('#ad-login-go').textContent = '들어가기';
  if (!r.ok) { $('#ad-login-err').textContent = r.msg; return; }
  $('#ad-pw').value = ''; $('#ad-login').hidden = true; $('#ad-app').hidden = false; reload();
};
$('#ad-logout').onclick = () => { api.ok = false; api.token = null; location.reload(); };
$('#ad-reload').onclick = () => reload();
$('#ad-range').onchange = () => renderTrend();
$('#ad-csv').onclick = () => exportUsers();
$$('.sd-nav button').forEach(b => b.onclick = () => showTab(b.dataset.t));
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) showTab(g.dataset.go); });
$$('[data-q]').forEach(i => i.oninput = () => { $$('[data-q]').forEach(j => { if (j !== i) j.value = i.value; }); renderMembers(); });
$$('[data-f]').forEach(i => i.onchange = () => { $$('[data-f]').forEach(j => { if (j !== i) j.value = i.value; }); renderMembers(); });
$$('#lec-seg button').forEach(b => b.onclick = () => { lecView = b.dataset.v; $$('#lec-seg button').forEach(x => x.classList.toggle('on', x === b)); renderLecChart(); });
$('#dt-x').onclick = closeDetail; $('#dt-dim').onclick = closeDetail;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });
$('#miss-copy-all').onclick = () => copy(inviteMsg());

async function reload() {
  $('#kpis').innerHTML = '<p class="muted">불러오는 중…</p>';
  try { D = await withTimeout(api.load(), 25000); } catch (e) { $('#kpis').innerHTML = '<p class="err">회원 정보를 불러오지 못했어요. 새로고침을 눌러 주세요.</p>'; return; }
  D.users.forEach(u => { u.st = stat(u); });
  D.users.sort((a, b) => (b.st.lastAct || 0) - (a.st.lastAct || 0));
  if (sel) sel = D.users.find(u => (sel.id && u.id === sel.id) || u.key === sel.key) || null;
  renderAll();
}
const TITLES = { dash: ['교육 운영 대시보드', '점주님 학습 현황을 한눈에 확인하세요'], members: ['회원', '점포·대표자·진도 확인, 비밀번호 재설정과 아이디 변경'], missing: ['미가입 점포', '가입할 때 명단에서 고른 점포로 대조해요 · 직접 적은 회원은 아래에서 연결'], lectures: ['강의 현황', '강의별 수강·수료와 영상 연결 상태'], roster: ['점포 명단', '미가입 대조 기준이 되는 점포 목록'], settings: ['설정', '내보내기 · 관리자 비밀번호 · 데이터 보관 위치'] };
function showTab(t) {
  tab = t; $$('.sd-nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  $$('.pane').forEach(p => { p.hidden = p.id !== 'pane-' + t; });
  $('#pg-title').textContent = TITLES[t][0]; $('#pg-sub').textContent = TITLES[t][1];
  $('#ad-range').hidden = t !== 'dash'; $('#kpis').hidden = t !== 'dash';
  document.body.dataset.tab = t;
  ({ dash: renderDash, members: renderMembers, missing: renderMissing, lectures: renderLectures, roster: renderRoster, settings: renderSettings })[t]();
}
function renderAll() { const m = matched(); $('#nav-miss').textContent = m.missing.length || ''; showTab(tab); renderDetail(); }

// ---------- 계산 ----------
function stat(u) {
  const P = u.prog || {}; let en = 0, done = 0, sum = 0, lastAct = Math.max(u.last || 0, u.at || 0);
  for (const l of LECTURES) { const r = P[l.id]; if (!r || !r.enrolled) continue; en++; if (r.done) done++; sum += r.done ? 100 : lecPct(r); lastAct = Math.max(lastAct, r.last || 0, r.enrolled || 0, r.done || 0); }
  return { en, done, avg: en ? Math.round(sum / en) : 0, lastAct };
}
// 점포 대조: 가입할 때 명단에서 고른 점포(storeNo)로 연결 — 이름을 다르게 적어도 어긋나지 않음.
// 직접 입력한 회원(storeNo 없음)은 '미연결'로 두고, 이름이 비슷한 명단 점포를 제안 → 관리자가 한 번 눌러 연결
const rkey = r => String(r.no || r.store || '');
const linkedRow = u => u.storeNo ? roster().find(r => rkey(r) === u.storeNo) : null;
function suggest(u) { const k = normStore(u.store); if (!k) return null; return roster().find(r => { const x = normStore(r.store); return x && (x === k || (k.length > 1 && x.length > 1 && (x.includes(k) || k.includes(x)))); }) || null; }
function matched() {
  const R = roster();
  const joined = [], missing = []; R.forEach(r => { const us = D.users.filter(u => u.storeNo && u.storeNo === rkey(r)); (us.length ? joined : missing).push({ ...r, users: us }); });
  const extra = D.users.filter(u => !linkedRow(u)).map(u => Object.assign(u, { sug: suggest(u) }));
  return { joined, missing, extra };
}
async function linkUser(u, r, btn) {
  if (btn) btn.disabled = true; let res; try { res = await withTimeout(api.edit(u, r ? { storeNo: rkey(r), store: r.store } : { storeNo: '' }), 20000); } catch (e) { res = { ok: false, msg: '연결이 늦어요.' }; } if (btn) btn.disabled = false;
  if (!res.ok) { toast(res.msg); return; } u.storeNo = r ? rkey(r) : ''; if (r) u.store = r.store; if (u.rec) { u.rec.storeNo = u.storeNo; if (r) u.rec.store = r.store; }
  toast(r ? `${u.owner || u.name}님을 「${r.store}」에 연결했어요.` : '점포 연결을 풀었어요.'); renderAll();
}
const rosterOpts = cur => '<option value="">— 명단 점포 선택 —</option>' + roster().map(r => `<option value="${esc(rkey(r))}"${rkey(r) === cur ? ' selected' : ''}>${r.no ? esc(r.no) + '번 · ' : ''}${esc(r.store)}</option>`).join('');
function events() {
  const ev = []; const nm = u => `${u.store || '점포 미입력'} · ${u.owner || u.name || u.id}`;
  D.users.forEach(u => {
    if (u.at) ev.push({ t: u.at, u, who: nm(u), k: 'join', what: '회원가입' });
    for (const l of LECTURES) { const r = (u.prog || {})[l.id]; if (!r || !r.enrolled) continue;
      ev.push({ t: r.enrolled, u, who: nm(u), k: 'start', what: `${lecNo(l)}강 수강 시작` });
      if (r.done) ev.push({ t: r.done, u, who: nm(u), k: 'done', what: `${lecNo(l)}강 수료` });
      else if (r.last && r.last - r.enrolled > 60000) ev.push({ t: r.last, u, who: nm(u), k: 'watch', what: `${lecNo(l)}강 ${lecPct(r)}% 시청` }); }
  });
  return ev.sort((a, b) => b.t - a.t);
}

// ---------- 대시보드 ----------
function renderDash() { renderKpis(); renderCat(); renderTrend(); renderLecChart(); renderHeat(); renderDashMiss(); renderFeed(); renderMembers(); }
const ICON = { users: '<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 19c0-3.3 2.7-5 6-5s6 1.7 6 5M14 14.3c.6-.2 1.3-.3 2-.3 3 0 6 1.4 6 4.5"/>', store: '<path d="M3 9l1.5-5h15L21 9M3 9h18M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3m0 0c0 1.7 1.3 3 3 3s3-1.3 3-3m0 0c0 1.7 1.3 3 3 3s3-1.3 3-3M5 12v8h14v-8M10 20v-5h4v5"/>', book: '<path d="M4 5c3-1.5 6-1.5 8 .5 2-2 5-2 8-.5v14c-3-1.5-6-1.5-8 .5-2-2-5-2-8-.5Z M12 5.5v14"/>', cap: '<path d="M2 9l10-5 10 5-10 5Z M6 11v5c3 2.5 9 2.5 12 0v-5 M22 9v6"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' };
const cw = sel => Math.max(300, Math.floor(($(sel) || {}).clientWidth || 520));
let rzT = 0; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (tab === 'dash' && D.users) { renderCat(); renderTrend(); renderLecChart(); } }, 150); });
const svgI = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
function renderKpis() {
  const m = matched(); const S = D.users.map(u => u.st);
  const en = S.reduce((a, s) => a + s.en, 0), done = S.reduce((a, s) => a + s.done, 0);
  const act7 = D.users.filter(u => u.st.lastAct && Date.now() - u.st.lastAct < WEEK).length;
  const newW = D.users.filter(u => u.at && Date.now() - u.at < WEEK).length, R = roster().length;
  const pj = R ? Math.round(m.joined.length / R * 100) : 0;
  $('#kpis').innerHTML = [
    ['가입 회원 수', `${D.users.length}<small>명</small>`, newW ? `이번 주 +${newW}명` : `이용 중지 ${D.users.filter(u => u.off).length}명`, 'users'],
    ['명단 대비 가입 점포', `${m.joined.length}<small> / ${R}</small>`, `<span class="kbar"><i style="width:${pj}%"></i></span>${pj}%`, 'store'],
    ['수강신청 건수', `${en}<small>건</small>`, `회원 1명당 ${D.users.length ? (en / D.users.length).toFixed(1) : 0}강`, 'book'],
    ['수료 건수', `${done}<small>건</small>`, `수료율 ${en ? Math.round(done / en * 100) : 0}%`, 'cap'],
    ['최근 7일 접속', `${act7}<small>명</small>`, `영상 연결 ${LECTURES.filter(l => l.yt).length} / ${LECTURES.length}강`, 'chart'],
  ].map(([k, v, s, ic]) => `<div class="kpi"><div><span>${k}</span><b>${v}</b><small>${s}</small></div><i class="kic">${svgI(ic)}</i></div>`).join('');
}
function catStats() {
  return CATS.map(c => { let n = 0, sum = 0, done = 0; D.users.forEach(u => LECTURES.filter(l => l.cat === c).forEach(l => { const r = (u.prog || {})[l.id]; if (!r || !r.enrolled) return; n++; sum += r.done ? 100 : lecPct(r); if (r.done) done++; })); return { c, n, avg: n ? Math.round(sum / n) : 0, rate: n ? Math.round(done / n * 100) : 0 }; });
}
function renderCat() {
  const rows = catStats(); const W = cw('#ch-cat'), L = 86, R = 44, rowH = 46, H = rows.length * rowH + 30, bw = W - L - R;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="분류별 평균 진도율과 수료율">`;
  [0, 50, 100].forEach(p => { const x = L + bw * p / 100; s += `<line x1="${x}" x2="${x}" y1="4" y2="${H - 24}" class="gl"/><text x="${x}" y="${H - 8}" class="ax" text-anchor="middle">${p}%</text>`; });
  rows.forEach((r, i) => { const y = 8 + i * rowH;
    s += `<text x="${L - 10}" y="${y + 21}" class="lb" text-anchor="end">${esc(r.c)}</text>`;
    s += `<rect x="${L}" y="${y + 4}" width="${Math.max(2, bw * r.avg / 100)}" height="12" rx="3" class="b-pl"><title>${esc(r.c)} 평균 진도율 ${r.avg}% (수강 ${r.n}건)</title></rect><text x="${L + bw * r.avg / 100 + 6}" y="${y + 14}" class="vl">${r.avg}%</text>`;
    s += `<rect x="${L}" y="${y + 19}" width="${Math.max(2, bw * r.rate / 100)}" height="12" rx="3" class="b-ap"><title>${esc(r.c)} 수료율 ${r.rate}%</title></rect><text x="${L + bw * r.rate / 100 + 6}" y="${y + 29}" class="vl">${r.rate}%</text>`; });
  $('#ch-cat').innerHTML = s + '</svg>' + (rows.every(r => !r.n) ? '<p class="empty-note">아직 수강 기록이 없어요.</p>' : '');
}
function renderTrend() {
  const nW = +$('#ad-range').value || 4; $('#tr-title').textContent = `최근 ${nW}주 접속·수강 추이`;
  const end = Date.now(), ev = events(); const W = cw('#ch-trend'), H = 230, L = 34, Rr = 18, T = 18, Bm = 30;
  const wk = Array.from({ length: nW }, (_, i) => { const a = end - (nW - i) * WEEK, b = a + WEEK; const users = new Set(ev.filter(e => e.t >= a && e.t < b).map(e => e.u.key)); return { a, act: users.size, st: ev.filter(e => e.k === 'start' && e.t >= a && e.t < b).length }; });
  const mx = Math.max(4, ...wk.map(w => Math.max(w.act, w.st))); const top = Math.ceil(mx / 4) * 4;
  const X = i => L + 16 + (W - L - Rr - 32) * (nW === 1 ? .5 : i / (nW - 1)), Y = v => T + (H - T - Bm) * (1 - v / top);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="주별 접속 회원과 수강 시작 추이">`;
  for (let k = 0; k <= 4; k++) { const v = top * k / 4; s += `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`; }
  wk.forEach((w, i) => { if (nW > 8 && i % 2 && i !== nW - 1) return; s += `<text x="${X(i)}" y="${H - 10}" class="ax" text-anchor="middle">${i === nW - 1 ? '이번 주' : (nW - 1 - i) + '주 전'}</text>`; });
  const line = (key, cls) => { s += `<polyline points="${wk.map((w, i) => X(i) + ',' + Y(w[key])).join(' ')}" class="${cls}" fill="none"/>`; wk.forEach((w, i) => { s += `<circle cx="${X(i)}" cy="${Y(w[key])}" r="4.5" class="${cls}-dot"><title>${new Date(w.a).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}~ ${key === 'act' ? '접속 회원' : '수강 시작'} ${w[key]}</title></circle>${w[key] ? `<text x="${X(i)}" y="${Y(w[key]) - 9}" class="vl" text-anchor="middle">${w[key]}</text>` : ''}`; }); };
  line('act', 'ln-pl'); line('st', 'ln-ap');
  $('#ch-trend').innerHTML = s + '</svg>';
}
function lecStats() { return LECTURES.map(l => { let en = 0, done = 0, sum = 0; D.users.forEach(u => { const r = (u.prog || {})[l.id]; if (!r || !r.enrolled) return; en++; sum += r.done ? 100 : lecPct(r); if (r.done) done++; }); return { l, en, done, ing: en - done, avg: en ? Math.round(sum / en) : 0 }; }); }
function renderLecChart() {
  let rows = lecStats(); if (lecView === 'top') rows = [...rows].sort((a, b) => b.en - a.en || b.done - a.done || lecNo(a.l) - lecNo(b.l)).slice(0, 10);
  const L = 34, H = 240, T = 18, Bm = 34, W = Math.max(cw('#ch-lec'), L + rows.length * (lecView === 'all' ? 40 : 30) + 12);
  const mx = Math.max(4, ...rows.map(r => r.en)); const top = Math.ceil(mx / 4) * 4; const Y = v => T + (H - T - Bm) * (1 - v / top);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" style="width:${W}px" role="img" aria-label="강의별 수강 신청과 수료 수">`;
  for (let k = 0; k <= 4; k++) { const v = top * k / 4; s += `<line x1="${L}" x2="${W - 6}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="${L - 6}" y="${Y(v) + 4}" class="ax" text-anchor="end">${v}</text>`; }
  const step = (W - L - 26) / rows.length;
  rows.forEach((r, i) => { const bw = Math.max(6, Math.min(18, step / 2 - 5)), x = L + 6 + i * step + (step - bw * 2 - 3) / 2;
    s += `<rect x="${x}" y="${Y(r.en)}" width="${bw}" height="${Math.max(0, Y(0) - Y(r.en))}" rx="3" class="b-pl"><title>${esc(r.l.t)} 수강 ${r.en}명</title></rect>${r.en ? `<text x="${x + bw / 2}" y="${Y(r.en) - 4}" class="vl" text-anchor="middle">${r.en}</text>` : ''}`;
    s += `<rect x="${x + bw + 3}" y="${Y(r.done)}" width="${bw}" height="${Math.max(0, Y(0) - Y(r.done))}" rx="3" class="b-ap"><title>${esc(r.l.t)} 수료 ${r.done}명</title></rect>${r.done ? `<text x="${x + bw * 1.5 + 3}" y="${Y(r.done) - 4}" class="vl" text-anchor="middle">${r.done}</text>` : ''}`;
    s += `<text x="${x + bw + 1.5}" y="${H - 14}" class="ax" text-anchor="middle">${lecNo(r.l)}강</text>`; });
  $('#ch-lec').innerHTML = s + '</svg>';
}
function heatCls(r) { if (!r || !r.enrolled) return 'h0'; if (r.done) return 'h5'; const p = lecPct(r); return p >= 70 ? 'h4' : p >= 40 ? 'h3' : p >= 10 ? 'h2' : 'h1'; }
function renderHeat() {
  const us = D.users.filter(u => !u.off).slice(0, 40);
  if (!us.length) { $('#ch-heat').innerHTML = '<p class="empty-note">아직 가입한 점포가 없어요.</p>'; return; }
  $('#ch-heat').innerHTML = `<table class="heat"><thead><tr><th></th>${LECTURES.map(l => `<th title="${esc(l.t)}">${lecNo(l)}</th>`).join('')}<th class="hp">평균</th></tr></thead><tbody>${us.map(u => `<tr data-k="${esc(u.key)}"><th>${esc(u.store || u.owner || u.id)}</th>${LECTURES.map(l => { const r = (u.prog || {})[l.id]; return `<td class="${heatCls(r)}" title="${esc(u.store)} · ${esc(l.t)} — ${!r || !r.enrolled ? '미신청' : r.done ? '수료' : lecPct(r) + '%'}"></td>`; }).join('')}<td class="hp">${u.st.avg}%</td></tr>`).join('')}</tbody></table>`;
  $$('#ch-heat tr[data-k]').forEach(tr => tr.onclick = () => selectUser(tr.dataset.k));
}
const inviteMsg = store => `[${BRAND.ko}] ${store ? store + ' 점주님, ' : '점주님, '}용마거리 점주 전용 온라인 강의실이 열렸어요. 아래 주소에서 회원가입(점포명·대표자명) 후 강의를 들어 보세요.\n${HOME}`;
function renderDashMiss() {
  const m = matched(); $('#miss-title').textContent = `미가입 점포 ${m.missing.length}곳`;
  $('#dash-miss').innerHTML = m.missing.length ? `<ul class="mlist">${m.missing.slice(0, 6).map(r => `<li><span class="mno">${esc(r.no || '·')}</span><b>${esc(r.store)}</b><button class="ad-btn ghost xs" data-inv="${esc(r.store)}">안내 문구 복사</button></li>`).join('')}</ul>${m.missing.length > 6 ? `<button class="lnk" data-go="missing">나머지 ${m.missing.length - 6}곳 더 보기 ›</button>` : ''}` : '<p class="empty-note">명단의 모든 점포가 가입했어요.</p>';
  $$('#dash-miss [data-inv]').forEach(b => b.onclick = () => copy(inviteMsg(b.dataset.inv)));
}
function renderFeed() {
  const ev = events().slice(0, 8); const lb = { join: '가입', start: '수강', done: '수료', watch: '시청' };
  $('#feed').innerHTML = ev.length ? ev.map(e => `<li data-k="${esc(e.u.key)}"><i class="fd ${e.k}">${lb[e.k]}</i><span><b>${esc(e.who)}</b><small>${esc(e.what)}</small></span><time>${ago(e.t)}</time></li>`).join('') : '<li class="empty-note">아직 활동이 없어요.</li>';
  $$('#feed li[data-k]').forEach(li => li.onclick = () => selectUser(li.dataset.k));
}

// ---------- 회원 표 ----------
function filtered() {
  const q = ($('[data-q]').value || '').trim().toLowerCase(), f = $('[data-f]').value;
  return D.users.filter(u => {
    if (q && ![u.store, u.owner, u.name, u.id].some(x => String(x || '').toLowerCase().includes(q))) return false;
    const s = u.st; if (f === 'ing') return s.en > s.done; if (f === 'done') return s.done > 0; if (f === 'none') return s.en === 0;
    if (f === 'idle') return !s.lastAct || Date.now() - s.lastAct > 14 * DAY; if (f === 'off') return u.off; return true; });
}
function renderMembers() {
  const list = filtered(); if ($('#mem-count')) $('#mem-count').textContent = `${list.length}명`;
  const html = `<table class="tbl"><thead><tr><th>점포명</th><th>대표자</th><th>아이디</th><th>최근 접속</th><th class="n">신청</th><th class="n">수료</th><th>평균 진도</th><th class="c">관리</th></tr></thead><tbody>` +
    (list.length ? list.map(u => `<tr class="${u.off ? 'off' : ''}${sel && sel.key === u.key ? ' sel' : ''}" data-k="${esc(u.key)}">
      <td data-l="점포명"><b>${esc(u.store || '—')}</b>${u.off ? ' <em class="tag off">이용 중지</em>' : ''}${u.legacy ? ' <em class="tag">이전 형식</em>' : ''}${!linkedRow(u) ? ' <em class="tag warn">명단 미연결</em>' : ''}</td>
      <td data-l="대표자">${esc(u.owner || u.name || '—')}</td><td data-l="아이디" class="mono">${esc(u.id || '(확인 불가)')}</td>
      <td data-l="최근 접속">${ago(u.st.lastAct)}</td><td data-l="신청" class="n">${u.st.en}</td><td data-l="수료" class="n">${u.st.done}</td>
      <td data-l="평균 진도"><span class="pbar"><i style="width:${u.st.avg}%"></i></span><small class="pv">${u.st.avg}%</small></td>
      <td class="c"><button class="ad-btn ghost xs">관리</button></td></tr>`).join('') : `<tr><td colspan="8" class="empty">${D.users.length ? '조건에 맞는 회원이 없어요.' : '아직 가입한 회원이 없어요.'}</td></tr>`) + '</tbody></table>';
  $$('[data-members]').forEach(w => { w.innerHTML = html; w.querySelectorAll('tbody tr[data-k]').forEach(tr => tr.onclick = () => selectUser(tr.dataset.k)); });
}

// ---------- 회원 상세 (넓은 화면: 오른쪽 패널 / 좁은 화면: 올라오는 패널) ----------
function selectUser(key) { sel = D.users.find(u => u.key === key) || null; renderDetail(); $$('tbody tr[data-k]').forEach(tr => tr.classList.toggle('sel', !!sel && tr.dataset.k === sel.key)); if (innerWidth < 1180) { $('#detail').classList.add('open'); $('#dt-dim').hidden = false; document.body.classList.add('lock'); } }
function closeDetail() { $('#detail').classList.remove('open'); $('#dt-dim').hidden = true; document.body.classList.remove('lock'); }
function renderDetail() {
  const u = sel; if (!u) { $('#dt-body').innerHTML = '<div class="dt-empty">' + svgI('users') + '<p>회원 표나 히트맵에서 회원을 고르면<br>계정 관리와 강의별 진도가 여기에 표시돼요.</p></div>'; return; }
  const s = u.st;
  const rows = LECTURES.map(l => { const r = (u.prog || {})[l.id]; if (!r || !r.enrolled) return ''; const p = r.done ? 100 : lecPct(r);
    return `<li><div class="dl-t"><b><em>${String(lecNo(l)).padStart(2, '0')}</em> ${esc(lecShort(l))}</b>${r.done ? '<i class="tag ok">수료</i>' : ''}</div><div class="dl-b"><span class="pbar${r.done ? ' done' : ''}"><i style="width:${p}%"></i></span><small>${p}%</small></div><small class="dl-s">신청 ${fmtD(r.enrolled)} · ${r.done ? `수료 ${fmtD(r.done)}` : `마지막 위치 ${fmtT(r.pos)}`}</small></li>`; }).filter(Boolean).join('');
  $('#dt-body').innerHTML = `
    <div class="dt-card"><div class="dt-top"><span class="dt-av">${esc((u.owner || u.name || '?').trim()[0] || '?')}</span><div><b>${esc(u.store || '점포 미입력')}</b><small>${u.off ? '<i class="tag off">이용 중지</i>' : '<i class="tag ok">이용 중</i>'}</small></div></div>
      <dl><dt>대표자</dt><dd>${esc(u.owner || u.name || '—')}</dd><dt>아이디</dt><dd class="mono">${esc(u.id || '(확인 불가)')}</dd><dt>가입일</dt><dd>${fmtDT(u.at)}</dd><dt>최근 로그인</dt><dd>${fmtDT(u.last)}</dd></dl>
      <div class="dt-nums"><div><span>신청</span><b>${s.en}<small>강</small></b></div><div><span>수료</span><b>${s.done}<small>강</small></b></div><div><span>평균</span><b>${s.avg}<small>%</small></b></div></div></div>
    ${u.legacy ? '<p class="note">이전 형식 계정입니다. 회원이 한 번 로그인하면 아이디 표시·비밀번호 재설정이 가능해져요.</p>' : ''}
    <div class="dt-sub dt-link${linkedRow(u) ? '' : ' warn'}"><label>명단 점포 연결${linkedRow(u) ? '' : ' <i class="tag warn">미연결</i>'}<select id="dr-link">${rosterOpts(u.storeNo)}</select></label><button class="ad-btn sm" id="dr-link-go">연결</button>${!linkedRow(u) ? `<p class="tiny">가입 때 적은 점포명: <b>${esc(u.store || '없음')}</b>${u.sug ? ` · 비슷한 명단 점포: <b>${esc(u.sug.store)}</b>` : ''}</p>` : ''}</div>
    <div class="dt-acts"><button class="ad-btn" id="dr-temp">임시 비밀번호 발급</button><button class="ad-btn ghost" id="dr-rename-open">아이디 변경</button><button class="ad-btn ${u.off ? 'ghost' : 'danger'}" id="dr-off">${u.off ? '이용 중지 풀기' : '이용 중지'}</button></div>
    <p class="dt-out" id="dr-pw-out" hidden></p>
    <div class="dt-sub" id="dr-rename-box" hidden><label>새 아이디<input id="dr-newid" maxlength="16" placeholder="영문 소문자·숫자 4~16자"></label><button class="ad-btn sm" id="dr-rename">바꾸기</button><p class="tiny">바꾸면 기존 아이디로는 로그인이 안 되고, 진도는 새 아이디로 옮겨져요.</p></div>
    <details class="dt-more"><summary>비밀번호 직접 지정 · 점포 정보 수정 · 삭제</summary>
      <div class="dt-sub"><label>비밀번호 직접 지정<input id="dr-pw" maxlength="64" placeholder="8자 이상"></label><button class="ad-btn ghost sm" id="dr-setpw">이 비밀번호로 바꾸기</button></div>
      <div class="dt-sub"><label>점포명<input id="dr-store" maxlength="30" value="${esc(u.store)}"></label><label>대표자명<input id="dr-owner" maxlength="12" value="${esc(u.owner || u.name)}"></label><button class="ad-btn ghost sm" id="dr-save">점포 정보 저장</button></div>
      <div class="dt-sub"><button class="ad-btn danger sm" id="dr-del">회원 삭제</button><p class="tiny">진도·수료 기록도 함께 지워지고 되돌릴 수 없어요.</p></div>
    </details>
    <h3 class="dt-h">강의별 진도 <small>${s.en}강</small></h3>
    ${rows ? `<ul class="dt-lec">${rows}</ul>` : '<p class="muted small">아직 수강신청한 강의가 없어요.</p>'}
    <p class="tiny muted">진도는 실제로 재생된 구간만 셉니다. 90% 이상 보면 수료.</p>`;
  const busy = async (btn, fn) => { btn.disabled = true; try { return await withTimeout(fn(), 20000); } catch (e) { return { ok: false, msg: '연결이 늦어요. 다시 시도해 주세요.' }; } finally { btn.disabled = false; } };
  const setPw = async (btn, pw) => { const r = await busy(btn, () => api.setPassword(u, pw)); if (!r.ok) { toast(r.msg); return; } const o = $('#dr-pw-out'); o.hidden = false; o.innerHTML = `임시 비밀번호 <b class="mono">${esc(pw)}</b><button class="ad-btn sm" id="dr-copy">안내 문구 복사</button><small>이 화면을 벗어나면 다시 볼 수 없어요. 점주님께 전화·문자로 알려 드리세요.</small>`; $('#dr-copy').onclick = () => copy(`[${BRAND.ko}] ${u.owner || u.name}님, 아이디 ${u.id} / 임시 비밀번호 ${pw} 로 로그인해 주세요.\n${HOME}`); if ($('#dr-pw')) $('#dr-pw').value = ''; };
  if (!linkedRow(u) && !u.sug) u.sug = suggest(u); if (!linkedRow(u) && u.sug) $('#dr-link').value = rkey(u.sug);
  $('#dr-link-go').onclick = e => { const v = $('#dr-link').value; const r = roster().find(x => rkey(x) === v); if (!r) { toast('연결할 명단 점포를 골라 주세요.'); return; } linkUser(u, r, e.currentTarget); };
  $('#dr-temp').onclick = e => setPw(e.currentTarget, tempPassword());
  $('#dr-setpw').onclick = e => { const pw = $('#dr-pw').value; if (pw.length < 8) { toast('비밀번호는 8자 이상이어야 해요.'); return; } setPw(e.currentTarget, pw); };
  $('#dr-rename-open').onclick = () => { $('#dr-rename-box').hidden = !$('#dr-rename-box').hidden; if (!$('#dr-rename-box').hidden) $('#dr-newid').focus(); };
  $('#dr-rename').onclick = async e => { const to = $('#dr-newid').value; const r = await busy(e.currentTarget, () => api.rename(u, to)); toast(r.ok ? `아이디를 ${to.trim().toLowerCase()}(으)로 바꿨어요.` : r.msg); if (r.ok) { sel = { key: '', id: to.trim().toLowerCase() }; reload(); } };
  $('#dr-save').onclick = async e => { const st = $('#dr-store').value.trim(), ow = $('#dr-owner').value.trim(); const r = await busy(e.currentTarget, () => api.edit(u, { store: st, owner: ow })); toast(r.ok ? '점포 정보를 저장했어요.' : r.msg); if (r.ok) { u.store = st; u.owner = ow; renderAll(); } };
  $('#dr-off').onclick = async e => { const r = await busy(e.currentTarget, () => api.edit(u, { off: !u.off })); if (!r.ok) { toast(r.msg); return; } u.off = !u.off; toast(u.off ? '이용을 중지했어요. 이 계정으로는 로그인이 안 돼요.' : '이용 중지를 풀었어요.'); renderAll(); };
  $('#dr-del').onclick = async e => { const t = prompt(`정말 삭제할까요? 진도·수료 기록도 함께 지워지고 되돌릴 수 없어요.\n삭제하려면 아이디(${u.id || u.store})를 그대로 입력하세요.`); if (t === null) return; if (t.trim() !== (u.id || u.store)) { toast('입력한 값이 달라 삭제하지 않았어요.'); return; } const r = await busy(e.currentTarget, () => api.remove(u)); toast(r.ok ? '회원을 삭제했어요.' : r.msg); if (r.ok) { sel = null; closeDetail(); reload(); } };
}
async function copy(t) { try { await navigator.clipboard.writeText(t); toast('복사했어요.'); } catch (e) { prompt('복사해서 쓰세요', t); } }

// ---------- 미가입 점포 ----------
function renderMissing() {
  const m = matched();
  $('#pane-missing').innerHTML = `
    <div class="kpis k3"><div class="kpi"><div><span>점포 명단</span><b>${roster().length}<small>곳</small></b><small>점포 명단 메뉴에서 수정</small></div><i class="kic">${svgI('store')}</i></div><div class="kpi"><div><span>가입 완료</span><b>${m.joined.length}<small>곳</small></b><small>가입 때 고른 점포로 대조</small></div><i class="kic">${svgI('users')}</i></div><div class="kpi warn"><div><span>미가입</span><b>${m.missing.length}<small>곳</small></b><small>안내 문구를 보내 주세요</small></div><i class="kic">${svgI('chart')}</i></div></div>
    ${m.extra.length ? `<article class="card attn"><header><h2>점포 연결이 필요한 회원 ${m.extra.length}명</h2></header><p class="small muted">가입할 때 명단에서 고르지 않고 점포명을 직접 적은 회원이에요. 맞는 명단 점포를 골라 연결하면 미가입 대조와 통계에 반영돼요. (비슷한 이름은 자동으로 골라 둡니다)</p><ul class="mlist big warn link">${m.extra.map(u => `<li data-k="${esc(u.key)}"><span class="mno">!</span><span class="lk-who"><b>${esc(u.store || '점포명 없음')}</b><small>${esc(u.owner || u.name)} (${esc(u.id)})</small></span><select data-link="${esc(u.key)}">${rosterOpts(u.sug ? rkey(u.sug) : '')}</select><button class="ad-btn xs" data-link-go="${esc(u.key)}">연결</button></li>`).join('')}</ul></article>` : ''}
    <article class="card"><header><h2>미가입 점포 ${m.missing.length}곳</h2><div class="tb-tools"><button class="ad-btn ghost sm" id="ms-msg">공통 안내 문구 복사</button><button class="ad-btn ghost sm" id="ms-csv">미가입 명단 CSV</button></div></header>
      ${m.missing.length ? `<ul class="mlist big">${m.missing.map(r => `<li><span class="mno">${esc(r.no || '·')}</span><b>${esc(r.store)}</b><small>${esc(r.owner || '대표자 미입력')}</small><button class="ad-btn ghost xs" data-inv="${esc(r.store)}">안내 문구 복사</button></li>`).join('')}</ul>` : '<p class="empty-note">명단의 모든 점포가 가입했어요.</p>'}</article>
    <article class="card"><header><h2>가입 완료 점포 ${m.joined.length}곳</h2></header>${m.joined.length ? `<ul class="mlist big ok">${m.joined.map(r => `<li><span class="mno">${esc(r.no || '·')}</span><b>${esc(r.store)}</b><small>${r.users.map(u => esc(u.owner || u.name) + ' (' + esc(u.id) + ')').join(', ')}</small></li>`).join('')}</ul>` : '<p class="empty-note">아직 없어요.</p>'}</article>
`;
  $('#ms-msg').onclick = () => copy(inviteMsg());
  $('#ms-csv').onclick = () => dl('미가입점포.csv', [['부스번호', '점포명', '대표자'], ...m.missing.map(r => [r.no, r.store, r.owner])]);
  $$('#pane-missing [data-inv]').forEach(b => b.onclick = () => copy(inviteMsg(b.dataset.inv)));
  $$('#pane-missing [data-link-go]').forEach(b => b.onclick = e => { e.stopPropagation(); const u = D.users.find(x => x.key === b.dataset.linkGo); const v = $(`select[data-link="${CSS.escape(b.dataset.linkGo)}"]`).value; const r = roster().find(x => rkey(x) === v); if (!r) { toast('연결할 명단 점포를 골라 주세요.'); return; } linkUser(u, r, b); });
  $$('#pane-missing li[data-k] .lk-who').forEach(el => el.onclick = () => selectUser(el.closest('li').dataset.k));
}

// ---------- 강의 현황 ----------
function renderLectures() {
  const rows = lecStats(); const top = [...rows].sort((a, b) => b.en - a.en)[0];
  $('#pane-lectures').innerHTML = `<div class="kpis k3"><div class="kpi"><div><span>전체 강의</span><b>${LECTURES.length}<small>강</small></b><small>${CATS.length}개 분류</small></div><i class="kic">${svgI('book')}</i></div><div class="kpi"><div><span>영상 연결</span><b>${LECTURES.filter(l => l.yt).length}<small> / ${LECTURES.length}</small></b><small>유튜브 일부 공개</small></div><i class="kic">${svgI('chart')}</i></div><div class="kpi"><div><span>가장 많이 듣는 강의</span><b class="sm">${top && top.en ? esc(lecNo(top.l) + '강 · ' + lecShort(top.l)) : '—'}</b><small>수강 신청 기준</small></div><i class="kic">${svgI('cap')}</i></div></div>
    <article class="card"><header><h2>강의별 현황</h2><button class="ad-btn ghost sm" id="lx-csv">CSV</button></header><div class="tbl-wrap"><table class="tbl"><thead><tr><th>강의</th><th>분류</th><th>영상</th><th class="n">신청</th><th class="n">수강 중</th><th class="n">수료</th><th>평균 진도</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td data-l="강의"><b>${esc(x.l.t)}</b>${x.l.len ? ` <small class="pv">${esc(x.l.len)}</small>` : ''}</td><td data-l="분류"><i class="tag">${esc(x.l.cat)}</i></td><td data-l="영상">${x.l.yt ? `<a class="tag ok" href="https://youtu.be/${esc(x.l.yt)}" target="_blank" rel="noopener">연결됨</a>` : '<i class="tag">준비 중</i>'}</td><td data-l="신청" class="n">${x.en}</td><td data-l="수강 중" class="n">${x.ing}</td><td data-l="수료" class="n">${x.done}</td><td data-l="평균 진도"><span class="pbar"><i style="width:${x.avg}%"></i></span><small class="pv">${x.avg}%</small></td></tr>`).join('')}</tbody></table></div></article>`;
  $('#lx-csv').onclick = () => dl('강의별현황.csv', [['강의', '분류', '영상', '신청', '수강중', '수료', '평균진도(%)'], ...rows.map(x => [x.l.t, x.l.cat, x.l.yt ? 'https://youtu.be/' + x.l.yt : '준비 중', x.en, x.ing, x.done, x.avg])]);
}

// ---------- 점포 명단 ----------
function renderRoster() {
  const R = roster(); const txt = R.map(r => [r.no, r.store, r.owner].join(', ')).join('\n');
  $('#pane-roster').innerHTML = `<article class="card"><header><h2>점포 명단 ${R.length}곳</h2><span class="muted small">${D.roster && D.roster.length ? '관리자가 저장한 명단' : '기본값: 용마미식거리 참여 부스(1~20번)'}</span></header>
    <p class="small muted">한 줄에 한 점포씩 <b>번호, 점포명, 대표자</b> 순서로 적어 주세요. 엑셀에서 세 칸을 복사해 붙여 넣어도 됩니다. 미가입 대조는 점포명으로 해요.</p>
    <textarea id="ro-txt" class="ad-ta" spellcheck="false">${esc(txt)}</textarea>
    <div class="row"><button class="ad-btn" id="ro-save">명단 저장</button><button class="ad-btn ghost" id="ro-def">기본 명단으로 되돌리기</button></div></article>`;
  $('#ro-save').onclick = async () => {
    const list = $('#ro-txt').value.split('\n').map(l => l.split(/\t|,/).map(x => x.trim())).filter(a => a.join('')).map(a => a.length === 1 ? { no: '', store: a[0], owner: '' } : { no: a[0], store: a[1] || '', owner: a[2] || '' }).filter(r => r.store);
    if (!list.length) { toast('명단이 비어 있어요.'); return; }
    $('#ro-save').disabled = true; let r; try { r = await withTimeout(api.saveRoster(list), 20000); } catch (err) { r = { ok: false, msg: '연결이 늦어요.' }; } $('#ro-save').disabled = false;
    toast(r.ok ? `명단 ${list.length}곳을 저장했어요.` : r.msg); if (r.ok) { D.roster = list; renderAll(); }
  };
  $('#ro-def').onclick = () => { $('#ro-txt').value = DEFAULT_ROSTER.map(r => [r.no, r.store, r.owner].join(', ')).join('\n'); toast('기본 명단을 불러왔어요. 저장을 눌러야 반영돼요.'); };
}

// ---------- 설정 ----------
function renderSettings() {
  $('#pane-settings').innerHTML = `<div class="g2">
    <article class="card"><header><h2>내보내기</h2></header><p class="small muted">엑셀에서 바로 열리는 CSV 파일로 받아요.</p><div class="row"><button class="ad-btn ghost" id="st-users">회원 명단 CSV</button><button class="ad-btn ghost" id="st-prog">회원×강의 진도 CSV</button></div></article>
    <article class="card"><header><h2>관리자 비밀번호</h2></header>${api.server ? '<p class="small muted">자체 서버 모드입니다. 서버의 ADMIN_PW 값으로 관리해요.</p>' : `<p class="small muted">바꾸면 다음부터 새 비밀번호로 들어와야 해요.</p><div class="row"><input type="password" id="st-pw" placeholder="새 관리자 비밀번호 (8자 이상)" autocomplete="new-password"><input type="password" id="st-pw2" placeholder="한 번 더" autocomplete="new-password"><button class="ad-btn sm" id="st-pw-go">바꾸기</button></div>`}</article></div>
    <article class="card"><header><h2>데이터 보관 위치</h2></header><p class="small">${api.server ? '자체 서버(accounts.json)에 보관 중입니다. 비밀번호는 scrypt 암호화 값만 저장해요.' : '시연 모드: 공개 MQTT 중계 서버에 보관 중입니다. 비밀번호는 PBKDF2 암호화 값만 저장하지만, 실제 운영 전 자체 서버로 옮겨야 해요.'}</p></article>`;
  $('#st-users').onclick = exportUsers;
  $('#st-prog').onclick = () => dl('강의별진도.csv', [['점포명', '대표자', '아이디', ...LECTURES.map(l => l.t)], ...D.users.map(u => [u.store, u.owner || u.name, u.id, ...LECTURES.map(l => { const r = (u.prog || {})[l.id]; return !r || !r.enrolled ? '' : r.done ? '수료' : lecPct(r) + '%'; })])]);
  if ($('#st-pw-go')) $('#st-pw-go').onclick = async () => { const a = $('#st-pw').value, b = $('#st-pw2').value; if (a !== b) { toast('두 칸이 달라요.'); return; } $('#st-pw-go').disabled = true; const r = await api.changeAdminPw(a).catch(() => ({ ok: false, msg: '바꾸지 못했어요.' })); $('#st-pw-go').disabled = false; toast(r.ok ? '관리자 비밀번호를 바꿨어요.' : r.msg); if (r.ok) $('#st-pw').value = $('#st-pw2').value = ''; };
}
function exportUsers() { dl('회원명단.csv', [['점포명', '대표자', '아이디', '가입일', '최근접속', '수강신청', '수료', '평균진도(%)', '상태'], ...D.users.map(u => [u.store, u.owner || u.name, u.id, fmtD(u.at), fmtD(u.st.lastAct), u.st.en, u.st.done, u.st.avg, u.off ? '이용중지' : '정상'])]); }
function dl(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${BRAND.short}_${name}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
window.__adm = { api, get D() { return D; }, reload, selectUser, showTab };
