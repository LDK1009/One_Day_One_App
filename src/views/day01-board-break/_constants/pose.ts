//////////////////////////////////////// 포즈 상수 ////////////////////////////////////////
// MoveNet SinglePose Lightning(int8) 기준 값 모음.
// 판정 임계값은 전부 "어깨 너비" 로 정규화된 비율이라 카메라 거리와 무관합니다.

////////// 모델 입력 한 변의 길이 (Lightning = 192, Thunder = 256)
export const MODEL_INPUT_SIZE = 192;

////////// MoveNet 출력 키포인트 순서 (17개)
export const KEYPOINT_NAMES = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;

////////// 이 값보다 신뢰도가 낮은 키포인트는 판정에서 제외
export const MIN_KEYPOINT_SCORE = 0.3;

//////////////////// 준비 자세 판정 ////////////////////
export const READY_STANCE = {
  ////////// 발 간격 ≥ 어깨너비 × 이 값
  minAnkleGapRatio: 1.1,
  ////////// 손목이 골반에서 이 반경(어깨너비 배수) 안에 있어야 함
  maxWristToHipRatio: 0.45,
  ////////// 이 시간(ms) 동안 자세를 유지해야 READY 확정
  holdDurationMs: 700,
} as const;

//////////////////// 주먹 판정 ////////////////////
export const PUNCH = {
  ////////// 뻗기 전 상태로 인정하는 최대 reach (어깨~손목 거리 / 어깨너비)
  retractedReachRatio: 0.55,
  ////////// 이 reach 를 넘으면 뻗은 것으로 인정
  extendedReachRatio: 0.9,
  ////////// 뻗는 데 허용되는 최대 시간(ms). 느리게 뻗으면 주먹으로 안 침
  maxExtendDurationMs: 450,
  ////////// 연타 오인식 방지 쿨다운(ms)
  cooldownMs: 350,
} as const;

//////////////////// 오버레이 ////////////////////
// 전면 카메라 프리뷰는 좌우 반전되어 보이지만 프레임 데이터는 반전되지 않습니다.
// 스켈레톤을 프리뷰에 맞추려면 x 를 뒤집어야 합니다.
export const MIRROR_OVERLAY_X = true;
