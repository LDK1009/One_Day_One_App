//////////////////////////////////////// 안내문 · 디버그 ////////////////////////////////////////
// 안내문은 화면 정중앙에 아이콘 + 문구 카드로 띄웁니다.
// 세 안내가 같은 자리에 겹치므로 각 레이어를 absoluteFill 로 깔고 opacity 로만 전환합니다
// (Reanimated 애니메이션 스타일이라 JS 리렌더가 없습니다).
//
// 디버그 패널은 임계값 실측용이라 평소에는 끕니다 — _constants/fog.ts 의 SHOW_DEBUG 로 켜세요.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';
import { DEBUG_POLL_MS, SHOW_DEBUG } from '../_constants/fog';

////////// 안내 카드 색·크기 (테마에 없는 값이라 여기서 관리합니다)
const HINT_ICON_SIZE = 56;
const HINT_FOREGROUND = '#FFFFFF';
const HINT_SCRIM = 'rgba(0, 0, 0, 0.5)';

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
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {hasMicError ? (
        <View style={[StyleSheet.absoluteFill, styles.hintLayer]}>
          <HintCard iconName="microphone-off" message="마이크를 사용할 수 없습니다" />
        </View>
      ) : null}

      <Animated.View style={[StyleSheet.absoluteFill, styles.hintLayer, blowStyle]}>
        <HintCard iconName="weather-windy" message="마이크에 하아~ 불어보세요" />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, styles.hintLayer, writeStyle]}>
        <HintCard iconName="draw" message="손가락으로 글씨를 써보세요" />
      </Animated.View>

      {SHOW_DEBUG ? (
        <DebugPanel fogLevel={fogLevel} debugDb={debugDb} debugStreak={debugStreak} />
      ) : null}
    </View>
  );
}

//////////////////////////////////////// 안내 카드 ////////////////////////////////////////
// 아이콘을 위, 문구를 아래에 둔 세로 카드. 세 안내가 같은 모양을 공유합니다.

type HintCardProps = {
  ////////// MaterialCommunityIcons 아이콘 이름
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  message: string;
};

function HintCard({ iconName, message }: HintCardProps) {
  return (
    <View style={styles.hintCard}>
      <MaterialCommunityIcons name={iconName} size={HINT_ICON_SIZE} color={HINT_FOREGROUND} />
      <Text style={styles.hintText}>{message}</Text>
    </View>
  );
}

//////////////////////////////////////// 디버그 패널 ////////////////////////////////////////
// 숫자를 텍스트로 보여줘야 해서 SharedValue 를 주기적으로 JS 로 복사합니다.
// 실측할 때만 켜므로 리렌더 비용을 감수합니다.

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
  ////////// 안내 하나가 차지하는 레이어. 화면 전체를 덮고 카드를 정중앙에 놓습니다
  hintLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: HINT_SCRIM,
  },
  hintText: {
    color: HINT_FOREGROUND,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
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
