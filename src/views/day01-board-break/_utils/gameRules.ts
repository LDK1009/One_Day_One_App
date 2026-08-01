//////////////////////////////////////// 게임 규칙 ////////////////////////////////////////
// 무한 모드. 격파 수가 쌓일수록 대상이 단단해진다 (송판 → 벽돌 → 콘크리트 → 강철 → 다이아몬드).

import { BOARD_MATERIALS, type BoardMaterial } from '../_constants/materials';

////////// 재질이 한 단계 오르는 주기(격파 장수)
const MATERIAL_STEP_SIZE = 5;

//////////////////// 필요 타격 횟수 ////////////////////
// 0~4장 → 1타(송판) / 5~9장 → 2타(벽돌) / 10~14장 → 3타(콘크리트) / ...
// 마지막 재질에 도달하면 그 이상은 올라가지 않는다.
export function getRequiredHits(brokenCount: number): number {
  const step = Math.floor(brokenCount / MATERIAL_STEP_SIZE);
  const required = Math.min(step + 1, BOARD_MATERIALS.length);
  return required;
}

//////////////////// 현재 재질 ////////////////////
export function getMaterial(requiredHits: number): BoardMaterial {
  const index = Math.min(Math.max(requiredHits, 1), BOARD_MATERIALS.length) - 1;
  return BOARD_MATERIALS[index];
}
