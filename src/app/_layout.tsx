//////////////////////////////////////// 루트 레이아웃 ////////////////////////////////////////
// Provider 트리만 마운트합니다. 로그인·백엔드 없음 — 앱을 켜면 바로 런처가 뜹니다.

import { Stack } from 'expo-router';

import { AppProviders } from '@/shared/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(apps)" />
      </Stack>
    </AppProviders>
  );
}
