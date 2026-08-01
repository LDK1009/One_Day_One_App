//////////////////////////////////////// 송판 연출 ////////////////////////////////////////
// 나무 질감(그라데이션 + 나뭇결) + 두께감(하단 측면) + 타격 시 들쭉날쭉한 균열,
// 격파 시 좌우 반쪽이 회전하며 날아가고 파편이 흩어집니다.
//
// 이미지 에셋 없이 그라데이션·뷰 조합으로만 만들었습니다 (번들 용량 0).

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from 'react-native-paper';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';

import type { BoardMaterial } from '../_constants/materials';
import { BoardPattern } from './BoardPattern';

const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 104;
const HALF_WIDTH = BOARD_WIDTH / 2;
const EDGE_HEIGHT = 10;

////////// 격파 연출 시간(ms). useBreakGame 의 BREAK_ANIMATION_MS 와 맞춰야 자연스럽습니다.
const BREAK_DURATION_MS = 450;

////////// 파편 — [x방향, y방향, 회전, 크기]
const SPLINTERS = [
  [-1.4, -0.9, -140, 16],
  [-0.9, 0.7, 90, 11],
  [-0.5, -1.3, 200, 13],
  [0.6, -1.1, -170, 14],
  [1.1, 0.6, 120, 10],
  [1.5, -0.5, -90, 15],
  [0.2, 1.2, 60, 9],
  [-0.2, -1.5, 150, 12],
] as const;

type BoardStageProps = {
  currentHits: number;
  requiredHits: number;
  material: BoardMaterial;
  isBreaking: boolean;
  brokenCount: number;
};

export function BoardStage({
  currentHits,
  requiredHits,
  material,
  isBreaking,
  brokenCount,
}: BoardStageProps) {
  ////////// 0 = 멀쩡함, 1 = 완전히 갈라짐
  const breakProgress = useSharedValue(0);
  ////////// 타격 순간 짧게 흔들리는 값
  const hitPulse = useSharedValue(0);
  ////////// 새 송판 등장 (0 → 1)
  const entrance = useSharedValue(1);

  useEffect(() => {
    if (isBreaking) {
      breakProgress.set(withTiming(1, { duration: BREAK_DURATION_MS }));
    }
  }, [isBreaking, breakProgress]);

  ////////// 다음 송판 등장 → 상태 초기화 후 튀어나오기
  useEffect(() => {
    breakProgress.set(0);
    entrance.set(0);
    entrance.set(withSpring(1, { damping: 11, stiffness: 170 }));
  }, [brokenCount, breakProgress, entrance]);

  ////////// 타격 시 흔들림
  useEffect(() => {
    if (currentHits === 0) return;
    hitPulse.set(
      withSequence(
        withTiming(1, { duration: 45 }),
        withTiming(-0.7, { duration: 55 }),
        withTiming(0, { duration: 90 }),
      ),
    );
  }, [currentHits, hitPulse]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.88 + entrance.get() * 0.12 },
      { translateX: hitPulse.get() * 14 },
      { rotate: `${hitPulse.get() * 2}deg` },
    ],
    opacity: entrance.get(),
  }));

  const leftHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -breakProgress.get() * 150 },
      { translateY: breakProgress.get() * 70 },
      { rotate: `${-breakProgress.get() * 42}deg` },
    ],
    opacity: 1 - breakProgress.get() * 0.9,
  }));

  const rightHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: breakProgress.get() * 150 },
      { translateY: breakProgress.get() * 70 },
      { rotate: `${breakProgress.get() * 42}deg` },
    ],
    opacity: 1 - breakProgress.get() * 0.9,
  }));

  ////////// 마지막 타격은 격파이므로 금은 requiredHits-1 개까지만
  const crackCount = Math.min(currentHits, Math.max(requiredHits - 1, 0));

  return (
    <View style={styles.stage} pointerEvents="none">
      <Animated.View style={[styles.board, containerStyle]}>
        <BoardHalf side="left" material={material} animatedStyle={leftHalfStyle} />
        <BoardHalf side="right" material={material} animatedStyle={rightHalfStyle} />

        {/* 타격으로 생긴 균열 */}
        {Array.from({ length: crackCount }).map((_, index) => (
          <Crack key={`crack-${index}`} index={index} color={material.crackColor} />
        ))}

        {/* 격파 파편 */}
        {SPLINTERS.map((splinter, index) => (
          <Splinter
            key={`splinter-${index}`}
            spec={splinter}
            progress={breakProgress}
            material={material}
          />
        ))}
      </Animated.View>

      <View style={styles.caption}>
        <Text style={styles.captionText}>
          {material.name} · {currentHits}/{requiredHits}
        </Text>
      </View>
    </View>
  );
}

