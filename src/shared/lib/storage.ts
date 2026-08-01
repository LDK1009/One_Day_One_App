//////////////////////////////////////// 영구 저장소 ////////////////////////////////////////
// zustand persist 의 저장 엔진. Expo Go 에서 바로 동작하도록 AsyncStorage 를 사용합니다.
// (더 빠른 저장이 필요하면 dev build 전환 후 react-native-mmkv 로 교체 — README 참고)

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

//////////////////// zustand persist 어댑터 ////////////////////
// AsyncStorage 는 비동기(Promise) API 이며 zustand 의 StateStorage 인터페이스와 호환됩니다.
export const persistStorage: StateStorage = {
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  getItem: (key) => AsyncStorage.getItem(key),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
