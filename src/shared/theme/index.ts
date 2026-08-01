//////////////////////////////////////// Paper 테마 ////////////////////////////////////////
// light/dark MD3 테마에 브랜드 색상을 주입합니다.
// 앱마다 룩을 바꾸려면 colors/radius/typography 토큰 파일만 수정하세요.

import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { brand } from './colors';

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    error: brand.error,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.primary,
    secondary: brand.secondary,
    error: brand.error,
  },
};

export { accentByDay, accents, brand } from './colors';
export { radius, type Radius } from './radius';
export { spacing, type Spacing } from './spacing';
export { fontSize, fontWeight, type FontSize } from './typography';
