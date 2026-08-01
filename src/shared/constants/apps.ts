//////////////////////////////////////// 앱 레지스트리 ////////////////////////////////////////
// 챌린지로 만든 앱 목록. 런처 화면이 이 배열을 그대로 렌더합니다.
// 항목은 `node scripts/new-app.js <슬러그> "<제목>"` 이 자동으로 추가하므로 손으로 넣지 마세요.

export type DailyApp = {
  id: string; // 슬러그. 라우트 파일명과 동일 (예: 'day01-tip-calc')
  day: number; // Day 번호
  title: string; // 런처 카드 제목
  description: string; // 카드 한 줄 설명 (릴스 캡션에도 재사용)
  icon: string; // MaterialCommunityIcons 아이콘 이름
  accentColor: string; // 카드 강조색 (accentByDay 결과)
  createdAt: string; // 'YYYY-MM-DD'
  route: string; // expo-router 경로 (예: '/(apps)/day01-tip-calc')
};

//////////////////// APPS_START ////////////////////
export const DAILY_APPS: DailyApp[] = [
  {
    id: 'day00-sample',
    day: 0,
    title: '샘플 앱',
    description: '템플릿 동작 확인용 예시 — 지워도 됩니다',
    icon: 'gesture-tap-button',
    accentColor: '#8E4EC6',
    createdAt: '2026-08-01',
    route: '/(apps)/day00-sample',
  },
  {
    id: 'day01-board-break',
    day: 1,
    title: '송판 격파',
    description: '태권도 자세 잡고 주먹으로 송판 깨기',
    icon: 'karate',
    accentColor: '#3B5BFF',
    createdAt: '2026-08-01',
    route: '/(apps)/day01-board-break',
  },
  {
    id: 'day02-window-fog',
    day: 2,
    title: '입김 유리창',
    description: '하아~ 불어 서린 창에 낙서하기',
    icon: 'weather-fog',
    accentColor: '#E5484D',
    createdAt: '2026-08-01',
    route: '/(apps)/day02-window-fog',
  },
];
//////////////////// APPS_END ////////////////////

////////// 최신 Day 가 위로 오도록 정렬한 목록
export function getAppsSortedByDay(): DailyApp[] {
  const sorted = [...DAILY_APPS].sort((a, b) => b.day - a.day);
  return sorted;
}

////////// 지금까지 만든 앱 개수 (Day 0 샘플 제외)
export function getChallengeCount(): number {
  const count = DAILY_APPS.filter((app) => app.day > 0).length;
  return count;
}
