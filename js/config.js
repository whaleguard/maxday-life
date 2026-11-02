// 맥스데이 라이프 — 디자인 기준 v1.1 (GPT 확정) + v1.2 추가(놀이터·기계·트리·다도실/카페)
// 단위: m, Y 위쪽, 내부는 방 중심 바닥 (0,0,0), 중심 시설은 −Z

// 브랜드: 거래처별 페이지에서 window.MDL_BRAND 로 이름·로고·실시간 공간(ns)을 바꿔 같은 공간을 재사용
const _B = (typeof window !== 'undefined' && window.MDL_BRAND) || {};
export const BRAND = { ko: _B.ko || '맥스데이 라이프', en: _B.en || 'MAX DAY LIFE', short: _B.short || '맥스데이', logo: _B.logo || 'assets/logo.png', title: _B.title || '온라인 기도공간', videos: _B.videos || {}, cinema: !!_B.cinema, drivein: _B.drivein !== false, sister: _B.sister || null };
const S = BRAND.short;

export const COLORS = { base: '#15272B', panel: '#F4F0E7', accent: '#C9AE73', ink: '#233335' };

export const DEMO_URL = 'https://mapinlife.store/demo/?p=';

// 키오스크 프로그램 (mapinlife.store/demo 코드)
export const PROGRAMS = {
  unse: { name: '운세향', sub: '띠 · 별자리 · 이달 총운', kind: 'fortune' },
  lucky: { name: '오늘의 행운 뽑기', sub: '제비뽑기 · 포춘쿠키 · 이달의 꽃', kind: 'fortune' },
  tarot: { name: '별빛 타로', sub: '카드 세 장이 들려주는 오늘의 이야기', kind: 'fortune' },
  seonnyeo: { name: '운세 뽑는 선녀', sub: '복주머니에서 뽑는 열두 가지 운', kind: 'fortune' },
  raon: { name: '라온선녀의 운세', sub: '열두 가지 운을 하나씩 깊이', kind: 'fortune' },
  gwansang: { name: '나읽기', sub: '사주와 얼굴로 나를 읽다', kind: 'fortune' },
  seven: { name: '7초를 잡아라!', sub: '7.777초에 멈추면 행운이', kind: 'game' },
  arcade: { name: '터치 챌린지', sub: '기억력·두더지·순발력 랭킹 도전', kind: 'game' },
  iq: { name: 'IQ 퍼즐 챌린지', sub: '도형·수열·성냥개비 10문제', kind: 'game' },
  fairytale: { name: '동화 키오스크', sub: '우리 아이가 주인공인 동화책', kind: 'kids' },
  engword: { name: '영어 단어 퀴즈', sub: '그림 보고 영어 단어 맞히기', kind: 'kids' },
  spelling: { name: '받아쓰기·맞춤법', sub: '맞춤법 10문제, 달인 상장', kind: 'kids' },
  funtest: { name: '재미 테스트', sub: '3분이면 나를 알아요', kind: 'kids' },
  gacha: { name: '랜덤박스', sub: '무료 행운 소품 뽑기', kind: 'gacha' },
};

