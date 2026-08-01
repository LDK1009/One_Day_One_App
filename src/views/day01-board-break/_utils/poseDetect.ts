//////////////////////////////////////// 자세·주먹 판정 ////////////////////////////////////////
// 전부 순수 함수 + worklet. 상태는 호출하는 쪽(SharedValue)이 들고 있습니다.
//
// 모든 거리는 "어깨 너비" 로 나눠 정규화합니다 → 카메라와의 거리가 변해도 임계값이 유지됩니다.

import { MIN_KEYPOINT_SCORE, PUNCH, READY_STANCE } from '../_constants/pose';
import { distance, type Keypoint, type PoseKeypoints } from './keypoints';

//////////////////// 손목 높이 ////////////////////
// (골반y - 손목y) / 어깨너비. 이미지 좌표는 아래로 갈수록 y 가 커지므로
// 값이 양수면 손목이 골반보다 위, 음수면 아래(= 팔을 내린 상태)를 뜻한다.
export function computeWristRise(wrist: Keypoint, hip: Keypoint, shoulderWidth: number): number {
  'worklet';
  if (shoulderWidth <= 0) return 0;
  return (hip.y - wrist.y) / shoulderWidth;
}

//////////////////// 준비 자세 ////////////////////
// 양 주먹을 허리(골반) 옆에 붙인 상태.
// 발 조건은 빼고(구도 문제) 대신 손목 높이로 "팔을 그냥 내린 자세"와 구분한다.
export function isReadyStance(keypoints: PoseKeypoints, shoulderWidth: number): boolean {
  'worklet';
  if (shoulderWidth <= 0) return false;

  const { leftWrist, rightWrist, leftHip, rightHip } = keypoints;

  ////////// 1) 판정에 쓰는 키포인트가 전부 잡혔는지
  const required = [leftWrist, rightWrist, leftHip, rightHip];
  for (let index = 0; index < required.length; index += 1) {
    if (required[index].score < MIN_KEYPOINT_SCORE) return false;
  }

  ////////// 2) 양 손목이 각각 같은 쪽 골반 근처에 있는지
  const leftWristToHip = distance(leftWrist, leftHip) / shoulderWidth;
  const rightWristToHip = distance(rightWrist, rightHip) / shoulderWidth;
  if (leftWristToHip > READY_STANCE.maxWristToHipRatio) return false;
  if (rightWristToHip > READY_STANCE.maxWristToHipRatio) return false;

  ////////// 3) 손목이 골반보다 아래로 처지지 않았는지 (팔 내린 자세 배제)
  const leftRise = computeWristRise(leftWrist, leftHip, shoulderWidth);
  const rightRise = computeWristRise(rightWrist, rightHip, shoulderWidth);
  if (leftRise < READY_STANCE.minWristRiseRatio) return false;
  if (rightRise < READY_STANCE.minWristRiseRatio) return false;

  return true;
}

//////////////////// 팔 뻗은 정도 ////////////////////
// 손목~골반 거리 / 어깨너비. 양손 중 큰 값을 쓴다.
//
// 어깨~손목 거리를 쓰지 않는 이유: 정면으로 지르면 팔이 카메라 쪽으로 향해
// 2D 투영 길이가 오히려 짧아져 대기 상태와 구분이 안 된다(실측으로 확인).
// 골반 기준 거리는 위·앞·옆 어느 방향으로 뻗어도 확실히 증가한다.
export function computeMaxExtension(keypoints: PoseKeypoints, shoulderWidth: number): number {
  'worklet';
  if (shoulderWidth <= 0) return 0;

  const { leftHip, rightHip, leftWrist, rightWrist } = keypoints;

  let maxExtension = 0;
  if (leftWrist.score >= MIN_KEYPOINT_SCORE && leftHip.score >= MIN_KEYPOINT_SCORE) {
    const leftExtension = distance(leftWrist, leftHip) / shoulderWidth;
    if (leftExtension > maxExtension) maxExtension = leftExtension;
  }
  if (rightWrist.score >= MIN_KEYPOINT_SCORE && rightHip.score >= MIN_KEYPOINT_SCORE) {
    const rightExtension = distance(rightWrist, rightHip) / shoulderWidth;
    if (rightExtension > maxExtension) maxExtension = rightExtension;
  }

  return maxExtension;
}

//////////////////// 주먹 추적기 ////////////////////
// 프레임마다 reach 를 넣으면 "접힌 상태 → 빠르게 뻗음" 전이를 감지해 주먹 1회로 셉니다.
export type PunchPhase = 'idle' | 'retracted';

export type PunchTracker = {
  phase: PunchPhase;
  ////////// 접힌 상태로 들어간 시각(ms). 여기서 너무 오래 걸려 뻗으면 주먹으로 안 침
  retractedAtMs: number;
  ////////// 마지막으로 주먹을 인정한 시각(ms). 쿨다운 계산용
  lastPunchAtMs: number;
};

export function createPunchTracker(): PunchTracker {
  'worklet';
  return { phase: 'idle', retractedAtMs: 0, lastPunchAtMs: 0 };
}

export type PunchStepResult = {
  tracker: PunchTracker;
  punched: boolean;
};

export function stepPunchTracker(
  tracker: PunchTracker,
  extension: number,
  nowMs: number,
): PunchStepResult {
  'worklet';

  ////////// 1) 팔이 충분히 접혔으면 "발사 준비" 상태로 전환
  if (extension > 0 && extension <= PUNCH.retractedExtensionRatio) {
    if (tracker.phase !== 'retracted') {
      return {
        tracker: { ...tracker, phase: 'retracted', retractedAtMs: nowMs },
        punched: false,
      };
    }
    return { tracker: tracker, punched: false };
  }

  ////////// 2) 접힌 상태에서 임계치를 넘겨 뻗었으면 주먹으로 인정
  if (tracker.phase === 'retracted' && extension >= PUNCH.extendedExtensionRatio) {
    const extendDuration = nowMs - tracker.retractedAtMs;
    const sinceLastPunch = nowMs - tracker.lastPunchAtMs;
    const isFastEnough = extendDuration <= PUNCH.maxExtendDurationMs;
    const isOffCooldown = sinceLastPunch >= PUNCH.cooldownMs;

    if (isFastEnough && isOffCooldown) {
      return {
        tracker: { phase: 'idle', retractedAtMs: 0, lastPunchAtMs: nowMs },
        punched: true,
      };
    }

    ////////// 너무 느리거나 쿨다운 중이면 카운트 없이 초기화
    return { tracker: { ...tracker, phase: 'idle', retractedAtMs: 0 }, punched: false };
  }

  return { tracker: tracker, punched: false };
}
