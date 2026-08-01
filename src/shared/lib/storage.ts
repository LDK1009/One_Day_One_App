//////////////////////////////////////// 영구 저장소 ////////////////////////////////////////
// zustand persist 의 저장 엔진. dev build 전환으로 MMKV 를 쓸 수 있게 되어 교체했습니다.
// MMKV 는 동기 API 라 AsyncStorage 보다 빠르고, 앱 시작 시 상태 복원이 즉시 끝납니다.

import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

////////// 앱 전역 기본 인스턴스
export const storage = createMMKV();

//////////////////// zustand persist 어댑터 ////////////////////
// zustand 의 StateStorage 는 동기·비동기 둘 다 허용하므로 그대로 연결하면 됩니다.
export const persistStorage: StateStorage = {
  setItem: (key, value) => storage.set(key, value),
  getItem: (key) => storage.getString(key) ?? null,
  removeItem: (key) => storage.remove(key),
};