export const SPACES = {
  temple: {
    key: 'temple', name: S + '사', desc: '불교 법당', btn: '절로 가기', short: '절',
    room: { w: 14, d: 16, h: 6.6 },
    floor: '#846044', wall: '#D8C7A6', ceil: '#624735',
    sun: ['#FFD9A3', 1.8], amb: ['#D7C3A6', 0.75], spawn: [0, 0, 6.8],
    seatType: 'cushion', seatColor: '#9A8160',
    seatX: [-2.5, -1.2, 1.2, 2.5], seatZ: [-1.8, -0.2, 1.4, 3.0, 4.6],
    actions: ['palms', 'bow'], outfit: 'robe', music: 'temple',
  },
  church: {
    key: 'church', name: S + '교회', desc: '개신교 예배당', btn: '교회로 가기', short: '교회',
    room: { w: 14, d: 18, h: 7 },
    floor: '#A58664', wall: '#EEE6D5', ceil: '#D9CBB7',
    sun: ['#FFF0CF', 2.0], amb: ['#E8DDC6', 0.85], spawn: [0, 0, 7.8],
    seatType: 'chair', seatColor: '#89664A',
    seatX: [-2.6, -1.3, 1.3, 2.6], seatZ: [-2.8, -0.9, 1.0, 2.9, 4.8],
    actions: ['pray'], outfit: 'casual', music: 'church',
  },
  cathedral: {
    key: 'cathedral', name: S + '성당', desc: '천주교 성당', btn: '성당으로 가기', short: '성당',
    room: { w: 16, d: 20, h: 9 },
    floor: '#B8B3A8', wall: '#CFC7B8', ceil: '#AFA99E',
    sun: ['#E2E8FF', 1.6], amb: ['#BFC9DC', 0.8], spawn: [0, 0, 8.8],
    seatType: 'pew', seatColor: '#73563F',
    seatX: [-2.7, -1.3, 1.3, 2.7], seatZ: [-3, -1, 1, 3, 5],
    actions: ['pray'], outfit: 'casual', music: 'cathedral',
    candles: { table: [5.8, 0, 6.3], size: [1.8, 0.9, 0.8], rows: 4, cols: 6, dx: 0.26, dz: 0.18, access: [4.5, 0, 6.3], ttlMin: 10 },
  },
  playground: {
    key: 'playground', name: S + ' 놀이터', desc: '운세·뽑기·놀이방', btn: '놀이터로 가기', short: '놀이터',
    room: { w: 24, d: 22, h: 5.5 },
    floor: '#DCCFB8', aisle: '#EEE5D5', wall: '#F2E8D7', ceil: '#E4D8C2',
    sun: ['#FFF0D0', 2.0], amb: ['#DCE8E3', 0.9], spawn: [0, 0, 9.5],
    seatType: 'bench', seatColor: '#A17C58',
    actions: [], outfit: 'casual', music: 'playground',
  },
};

export const SPACE_ORDER = ['temple', 'church', 'cathedral', 'playground'];

export const ROOM_CAPACITY = 20;

export const CHARACTER = {
  skin: ['#DDB18D', '#F0CCAA', '#AE7959'],
  hair: '#493B35',
  robe: [['#909D9E', '#736653'], ['#B7A58C', '#736653']],
  casual: [['#D2B887', '#5C6570'], ['#8FA89B', '#626057'], ['#B3939C', '#555F72']],
  walkSpeed: 1.6,
};

// 손님 이름 (GPT v1.1)
export const NAME_ADJ = ['고요한', '따뜻한', '잔잔한', '포근한', '맑은', '은은한', '다정한', '온화한', '느긋한', '부드러운', '편안한', '반짝이는'];
export const NAME_NOUN = ['등불', '바람', '구름', '나무', '이슬', '별빛', '물결', '햇살', '달빛', '풀잎', '숲', '샘물'];

export const TEXT = {
  loading: '조용한 공간을 준비하고 있어요.',
  joining: '자리를 살펴보고 있어요.',
  reconnecting: '연결이 잠시 끊겼어요. 다시 연결하고 있어요.',
  failed: '연결하지 못했어요. 다시 시도해 주세요.',
  full: '이 공간의 자리가 모두 찼어요. 다른 방을 안내해 드릴게요.',
  taken: '다른 분이 먼저 앉으셨어요. 다른 자리를 골라주세요.',
};

// 실시간 연결 설정
// 1) 자체 서버(권장, 서버 권한 판정): ?server=wss://도메인/ws 또는 아래 WS_SERVER 값
// 2) 서버가 없으면 공개 MQTT 중계(테스트용, 브로커 순서 기준 판정)
export const WS_SERVER = '';
export const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081',
];
export const MQTT_NS = _B.ns || 'maxdaylife/v1';

