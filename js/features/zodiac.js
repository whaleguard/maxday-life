// 12지신 — 띠별 성격과 오늘의 한마디 (사주 운세 프로그램으로 연결)
export const ZODIAC = [
  { id: 'rat', ko: '쥐', ji: '자(子)', trait: '눈치가 빠르고 부지런해 기회를 놓치지 않아요.' },
  { id: 'ox', ko: '소', ji: '축(丑)', trait: '묵묵하고 성실해 한번 맡은 일은 끝까지 해내요.' },
  { id: 'tiger', ko: '호랑이', ji: '인(寅)', trait: '용기 있고 당당해 앞장서는 일이 잘 맞아요.' },
  { id: 'rabbit', ko: '토끼', ji: '묘(卯)', trait: '다정하고 섬세해 사람 사이를 부드럽게 이어요.' },
  { id: 'dragon', ko: '용', ji: '진(辰)', trait: '꿈이 크고 기운이 넘쳐 주변에 힘을 줘요.' },
  { id: 'snake', ko: '뱀', ji: '사(巳)', trait: '지혜롭고 침착해 깊이 생각한 뒤 움직여요.' },
  { id: 'horse', ko: '말', ji: '오(午)', trait: '활기차고 솔직해 어디서든 분위기를 살려요.' },
  { id: 'sheep', ko: '양', ji: '미(未)', trait: '온화하고 배려심이 깊어 곁에 있으면 편안해요.' },
  { id: 'monkey', ko: '원숭이', ji: '신(申)', trait: '재치 있고 손재주가 좋아 무엇이든 금방 익혀요.' },
  { id: 'rooster', ko: '닭', ji: '유(酉)', trait: '꼼꼼하고 부지런해 하루를 누구보다 일찍 열어요.' },
  { id: 'dog', ko: '개', ji: '술(戌)', trait: '의리 있고 정직해 믿고 기댈 수 있는 사람이에요.' },
  { id: 'pig', ko: '돼지', ji: '해(亥)', trait: '너그럽고 복이 많아 주변에 나눌 줄 알아요.' },
];
const WORDS = [
  '작은 친절이 큰 인연으로 돌아오는 날이에요.', '서두르지 않아도 괜찮아요. 오늘은 한 걸음이면 충분해요.', '미뤄 둔 연락을 하면 반가운 소식이 와요.',
  '마음을 비우면 길이 보여요. 잠시 쉬어 가세요.', '고마운 사람에게 고맙다고 말해 보세요.', '오늘 정한 작은 다짐이 오래 갈 거예요.',
  '뜻밖의 곳에서 도움의 손길이 있어요.', '익숙한 길보다 새로운 길에 행운이 있어요.', '건강을 챙기면 일도 술술 풀려요.',
  '말 한마디를 고르면 관계가 따뜻해져요.', '오늘의 정리가 내일의 여유가 돼요.', '기다리던 일이 조금씩 움직이기 시작해요.',
];
export function zodiacOfYear(y) { return ZODIAC[((y - 4) % 12 + 12) % 12]; }
export function todayWord(id) {
  const d = new Date(); const k = d.getFullYear() * 400 + (d.getMonth() + 1) * 32 + d.getDate();
  const i = ZODIAC.findIndex(z => z.id === id);
  const lucky = ['동쪽', '서쪽', '남쪽', '북쪽'][(k + i) % 4], color = ['하늘색', '연두색', '노란색', '분홍색', '흰색', '보라색'][(k * 3 + i) % 6];
  return { word: WORDS[(k + i * 7) % WORDS.length], lucky, color, num: (k + i * 13) % 9 + 1 };
}
