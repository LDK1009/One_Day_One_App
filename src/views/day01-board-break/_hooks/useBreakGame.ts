//////////////////////////////////////// 격파 게임 상태머신 ////////////////////////////////////////
// 키포인트(SharedValue)를 UI 스레드에서 매 프레임 읽어 판정하고,
// 판정 결과(준비 완료 / 주먹)만 JS 스레드로 올려 게임 상태를 바꿉니다.
//
// 상태 흐름:
//   waiting  준비 자세를 0.7초 유지할 때까지 대기
//     ↓ (자세 확정)
//   playing  송판 등장 → 주먹 감지마다 hit +1 → hit == 필요 타격수면 격파 → 다음 송판

import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import type { BoardMaterial } from '../_constants/materials';
import {
  MIN_KEYPOINT_SCORE,
  READY_STANCE,
  SHOULDER_WIDTH_SMOOTHING,
} from '../_constants/pose';
import { getShoulderWidth, type PoseKeypoints } from '../_utils/keypoints';
import { getMaterial, getRequiredHits } from '../_utils/gameRules';
import {
  computeExtension,
  createPunchTracker,
  isReadyStance,
  stepPunchTracker,
} from '../_utils/poseDetect';
import { useBreakSounds } from './useBreakSounds';

export type GamePhase = 'waiting' | 'playing';

export type BreakGame = {
  phase: GamePhase;
  ////////// 지금까지 깬 송판 수
  brokenCount: number;
  ////////// 현재 송판에 넣은 타격 수
  currentHits: number;
  ////////// 현재 송판을 깨는 데 필요한 타격 수
  requiredHits: number;
  ////////// 현재 대상 재질 (송판 → 벽돌 → 콘크리트 → 강철 → 다이아몬드)
  material: BoardMaterial;
  ////////// 격파 연출 중이면 true (송판이 사라졌다가 다음 장이 등장)
  isBreaking: boolean;
  ////////// 준비 자세가 유지되고 있는지 (waiting 단계 안내용)
  isStanceHeld: boolean;
  ////////// 누적 주먹 수. 리셋되지 않아 화면 흔들림 트리거로 쓸 수 있다
  punchCount: number;
};

type UseBreakGameProps = {
  keypoints: SharedValue<PoseKeypoints>;
};

////////// 격파 연출 시간(ms)
const BREAK_ANIMATION_MS = 450;

