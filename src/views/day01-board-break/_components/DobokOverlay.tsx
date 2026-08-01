//////////////////////////////////////// 도복 오버레이 ////////////////////////////////////////
// 어깨·골반 키포인트에 흰 도복 상의와 검은 띠를 붙여 몸을 따라다니게 합니다.
//
// 진짜 옷 교체(픽셀 단위)는 인체 세그멘테이션 마스크가 필요한데 MoveNet 은 키포인트 17개만
// 주므로 불가능합니다. 대신 몸통 사각형을 키포인트로 추정해 그 위에 덧입히는 방식입니다.
//
// 좌표 계산:
//   어깨 중점 · 골반 중점 (프레임 기준 0~1)
//     → 프리뷰 'cover' 보정 + 좌우 반전 → 화면 픽셀
//     → 두 점의 중점에 배치 / 두 점을 잇는 각도로 회전 / 어깨너비·몸통길이로 확대

import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { MIN_KEYPOINT_SCORE, MIRROR_OVERLAY_X } from '../_constants/pose';
import type { FrameSize } from '../_hooks/usePoseDetection';
import type { PoseKeypoints } from '../_utils/keypoints';

////////// 기준 크기. 실제 크기는 transform scale 로 맞춥니다 (레이아웃 재계산 방지)
const BASE_WIDTH = 100;
const BASE_HEIGHT = 140;

////////// 어깨너비 대비 도복 폭 배수 (옷은 몸보다 넓게 걸침)
const JACKET_WIDTH_RATIO = 1.75;
////////// 몸통 길이 대비 도복 길이 배수 (골반 아래까지 내려옴)
const JACKET_LENGTH_RATIO = 1.35;

type DobokOverlayProps = {
  keypoints: SharedValue<PoseKeypoints>;
  frameSize: SharedValue<FrameSize>;
};

export function DobokOverlay({ keypoints, frameSize }: DobokOverlayProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const points = keypoints.get();
    const frame = frameSize.get();

    const { leftShoulder, rightShoulder, leftHip, rightHip } = points;
    const minScore = Math.min(
      leftShoulder.score,
      rightShoulder.score,
      leftHip.score,
      rightHip.score,
    );

    if (frame.width === 0 || layout.width === 0 || minScore < MIN_KEYPOINT_SCORE) {
      return { opacity: 0 };
    }

    ////////// 프리뷰 'cover' 로 확대·크롭된 좌표계로 변환
    const scale = Math.max(layout.width / frame.width, layout.height / frame.height);
    const displayWidth = frame.width * scale;
    const displayHeight = frame.height * scale;
    const offsetX = (layout.width - displayWidth) / 2;
    const offsetY = (layout.height - displayHeight) / 2;

    const toScreenX = (normalizedX: number) => {
      const raw = offsetX + normalizedX * displayWidth;
      return MIRROR_OVERLAY_X ? layout.width - raw : raw;
    };
    const toScreenY = (normalizedY: number) => offsetY + normalizedY * displayHeight;

    const shoulderMidX = toScreenX((leftShoulder.x + rightShoulder.x) / 2);
    const shoulderMidY = toScreenY((leftShoulder.y + rightShoulder.y) / 2);
    const hipMidX = toScreenX((leftHip.x + rightHip.x) / 2);
    const hipMidY = toScreenY((leftHip.y + rightHip.y) / 2);

    ////////// 몸통 길이·기울기
    const torsoDeltaX = hipMidX - shoulderMidX;
    const torsoDeltaY = hipMidY - shoulderMidY;
    const torsoLength = Math.sqrt(torsoDeltaX * torsoDeltaX + torsoDeltaY * torsoDeltaY);
    if (torsoLength < 1) return { opacity: 0 };

    ////////// 세로축(아래 방향) 기준 기울기 각도
    const angleDegrees = (Math.atan2(torsoDeltaX, torsoDeltaY) * 180) / Math.PI;

    ////////// 어깨 너비 (화면 픽셀)
    const shoulderScreenWidth = Math.abs(
      toScreenX(leftShoulder.x) - toScreenX(rightShoulder.x),
    );

    const centerX = (shoulderMidX + hipMidX) / 2;
    const centerY = (shoulderMidY + hipMidY) / 2;

    return {
      opacity: 1,
      transform: [
        { translateX: centerX - layout.width / 2 },
        { translateY: centerY - layout.height / 2 },
        { rotate: `${-angleDegrees}deg` },
        { scaleX: (shoulderScreenWidth * JACKET_WIDTH_RATIO) / BASE_WIDTH },
        { scaleY: (torsoLength * JACKET_LENGTH_RATIO) / BASE_HEIGHT },
      ],
    };
  });

  return (
    <View style={styles.container} pointerEvents="none" onLayout={handleLayout}>
      <Animated.View style={[styles.jacket, animatedStyle]}>
        {/* 도복 상의 몸판 */}
        <View style={styles.body} />

        {/* 왼쪽 앞섶 */}
        <View style={[styles.lapel, styles.lapelLeft]} />
        {/* 오른쪽 앞섶 (위로 겹침) */}
        <View style={[styles.lapel, styles.lapelRight]} />

        {/* 검은 띠 */}
        <View style={styles.belt} />
        <View style={styles.beltKnot} />
      </Animated.View>
    </View>
  );
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
  jacket: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -BASE_WIDTH / 2,
    marginTop: -BASE_HEIGHT / 2,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  },
  body: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F3EC',
    borderWidth: 1.5,
    borderColor: '#C9C4B4',
    borderRadius: 6,
  },
  lapel: {
    position: 'absolute',
    top: -2,
    width: 26,
    height: BASE_HEIGHT * 0.82,
    backgroundColor: '#FBFAF6',
    borderColor: '#C9C4B4',
    borderWidth: 1.5,
  },
  lapelLeft: {
    left: BASE_WIDTH / 2 - 30,
    transform: [{ rotate: '13deg' }],
  },
  lapelRight: {
    left: BASE_WIDTH / 2 + 4,
    transform: [{ rotate: '-13deg' }],
  },
  belt: {
    position: 'absolute',
    left: -4,
    right: -4,
    bottom: BASE_HEIGHT * 0.12,
    height: 14,
    backgroundColor: '#16181D',
    borderRadius: 3,
  },
  beltKnot: {
    position: 'absolute',
    left: BASE_WIDTH / 2 - 11,
    bottom: BASE_HEIGHT * 0.09,
    width: 22,
    height: 20,
    backgroundColor: '#22252C',
    borderRadius: 4,
  },
});
