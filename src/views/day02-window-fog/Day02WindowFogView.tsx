//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { CameraBackground } from './_components/CameraBackground';
import { FogCanvas, type WipePoint } from './_components/FogCanvas';

export function Day02WindowFogView() {
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  ////////// Task 4 에서 입김 감지로 교체합니다. 지금은 김이 꽉 찬 상태로 고정해 렌더를 확인합니다
  const fogLevel = useSharedValue(1);
  const activePoints = useSharedValue<WipePoint[]>([]);

  return (
    <CameraBackground isActive={isFocused}>
      <FogCanvas fogLevel={fogLevel} activePoints={activePoints} paths={[]} />
    </CameraBackground>
  );
}
