//////////////////////////////////////// 스켈레톤 오버레이 ////////////////////////////////////////
// S2 검증용. 모델이 실제로 사람을 잡고 있는지 눈으로 확인하기 위해 키포인트 17개를 점으로 찍습니다.
// 게임 완성 후에는 debug 토글로 꺼두면 됩니다.
//
// 좌표 변환:
//   키포인트(프레임 기준 0~1)
//     → 프리뷰 resizeMode 'cover' 로 확대·크롭된 위치 보정
//     → 전면 카메라 좌우 반전 보정
//     → 화면 픽셀 좌표

import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { KEYPOINT_NAMES, MIN_KEYPOINT_SCORE, MIRROR_OVERLAY_X } from '../_constants/pose';
import type { FrameSize } from '../_hooks/usePoseDetection';
import type { KeypointName, PoseKeypoints } from '../_utils/keypoints';

const DOT_SIZE = 12;

type SkeletonOverlayProps = {
  keypoints: SharedValue<PoseKeypoints>;
  frameSize: SharedValue<FrameSize>;
};

export function SkeletonOverlay({ keypoints, frameSize }: SkeletonOverlayProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={styles.container} pointerEvents="none" onLayout={handleLayout}>
      {KEYPOINT_NAMES.map((name) => (
        <KeypointDot
          key={name}
          name={name}
          keypoints={keypoints}
          frameSize={frameSize}
          viewWidth={layout.width}
          viewHeight={layout.height}
        />
      ))}
    </View>
  );
}

//////////////////// 키포인트 점 하나 ////////////////////
type KeypointDotProps = {
  name: KeypointName;
  keypoints: SharedValue<PoseKeypoints>;
  frameSize: SharedValue<FrameSize>;
  viewWidth: number;
  viewHeight: number;
};

function KeypointDot({
  name,
  keypoints,
  frameSize,
  viewWidth,
  viewHeight,
}: KeypointDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const point = keypoints.get()[name];
    const frame = frameSize.get();

    ////////// 아직 프레임이 안 왔거나 신뢰도가 낮으면 숨김
    if (frame.width === 0 || viewWidth === 0 || point.score < MIN_KEYPOINT_SCORE) {
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    }

    ////////// 'cover' 로 확대된 프리뷰 크기와 잘려나간 여백 계산
    const scale = Math.max(viewWidth / frame.width, viewHeight / frame.height);
    const displayWidth = frame.width * scale;
    const displayHeight = frame.height * scale;
    const offsetX = (viewWidth - displayWidth) / 2;
    const offsetY = (viewHeight - displayHeight) / 2;

    const rawX = offsetX + point.x * displayWidth;
    const screenX = MIRROR_OVERLAY_X ? viewWidth - rawX : rawX;
    const screenY = offsetY + point.y * displayHeight;

    return {
      opacity: 1,
      transform: [
        { translateX: screenX - DOT_SIZE / 2 },
        { translateY: screenY - DOT_SIZE / 2 },
      ],
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#00E5FF',
    borderWidth: 1,
    borderColor: '#003844',
  },
});
