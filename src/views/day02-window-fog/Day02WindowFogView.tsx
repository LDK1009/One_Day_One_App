//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas } from './_components/FogCanvas';
import { useBreathDetector } from './_hooks/useBreathDetector';
import { useFogPaths } from './_hooks/useFogPaths';

export function Day02WindowFogView() {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// 문지르는 동안 입김 판정을 멈추기 위한 플래그 (Task 5 에서 실제로 켭니다)
  const isWipingRef = useRef(false);

  const { fogLevel } = useBreathDetector(isFocused, isWipingRef);

  ////////// Task 5 에서 효과음·햅틱으로 채웁니다
  const noop = useCallback(() => undefined, []);

  const { wipeGesture, activePoints, paths } = useFogPaths({
    onWipeStart: noop,
    onWipeMove: noop,
    onWipeEnd: noop,
  });

  return (
    <CameraBackground isActive={isFocused}>
      <GestureDetector gesture={wipeGesture}>
        <View style={StyleSheet.absoluteFill}>
          <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={paths} />
        </View>
      </GestureDetector>
    </CameraBackground>
  );
}
