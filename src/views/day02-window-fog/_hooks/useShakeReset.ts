//////////////////////////////////////// 흔들기 감지 ////////////////////////////////////////
// 가속도 크기가 임계를 넘는 일이 짧은 시간 안에 2회 발생하면 리셋으로 판정합니다.
// 1회로 하면 걷거나 주머니에 넣을 때 오작동합니다.
//
// magnitude = √(x² + y² + z²) — 폰이 정지해 있으면 중력만 잡혀 약 1 입니다.

import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';

import { SHAKE_COUNT, SHAKE_THRESHOLD_G, SHAKE_WINDOW_MS } from '../_constants/fog';

const ACCELEROMETER_INTERVAL_MS = 100;

export function useShakeReset(isEnabled: boolean, onShake: () => void) {
  const hitTimesRef = useRef<number[]>([]);
  const onShakeRef = useRef(onShake);

  ////////// 렌더 중 ref 를 건드리면 React Compiler 린트에 걸리므로 effect 에서 갱신합니다
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (!isEnabled) {
      hitTimesRef.current = [];
      return;
    }

    Accelerometer.setUpdateInterval(ACCELEROMETER_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      if (magnitude < SHAKE_THRESHOLD_G) return;

      const now = Date.now();
      const recentHits = hitTimesRef.current.filter((time) => now - time < SHAKE_WINDOW_MS);
      recentHits.push(now);
      hitTimesRef.current = recentHits;

      if (recentHits.length >= SHAKE_COUNT) {
        hitTimesRef.current = [];
        onShakeRef.current();
      }
    });

    return () => subscription.remove();
  }, [isEnabled]);
}
