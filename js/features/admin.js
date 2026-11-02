// 아카데미 관리자: 회원·진도 조회, 비밀번호 재설정, 아이디 변경, 이용 중지, 점포 명단(미가입 대조)
//  - 자체 서버 모드: 서버가 ADMIN_PW로 관리자 판정, 회원 데이터도 서버에서만 읽고 고침 (운영용)
//  - 공개 MQTT 모드(GitHub Pages 시연): 관리자 비밀번호 해시는 브랜드 설정(adminHash) 또는 관리자 화면에서 바꾼 값.
//    회원 기록이 공개 중계 서버에 있으므로 시연용 — 실제 운영은 반드시 자체 서버로
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha(s) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
export async function pbkdf2(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, k, 256));
}
export function tempPassword() { // 헷갈리는 글자(0 O 1 l I) 빼고 10자
  const A = 'abcdefghjkmnpqrstuvwxyz', N = '23456789'; const r = crypto.getRandomValues(new Uint8Array(10));
  let s = ''; for (let i = 0; i < 10; i++) s += i < 6 ? A[r[i] % A.length] : N[r[i] % N.length]; return s;
}

export class AdminApi {
  constructor(net, ns, adminHash) { this.net = net; this.ns = ns; this.defHash = adminHash || ''; this.token = null; this.ok = false; }
  get server() { return this.net.mode !== 'mqtt'; }
  async login(pw) {
    if (this.server) { const r = await this.net.acct('adminLogin', { pw }); if (!r.ok) return { ok: false, msg: r.reason === 'off' ? '서버에 관리자 비밀번호(ADMIN_PW)가 설정되지 않았어요.' : '관리자 비밀번호가 맞지 않아요.' }; this.token = r.token; this.ok = true; return { ok: true }; }
    const ov = await this.net.kvGet('admin');
    const salt = ov?.salt || ('mdl-admin:' + this.ns), want = ov?.hash || this.defHash;
    if (!want) return { ok: false, msg: '관리자 비밀번호가 아직 설정되지 않았어요.' };
    if (await pbkdf2(pw, salt) !== want) { await new Promise(r => setTimeout(r, 700)); return { ok: false, msg: '관리자 비밀번호가 맞지 않아요.' }; }
    this.ok = true; return { ok: true };
  }
  async changeAdminPw(pw) {
    if (this.server) return { ok: false, msg: '서버 모드에서는 서버의 ADMIN_PW 값을 바꿔 주세요.' };
    if (String(pw).length < 8) return { ok: false, msg: '8자 이상으로 정해 주세요.' };
    const salt = hex(crypto.getRandomValues(new Uint8Array(16))); await this.net.kvPut('admin', { salt, hash: await pbkdf2(pw, salt), at: Date.now() }); return { ok: true };
  }
  // 회원 목록 + 진도 + 점포 명단
  async load() {
    if (this.server) {
      const r = await this.net.acct('adminList', { token: this.token }); if (!r.ok) throw new Error(r.reason || 'fail');
      return { users: r.users.map(u => ({ ...u, key: u.id, prog: r.prog[u.id] || {} })), roster: r.roster };
    }
    const [accts, progs, roster] = await Promise.all([this.net.kvList('acct/'), this.net.kvList('prog/'), this.net.kvGet('roster')]);
    const users = Object.entries(accts).map(([key, rec]) => ({ key, rec, id: rec.id || '', name: rec.name || '', store: rec.store || '', owner: rec.owner || rec.name || '', at: rec.at || 0, last: rec.last || rec.at || 0, off: !!rec.off, legacy: !rec.id || !rec.pk, prog: (rec.pk && progs[rec.pk]) || {} }));
    return { users, roster: Array.isArray(roster?.list) ? roster.list : null };
  }
  async setPassword(u, pw) {
    if (String(pw).length < 8) return { ok: false, msg: '비밀번호는 8자 이상이어야 해요.' };
    if (this.server) { const r = await this.net.acct('adminSetPw', { token: this.token, id: u.id, pw }); return r.ok ? { ok: true } : { ok: false, msg: '바꾸지 못했어요.' }; }
    if (!u.rec.pk) return { ok: false, msg: '이전 형식 계정이라 진도 보관 키가 없어요. 회원이 한 번 로그인하면 바꿀 수 있어요.' };
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const rec = { ...u.rec, salt, hash: await pbkdf2(pw, salt), pwAt: Date.now() }; await this.net.kvPut('acct/' + u.key, rec); u.rec = rec; return { ok: true };
  }
  async rename(u, to) {
    to = String(to || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{4,16}$/.test(to)) return { ok: false, msg: '아이디는 영문 소문자·숫자 4~16자예요.' };
    if (this.server) { const r = await this.net.acct('adminRename', { token: this.token, id: u.id, to }); return r.ok ? { ok: true } : { ok: false, msg: r.reason === 'taken' ? '이미 쓰는 아이디예요.' : '바꾸지 못했어요.' }; }
    if (!u.rec.pk) return { ok: false, msg: '이전 형식 계정이라 아이디를 옮길 수 없어요.' };
    const nk = await sha(this.ns + ':' + to); if (await this.net.kvGet('acct/' + nk)) return { ok: false, msg: '이미 쓰는 아이디예요.' };
    await this.net.kvPut('acct/' + nk, { ...u.rec, id: to }); await this.net.kvDel('acct/' + u.key); return { ok: true };
  }
  async edit(u, patch) {
    if (this.server) { const r = await this.net.acct('adminEdit', { token: this.token, id: u.id, ...patch }); return r.ok ? { ok: true } : { ok: false, msg: '저장하지 못했어요.' }; }
    const rec = { ...u.rec, ...patch }; if (patch.owner !== undefined && patch.owner) rec.name = patch.owner;
    await this.net.kvPut('acct/' + u.key, rec); u.rec = rec; return { ok: true };
  }
  async remove(u) {
    if (this.server) { const r = await this.net.acct('adminDelete', { token: this.token, id: u.id }); return r.ok ? { ok: true } : { ok: false, msg: '삭제하지 못했어요.' }; }
    await this.net.kvDel('acct/' + u.key); if (u.rec.pk) await this.net.kvDel('prog/' + u.rec.pk); return { ok: true };
  }
  async saveRoster(list) {
    if (this.server) { const r = await this.net.acct('adminRoster', { token: this.token, roster: list }); return r.ok ? { ok: true } : { ok: false, msg: '저장하지 못했어요.' }; }
    await this.net.kvPut('roster', { list, at: Date.now() }); return { ok: true };
  }
}

// 진도 계산 (account.js 와 같은 기준: 실제로 본 구간 합 ÷ 영상 길이, 90% 이상 = 수료)
export function lecPct(r) { if (!r || !r.dur) return 0; const w = (r.seen || []).reduce((s, [a, b]) => s + (b - a), 0); return Math.min(100, Math.round(w / r.dur * 100)); }
export const normStore = s => String(s || '').replace(/\s|\(.*?\)|[·.\-_]/g, '').toLowerCase();
