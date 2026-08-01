//////////////////////////////////////// 앱 전역 설정 스토어 ////////////////////////////////////////
// zustand persist + AsyncStorage 사용 예시. 테마 모드 등 비민감 클라이언트 상태를 영구 저장합니다.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { persistStorage } from '@/shared/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type AppState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => persistStorage),
    },
  ),
);
