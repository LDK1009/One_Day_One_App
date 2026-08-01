//////////////////////////////////////// 안내문 · 디버그 ////////////////////////////////////////
// 안내문은 Reanimated 애니메이션 스타일로 보였다 숨겼다 합니다 (JS 리렌더 없음).
// 디버그 패널은 개발 중에만 켜며, 숫자를 화면에 띄워야 하므로 별도로 폴링합니다.
// Task 8 에서 임계값을 확정한 뒤 SHOW_DEBUG 를 false 로 바꿉니다.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';
import { DEBUG_POLL_MS, SHOW_DEBUG } from '../_constants/fog';

type BlowHintProps = {
  fogLevel: SharedValue<number>;
  debugDb: SharedValue<number>;
  debugStreak: SharedValue<number>;
  ////////// 이번 김에 글씨를 쓴 적이 있는지 (있으면 쓰기 안내를 숨깁니다)
  hasWiped: boolean;
  ////////// 녹음 시작에 실패했는지
  hasMicError: boolean;
};

export function BlowHint({ fogLevel, debugDb, debugStreak, hasWiped, hasMicError }: BlowHintProps) {
  ////////// 김이 하나도 없을 때 — 불라는 안내 (마이크 오류 시에는 숨깁니다)
  const blowStyle = useAnimatedStyle(() => ({
    opacity: !hasMicError && fogLevel.get() === 0 ? 1 : 0,
  }));

  ////////// 김이 꽉 찼는데 아직 안 썼을 때 — 쓰라는 안내 (마이크 오류 시에는 숨깁니다)
  const writeStyle = useAnimatedStyle(() => ({
    opacity: fogLevel.get() >= 1 && !hasWiped && !hasMicError ? 1 : 0,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      {hasMicError ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>마이크를 사용할 수 없습니다</Text>
        </View>
      ) : null}

      <Animated.View style={[styles.hintBox, blowStyle]}>
        <Text style={styles.hintText}>마이크에 하아~ 불어보세요</Text>
      </Animated.View>

      <Animated.View style={[styles.hintBox, writeStyle]}>
        <Text style={styles.hintText}>손가락으로 글씨를 써보세요</Text>
      </Animated.View>

      {SHOW_DEBUG ? (
        <DebugPanel fogLevel={fogLevel} debugDb={debugDb} debugStreak={debugStreak} />
      ) : null}
    </View>
  );
}

//////////////////////////////////////// 디버그 패널 ////////////////////////////////////////
// 숫자를 텍스트로 보여줘야 해서 SharedValue 를 주기적으로 JS 로 복사합니다.
// 개발 중에만 켜므로 리렌더 비용을 감수합니다.

type DebugPanelProps = {
  fogLevel: SharedValue<number>;
  debugDb: SharedValue<number>;
  debugStreak: SharedValue<number>;
};

function DebugPanel({ fogLevel, debugDb, debugStreak }: DebugPanelProps) {
  const [snapshot, setSnapshot] = useState({ decibel: 0, streak: 0, fog: 0 });

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSnapshot({
        decibel: debugDb.get(),
        streak: debugStreak.get(),
        fog: fogLevel.get(),
      });
    }, DEBUG_POLL_MS);

    return () => clearInterval(intervalId);
  }, [debugDb, debugStreak, fogLevel]);

  return (
    <View style={styles.debugBox}>
      <Text style={styles.debugText}>dB {snapshot.decibel.toFixed(1)}</Text>
      <Text style={styles.debugText}>streak {snapshot.streak}</Text>
      <Text style={styles.debugText}>fog {snapshot.fog.toFixed(2)}</Text>
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBox: {
    position: 'absolute',
    bottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  debugBox: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  debugText: {
    color: '#7CFFB2',
    fontSize: fontSize.sm,
  },
});
