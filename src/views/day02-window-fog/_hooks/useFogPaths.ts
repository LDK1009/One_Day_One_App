//////////////////////////////////////// 지우기 제스처 ////////////////////////////////////////
// 손가락 경로를 모아 Skia 획으로 만듭니다.
//
// 성능 설계: 드래그 중에는 SharedValue 만 갱신해 JS 리렌더를 0회로 유지하고,
// 손을 뗄 때(onEnd)만 setState 로 완성 획을 커밋합니다.
// 햅틱 콜백도 worklet 안에서 스로틀해 JS 왕복 횟수를 초당 12회 수준으로 낮춥니다.

import { Skia, type SkPath } from '@shopify/react-native-skia';
import { useCallback, useState } from 'react';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { WipePoint } from '../_components/FogCanvas';
import { HAPTIC_THROTTLE_MS } from '../_constants/fog';

export type FogPathsCallbacks = {
  ////////// 문지르기 시작 — 효과음 재생·입김 감지 일시정지에 사용
  onWipeStart: () => void;
  ////////// 문지르는 중 (HAPTIC_THROTTLE_MS 간격으로만 호출) — 햅틱에 사용
  onWipeMove: () => void;
  ////////// 문지르기 종료 — 효과음 정지·입김 감지 재개에 사용
  onWipeEnd: () => void;
};

export type FogPathsResult = {
  wipeGesture: PanGesture;
  activePoints: SharedValue<WipePoint[]>;
  paths: SkPath[];
  clearPaths: () => void;
};

////////// worklet 안에서 쓸 현재 시각 (인라인 Date.now() 는 purity 린트에 걸립니다)
function getNowMs(): number {
  'worklet';
  return Date.now();
}

////////// 점 배열을 Skia 획 하나로 변환
function buildPath(points: WipePoint[]): SkPath | null {
  if (points.length < 2) return null;

  const path = Skia.Path.Make();
  path.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    path.lineTo(points[index].x, points[index].y);
  }
  return path;
}

export function useFogPaths(callbacks: FogPathsCallbacks): FogPathsResult {
  const activePoints = useSharedValue<WipePoint[]>([]);
  const lastHapticAt = useSharedValue(0);
  const [paths, setPaths] = useState<SkPath[]>([]);

  const commitPath = useCallback(
    (points: WipePoint[]) => {
      const path = buildPath(points);
      if (path != null) {
        setPaths((previous) => [...previous, path]);
      }
      ////////// UI 스레드에서 비우면 커밋(setPaths)보다 먼저 지워져 획이 한 프레임 사라집니다
      activePoints.set([]);
    },
    [activePoints],
  );

  const clearPaths = useCallback(() => {
    setPaths([]);
  }, []);

  const { onWipeStart, onWipeMove, onWipeEnd } = callbacks;

  const wipeGesture = Gesture.Pan()
    .onBegin((event) => {
      activePoints.set([{ x: event.x, y: event.y }]);
      lastHapticAt.set(0);
      runOnJS(onWipeStart)();
    })
    .onUpdate((event) => {
      activePoints.set([...activePoints.get(), { x: event.x, y: event.y }]);

      ////////// 햅틱은 스로틀해서 JS 왕복을 줄입니다
      const now = getNowMs();
      if (now - lastHapticAt.get() >= HAPTIC_THROTTLE_MS) {
        lastHapticAt.set(now);
        runOnJS(onWipeMove)();
      }
    })
    .onEnd(() => {
      runOnJS(commitPath)(activePoints.get());
    })
    ////////// 탭처럼 ACTIVE 를 못 거친 제스처는 onEnd 가 오지 않습니다. 정리는 반드시 onFinalize 에서
    .onFinalize(() => {
      runOnJS(onWipeEnd)();
    });

  return { wipeGesture, activePoints, paths, clearPaths };
}
