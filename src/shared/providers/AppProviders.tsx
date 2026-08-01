//////////////////////////////////////// 전역 Provider 묶음 ////////////////////////////////////////
// 앱 루트에서 마운트되는 Provider 트리. 순서가 중요합니다.
// GestureHandler → SafeArea → Query → Paper

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/shared/lib/queryClient';
import { darkTheme, lightTheme } from '@/shared/theme';
import { useAppStore } from '@/shared/store/appStore';

////////// Paper 아이콘을 @expo/vector-icons 로 연결 (Expo 환경에서 필수)
// Paper 는 아이콘 이름을 string 으로 넘기므로 vector-icons 의 글리프 타입으로 좁혀줍니다.
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const paperSettings = {
  icon: (props: { name: string; color?: string; size: number }) => (
    <MaterialCommunityIcons name={props.name as IconName} color={props.color} size={props.size} />
  ),
};

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const systemScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.themeMode);

  ////////// 테마 결정: 사용자 설정(themeMode)이 우선, 'system'이면 OS 설정을 따름
  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme} settings={paperSettings}>
            {children}
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
