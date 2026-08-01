//////////////////////////////////////// 송판 연출 ////////////////////////////////////////
// 송판을 좌/우 반쪽으로 나눠 두고, 격파 시 양쪽으로 튕겨나가게 합니다.
// 타격마다 금(crack)이 하나씩 늘고 판이 짧게 흔들립니다.

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

const BOARD_WIDTH = 280;
const BOARD_HEIGHT = 96;
const HALF_WIDTH = BOARD_WIDTH / 2;

////////// 격파 연출 시간(ms). useBreakGame 의 BREAK_ANIMATION_MS 와 맞춰야 자연스럽습니다.
const BREAK_DURATION_MS = 450;

type BoardStageProps = {
  currentHits: number;
  requiredHits: number;
  boardLabel: string;
  isBreaking: boolean;
  brokenCount: number;
};

export function BoardStage({
  currentHits,
  requiredHits,
  boardLabel,
  isBreaking,
  brokenCount,
}: BoardStageProps) {
  ////////// 0 = 멀쩡함, 1 = 완전히 갈라짐
  const breakProgress = useSharedValue(0);
  ////////// 타격 순간 짧게 흔들리는 값
  const hitPulse = useSharedValue(0);
  ////////// 새 송판 등장 (0 → 1)
  const entrance = useSharedValue(1);

  ////////// 격파 시작 → 갈라짐
  useEffect(() => {
    if (isBreaking) {
      breakProgress.set(withTiming(1, { duration: BREAK_DURATION_MS }));
    }
  }, [isBreaking, breakProgress]);

  ////////// 다음 송판 등장 → 상태 초기화 후 튀어나오기
  useEffect(() => {
    breakProgress.set(0);
    entrance.set(0);
    entrance.set(withSpring(1, { damping: 12, stiffness: 180 }));
  }, [brokenCount, breakProgress, entrance]);

  ////////// 타격 시 흔들림
  useEffect(() => {
    if (currentHits === 0) return;
    hitPulse.set(
      withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 140 })),
    );
  }, [currentHits, hitPulse]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.85 + entrance.get() * 0.15 },
      { translateX: hitPulse.get() * 10 },
    ],
    opacity: entrance.get(),
  }));

  const leftHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -breakProgress.get() * 140 },
      { translateY: breakProgress.get() * 60 },
      { rotate: `${-breakProgress.get() * 35}deg` },
    ],
    opacity: 1 - breakProgress.get(),
  }));

  const rightHalfStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: breakProgress.get() * 140 },
      { translateY: breakProgress.get() * 60 },
      { rotate: `${breakProgress.get() * 35}deg` },
    ],
    opacity: 1 - breakProgress.get(),
  }));

  ////////// 남은 타격 수만큼 금을 그림 (마지막 타격은 격파이므로 금은 requiredHits-1 개까지)
  const crackCount = Math.min(currentHits, Math.max(requiredHits - 1, 0));

  return (
    <View style={styles.stage} pointerEvents="none">
      <Animated.View style={[styles.board, containerStyle]}>
        <Animated.View style={[styles.half, styles.leftHalf, leftHalfStyle]}>
          <View style={styles.grain} />
          <View style={[styles.grain, styles.grainLower]} />
        </Animated.View>

        <Animated.View style={[styles.half, styles.rightHalf, rightHalfStyle]}>
          <View style={styles.grain} />
          <View style={[styles.grain, styles.grainLower]} />
        </Animated.View>

        {/* 타격으로 생긴 금 */}
        {Array.from({ length: crackCount }).map((_, index) => (
          <View
            key={`crack-${index}`}
            style={[
              styles.crack,
              {
                left: HALF_WIDTH - 40 + index * 26,
                transform: [{ rotate: index % 2 === 0 ? '12deg' : '-14deg' }],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* 송판 정보 */}
      <View style={styles.caption}>
        <Text style={styles.captionText}>
          {boardLabel} · {currentHits}/{requiredHits}
        </Text>
      </View>
    </View>
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
    backgroundColor: '#C98A4B',
    borderColor: '#8B5A2B',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  leftHalf: {
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 2,
    borderRightWidth: 1,
  },
  rightHalf: {
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    borderWidth: 2,
    borderLeftWidth: 1,
  },
  grain: {
    height: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(139,90,43,0.45)',
  },
  grainLower: {
    width: '70%',
  },
  crack: {
    position: 'absolute',
    top: 4,
    width: 3,
    height: BOARD_HEIGHT - 8,
    backgroundColor: 'rgba(40,20,5,0.75)',
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
