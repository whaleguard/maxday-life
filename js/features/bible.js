// 성경 말씀 검색 — 성경전서 개역한글판(대한성서공회, 1961, 저작재산권 만료)
// 데이터: data/bible/index.json(권·장 정보) + data/bible/{권}.json(장별 절) + all.txt(단어 검색용, 필요할 때만 불러옴)
const $ = s => document.querySelector(s);
let INDEX = null; const books = new Map(); let ALL = null;

const TODAY = [ // 오늘의 말씀 후보 [권, 장, 절]
  [42, 3, 16], [18, 23, 1], [49, 4, 13], [39, 11, 28], [44, 8, 28], [22, 41, 10], [19, 3, 5], [45, 13, 4], [18, 46, 1], [49, 4, 6], [42, 14, 27], [57, 11, 1], [18, 119, 105], [39, 6, 33], [22, 40, 31], [51, 5, 16],
];

async function loadIndex() { if (!INDEX) INDEX = await (await fetch('data/bible/index.json')).json(); return INDEX; }
async function loadBook(i) { if (!books.has(i)) books.set(i, await (await fetch(`data/bible/${i}.json`)).json()); return books.get(i); }
async function loadAll() { if (!ALL) { const t = await (await fetch('data/bible/all.txt')).text(); ALL = t.split('\n'); } return ALL; }

function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export async function openBible() {
  $('#modal-bible').hidden = false;
  const idx = await loadIndex();
  const sel = $('#bb-book');
  if (!sel.options.length) {
    const og = (label, nt) => { const g = document.createElement('optgroup'); g.label = label; idx.filter(b => b.nt === nt).forEach(b => { const o = document.createElement('option'); o.value = b.id; o.textContent = b.ko; g.appendChild(o); }); sel.appendChild(g); };
    og('구약', false); og('신약', true);
    sel.onchange = () => { fillChapters(); showChapter(); };
    $('#bb-ch').onchange = showChapter;
    $('#bb-search').onsubmit = e => { e.preventDefault(); search($('#bb-q').value); };
    $('#bb-today').onclick = today;
    $('#bb-prev').onclick = () => step(-1); $('#bb-next').onclick = () => step(1);
    sel.value = 42; fillChapters(); $('#bb-ch').value = 3;
  }
  if (!$('#bb-out').dataset.loaded) { await today(); $('#bb-out').dataset.loaded = '1'; }
}
function fillChapters() {
  const b = INDEX[+$('#bb-book').value]; const ch = $('#bb-ch'); ch.innerHTML = '';
  b.ch.forEach((n, i) => { const o = document.createElement('option'); o.value = i + 1; o.textContent = `${i + 1}${b.ko === '시편' ? '편' : '장'}`; ch.appendChild(o); });
}
async function showChapter(highlight) {
  const bi = +$('#bb-book').value, c = +$('#bb-ch').value; const b = INDEX[bi];
  const data = await loadBook(bi); const vs = data[c - 1] || [];
  $('#bb-title').textContent = `${b.ko} ${c}${b.ko === '시편' ? '편' : '장'}`;
  $('#bb-out').innerHTML = vs.map((t, i) => `<p class="v${highlight === i + 1 ? ' hi' : ''}" id="bv${i + 1}"><sup>${i + 1}</sup>${esc(t)}</p>`).join('');
  if (highlight) { const el = document.getElementById('bv' + highlight); el && el.scrollIntoView({ block: 'center' }); } else $('#bb-out').scrollTop = 0;
}
function step(d) {
  const sel = $('#bb-ch'); let c = +sel.value + d; let bi = +$('#bb-book').value;
  if (c < 1) { if (bi === 0) return; bi--; $('#bb-book').value = bi; fillChapters(); c = INDEX[bi].ch.length; }
  else if (c > INDEX[bi].ch.length) { if (bi === 65) return; bi++; $('#bb-book').value = bi; fillChapters(); c = 1; }
  sel.value = c; showChapter();
}
async function jump(bi, c, v) { $('#bb-book').value = bi; fillChapters(); $('#bb-ch').value = c; await showChapter(v); }
async function today() {
  const d = new Date(); const k = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % TODAY.length;
  const [bi, c, v] = TODAY[k]; const data = await loadBook(bi);
  $('#bb-verse').innerHTML = `<b>오늘의 말씀</b><span>“${esc(data[c - 1][v - 1])}”</span><em>${INDEX[bi].ko} ${c}:${v}</em>`;
  await jump(bi, c, v);
}
// "요 3:16", "요한복음 3장 16절", "시 23" 형식 → 바로 이동, 아니면 본문 단어 검색
async function search(q) {
  q = q.trim(); if (!q) return;
  const m = q.replace(/\s+/g, ' ').match(/^([가-힣0-9]+)\s*(\d+)\s*(?:장|편)?\s*[:：.]?\s*(\d+)?\s*절?$/);
  if (m) {
    const name = m[1]; const b = INDEX.find(x => x.ko === name || x.ab === name || x.ko.startsWith(name));
    if (b) { const c = Math.min(+m[2], b.ch.length); return jump(b.id, c, m[3] ? +m[3] : undefined); }
  }
  $('#bb-title').textContent = `“${q}” 찾는 중…`; $('#bb-out').innerHTML = '';
  const all = await loadAll(); const words = q.split(' ').filter(Boolean); const res = [];
  for (const line of all) { const p = line.split('|'); const t = p.slice(3).join('|'); if (words.every(w => t.includes(w))) { res.push(p); if (res.length >= 200) break; } }
  $('#bb-title').textContent = `“${q}” 검색 결과 ${res.length >= 200 ? '200+' : res.length}건`;
  const mark = t => { let h = esc(t); words.forEach(w => { h = h.split(esc(w)).join(`<mark>${esc(w)}</mark>`); }); return h; };
  $('#bb-out').innerHTML = res.length ? res.map(([bi, c, v, ...t]) => `<p class="v res" data-j="${bi},${c},${v}"><b>${INDEX[+bi].ab} ${c}:${v}</b> ${mark(t.join('|'))}</p>`).join('') : '<p class="muted">찾는 구절이 없어요. 다른 단어로 찾아보세요.</p>';
  $('#bb-out').querySelectorAll('.res').forEach(p => p.onclick = () => { const [bi, c, v] = p.dataset.j.split(',').map(Number); jump(bi, c, v); });
}
