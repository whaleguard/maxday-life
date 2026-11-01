// 카페·식당 매장 데이터 — 3D 실내, 2D 배치도(예약), 메뉴, 영업시간을 한 곳에서 관리
// 실제 거래처 매장으로 바꿀 때는 이 파일의 테이블 좌표·메뉴·시간만 고치면 3D와 예약 화면이 함께 바뀝니다.

// 테이블: id, zone(구역), x,z(중심, m), w,d(크기), round, cap(최대 인원), chairs: 'z2'(앞뒤 1명씩) 'z4'(앞뒤 2명씩) 'x4' 'sofa' 'bar' 'ring'
export const STORES = {
  cafe: {
    title: '카페', open: '10:00', close: '21:00', step: 30, dur: 90,
    fixtures: [
      { kind: 'counter', label: '주문 카운터', x: -4.6, z: -5.7, w: 4.2, d: 0.9 },
      { kind: 'case', label: '디저트 쇼케이스', x: -1.7, z: -5.7, w: 1.6, d: 0.8 },
      { kind: 'selfbar', label: '셀프바 (물·빨대·냅킨)', x: 1.4, z: -6.5, w: 2.0, d: 0.6 },
      { kind: 'restroom', label: '화장실', x: 6.0, z: -5.8, w: 4.0, d: 2.4 },
      { kind: 'plant', x: -7.3, z: 6.3, w: 0.6, d: 0.6 }, { kind: 'plant', x: 7.3, z: 6.3, w: 0.6, d: 0.6 },
    ],
    windows: 'right',
    tables: [
      { id: '창1', zone: '창가 바', x: 7.35, z: -2.9, w: 0.45, d: 1.5, cap: 2, chairs: 'bar' },
      { id: '창2', zone: '창가 바', x: 7.35, z: -0.9, w: 0.45, d: 1.5, cap: 2, chairs: 'bar' },
      { id: '창3', zone: '창가 바', x: 7.35, z: 1.1, w: 0.45, d: 1.5, cap: 2, chairs: 'bar' },
      { id: '소1', zone: '소파석', x: -6.0, z: -2.2, w: 0.8, d: 1.2, cap: 4, chairs: 'sofa' },
      { id: '소2', zone: '소파석', x: -6.0, z: 1.2, w: 0.8, d: 1.2, cap: 4, chairs: 'sofa' },
      { id: '홀1', zone: '홀', x: -2.6, z: -1.9, w: 0.7, d: 0.7, cap: 2, chairs: 'z2', round: true },
      { id: '홀2', zone: '홀', x: 0.4, z: -1.9, w: 0.7, d: 0.7, cap: 2, chairs: 'z2', round: true },
      { id: '홀3', zone: '홀', x: -2.6, z: 1.0, w: 0.7, d: 0.7, cap: 2, chairs: 'z2', round: true },
      { id: '홀4', zone: '홀', x: 0.4, z: 1.0, w: 0.7, d: 0.7, cap: 2, chairs: 'z2', round: true },
      { id: '홀5', zone: '홀', x: 3.9, z: -1.9, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '홀6', zone: '홀', x: 3.9, z: 1.4, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '단1', zone: '단체석', x: -3.4, z: 4.3, w: 2.6, d: 0.9, cap: 6, chairs: 'z6' },
    ],
    menu: [
      { cat: '커피', items: [['아메리카노', 4500], ['카페라떼', 5000], ['바닐라라떼', 5500], ['콜드브루', 5000], ['플랫화이트', 5500]] },
      { cat: '음료', items: [['말차라떼', 5500], ['자몽에이드', 6000], ['캐모마일 티', 4800], ['딸기 스무디', 6500]] },
      { cat: '디저트', items: [['버터 크루아상', 4000], ['바스크 치즈케이크', 6500], ['티라미수', 7000], ['초코칩 쿠키', 3000]] },
    ],
  },
  restaurant: {
    title: '식당', open: '11:30', close: '21:00', step: 30, dur: 90,
    fixtures: [
      { kind: 'kitchen', label: '오픈 주방', x: 6.0, z: -6.6, w: 6.0, d: 2.8 },
      { kind: 'counter', label: '계산대·포스', x: 6.6, z: 6.5, w: 2.4, d: 0.7 },
      { kind: 'selfbar', label: '셀프바 (반찬·물)', x: 0.6, z: -7.3, w: 2.8, d: 0.6 },
      { kind: 'restroom', label: '화장실', x: -7.5, z: -6.8, w: 3.0, d: 2.4 },
      { kind: 'room', label: '룸', x: -6.75, z: -2.9, w: 4.5, d: 4.4, door: 'right' },
      { kind: 'bench', label: '대기석', x: -7.6, z: 6.9, w: 2.2, d: 0.5 },
      { kind: 'plant', x: 8.4, z: 7.4, w: 0.6, d: 0.6 }, { kind: 'plant', x: -4.2, z: 7.4, w: 0.6, d: 0.6 },
    ],
    windows: 'right',
    tables: [
      { id: '창1', zone: '창가', x: 7.9, z: -3.4, w: 1.0, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '창2', zone: '창가', x: 7.9, z: -0.4, w: 1.0, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '창3', zone: '창가', x: 7.9, z: 2.6, w: 1.0, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '홀1', zone: '홀', x: -2.0, z: -1.8, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '홀2', zone: '홀', x: 1.6, z: -1.8, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '홀3', zone: '홀', x: -2.0, z: 1.6, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '홀4', zone: '홀', x: 1.6, z: 1.6, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '홀5', zone: '홀', x: 4.4, z: 4.2, w: 1.2, d: 0.8, cap: 4, chairs: 'z4' },
      { id: '원1', zone: '원탁(단체)', x: -3.6, z: 5.0, w: 1.5, d: 1.5, cap: 6, chairs: 'ring', round: true },
      { id: '룸1', zone: '룸', x: -6.8, z: -2.9, w: 2.4, d: 1.0, cap: 8, chairs: 'z8' },
    ],
    menu: [
      { cat: '정식', items: [['한우 불고기 정식', 16000], ['제육볶음 정식', 11000], ['고등어구이 정식', 12000]] },
      { cat: '찌개·탕', items: [['된장찌개', 10000], ['김치찌개', 10000], ['갈비탕', 14000]] },
      { cat: '단품·나눔', items: [['돌솥비빔밥', 11000], ['해물파전', 15000], ['수육 보쌈(중)', 32000]] },
      { cat: '추가', items: [['공기밥', 1000], ['음료', 2000]] },
    ],
  },
};

