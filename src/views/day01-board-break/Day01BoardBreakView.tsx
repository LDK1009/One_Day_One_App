//////////////////////////////////////// 송판 격파 ////////////////////////////////////////
// S1 단계: 전면 카메라 프리뷰가 뜨는지 확인.
// 이후 단계에서 포즈 추론(S2) → 자세/주먹 판정(S3~S4) → 게임 연출(S5)을 얹습니다.

import { useIsFocused } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';

import { CameraLayer } from './_components/CameraLayer';

export function Day01BoardBreakView() {
  const insets = useSafeAreaInsets();

  ////////// 다른 화면으로 이동하면 카메라를 멈춤
  const isFocused = useIsFocused();

  return (
    <CameraLayer isActive={isFocused}>
      <View style={[styles.overlay, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>S1 · 카메라 프리뷰</Text>
        </View>
      </View>
    </CameraLayer>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