// v1.2 — 정원 4번째 갈래 + 정원 기계
export const GARDEN = {
  ground: [40, 36], groundColor: '#586951', path: '#C8B79D', pathEdge: '#8A8879',
  sky: ['#29364F', '#956F82', '#E8BC94'], fog: ['#B6A0A0', 38, 75],
  sun: ['#FFE0B0', 2.4, [-12, 18, 10]], amb: ['#B8C7DE', 0.8],
  cam: { pos: [0, 23, 34], look: [0, 1, 1], minHalf: 14, wideHalf: 20 },
  buildings: {
    temple: { c: [-10, -3], size: [6.8, 7, 5.4] },
    church: { c: [0, -5], size: [6, 8, 7] },
    cathedral: { c: [10, -3], size: [6.8, 8, 8.6] },
    playground: { c: [12, 9], size: [8, 8, 4.6] },
  },
  trees: [[-15, 6], [-15, -7], [-6, -10], [6, -11], [15, -7], [18, 5], [-6, 10], [5, 16]],
  machines: [
    { prog: 'unse', x: -3.8, z: 9, color: '#B99BCB' },
    { prog: 'lucky', x: -3.8, z: 12, color: '#E6C46D' },
    { prog: 'tarot', x: 3.8, z: 9, color: '#9496D4' },
    { prog: 'seonnyeo', x: 3.8, z: 12, color: '#87BDB5' },
  ],
};

export const BUTTON_STYLE = {
  temple: { bg: '#E7DDC9', fg: '#354A3D', bd: '#A59B7C', hv: '#D9CCB0' },
  church: { bg: '#DFE9E4', fg: '#31524C', bd: '#8FA99F', hv: '#CBDDD4' },
  cathedral: { bg: '#E4E4EE', fg: '#414A68', bd: '#999FB6', hv: '#D1D4E5' },
  playground: { bg: '#F2DFC1', fg: '#684C32', bd: '#C6A073', hv: '#E9CFA9' },
};

// v1.2 — 놀이터 내부
export const PLAYGROUND = {
  machines: [
    { prog: 'unse', x: -8, z: -8.8, face: 0, color: '#B99BCB' },
    { prog: 'lucky', x: -4.8, z: -8.8, face: 0, color: '#E6C46D' },
    { prog: 'tarot', x: -1.6, z: -8.8, face: 0, color: '#9496D4' },
    { prog: 'seonnyeo', x: 1.6, z: -8.8, face: 0, color: '#87BDB5' },
    { prog: 'raon', x: 4.8, z: -8.8, face: 0, color: '#DDA7B7' },
    { prog: 'gwansang', x: 8, z: -8.8, face: 0, color: '#9DB3CD' },
    { prog: 'seven', x: -10.3, z: -3.5, face: 1, color: '#E9A26D' },
    { prog: 'arcade', x: -10.3, z: 0, face: 1, color: '#78B8BD' },
    { prog: 'iq', x: -10.3, z: 3.5, face: 1, color: '#ACA0D2' },
    { prog: 'gacha', id: 'gachaA', x: 10.3, z: -7, face: -1, color: '#D98C7D', type: 'gacha' },
    { prog: 'gacha', id: 'gachaB', x: 10.3, z: -4, face: -1, color: '#78B7AD', type: 'gacha' },
    { prog: 'fairytale', x: 3.5, z: 0.5, face: 0, color: '#E7B88A', type: 'kids' },
    { prog: 'engword', x: 5.5, z: 0.5, face: 0, color: '#8DBDD7', type: 'kids' },
    { prog: 'spelling', x: 7.5, z: 0.5, face: 0, color: '#A2C89B', type: 'kids' },
    { prog: 'funtest', x: 9.5, z: 0.5, face: 0, color: '#D7A7CA', type: 'kids' },
  ],
  mat: { c: [6.5, 3.5], size: [9, 10], colors: ['#F1CE79', '#A8D6CA', '#B8D4EB', '#E8B8C5'] },
  fence: '#EADFC7',
  benches: [[-5.5, 2], [-5.5, 5], [-5.5, 8]],
};
export const TEMPLE_MACHINE = { prog: 'lucky', x: -5.5, z: 6.4, face: 0, color: '#E6C46D' };

export const XMAS_TREE = {
  church: { x: -5.3, z: -6.3, h: 2.8, r: 0.85, balls: 12, ballR: 0.055, star: 0.28, lights: 16 },
  cathedral: { x: 5.7, z: -6.8, h: 3.4, r: 1.0, balls: 18, ballR: 0.065, star: 0.34, lights: 24 },
  leaf: ['#315D4C', '#42735B', '#56836A'], trunk: '#70523B', pot: '#B39A76',
  deco: ['#DDBB68', '#F3E6C5', '#AC625A'], bulb: '#FFE0A0',
};

