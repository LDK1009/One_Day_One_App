//////////////////////////////////////// 런처 화면 ////////////////////////////////////////
// 챌린지로 만든 앱들을 2열 그리드로 보여줍니다. 릴스 인트로 화면 역할도 겸합니다.

import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAppsSortedByDay, getChallengeCount } from '@/shared/constants/apps';
import { fontSize, fontWeight, spacing } from '@/shared/theme';

import { AppCard } from './_components/AppCard';

////////// 그리드 열 개수
const COLUMN_COUNT = 2;

export function LauncherView() {
  const insets = useSafeAreaInsets();

  ////////// 최신 Day 가 위로 오도록 정렬 + 진행 개수
  const apps = getAppsSortedByDay();
  const challengeCount = getChallengeCount();

  ////////// 2개씩 묶어 행 단위로 렌더 (홀수면 마지막 칸을 빈 자리로 채움)
  const rows: (typeof apps)[] = [];
  for (let index = 0; index < apps.length; index += COLUMN_COUNT) {
    rows.push(apps.slice(index, index + COLUMN_COUNT));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <Text style={styles.heading}>1일 1앱</Text>
      <Text style={styles.subheading}>
        매일 앱 하나씩 · 지금까지 {challengeCount}개
      </Text>

      {/* 앱 그리드 */}
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
            {row.length < COLUMN_COUNT && <View style={styles.spacer} />}
          </View>
        ))}
      </View>

      {/* 빈 상태 */}
      {apps.length === 0 && (
        <Text style={styles.empty}>
          아직 앱이 없습니다.{'\n'}
          {'node scripts/new-app.js day01-slug "제목"'} 으로 첫 앱을 만드세요.
        </Text>
      )}
    </ScrollView>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    letterSpacing: -1,
  },
  subheading: {
    fontSize: fontSize.sm,
    opacity: 0.6,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  grid: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  empty: {
    fontSize: fontSize.sm,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xxl,
    lineHeight: 22,
  },
});
