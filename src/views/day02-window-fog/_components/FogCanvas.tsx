//////////////////////////////////////// 김서림 캔버스 ////////////////////////////////////////
// 흰색 사각형(김)을 깔고, 손가락 경로를 blendMode="clear" 로 뚫어 아래 카메라가 드러나게 합니다.
//
// <Group layer> 가 필수입니다. layer 가 없으면 clear 가 이 캔버스를 넘어
// 아래에 깔린 카메라 뷰까지 뚫어버립니다.

import { Canvas, Group, Path, Rect, Skia, type SkPath } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { WIPE_STROKE_WIDTH } from '../_constants/fog';

export type WipePoint = { x: number; y: number };

type FogCanvasProps = {
  ////////// 김 농도 0~1
  fogLevel: SharedValue<number>;
  ////////// 지금 그리는 중인 획의 점들. 손을 떼면 빈 배열이 됩니다
  activePoints: SharedValue<WipePoint[]>;
  ////////// 이미 완성된 획들
  paths: SkPath[];
};

export function FogCanvas({ fogLevel, activePoints, paths }: FogCanvasProps) {
  const { width, height } = useWindowDimensions();

  ////////// 그리는 중인 획 — worklet 안에서 매 프레임 재구성하므로 JS 리렌더가 없습니다
  const activePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const points = activePoints.get();
    if (points.length > 0) {
      path.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        path.lineTo(points[index].x, points[index].y);
      }
    }
    return path;
  });

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group layer>
        <Group opacity={fogLevel}>
          <Rect x={0} y={0} width={width} height={height} color="#FFFFFF" />
        </Group>

        {paths.map((path, index) => (
          <Path
            key={index}
            path={path}
            blendMode="clear"
            style="stroke"
            strokeWidth={WIPE_STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}

        <Path
          path={activePath}
          blendMode="clear"
          style="stroke"
          strokeWidth={WIPE_STROKE_WIDTH}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>
    </Canvas>
  );
}
