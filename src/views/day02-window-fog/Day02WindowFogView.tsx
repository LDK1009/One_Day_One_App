//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';

import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas } from './_components/FogCanvas';
import { useFogPaths } from './_hooks/useFogPaths';

export function Day02WindowFogView() {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// Task 4 에서 입김 감지로 교체합니다
  const fogLevel = useSharedValue(1);

  ////////// Task 5·6 에서 효과음·햅틱으로 채웁니다
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