// v1.2 — 무료 랜덤박스
export const GACHA = {
  tiers: [
    { key: 'common', name: '일반', p: 0.60, color: '#A6B7AD' },
    { key: 'special', name: '특별', p: 0.25, color: '#78B7C2' },
    { key: 'rare', name: '희귀', p: 0.12, color: '#AE91CD' },
    { key: 'legend', name: '전설', p: 0.03, color: '#DBB65F' },
  ],
  items: [
    { id: 'sprout', tier: 'common', name: '새싹 머리핀', c: ['#8DB776'] },
    { id: 'acorn', tier: 'common', name: '도토리 모자', c: ['#B58A5B'] },
    { id: 'flower', tier: 'common', name: '하얀 꽃핀', c: ['#F4EEDC', '#E3BD67'] },
    { id: 'beret', tier: 'special', name: '포근한 베레모', c: ['#BA8F90'] },
    { id: 'bunny', tier: 'special', name: '토끼 귀', c: ['#EDE2CC', '#D9ADAB'] },
    { id: 'cloud', tier: 'special', name: '구름 모자', c: ['#DCE8ED'] },
    { id: 'moon', tier: 'rare', name: '초승달 장식', c: ['#E8C879'] },
    { id: 'antenna', tier: 'rare', name: '별 안테나', c: ['#BDA1DB', '#F2D383'] },
    { id: 'planet', tier: 'rare', name: '작은 행성', c: ['#8DB8C9', '#E5CCA0'] },
    { id: 'crown', tier: 'legend', name: '금빛 왕관', c: ['#DAB45E', '#7BAEB0'] },
    { id: 'ribbon', tier: 'legend', name: '오로라 리본', c: ['#8BCBC1', '#B7A0D8'] },
    { id: 'tiara', tier: 'legend', name: '은하 티아라', c: ['#A9BAD8', '#E9D49A'] },
  ],
  animSec: 2, cooldownSec: 3,
};

// v1.3 — 다도실(절) / 카페 코너(교회·성당): 같은 내부 공간의 옆 구역 (휴게 좌석은 정원 20명과 별도)
export const ANNEX = {
  temple: {
    kind: 'tea', name: '다도실', side: 1, x0: 7, x1: 13, floor: '#B39772', wall: '#E0D1B7', wood: '#826245', border: '#8C7152',
    light: ['#FFDDB0', 0.45, [10, 3, 0]], camX: 3, minW: 24,
    tables: [[10, -2.5], [10, 2]], table: { w: 1.6, d: 1.0, h: 0.32, round: false },
    seatOffsets: [[-1.2, 0], [1.2, 0], [0, -1.05], [0, 1.05]], seat: { type: 'cushion', size: 0.65, color: '#8D9A7A' },
    cabinet: { c: [10, -6.4], size: [2.4, 0.6, 0.85], color: '#806044' },
    plants: [[12, 5.8], [12, -6.5]], action: 'tea', actionLabel: '차 마시기', drinkSec: 3.2,
  },
  church: {
    kind: 'cafe', name: '카페', side: 1, x0: 7, x1: 13, floor: '#CCB699', wall: '#EFE4D2', wood: '#947252', border: '#AC957A',
    light: ['#FFE8C5', 0.4, [10, 3, 0]], camX: 3, minW: 24,
    tables: [[10, -4], [10, 0], [10, 4]], table: { r: 0.5, h: 0.68, round: true },
    seatOffsets: [[-1.15, 0], [1.15, 0]], seat: { type: 'chair', w: 0.55, d: 0.55, h: 0.36, color: '#9A785A' },
    counter: { c: [10, -7.4], size: [3.6, 0.75, 0.9] }, plants: [[12, 6.8], [12, -7.5]], action: 'coffee', actionLabel: '커피 마시기', drinkSec: 2.8,
  },
  cathedral: {
    kind: 'cafe', name: '카페', side: -1, x0: -14, x1: -8, floor: '#D6C8B7', wall: '#EBE2D6', wood: '#947252', border: '#AC957A',
    light: ['#FFE8C5', 0.4, [-11, 3, 0]], camX: -3, minW: 26,
    tables: [[-11, -4], [-11, 0], [-11, 4]], table: { r: 0.5, h: 0.68, round: true },
    seatOffsets: [[-1.15, 0], [1.15, 0]], seat: { type: 'chair', w: 0.55, d: 0.55, h: 0.36, color: '#9A785A' },
    counter: { c: [-11, -8.4], size: [3.6, 0.75, 0.9] }, plants: [[-13, 7.8], [-13, -8.5]], action: 'coffee', actionLabel: '커피 마시기', drinkSec: 2.8,
  },
  door: { z0: 4.3, z1: 6.7, h: 2.3 }, partition: { h: 0.85, t: 0.12 },
};

