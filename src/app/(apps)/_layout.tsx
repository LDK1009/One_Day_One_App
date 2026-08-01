//////////////////////////////////////// 챌린지 앱 레이아웃 ////////////////////////////////////////
// 개별 앱 화면 그룹. 시연 중 런처로 돌아올 수 있도록 헤더(뒤로가기)를 켭니다.

import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function AppsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.onBackground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
