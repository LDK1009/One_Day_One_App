//////////////////////////////////////// 샘플 앱 화면 ////////////////////////////////////////
// 템플릿이 제대로 도는지 확인하는 최소 예시 — 탭 카운터.
// 테마 토큰 / Paper 컴포넌트 / 햅틱 사용법을 한눈에 보여줍니다. 실제 챌린지 시작하면 지워도 됩니다.

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { brand, fontSize, fontWeight, radius, spacing } from '@/shared/theme';

export function Day00SampleView() {
  const [count, setCount] = useState(0);

  ////////// 탭 → 햅틱 + 카운트 증가
  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCount((previous) => previous + 1);
  };

  ////////// 초기화
  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCount(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>화면을 탭하세요</Text>

      <Pressable
        onPress={handleTap}
        style={({ pressed }) => [styles.tapArea, pressed && styles.tapAreaPressed]}
      >
        <Text style={styles.count}>{count}</Text>
      </Pressable>

      <Button mode="text" onPress={handleReset} disabled={count === 0}>
        초기화
      </Button>
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    opacity: 0.6,
  },
  tapArea: {
    width: 220,
    height: 220,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${brand.primary}1A`,
    borderWidth: 2,
    borderColor: `${brand.primary}55`,
  },
  tapAreaPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: `${brand.primary}33`,
  },
  count: {
    fontSize: 88,
    fontWeight: fontWeight.black,
    color: brand.primary,
  },
});
