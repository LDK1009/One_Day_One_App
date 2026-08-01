//////////////////////////////////////// 게임 규칙 ////////////////////////////////////////
// 무한 모드. 격파 수가 쌓일수록 송판이 두꺼워져 한 번에 안 깨집니다.

////////// 강도가 한 단계 오르는 주기(격파 장수)
const HITS_STEP_SIZE = 5;

////////// 필요 타격 횟수 상한
const MAX_REQUIRED_HITS = 5;

//////////////////// 필요 타격 횟수 ////////////////////
// 0~4장 → 1타 / 5~9장 → 2타 / 10~14장 → 3타 / ... / 20장 이상 → 5타 고정
export function getRequiredHits(brokenCount: number): number {
  const step = Math.floor(brokenCount / HITS_STEP_SIZE);
  const required = Math.min(step + 1, MAX_REQUIRED_HITS);
  return required;
}

//////////////////// 송판 라벨 ////////////////////
// 화면에 표시할 강도 이름. 필요 타격 횟수와 1:1 대응합니다.
const BOARD_LABELS = ['소나무', '참나무', '벽돌', '콘크리트', '강철'];

export function getBoardLabel(requiredHits: number): string {
  const index = Math.min(requiredHits, BOARD_LABELS.length) - 1;
  return BOARD_LABELS[index];
}
