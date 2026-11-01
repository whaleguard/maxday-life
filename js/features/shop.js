// 공간별 샵 + 공덕 포인트
// 1차: 공간에 머물거나 기도·절·염주·촛불로 쌓이는 포인트로 구매 (이 기기에만 저장)
// 결제 연동 시: PAYMENT.enabled = true 와 checkout() 만 구현하면 원화 결제로 전환
import { OUTFITS, HAND_ITEMS } from '../character.js';

export const PAYMENT = { enabled: false };
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

export const CATALOG = {
  temple: [
    { id: 'o:monk', type: 'outfit', ref: 'monk', price: 0, note: '기본 승복' },
    { id: 'o:monkBrown', type: 'outfit', ref: 'monkBrown', price: 60 },
    { id: 'o:hanbokBlue', type: 'outfit', ref: 'hanbokBlue', price: 90 },
    { id: 'o:hanbokPink', type: 'outfit', ref: 'hanbokPink', price: 90 },
    { id: 'h:beads', type: 'hand', ref: 'beads', price: 20 },
    { id: 'h:moktak', type: 'hand', ref: 'moktak', price: 40 },
    { id: 'h:lantern', type: 'hand', ref: 'lantern', price: 30 },
    { id: 'h:lotus', type: 'hand', ref: 'lotus', price: 25 },
  ],
  church: [
    { id: 'o:suitNavy', type: 'outfit', ref: 'suitNavy', price: 80 },
    { id: 'o:suitGray', type: 'outfit', ref: 'suitGray', price: 80 },
    { id: 'o:cardigan', type: 'outfit', ref: 'cardigan', price: 50 },
    { id: 'o:hanbokBlue', type: 'outfit', ref: 'hanbokBlue', price: 90 },
    { id: 'h:bible', type: 'hand', ref: 'bible', price: 20 },
    { id: 'h:hymnal', type: 'hand', ref: 'hymnal', price: 20 },
    { id: 'h:candle', type: 'hand', ref: 'candle', price: 15 },
  ],
  cathedral: [
    { id: 'o:suitNavy', type: 'outfit', ref: 'suitNavy', price: 80 },
    { id: 'o:cardigan', type: 'outfit', ref: 'cardigan', price: 50 },
    { id: 'o:hanbokPink', type: 'outfit', ref: 'hanbokPink', price: 90 },
    { id: 'h:rosary', type: 'hand', ref: 'rosary', price: 25 },
    { id: 'h:bible', type: 'hand', ref: 'bible', price: 20 },
    { id: 'h:candle', type: 'hand', ref: 'candle', price: 15 },
  ],
};
export function itemName(it) { return it.type === 'outfit' ? OUTFITS[it.ref].name : HAND_ITEMS[it.ref]; }

export const Points = {
  get() { return +(ls.get('mdl_pts') || 0); },
  add(n, why) { const v = Points.get() + n; ls.set('mdl_pts', String(v)); Points.onChange && Points.onChange(v, n, why); return v; },
  spend(n) { const v = Points.get(); if (v < n) return false; ls.set('mdl_pts', String(v - n)); Points.onChange && Points.onChange(v - n, -n); return true; },
  daily() { const d = new Date().toDateString(); if (ls.get('mdl_daily') === d) return false; ls.set('mdl_daily', d); Points.add(30, '오늘 첫 방문'); return true; },
};
export const Owned = {
  list() { try { return JSON.parse(ls.get('mdl_owned') || '["o:monk"]'); } catch (e) { return ['o:monk']; } },
  has(id) { return Owned.list().includes(id) || id === 'o:monk'; },
  add(id) { const l = Owned.list(); if (!l.includes(id)) { l.push(id); ls.set('mdl_owned', JSON.stringify(l)); } },
};
export const Wear = {
  get() { try { return JSON.parse(ls.get('mdl_wear') || '{}'); } catch (e) { return {}; } },
  set(p) { const w = { ...Wear.get(), ...p }; ls.set('mdl_wear', JSON.stringify(w)); return w; },
};
