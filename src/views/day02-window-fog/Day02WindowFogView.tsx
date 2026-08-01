//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { withTiming } from 'react-native-reanimated';

import { BlowHint } from './_components/BlowHint';
import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas } from './_components/FogCanvas';
import { BREATH_RESUME_MS, RESET_DURATION_MS } from './_constants/fog';
import { useBreathDetector } from './_hooks/useBreathDetector';
import { useFogPaths } from './_hooks/useFogPaths';
import { useShakeReset } from './_hooks/useShakeReset';
import { useWipeFeedback } from './_hooks/useWipeFeedback';

export function Day02WindowFogView() {
  ////////// 촬영 중 화면이 꺼지지 않도록 유지
  useKeepAwake();

  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// 문지르는 동안 입김 판정을 멈추기 위한 플래그
  const isWipingRef = useRef(false);

  ////////// 직전 획이 예약한 재개 타이머 — 새 획이 시작되면 취소해야 획 도중에 잠금이 풀리지 않습니다
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { fogLevel, debugDb, debugStreak, hasMicError } = useBreathDetector(isFocused, isWipingRef);

  const { startWipe, tickWipe, stopWipe } = useWipeFeedback();

  ////////// 글씨를 한 번이라도 썼는지 (쓰기 안내 노출 여부에 사용)
  const [hasWiped, setHasWiped] = useState(false);

  ////////// 문지르기 시작 — 효과음을 켜고 입김 판정을 잠급니다
  const handleWipeStart = useCallback(() => {
    ////////// 직전 획의 재개 타이머가 살아 있으면 이번 획 도중에 잠금을 풀어버립니다
    if (resumeTimerRef.current != null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    isWipingRef.current = true;
    setHasWiped(true);
    startWipe();
  }, [startWipe]);

  ////////// 문지르기 종료 — 효과음을 끄고 잔향이 빠진 뒤 입김 판정을 재개합니다
  const handleWipeEnd = useCallback(() => {
    stopWipe();
    resumeTimerRef.current = setTimeout(() => {
      resumeTimerRef.current = null;
      isWipingRef.current = false;
    }, BREATH_RESUME_MS);
  }, [stopWipe]);

  ////////// 언마운트 시 남은 재개 타이머 정리
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current != null) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const { wipeGesture, activePoints, paths, clearPaths } = useFogPaths({
    onWipeStart: handleWipeStart,
    onWipeMove: tickWipe,
    onWipeEnd: handleWipeEnd,
  });

  ////////// 흔들기 리셋 — 김과 글씨를 함께 지웁니다
  const handleShake = useCallback(() => {
    fogLevel.set(withTiming(0, { duration: RESET_DURATION_MS }));
    clearPaths();
    setHasWiped(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((error) =>
      console.error('[day02] 햅틱 실패', error),
    );
  }, [fogLevel, clearPaths]);

  useShakeReset(isFocused, handleShake);

  return (
    <CameraBackground isActive={isFocused}>
      <GestureDetector gesture={wipeGesture}>
        <View style={StyleSheet.absoluteFill}>
          <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={paths} />
        </View>
      </GestureDetector>
      <BlowHint
        fogLevel={fogLevel}
        debugDb={debugDb}
        debugStreak={debugStreak}
        hasWiped={hasWiped}
        hasMicError={hasMicError}
      />
    </CameraBackground>
  );
}
