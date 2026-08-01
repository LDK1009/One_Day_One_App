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
// 발 조건은 뺐다. 전신이 프레임에 들어가려면 카메라에서 2~3m 물러나야 해서
// 릴스 구도(주먹 동작이 크게 보여야 함)와 충돌하기 때문.
// 대신 "팔을 그냥 내린 상태"와 구분하기 위해 손목 높이를 본다.
export const READY_STANCE = {
  ////////// 손목이 골반에서 이 반경(어깨너비 배수) 안에 있어야 함
  maxWristToHipRatio: 0.6,
  ////////// (골반y - 손목y) / 어깨너비. 손목이 골반보다 이만큼은 위에 있어야 함.
  //         팔을 내리면 손목이 골반보다 아래로 내려가 음수가 된다.
  minWristRiseRatio: -0.05,
  ////////// 이 시간(ms) 동안 자세를 유지해야 READY 확정
  holdDurationMs: 700,
} as const;

//////////////////// 주먹 판정 ////////////////////
// 지표는 "손목~골반 거리 / 어깨너비". 어깨~손목 거리는 쓰지 않는다 —
// 정면으로 지르면 카메라 쪽으로 뻗는 만큼 2D 투영이 짧아져 값이 거의 안 변한다.
//
// 실측(갤럭시 S21, 상반신 구도):
//   허리에 붙인 상태  0.29 ~ 0.38
//   앞으로 뻗은 상태  0.74 ~ 1.87
export const PUNCH = {
  ////////// 이 값 이하면 "접힘"(발사 준비) 상태로 본다
  retractedExtensionRatio: 0.55,
  ////////// 이 값을 넘으면 뻗은 것으로 인정
  extendedExtensionRatio: 0.7,
  ////////// 뻗는 데 허용되는 최대 시간(ms). 느리게 뻗으면 주먹으로 안 침
  maxExtendDurationMs: 700,
  ////////// 같은 손의 연타 오인식 방지 쿨다운(ms). 손마다 따로 적용된다
  cooldownMs: 250,
} as const;

//////////////////// 어깨너비 평활화 ////////////////////
// 모든 비율의 분모라서 이 값이 튀면 판정 전체가 흔들린다.
// 실측에서 프레임마다 0.03~0.50 까지 요동쳐 EMA 로 다듬는다.
export const SHOULDER_WIDTH_SMOOTHING = {
  ////////// 새 값의 반영 비율 (낮을수록 안정적이지만 반응이 느림)
  alpha: 0.25,
  ////////// 이 범위를 벗어난 값은 인식 실패로 보고 버린다 (정규 좌표 기준)
  minValid: 0.08,
  maxValid: 0.9,
} as const;

//////////////////// 오버레이 ////////////////////
// 전면 카메라 프리뷰는 좌우 반전되어 보이지만 프레임 데이터는 반전되지 않습니다.
// 스켈레톤을 프리뷰에 맞추려면 x 를 뒤집어야 합니다.
export const MIRROR_OVERLAY_X = true;