// v2 — 카페·식당 (지도에 별도 건물): 3D로 미리 둘러보기 + 자리 예약 + 미리 주문 (포스 연동 준비)
SPACES.cafe = {
  key: 'cafe', name: S + ' 카페', desc: '카페 · 자리 예약', btn: '카페 가기', short: '카페',
  room: { w: 16, d: 14, h: 4.2 }, floor: '#C9A27A', wall: '#F2EADB', ceil: '#E9DFCC',
  sun: ['#FFF1D6', 2.0], amb: ['#F2E6D2', 0.95], spawn: [0, 0, 6.2],
  actions: [], outfit: 'casual', music: 'cafe',
};
SPACES.restaurant = {
  key: 'restaurant', name: S + ' 식당', desc: '한식당 · 자리 예약', btn: '식당 가기', short: '식당',
  room: { w: 18, d: 16, h: 4.4 }, floor: '#8E6A4E', wall: '#EFE6D6', ceil: '#E6DAC6',
  sun: ['#FFEBC8', 1.9], amb: ['#EADCC6', 0.9], spawn: [0, 0, 7.2],
  actions: [], outfit: 'casual', music: 'cafe',
};
SPACE_ORDER.push('cafe', 'restaurant');
BUTTON_STYLE.cafe = { bg: '#EFE2D0', fg: '#5B3F2A', bd: '#B8956F', hv: '#E5D2B9' };
BUTTON_STYLE.restaurant = { bg: '#F1DCD3', fg: '#6B2F25', bd: '#C08A77', hv: '#E8C9BC' };

// 스크린 기본 영상 (유튜브 공식 채널 공개 영상을 '퍼가기'로 재생 — 거래처별로 BRAND.videos 로 교체)
export const VIDEOS = {
  church: 'G4ymZxboVXY',     // CBS설교 · 말씀과 함께
  cathedral: 'J6IkJIGFFu0',  // cpbcTV 매일미사
  cafe: 'MYPVQccHhAQ',       // Relaxing Jazz Piano · 카페 재즈
  restaurant: 'yGzw1n5GudU', // 햄지 · 한식 백반
  stage: 'hn7LUXKaQ3o',      // 용마미식거리 현장 (JY Enter)
  drivein: '',               // 맥스데이 라이프카드 영상 링크를 넣으면 지도 스크린에서 바로 재생 (비어 있으면 자체 홍보 영상)
};

