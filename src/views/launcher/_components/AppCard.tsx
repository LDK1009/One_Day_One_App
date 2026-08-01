//////////////////////////////////////// 런처 앱 카드 ////////////////////////////////////////
// 챌린지 앱 하나를 나타내는 카드. 탭하면 해당 앱 라우트로 이동합니다.

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { DailyApp } from '@/shared/constants/apps';
import { fontSize, fontWeight, radius, spacing } from '@/shared/theme';

////////// Paper 아이콘 타입 (문자열 이름을 글리프 이름으로 좁힘)
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type AppCardProps = {
  app: DailyApp;
};

export function AppCard({ app }: AppCardProps) {
  const router = useRouter();

  ////////// 탭 → 햅틱 후 앱 라우트로 이동
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(app.route);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: `${app.accentColor}1A`, borderColor: `${app.accentColor}40` },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: app.accentColor }]}>
        <MaterialCommunityIcons name={app.icon as IconName} size={26} color="#FFFFFF" />
      </View>

      <Text style={[styles.dayBadge, { color: app.accentColor }]}>
        {app.day > 0 ? `DAY ${String(app.day).padStart(2, '0')}` : 'SAMPLE'}
      </Text>

      <Text style={styles.title} numberOfLines={1}>
        {app.title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {app.description}
      </Text>
    </Pressable>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 168,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-start',
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dayBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.xs,
    opacity: 0.65,
    lineHeight: 17,
  },
});
