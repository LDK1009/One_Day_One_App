//////////////////////////////////////// 입김 유리창 ////////////////////////////////////////
// [1] 카메라 프리뷰 → [2] 김서림 캔버스 → [3] 안내문 순서로 3층을 쌓습니다.
// 화면이 포커스를 잃으면 카메라·마이크·센서를 모두 멈춥니다.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { CameraBackground } from './_components/CameraBackground';

export function Day02WindowFogView() {
  ////////// 화면 포커스 — 카메라·마이크·센서의 on/off 를 한 값으로 묶습니다
  const [isFocused, setIsFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  return <CameraBackground isActive={isFocused} />;
}
