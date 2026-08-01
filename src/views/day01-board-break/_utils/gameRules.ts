//////////////////////////////////////// 게임 규칙 ////////////////////////////////////////
// 무한 모드. 한 장 깰 때마다 재질이 바로 바뀐다 (릴스는 전개 속도가 핵심).
//
//   1번째 송판 1타 → 2번째 벽돌 2타 → 콘크리트 3타 → 강철 4타 → 다이아몬드 5타
//   → 다시 송판 1타 …  (순환)
//
// 다이아몬드에서 멈추면 5타짜리가 무한 반복돼 지루해지므로 처음으로 되돌린다.
// 한 바퀴는 1+2+3+4+5 = 15회 주먹.

import { BOARD_MATERIALS, type BoardMaterial } from '../_constants/materials';

//////////////////// 현재 재질 순번 ////////////////////
function getMaterialIndex(brokenCount: number): number {
  return brokenCount % BOARD_MATERIALS.length;
}

//////////////////// 필요 타격 횟수 ////////////////////
// 재질 순번과 1:1 대응 (송판 1타 … 다이아몬드 5타)
export function getRequiredHits(brokenCount: number): number {
  return getMaterialIndex(brokenCount) + 1;
}

//////////////////// 현재 재질 ////////////////////
export function getMaterial(brokenCount: number): BoardMaterial {
  return BOARD_MATERIALS[getMaterialIndex(brokenCount)];
}
