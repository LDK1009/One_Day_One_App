//////////////////////////////////////// 자세·주먹 판정 ////////////////////////////////////////
// 전부 순수 함수 + worklet. 상태는 호출하는 쪽(SharedValue)이 들고 있습니다.
//
// 모든 거리는 "어깨 너비" 로 나눠 정규화합니다 → 카메라와의 거리가 변해도 임계값이 유지됩니다.

import { MIN_KEYPOINT_SCORE, PUNCH, READY_STANCE } from '../_constants/pose';
import { distance, type PoseKeypoints } from './keypoints';

//////////////////// 준비 자세 ////////////////////
// 태권도 준비 자세 = ① 발을 어깨보다 넓게 벌리고 ② 양 주먹을 허리(골반) 옆에 붙인 상태
export function isReadyStance(keypoints: PoseKeypoints, shoulderWidth: number): boolean {
  'worklet';
  if (shoulderWidth <= 0) return false;

  const { leftAnkle, rightAnkle, leftWrist, rightWrist, leftHip, rightHip } = keypoints;

  ////////// 1) 판정에 쓰는 키포인트가 전부 잡혔는지
  const required = [leftAnkle, rightAnkle, leftWrist, rightWrist, leftHip, rightHip];
  for (let index = 0; index < required.length; index += 1) {
    if (required[index].score < MIN_KEYPOINT_SCORE) return false;
  }

  ////////// 2) 발 간격이 어깨너비보다 충분히 넓은지
  const ankleGap = Math.abs(leftAnkle.x - rightAnkle.x) / shoulderWidth;
  if (ankleGap < READY_STANCE.minAnkleGapRatio) return false;

  ////////// 3) 양 손목이 각각 같은 쪽 골반 근처에 있는지
  const leftWristToHip = distance(leftWrist, leftHip) / shoulderWidth;
  const rightWristToHip = distance(rightWrist, rightHip) / shoulderWidth;
  if (leftWristToHip > READY_STANCE.maxWristToHipRatio) return false;
  if (rightWristToHip > READY_STANCE.maxWristToHipRatio) return false;

  return true;
}

//////////////////// 팔 뻗은 정도 ////////////////////
// reach = 어깨~손목 거리 / 어깨너비.
// 허리에 붙인 상태는 약 0.4~0.5, 앞으로 쭉 뻗으면 1.0 안팎까지 올라갑니다.
export function computeMaxReach(keypoints: PoseKeypoints, shoulderWidth: number): number {
  'worklet';
  if (shoulderWidth <= 0) return 0;

  const { leftShoulder, rightShoulder, leftWrist, rightWrist } = keypoints;

  let maxReach = 0;
  if (leftWrist.score >= MIN_KEYPOINT_SCORE && leftShoulder.score >= MIN_KEYPOINT_SCORE) {
    const leftReach = distance(leftWrist, leftShoulder) / shoulderWidth;
    if (leftReach > maxReach) maxReach = leftReach;
  }
  if (rightWrist.score >= MIN_KEYPOINT_SCORE && rightShoulder.score >= MIN_KEYPOINT_SCORE) {
    const rightReach = distance(rightWrist, rightShoulder) / shoulderWidth;
    if (rightReach > maxReach) maxReach = rightReach;
  }

  return maxReach;
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
  reach: number,
  nowMs: number,
): PunchStepResult {
  'worklet';

  ////////// 1) 팔이 충분히 접혔으면 "발사 준비" 상태로 전환
  if (reach > 0 && reach <= PUNCH.retractedReachRatio) {
    if (tracker.phase !== 'retracted') {
      return {
        tracker: { ...tracker, phase: 'retracted', retractedAtMs: nowMs },
        punched: false,
      };
    }
    return { tracker: tracker, punched: false };
  }

  ////////// 2) 접힌 상태에서 임계치를 넘겨 뻗었으면 주먹으로 인정
  if (tracker.phase === 'retracted' && reach >= PUNCH.extendedReachRatio) {
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
