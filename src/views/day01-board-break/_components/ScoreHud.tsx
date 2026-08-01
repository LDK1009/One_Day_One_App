//////////////////////////////////////// 누적 격파 수 ////////////////////////////////////////
// 화면 상단 중앙에 지금까지 깬 송판 수를 크게 보여줍니다 (촬영 기준으로 크게).

import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';

type ScoreHudProps = {
  brokenCount: number;
};

export function ScoreHud({ brokenCount }: ScoreHudProps) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreLabel}>격파</Text>
      <Text style={styles.scoreValue}>{brokenCount}</Text>
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  scoreBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scoreLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    opacity: 0.7,
    letterSpacing: 2,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    lineHeight: fontSize.xxl + 6,
  },
});
