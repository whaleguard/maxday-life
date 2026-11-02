// 아카데미 관리자 화면
import { BRAND, LECTURES, STREET, MQTT_NS } from './config.js';
import { createNet, makeSid } from './net.js';
import { AdminApi, tempPassword, lecPct, normStore } from './features/admin.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const B = window.MDL_BRAND || {};
const net = createNet(makeSid());
const api = new AdminApi(net, MQTT_NS, B.adminHash);
const DAY = 864e5;
const fmtD = t => t ? new Date(t).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '—';
const fmtDT = t => t ? new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtT = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const ago = t => { if (!t) return '—'; const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? '오늘' : d === 1 ? '어제' : d + '일 전'; };
let toastT = 0; function toast(m) { const t = $('#ad-toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

const DEFAULT_ROSTER = [...(STREET.food || []), ...(STREET.market || [])].map(r => ({ no: String(r[0]), store: r[1], owner: '' }));
let D = { users: [], roster: null }, tab = 'members';
const roster = () => D.roster && D.roster.length ? D.roster : DEFAULT_ROSTER;

// ---------- 화면 기본 ----------
document.title = `관리자 · ${BRAND.ko}`;
$('#ad-name').textContent = BRAND.ko; $('#ad-logo').src = BRAND.logo; const HOME = B.home || new URL('./', document.baseURI).href; $('#ad-site').href = HOME;
$('#ad-mode').textContent = api.server ? '자체 서버' : '시연 모드';
$('#ad-mode').classList.toggle('demo', !api.server);
if (B.sister) { /* 관리자 화면에는 자매 사이트 링크를 두지 않음 */ }

$('#ad-login-form').onsubmit = async e => {
  e.preventDefault(); const pw = $('#ad-pw').value; if (!pw) return;
  $('#ad-login-go').disabled = true; $('#ad-login-go').textContent = '확인 중…'; $('#ad-login-err').textContent = '';
  let r; try { r = await withTimeout(api.login(pw), 20000); } catch (err) { r = { ok: false, msg: '연결이 늦어요. 잠시 후 다시 시도해 주세요.' }; }
  $('#ad-login-go').disabled = false; $('#ad-login-go').textContent = '들어가기';
  if (!r.ok) { $('#ad-login-err').textContent = r.msg; return; }
  $('#ad-pw').value = ''; try { sessionStorage.setItem('mdl_admin_' + MQTT_NS, '1'); } catch (err) {}
  $('#ad-login').hidden = true; $('#ad-app').hidden = false; $('#ad-reload').hidden = $('#ad-logout').hidden = false;
  reload();
};
$('#ad-logout').onclick = () => { api.ok = false; api.token = null; location.reload(); };
$('#ad-reload').onclick = () => reload();
document.querySelectorAll('.ad-tabs button').forEach(b => b.onclick = () => showTab(b.dataset.t));
$('#ad-q').oninput = renderMembers; $('#ad-f').onchange = renderMembers;
$('#dr-x').onclick = closeDrawer; $('#ad-drawer').onclick = e => { if (e.target.id === 'ad-drawer') closeDrawer(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

if (!api.server) {
  $('#ad-demo').hidden = false;
  $('#ad-demo').innerHTML = '<b>시연 모드</b> 회원 기록이 공개 중계 서버에 있어요. 비밀번호는 암호화 값만 보관하지만, 실제 점주님을 받기 전에 자체 서버로 옮겨야 합니다.';
}

async function reload() {
  $('#ad-kpis').innerHTML = '<p class="muted">불러오는 중…</p>';
  try { D = await withTimeout(api.load(), 25000); } catch (e) { $('#ad-kpis').innerHTML = '<p class="err">회원 정보를 불러오지 못했어요. 새로고침을 눌러 주세요.</p>'; return; }
  D.users.sort((a, b) => (b.last || 0) - (a.last || 0));
  renderKpis(); showTab(tab);
}
function showTab(t) {
  tab = t; document.querySelectorAll('.ad-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  document.querySelectorAll('.ad-pane').forEach(p => { p.hidden = p.id !== 'pane-' + t; });
  ({ members: renderMembers, missing: renderMissing, lectures: renderLectures, roster: renderRoster, settings: renderSettings })[t]();
}

// ---------- 계산 ----------
function stat(u) {
  const P = u.prog || {}; let en = 0, done = 0, sum = 0, n = 0, last = 0;
  for (const l of LECTURES) { const r = P[l.id]; if (!r || !r.enrolled) continue; en++; if (r.done) done++; sum += r.done ? 100 : lecPct(r); n++; last = Math.max(last, r.last || r.enrolled || 0); }
  return { en, done, avg: n ? Math.round(sum / n) : 0, last };
}
function matched() {
  const R = roster(); const byStore = new Map(); D.users.forEach(u => { const k = normStore(u.store); if (k) (byStore.get(k) || byStore.set(k, []).get(k)).push(u); });
  const joined = [], missing = []; R.forEach(r => { const k = normStore(r.store); const us = byStore.get(k) || [...byStore.entries()].find(([kk]) => k && kk && (kk.includes(k) || k.includes(kk)))?.[1]; (us && us.length ? joined : missing).push({ ...r, users: us || [] }); });
  const rk = R.map(r => normStore(r.store)).filter(Boolean);
  const extra = D.users.filter(u => { const k = normStore(u.store); return !k || !rk.some(x => x === k || x.includes(k) || k.includes(x)); });
  return { joined, missing, extra };
}

function renderKpis() {
  const m = matched(); const S = D.users.map(stat);
  const en = S.reduce((a, s) => a + s.en, 0), done = S.reduce((a, s) => a + s.done, 0);
  const act7 = D.users.filter(u => u.last && Date.now() - u.last < 7 * DAY).length;
  const R = roster().length;
  $('#ad-kpis').innerHTML = [
    ['가입 회원', D.users.length + '명', `이용 중지 ${D.users.filter(u => u.off).length}명`],
    ['명단 대비 가입 점포', `${m.joined.length} / ${R}`, `미가입 ${m.missing.length}곳`, R ? Math.round(m.joined.length / R * 100) : 0],
    ['수강신청', en + '건', `회원 1명당 ${D.users.length ? (en / D.users.length).toFixed(1) : 0}강`],
    ['수료', done + '건', `수료한 회원 ${S.filter(s => s.done).length}명`],
    ['최근 7일 접속', act7 + '명', `전체 강의 ${LECTURES.length}강 · 영상 연결 ${LECTURES.filter(l => l.yt).length}강`],
  ].map(([k, v, s, p]) => `<div class="ad-kpi"><span>${k}</span><b>${v}</b><small>${s}</small>${p !== undefined ? `<i class="bar"><i style="width:${p}%"></i></i>` : ''}</div>`).join('');
}

// ---------- 회원 ----------
function renderMembers() {
  const q = $('#ad-q').value.trim().toLowerCase(), f = $('#ad-f').value;
  const list = D.users.filter(u => {
    if (q && ![u.store, u.owner, u.name, u.id].some(x => String(x || '').toLowerCase().includes(q))) return false;
    const s = stat(u);
    if (f === 'ing') return s.en > s.done; if (f === 'done') return s.done > 0; if (f === 'none') return s.en === 0;
    if (f === 'idle') return !u.last || Date.now() - u.last > 14 * DAY; if (f === 'off') return u.off; return true;
  });
  $('#ad-count').textContent = `${list.length}명`;
  $('#ad-members').innerHTML = `<thead><tr><th>점포명</th><th>대표자</th><th>아이디</th><th>가입일</th><th>최근 접속</th><th class="n">신청</th><th class="n">수료</th><th>평균 진도</th><th></th></tr></thead><tbody>` +
    (list.length ? list.map(u => { const s = stat(u); return `<tr class="${u.off ? 'off' : ''}" data-k="${esc(u.key)}">
      <td data-l="점포명"><b>${esc(u.store || '—')}</b>${u.off ? ' <em class="tag off">이용 중지</em>' : ''}${u.legacy ? ' <em class="tag">이전 형식</em>' : ''}</td>
      <td data-l="대표자">${esc(u.owner || u.name || '—')}</td><td data-l="아이디" class="mono">${esc(u.id || '(확인 불가)')}</td>
      <td data-l="가입일">${fmtD(u.at)}</td><td data-l="최근 접속">${ago(Math.max(u.last || 0, s.last))}</td>
      <td data-l="신청" class="n">${s.en}</td><td data-l="수료" class="n">${s.done}</td>
      <td data-l="평균 진도"><span class="pbar"><i style="width:${s.avg}%"></i></span><small>${s.avg}%</small></td>
      <td><button class="ad-btn sm">관리</button></td></tr>`; }).join('') : `<tr><td colspan="9" class="empty">${D.users.length ? '조건에 맞는 회원이 없어요.' : '아직 가입한 회원이 없어요.'}</td></tr>`) + '</tbody>';
  document.querySelectorAll('#ad-members tbody tr[data-k]').forEach(tr => tr.onclick = () => openDrawer(D.users.find(u => u.key === tr.dataset.k)));
}

function openDrawer(u) {
  if (!u) return; const s = stat(u);
  $('#dr-title').textContent = `${u.store || '점포 미입력'} · ${u.owner || u.name || ''}`;
  const rows = LECTURES.map(l => { const r = (u.prog || {})[l.id]; if (!r || !r.enrolled) return ''; const p = r.done ? 100 : lecPct(r);
    return `<li><div><b>${esc(l.t)}</b><small>신청 ${fmtD(r.enrolled)} · ${r.done ? `수료 ${fmtD(r.done)}` : `마지막 위치 ${fmtT(r.pos)}`}${r.dur ? ` · 실제 시청 ${fmtT((r.seen || []).reduce((a, [x, y]) => a + y - x, 0))} / ${fmtT(r.dur)}` : ''}</small></div><span class="pbar${r.done ? ' done' : ''}"><i style="width:${p}%"></i></span><em>${r.done ? '수료' : p + '%'}</em></li>`; }).filter(Boolean).join('');
  $('#dr-body').innerHTML = `
    <dl class="dr-info"><dt>아이디</dt><dd class="mono">${esc(u.id || '(확인 불가)')}</dd><dt>가입일</dt><dd>${fmtDT(u.at)}</dd><dt>최근 로그인</dt><dd>${fmtDT(u.last)}</dd><dt>수강</dt><dd>신청 ${s.en} · 수료 ${s.done} · 평균 ${s.avg}%</dd></dl>
    ${u.legacy ? '<p class="note">이전 형식 계정입니다. 회원이 한 번 로그인하면 아이디 표시·비밀번호 재설정이 가능해져요.</p>' : ''}
    <h3>점포 정보</h3>
    <div class="dr-row"><label>점포명<input id="dr-store" maxlength="30" value="${esc(u.store)}"></label><label>대표자명<input id="dr-owner" maxlength="12" value="${esc(u.owner || u.name)}"></label></div>
    <button class="ad-btn sm" id="dr-save">점포 정보 저장</button>
    <h3>비밀번호 분실</h3>
    <p class="small muted">임시 비밀번호를 만들어 점주님께 전화·문자로 알려 주세요. 기존 진도·수료 기록은 그대로 남아요.</p>
    <div class="dr-row"><button class="ad-btn sm" id="dr-temp">임시 비밀번호 만들기</button><input id="dr-pw" maxlength="64" placeholder="또는 직접 입력 (8자 이상)"><button class="ad-btn sm ghost" id="dr-setpw">이 비밀번호로 바꾸기</button></div>
    <p class="dr-out" id="dr-pw-out" hidden></p>
    <h3>아이디 분실·변경</h3>
    <p class="small muted">아이디를 잊으셨으면 위 아이디를 알려 드리면 돼요. 바꾸면 기존 아이디로는 로그인이 안 되고, 진도는 새 아이디로 옮겨져요.</p>
    <div class="dr-row"><input id="dr-newid" maxlength="16" placeholder="새 아이디 (영문 소문자·숫자 4~16자)"><button class="ad-btn sm ghost" id="dr-rename">아이디 바꾸기</button></div>
    <h3>강의별 진도</h3>
    ${rows ? `<ul class="dr-lec">${rows}</ul>` : '<p class="small muted">아직 수강신청한 강의가 없어요.</p>'}
    <h3>계정 관리</h3>
    <div class="dr-row"><button class="ad-btn sm ghost" id="dr-off">${u.off ? '이용 중지 풀기' : '이용 중지'}</button><button class="ad-btn sm danger" id="dr-del">회원 삭제</button></div>`;
  const busy = async (btn, fn) => { btn.disabled = true; try { return await withTimeout(fn(), 20000); } catch (e) { return { ok: false, msg: '연결이 늦어요. 다시 시도해 주세요.' }; } finally { btn.disabled = false; } };
  $('#dr-save').onclick = async e => { const r = await busy(e.target, () => api.edit(u, { store: $('#dr-store').value.trim(), owner: $('#dr-owner').value.trim() })); toast(r.ok ? '점포 정보를 저장했어요.' : r.msg); if (r.ok) { u.store = $('#dr-store').value.trim(); u.owner = $('#dr-owner').value.trim(); renderKpis(); showTab(tab); } };
  const setPw = async (btn, pw) => { const r = await busy(btn, () => api.setPassword(u, pw)); if (!r.ok) { toast(r.msg); return; } const o = $('#dr-pw-out'); o.hidden = false; o.innerHTML = `새 비밀번호 <b class="mono">${esc(pw)}</b> <button class="ad-btn sm ghost" id="dr-copy">안내 문구 복사</button><br><small>이 창을 닫으면 다시 볼 수 없어요. 점주님께 로그인 후 바꾸시라고 안내해 주세요.</small>`; $('#dr-copy').onclick = () => copy(`[${BRAND.ko}] ${u.owner || u.name}님, 아이디 ${u.id} / 임시 비밀번호 ${pw} 로 로그인해 주세요.`); $('#dr-pw').value = ''; };
  $('#dr-temp').onclick = e => setPw(e.target, tempPassword());
  $('#dr-setpw').onclick = e => { const pw = $('#dr-pw').value; if (pw.length < 8) { toast('비밀번호는 8자 이상이어야 해요.'); return; } setPw(e.target, pw); };
  $('#dr-rename').onclick = async e => { const to = $('#dr-newid').value; const r = await busy(e.target, () => api.rename(u, to)); toast(r.ok ? `아이디를 ${to.trim().toLowerCase()}(으)로 바꿨어요.` : r.msg); if (r.ok) { closeDrawer(); reload(); } };
  $('#dr-off').onclick = async e => { const r = await busy(e.target, () => api.edit(u, { off: !u.off })); if (!r.ok) { toast(r.msg); return; } u.off = !u.off; toast(u.off ? '이용을 중지했어요. 이 계정으로는 로그인이 안 돼요.' : '이용 중지를 풀었어요.'); openDrawer(u); renderKpis(); showTab(tab); };
  $('#dr-del').onclick = async e => { const t = prompt(`정말 삭제할까요? 진도·수료 기록도 함께 지워지고 되돌릴 수 없어요.\n삭제하려면 아이디(${u.id || u.store})를 그대로 입력하세요.`); if (t === null) return; if (t.trim() !== (u.id || u.store)) { toast('입력한 값이 달라 삭제하지 않았어요.'); return; } const r = await busy(e.target, () => api.remove(u)); toast(r.ok ? '회원을 삭제했어요.' : r.msg); if (r.ok) { closeDrawer(); reload(); } };
  $('#ad-drawer').hidden = false; document.body.classList.add('lock');
}
function closeDrawer() { $('#ad-drawer').hidden = true; document.body.classList.remove('lock'); }
async function copy(t) { try { await navigator.clipboard.writeText(t); toast('복사했어요.'); } catch (e) { prompt('복사해서 쓰세요', t); } }

// ---------- 미가입 점포 ----------
function renderMissing() {
  const m = matched();
  const site = HOME;
  const msg = `[${BRAND.ko}] 점주님 전용 온라인 강의실이 열렸어요. 아래 주소에서 회원가입(점포명·대표자명) 후 강의를 들어 보세요.\n${site}`;
  $('#pane-missing').innerHTML = `
    <div class="ad-tools"><b>미가입 점포 ${m.missing.length}곳</b><span class="muted small">점포 명단 ${roster().length}곳 중 가입 ${m.joined.length}곳 · 점포명으로 대조</span><button class="ad-btn sm ghost" id="ms-msg">가입 안내 문구 복사</button><button class="ad-btn sm ghost" id="ms-csv">미가입 명단 CSV</button></div>
    <div class="ad-cards">${m.missing.map(r => `<div class="ad-mc"><em>${esc(r.no ? r.no + '번' : '')}</em><b>${esc(r.store)}</b><small>${esc(r.owner || '대표자 미입력')}</small></div>`).join('') || '<p class="muted">명단의 모든 점포가 가입했어요.</p>'}</div>
    <h3>가입 완료 점포 ${m.joined.length}곳</h3>
    <div class="ad-cards">${m.joined.map(r => `<div class="ad-mc ok"><em>${esc(r.no ? r.no + '번' : '')}</em><b>${esc(r.store)}</b><small>${r.users.map(u => esc(u.owner || u.name) + ' (' + esc(u.id) + ')').join(', ')}</small></div>`).join('') || '<p class="muted">아직 없어요.</p>'}</div>
    ${m.extra.length ? `<h3>명단에 없는 가입 회원 ${m.extra.length}명</h3><p class="small muted">점포명을 다르게 적었거나 명단에 없는 점포예요. 회원 관리에서 점포명을 고치거나, 점포 명단에 추가해 주세요.</p><div class="ad-cards">${m.extra.map(u => `<div class="ad-mc warn"><b>${esc(u.store || '점포명 없음')}</b><small>${esc(u.owner || u.name)} (${esc(u.id)})</small></div>`).join('')}</div>` : ''}`;
  $('#ms-msg').onclick = () => copy(msg);
  $('#ms-csv').onclick = () => dl('미가입점포.csv', [['부스번호', '점포명', '대표자'], ...m.missing.map(r => [r.no, r.store, r.owner])]);
}

// ---------- 강의별 ----------
function renderLectures() {
  const rows = LECTURES.map(l => { let en = 0, ing = 0, done = 0, sum = 0; D.users.forEach(u => { const r = (u.prog || {})[l.id]; if (!r || !r.enrolled) return; en++; if (r.done) done++; else ing++; sum += r.done ? 100 : lecPct(r); }); return { l, en, ing, done, avg: en ? Math.round(sum / en) : 0 }; });
  $('#pane-lectures').innerHTML = `<div class="ad-tools"><b>강의 ${LECTURES.length}강</b><span class="muted small">영상 연결 ${LECTURES.filter(l => l.yt).length}강 · 나머지는 '영상 준비 중'</span><button class="ad-btn sm ghost" id="lx-csv">강의별 현황 CSV</button></div>
    <div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>강의</th><th>분류</th><th>영상</th><th class="n">신청</th><th class="n">수강 중</th><th class="n">수료</th><th>평균 진도</th></tr></thead><tbody>
    ${rows.map(x => `<tr><td data-l="강의"><b>${esc(x.l.t)}</b></td><td data-l="분류">${esc(x.l.cat)}</td><td data-l="영상">${x.l.yt ? '<em class="tag ok">연결됨</em>' : '<em class="tag">준비 중</em>'}</td><td data-l="신청" class="n">${x.en}</td><td data-l="수강 중" class="n">${x.ing}</td><td data-l="수료" class="n">${x.done}</td><td data-l="평균 진도"><span class="pbar"><i style="width:${x.avg}%"></i></span><small>${x.avg}%</small></td></tr>`).join('')}</tbody></table></div>`;
  $('#lx-csv').onclick = () => dl('강의별현황.csv', [['강의', '분류', '영상', '신청', '수강중', '수료', '평균진도(%)'], ...rows.map(x => [x.l.t, x.l.cat, x.l.yt ? 'https://youtu.be/' + x.l.yt : '준비 중', x.en, x.ing, x.done, x.avg])]);
}

// ---------- 점포 명단 ----------
function renderRoster() {
  const R = roster(); const txt = R.map(r => [r.no, r.store, r.owner].join(', ')).join('\n');
  $('#pane-roster').innerHTML = `<div class="ad-tools"><b>점포 명단 ${R.length}곳</b><span class="muted small">${D.roster && D.roster.length ? '관리자가 저장한 명단' : '기본값: 용마미식거리 참여 부스(1~20번)'} · 미가입 대조 기준</span></div>
    <p class="small muted">한 줄에 한 점포씩 <b>번호, 점포명, 대표자</b> 순서로 적어 주세요. 엑셀에서 세 칸을 복사해 붙여 넣어도 됩니다.</p>
    <textarea id="ro-txt" class="ad-ta" spellcheck="false">${esc(txt)}</textarea>
    <div class="dr-row"><button class="ad-btn" id="ro-save">명단 저장</button><button class="ad-btn ghost" id="ro-def">기본 명단으로 되돌리기</button></div>`;
  $('#ro-save').onclick = async e => {
    const list = $('#ro-txt').value.split('\n').map(l => l.split(/\t|,/).map(x => x.trim())).filter(a => a.join('')).map(a => a.length === 1 ? { no: '', store: a[0], owner: '' } : { no: a[0], store: a[1] || '', owner: a[2] || '' }).filter(r => r.store);
    if (!list.length) { toast('명단이 비어 있어요.'); return; }
    e.target.disabled = true; let r; try { r = await withTimeout(api.saveRoster(list), 20000); } catch (err) { r = { ok: false, msg: '연결이 늦어요.' }; } e.target.disabled = false;
    toast(r.ok ? `명단 ${list.length}곳을 저장했어요.` : r.msg); if (r.ok) { D.roster = list; renderKpis(); renderRoster(); }
  };
  $('#ro-def').onclick = () => { $('#ro-txt').value = DEFAULT_ROSTER.map(r => [r.no, r.store, r.owner].join(', ')).join('\n'); toast('기본 명단을 불러왔어요. 저장을 눌러야 반영돼요.'); };
}

// ---------- 설정·내보내기 ----------
function renderSettings() {
  $('#pane-settings').innerHTML = `<h3>내보내기</h3><div class="dr-row"><button class="ad-btn ghost" id="st-users">회원 명단 CSV</button><button class="ad-btn ghost" id="st-prog">강의별 진도 CSV (회원×강의)</button></div>
    <h3>관리자 비밀번호</h3>${api.server ? '<p class="small muted">자체 서버 모드입니다. 서버의 ADMIN_PW 값으로 관리해요.</p>' : `<p class="small muted">관리자 비밀번호를 바꾸면 이 화면에 들어올 때 새 비밀번호를 써야 해요.</p><div class="dr-row"><input type="password" id="st-pw" placeholder="새 관리자 비밀번호 (8자 이상)" autocomplete="new-password"><input type="password" id="st-pw2" placeholder="한 번 더" autocomplete="new-password"><button class="ad-btn sm" id="st-pw-go">바꾸기</button></div>`}
    <h3>데이터 보관 위치</h3><p class="small">${api.server ? '자체 서버(accounts.json)에 보관 중입니다. 비밀번호는 scrypt 암호화 값만 저장해요.' : '시연 모드: 공개 MQTT 중계 서버에 보관 중입니다. 비밀번호는 PBKDF2 암호화 값만 저장하지만, 실제 운영 전 자체 서버로 옮겨야 해요.'}</p>`;
  $('#st-users').onclick = () => dl('회원명단.csv', [['점포명', '대표자', '아이디', '가입일', '최근접속', '수강신청', '수료', '평균진도(%)', '상태'], ...D.users.map(u => { const s = stat(u); return [u.store, u.owner || u.name, u.id, fmtD(u.at), fmtD(u.last), s.en, s.done, s.avg, u.off ? '이용중지' : '정상']; })]);
  $('#st-prog').onclick = () => dl('강의별진도.csv', [['점포명', '대표자', '아이디', ...LECTURES.map(l => l.t)], ...D.users.map(u => [u.store, u.owner || u.name, u.id, ...LECTURES.map(l => { const r = (u.prog || {})[l.id]; return !r || !r.enrolled ? '' : r.done ? '수료' : lecPct(r) + '%'; })])]);
  if ($('#st-pw-go')) $('#st-pw-go').onclick = async e => { const a = $('#st-pw').value, b = $('#st-pw2').value; if (a !== b) { toast('두 칸이 달라요.'); return; } e.target.disabled = true; const r = await api.changeAdminPw(a).catch(() => ({ ok: false, msg: '바꾸지 못했어요.' })); e.target.disabled = false; toast(r.ok ? '관리자 비밀번호를 바꿨어요.' : r.msg); if (r.ok) $('#st-pw').value = $('#st-pw2').value = ''; };
}
function dl(name, rows) {
  const csv = '﻿' + rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${BRAND.short}_${name}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
window.__adm = { api, get D() { return D; }, reload };