// v3 — 거래처 확장 공간 (window.MDL_BRAND.extra 로 켬): 야시장 먹거리 골목 + 게임장
// 용마미식거리 실제 매대 명단(2026yongma.com 「매대운영자명단 최종본」·「부스 배치도(최종)」, 개인정보 제외)
export const STREET = {
  name: _B.streetName || '용마미식거리', place: _B.streetPlace || '강릉 포남동 용마거리',
  hours: '매주 금·토 17:00~22:00', season: '2026. 10. 9. ~ 11. 14.',
  map: 'https://map.naver.com/p/search/%EA%B0%95%EB%A6%89%20%ED%8F%AC%EB%82%A81%EB%8F%99%EC%A3%BC%EB%AF%BC%EC%84%BC%ED%84%B0',
  site: _B.streetSite || 'https://2026yongma.com/',
  food: [
    [1, '다원잔기지떡', '잔기지떡 · 커피약과 · 커피건빵 · 식혜', '8,000원대', '포남동'],
    [2, '정동청과', '과일', '10,000원', '포남동'],
    [3, '하루곱창', '찐만두 · 튀김만두 · 곱창구이', '10,000 / 10,000 / 15,000원', '포남동'],
    [4, '만양맛값', '자연산 골뱅이숙회', '10,000원', '포남동'],
    [5, '두루두루삼겹', '냉삼 · 제육볶음', '10,000 / 8,000원', '포남동'],
    [6, '신촌장칼국수', '찐만두', '10,000원', '포남동'],
    [7, '인생포차', '오뎅 · 제육볶음', '2,000원~', '포남동'],
    [8, '정희이모', '커피 · 생맥주 · 기타', '3,000~5,000원', '포남동'],
    [9, '강릉사랑로컬푸드', '두부', '10,000원', '포남동'],
    [10, '유명참숯화로구이', '소불고기 핫도그 · 롱소시지 핫도그', '5,000원', '포남동'],
    [11, '보경카페', '한방차', '8,000원대', '포남동'],
    [12, '갤러리소풍', '새우부추전', '10,000원', '포남동'],
    [13, '다래 1 (스트릿 철판명가)', '팟타이 · 문어꼬치', '8,000 / 5,000원', '강릉시'],
    [14, '다래 2 (희양양 양꼬치)', '양꼬치 · 막창꼬치 · 고급양갈비', '6,000~10,000 / 5,000 / 8,000원', '강릉시'],
    [15, '포항물회', '육회컵물회 · 고추잡채', '9,000 / 6,000원', '강릉시'],
    [16, '강릉크로와상붕어빵', '월화달빵', '3,000원', '강릉시'],
  ],
  market: [
    [17, '시마', '잡화', '5,000~100,000원', '포남동'],
    [18, '메이드노리터', '수공예 실버 액세서리 · 은반지 만들기 체험', '10,000원~', '강릉시'],
    [19, '와글와글', '3D 출력물 클리커·키캡 · 수제 말랑이', '2,000원~', '강릉시'],
    [20, '실버moon', '실버·써지컬 주얼리', '5,000원~', '강릉시'],
  ],
  // 어서와존 K-미식벨트 (농식품부 연계 강릉 향토음식 — 공식 사이트 소개 기준, 가격은 현장 확인)
  kbelt: [
    [21, '어서와존 · 초당두부', '초당순두부 · 두부 요리', '현장 가격', 'K-미식벨트'],
    [22, '어서와존 · 감자옹심이', '감자옹심이 · 옹심이 빚기 체험', '현장 가격', 'K-미식벨트'],
    [23, '어서와존 · 강릉짬뽕', '동해 해산물 강릉식 짬뽕', '현장 가격', 'K-미식벨트'],
    [24, '어서와존 · 강릉커피', '강릉 로스터리 커피 · 로스팅 체험', '현장 가격', 'K-미식벨트'],
  ],
  shops: ['강릉한우마크나인', '포남보양탕', '만양맛값', '두루두루삼겹', '하루곱창', '인생포차', '신촌장칼국수', '갤러리소풍', '보경카페', '포남1동 행정복지센터'],
  local: [['초당두부', '바닷물로 간을 맞추는 강릉 대표 향토음식'], ['감자옹심이', '강원도 감자를 갈아 빚은 옹심이'], ['강릉짬뽕', '동해 해산물을 넣는 강릉식 짬뽕'], ['강릉커피', '커피의 도시 강릉의 한 잔']],
};
export const EXTRA = (_B.extra || []);
if (EXTRA.includes('foodstreet')) {
  SPACES.foodstreet = {
    key: 'foodstreet', name: STREET.name, desc: '야시장 먹거리 골목', btn: '골목 가기', short: '골목', outdoor: true,
    room: { w: 46, d: 46, h: 8 }, floor: '#3d3f45', wall: '#2a2c33', ceil: '#0E1F4D',
    sun: ['#9fb0e8', 0.5], amb: ['#6f7fb8', 0.6], spawn: [0, 0, 14],
    actions: [], outfit: 'casual', music: 'street',
  };
  SPACE_ORDER.push('foodstreet');
  BUTTON_STYLE.foodstreet = { bg: '#FFE1C2', fg: '#7A2E0E', bd: '#E7883A', hv: '#FFD0A3' };
}
if (EXTRA.includes('arcade')) {
  SPACES.arcade = {
    key: 'arcade', name: S + ' 게임장', desc: '게임·뽑기·포토부스', btn: '게임장 가기', short: '게임장',
    room: { w: 20, d: 16, h: 4.6 }, floor: '#2b2340', wall: '#2f2a45', ceil: '#1d1830',
    sun: ['#c8b8ff', 0.9], amb: ['#9a8fd0', 0.75], spawn: [0, 0, 7],
    actions: [], outfit: 'casual', music: 'arcade',
  };
  SPACE_ORDER.push('arcade');
  BUTTON_STYLE.arcade = { bg: '#E6DEFF', fg: '#3B2A7A', bd: '#9C88E0', hv: '#D7CBFF' };
}
// 게임장 기계 (mapinlife 프로그램 연결 + 뽑기 + 포토부스)
export const ARCADE = {
  machines: [
    { prog: 'seven', x: -8.2, z: -6.2, face: 0, color: '#FF7A59' },
    { prog: 'arcade', x: -6.2, z: -6.2, face: 0, color: '#4FC3F7' },
    { prog: 'iq', x: -4.2, z: -6.2, face: 0, color: '#B388FF' },
    { prog: 'funtest', x: -2.2, z: -6.2, face: 0, color: '#FFD54F' },
    { prog: 'tarot', x: 0.8, z: -6.2, face: 0, color: '#9496D4' },
    { prog: 'unse', x: 2.8, z: -6.2, face: 0, color: '#CE93D8' },
    { prog: 'lucky', x: 4.8, z: -6.2, face: 0, color: '#FFB74D' },
    { prog: 'gwansang', x: 6.8, z: -6.2, face: 0, color: '#80CBC4' },
    { prog: 'engword', x: -9.0, z: -2.2, face: 1, color: '#81D4FA', type: 'kids' },
    { prog: 'spelling', x: -9.0, z: -0.2, face: 1, color: '#A5D6A7', type: 'kids' },
    { prog: 'fairytale', x: -9.0, z: 1.8, face: 1, color: '#FFCC80', type: 'kids' },
    { prog: 'gacha', id: 'clawA', x: 9.0, z: -3.0, face: -1, color: '#FF6E9A', type: 'gacha' },
    { prog: 'gacha', id: 'clawB', x: 9.0, z: -0.8, face: -1, color: '#5ED3C4', type: 'gacha' },
    { prog: 'gacha', id: 'clawC', x: 9.0, z: 1.4, face: -1, color: '#FFC94D', type: 'gacha' },
  ],
  photo: { x: 7.4, z: 5.4, url: 'https://mirrorphoto.kr/' },
};