// 의자 위치(테이블 기준) → [x, z, 바라보는 방향 ry]
export function chairsOf(t) {
  const out = []; const { x, z, w, d } = t;
  const face = (cx, cz) => Math.atan2(x - cx, z - cz);
  const push = (cx, cz) => out.push([cx, cz, face(cx, cz)]);
  switch (t.chairs) {
    case 'z2': push(x, z - d / 2 - 0.42); push(x, z + d / 2 + 0.42); break;
    case 'z4': for (const s of [-1, 1]) { push(x - w * 0.25, z + s * (d / 2 + 0.42)); push(x + w * 0.25, z + s * (d / 2 + 0.42)); } break;
    case 'z6': for (const s of [-1, 1]) for (const k of [-1, 0, 1]) push(x + k * w * 0.33, z + s * (d / 2 + 0.42)); break;
    case 'z8': for (const s of [-1, 1]) for (const k of [-1.5, -0.5, 0.5, 1.5]) push(x + k * w * 0.24, z + s * (d / 2 + 0.42)); break;
    case 'ring': for (let i = 0; i < t.cap; i++) { const a = i / t.cap * Math.PI * 2; push(x + Math.cos(a) * (w / 2 + 0.45), z + Math.sin(a) * (w / 2 + 0.45)); } break;
    case 'sofa': for (const k of [-1, 1]) { out.push([x - w / 2 - 0.55, z + k * d * 0.25, Math.PI / 2]); push(x + w / 2 + 0.45, z + k * d * 0.25); } break;
    case 'bar': for (const k of [-1, 1]) out.push([x - 0.55, z + k * d * 0.25, Math.PI / 2]); break;
  }
  return out;
}

export function slotsOf(store) {
  const s = STORES[store]; const [oh, om] = s.open.split(':').map(Number), [ch, cm] = s.close.split(':').map(Number);
  const out = []; for (let m = oh * 60 + om; m <= ch * 60 + cm - s.dur; m += s.step) out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  return out;
}
export const won = n => n.toLocaleString('ko-KR') + '원';

// 포스 연동용 주문서 형식 (포스 API 연결 시 이 객체를 그대로 전송)
export function toPosOrder(r) {
  return {
    type: 'RESERVATION_PREORDER', store: r.store, orderId: r.id, table: r.table, zone: r.zone,
    visitDate: r.date, visitTime: r.time, party: r.size, customer: { name: r.name, phone: r.phone },
    items: r.items.map(([name, price, qty]) => ({ name, price, qty })), total: r.total, memo: r.memo || '', createdAt: r.createdAt,
  };
}
