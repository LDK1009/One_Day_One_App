//////////////////////////////////////// 단계 안내 ////////////////////////////////////////
// 화면 하단에 지금 무엇을 해야 하는지 한 줄로 안내합니다.

import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';

import type { GamePhase } from '../_hooks/useBreakGame';

type GuideBannerProps = {
  phase: GamePhase;
  isStanceHeld: boolean;
  isModelReady: boolean;
};

export function GuideBanner({ phase, isStanceHeld, isModelReady }: GuideBannerProps) {
  ////////// 단계별 안내 문구
  let guide: string;
  if (!isModelReady) {
    guide = '모델 불러오는 중...';
  } else if (phase === 'waiting') {
    guide = isStanceHeld ? '그대로 유지!' : '발 벌리고 양 주먹을 허리에';
  } else {
    guide = '주먹을 쭉 지르세요';
  }

  return (
    <View style={styles.guideBox}>
      <Text style={styles.guideText}>{guide}</Text>
    </View>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  guideBox: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});