// v4 — 강의실: 입장해서 강의 영상 듣기 (같은 방 사람과 함께 듣기)
// 강의는 유튜브 공식·공개 강의를 퍼가기로 재생. 거래처별로 window.MDL_BRAND.lectures 로 교체
export const LECTURE_CATS = ['매출 올리기', '가게 홍보', '창업 기초', '매장 운영'];
export const LECTURES = _B.lectures || [
  { id: 'pvijV5bguUo', t: '음식점 메뉴가격 결정 법칙 7가지', by: '김영갑교수TV', len: '26:15', cat: '매출 올리기', who: '음식점·먹거리부스 운영자', learn: '메뉴 가격을 정하는 기준을 배워요',
    check: ['대표 메뉴 3개의 재료비(원가) 계산하기', '메뉴별 원가율 확인하고 목표 원가율 정하기', '주변 가게 같은 메뉴 가격 3곳 조사하기', '세트·추가 메뉴로 객단가 올릴 방법 1가지 정하기'] },
  { id: 'eDzpZT9EeiA', t: '온라인 시장의 이해', by: '소상공인시장진흥공단 · 소상공인지식배움터', len: '4:36:46', cat: '매출 올리기', who: '온라인 판매를 시작하려는 상인', learn: '온라인 시장 구조와 판로를 이해해요',
    check: ['온라인으로 팔 수 있는 우리 가게 상품 3가지 적기', '시작할 판매 채널 1곳 정하기 (스마트스토어·배달앱 등)', '포장·택배 비용 확인하기'] },
  { id: 'YmAhvP7F3ew', t: '네이버 플레이스 · 소상공인 광고 총정리', by: '깡대표', len: '12:56', cat: '가게 홍보', who: '네이버 지도에 가게가 올라간 사장님', learn: '플레이스 정보 관리와 광고 세팅을 알아봐요',
    check: ['플레이스 영업시간·메뉴·가격을 최신으로 고치기', '대표 사진 5장 이상 올리기', '최근 리뷰에 답글 달기', '용마미식거리 행사(금·토 17~22시) 소식을 새소식에 올리기'] },
  { id: 'r8Fwv4rC5Jw', t: '팔로워 늘리는 인스타그램 마케팅 전략', by: '공부하는 사장 · 공사장TV', len: '34:36', cat: '가게 홍보', who: 'SNS로 손님을 모으고 싶은 가게', learn: '인스타그램 계정 운영 전략을 배워요',
    check: ['가게 계정 프로필·위치·영업시간 정리', '대표 메뉴 사진 9장 올리기', '#강릉맛집 #용마미식거리 #포남동맛집 해시태그 넣기', '주 2회 올릴 요일 정하기'] },
  { id: 'V_zYq8pYUXg', t: '창업하기 전 먼저 알아둘 법규', by: '공부하는 사장 · 공사장TV', len: '21:23', cat: '창업 기초', who: '창업을 준비 중인 분', learn: '창업 전에 확인할 법규·신고를 짚어봐요',
    check: ['사업자등록·영업신고가 필요한지 확인하기', '위생교육 등 필수 교육·서류 확인하기', '간판·옥외광고물 신고 대상인지 확인하기'] },
  { id: 'C1LJHM5XFeY', t: '돈 만드는 식당 메뉴 1강 · 메뉴개발 전략', by: '음식연주TV', len: '7:12', cat: '매장 운영', who: '메뉴를 새로 짜거나 바꾸려는 점주', learn: '잘 팔리는 메뉴를 만드는 기준을 알아봐요',
    check: ['지금 메뉴 중 잘 팔리는 것·안 팔리는 것 3개씩 적기', '대표 메뉴 1개를 정하고 사진·설명 다시 쓰기', '안 팔리는 메뉴 정리 여부 정하기'] },
  { id: 'h4Jd6aBrXuA', t: '네이버 지역소상공인 광고 등록하는 법', by: '자립마케팅 (소상공인 마케팅팀)', len: '20:43', cat: '가게 홍보', who: '광고를 처음 해보는 점주', learn: '지역 광고를 직접 등록하는 순서를 따라 해요',
    check: ['광고 예산(하루·한 달) 정하기', '광고에 쓸 대표 사진·문구 준비하기', '1주일 뒤 노출·클릭 수 확인하기'] },
];
if (EXTRA.includes('lecture')) {
  SPACES.lecture = {
    key: 'lecture', name: _B.lectureName || S + ' 강의실', desc: '강의 듣기 · 함께 보기', btn: '강의실 가기', short: '강의실',
    room: { w: 18, d: 18, h: 5.2 }, floor: '#BE9870', wall: _B.only && _B.only.join() === 'lecture' ? '#F7F2E9' : '#F3EFE6', ceil: '#E8E2D6',
    sun: ['#FFF4E0', 2.0], amb: ['#E6E2DA', 0.95], spawn: [0, 0, 8],
    seatType: 'none', actions: [], outfit: 'casual', music: 'lecture',
  };
  if (!SPACE_ORDER.includes('lecture')) SPACE_ORDER.push('lecture');
  BUTTON_STYLE.lecture = { bg: '#DDEBE6', fg: '#1F4A3F', bd: '#7FB0A0', hv: '#CBE0D8' };
}

// 거래처별 공간 선택: window.MDL_BRAND.only = ['foodstreet', 'playground', ...] (이 순서로 버튼·지도 구성)
if (Array.isArray(_B.only) && _B.only.length) { const keep = _B.only.filter(k => SPACES[k]); SPACE_ORDER.splice(0, SPACE_ORDER.length, ...keep); }