//////////////////// 송판 반쪽 ////////////////////
type BoardHalfProps = {
  side: 'left' | 'right';
  material: BoardMaterial;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
};

function BoardHalf({ side, material, animatedStyle }: BoardHalfProps) {
  const isLeft = side === 'left';

  return (
    <Animated.View
      style={[
        styles.half,
        isLeft ? styles.leftHalf : styles.rightHalf,
        { borderColor: material.borderColor },
        animatedStyle,
      ]}
    >
      {/* 재질 바탕 — 위에서 아래로 빛이 떨어지는 느낌 */}
      <LinearGradient
        colors={material.gradient}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 재질별 무늬 */}
      <BoardPattern
        pattern={material.pattern}
        width={HALF_WIDTH}
        height={BOARD_HEIGHT}
        isLeft={isLeft}
      />

      {/* 쪼개진 단면 (안쪽 모서리) */}
      <View style={isLeft ? styles.innerEdgeLeft : styles.innerEdgeRight} />

      {/* 두께감 — 아래쪽 측면 */}
      <LinearGradient
        colors={material.edgeGradient}
        style={[styles.bottomEdge, isLeft ? styles.bottomEdgeLeft : styles.bottomEdgeRight]}
      />
    </Animated.View>
  );
}

//////////////////// 균열 ////////////////////
// 직선 대신 짧은 조각을 어긋나게 쌓아 들쭉날쭉하게 만듭니다.
type CrackProps = {
  index: number;
  color: string;
};

function Crack({ index, color }: CrackProps) {
  const baseLeft = HALF_WIDTH - 46 + index * 30;
  const segments = [0, 1, 2, 3, 4];

  return (
    <>
      {segments.map((segment) => {
        const offset = segment % 2 === 0 ? 0 : 4 - (index % 2) * 7;
        return (
          <View
            key={`seg-${segment}`}
            style={[
              styles.crackSegment,
              {
                backgroundColor: color,
                left: baseLeft + offset,
                top: 6 + segment * ((BOARD_HEIGHT - 12) / segments.length),
                height: (BOARD_HEIGHT - 12) / segments.length,
                transform: [{ rotate: `${segment % 2 === 0 ? 9 : -11}deg` }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

//////////////////// 파편 ////////////////////
type SplinterProps = {
  spec: (typeof SPLINTERS)[number];
  progress: ReturnType<typeof useSharedValue<number>>;
  material: BoardMaterial;
};

function Splinter({ spec, progress, material }: SplinterProps) {
  const [directionX, directionY, rotation, size] = spec;

  const animatedStyle = useAnimatedStyle(() => {
    const value = progress.get();
    ////////// 중력 느낌 — 수평은 등속, 수직은 뒤로 갈수록 아래로
    return {
      opacity: value === 0 ? 0 : 1 - value,
      transform: [
        { translateX: directionX * 130 * value },
        { translateY: directionY * 60 * value + 120 * value * value },
        { rotate: `${rotation * value}deg` },
        { scale: 0.6 + value * 0.5 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.splinter,
        {
          width: size,
          height: size * material.splinterAspect,
          left: HALF_WIDTH - size / 2,
          backgroundColor: material.splinterColor,
          borderColor: material.splinterBorder,
        },
        animatedStyle,
      ]}
    />
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    gap: spacing.md,
  },
  board: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    flexDirection: 'row',
  },
  half: {
    width: HALF_WIDTH,
    height: BOARD_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#8A8A8A',
    ////////// 바닥에 드리우는 그림자로 떠 있는 느낌
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  leftHalf: {
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 2,
    borderRightWidth: 0,
  },
  rightHalf: {
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderWidth: 2,
    borderLeftWidth: 0,
  },
  innerEdgeLeft: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(92,58,30,0.35)',
  },
  innerEdgeRight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(92,58,30,0.35)',
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    height: EDGE_HEIGHT,
    left: 0,
    right: 0,
  },
  bottomEdgeLeft: {
    borderBottomLeftRadius: radius.sm,
  },
  bottomEdgeRight: {
    borderBottomRightRadius: radius.sm,
  },
  crackSegment: {
    position: 'absolute',
    width: 3,
    borderRadius: 1,
  },
  splinter: {
    position: 'absolute',
    top: BOARD_HEIGHT / 2,
    borderWidth: 1,
    borderRadius: 2,
  },
  caption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