export function useBreakGame({ keypoints }: UseBreakGameProps): BreakGame {
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [brokenCount, setBrokenCount] = useState(0);
  const [currentHits, setCurrentHits] = useState(0);
  const [isBreaking, setIsBreaking] = useState(false);
  const [isStanceHeld, setIsStanceHeld] = useState(false);
  const [punchCount, setPunchCount] = useState(0);

  const { playHit, playBreak } = useBreakSounds();

  ////////// UI 스레드에서 참조할 상태 미러
  const phaseShared = useSharedValue<GamePhase>('waiting');
  const stanceStartedAtMs = useSharedValue(0);
  ////////// 손마다 독립 추적. 한 손이 뻗어 있어도 다른 손 판정이 막히지 않는다
  const leftTracker = useSharedValue(createPunchTracker());
  const rightTracker = useSharedValue(createPunchTracker());
  ////////// 모든 비율의 분모. 원값이 심하게 튀어 EMA 로 다듬는다
  const smoothedShoulderWidth = useSharedValue(0);

  useEffect(() => {
    phaseShared.set(phase);
  }, [phase, phaseShared]);

  const requiredHits = getRequiredHits(brokenCount);
  const material = getMaterial(brokenCount);

  //////////////////// 준비 자세 확정 ////////////////////
  const handleStanceConfirmed = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('playing');
    setCurrentHits(0);
  }, []);

  const handleStanceHeldChange = useCallback((held: boolean) => {
    setIsStanceHeld(held);
  }, []);

  //////////////////// 주먹 1회 ////////////////////
  // 부작용(햅틱·타이머)을 state updater 안에 넣으면 이중 호출 시 격파가 두 번 세어지므로
  // 계산과 부작용을 콜백 본문에서 순서대로 처리합니다.
  const handlePunch = useCallback(() => {
    ////////// 격파 연출 중에는 타격을 받지 않음
    if (isBreaking) return;

    const needed = getRequiredHits(brokenCount);
    const nextHits = currentHits + 1;
    setCurrentHits(nextHits);
    setPunchCount((previousCount) => previousCount + 1);

    ////////// 아직 안 깨짐 — 금만 하나 더
    if (nextHits < needed) {
      playHit();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }

    ////////// 격파
    playBreak();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 70);
    setIsBreaking(true);
    setTimeout(() => {
      setBrokenCount((previousCount) => previousCount + 1);
      setCurrentHits(0);
      setIsBreaking(false);
    }, BREAK_ANIMATION_MS);
  }, [brokenCount, currentHits, isBreaking, playHit, playBreak]);

  //////////////////// 매 프레임 판정 (UI 스레드) ////////////////////
  useAnimatedReaction(
    () => keypoints.get(),
    (currentKeypoints) => {
      'worklet';
      const rawShoulderWidth = getShoulderWidth(currentKeypoints, MIN_KEYPOINT_SCORE);

      ////////// 어깨너비 평활화 — 이상값은 버리고, 정상값만 EMA 로 섞는다
      if (
        rawShoulderWidth >= SHOULDER_WIDTH_SMOOTHING.minValid &&
        rawShoulderWidth <= SHOULDER_WIDTH_SMOOTHING.maxValid
      ) {
        const previous = smoothedShoulderWidth.get();
        smoothedShoulderWidth.set(
          previous === 0
            ? rawShoulderWidth
            : previous * (1 - SHOULDER_WIDTH_SMOOTHING.alpha) +
                rawShoulderWidth * SHOULDER_WIDTH_SMOOTHING.alpha,
        );
      }

      const shoulderWidth = smoothedShoulderWidth.get();
      if (shoulderWidth <= 0) return;

      const nowMs = Date.now();

      ////////// 1) 준비 자세 대기 단계
      if (phaseShared.get() === 'waiting') {
        const stanceOk = isReadyStance(currentKeypoints, shoulderWidth);

        if (!stanceOk) {
          if (stanceStartedAtMs.get() !== 0) {
            stanceStartedAtMs.set(0);
            runOnJS(handleStanceHeldChange)(false);
          }
          return;
        }

        if (stanceStartedAtMs.get() === 0) {
          stanceStartedAtMs.set(nowMs);
          runOnJS(handleStanceHeldChange)(true);
          return;
        }

        if (nowMs - stanceStartedAtMs.get() >= READY_STANCE.holdDurationMs) {
          stanceStartedAtMs.set(0);
          runOnJS(handleStanceHeldChange)(false);
          runOnJS(handleStanceConfirmed)();
        }
        return;
      }

      ////////// 2) 플레이 단계 — 손마다 따로 주먹 감지
      const leftExtension = computeExtension(
        currentKeypoints.leftWrist,
        currentKeypoints.leftHip,
        shoulderWidth,
      );
      const leftResult = stepPunchTracker(leftTracker.get(), leftExtension, nowMs);
      leftTracker.set(leftResult.tracker);

      const rightExtension = computeExtension(
        currentKeypoints.rightWrist,
        currentKeypoints.rightHip,
        shoulderWidth,
      );
      const rightResult = stepPunchTracker(rightTracker.get(), rightExtension, nowMs);
      rightTracker.set(rightResult.tracker);

      ////////// 양손이 동시에 걸려도 한 번만 센다 (양손 지르기 = 1타)
      if (leftResult.punched || rightResult.punched) {
        runOnJS(handlePunch)();
      }
    },
    [handleStanceConfirmed, handleStanceHeldChange, handlePunch],
  );

  return {
    phase,
    brokenCount,
    currentHits,
    requiredHits,
    material,
    isBreaking,
    isStanceHeld,
    punchCount,
  };
}
