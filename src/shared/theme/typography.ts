//////////////////////////////////////// 타이포 토큰 ////////////////////////////////////////
// Paper 의 variant 로 부족할 때 쓰는 원시 값. 영상 촬영 기준이라 기본 스케일을 크게 잡았습니다.

import type { TextStyle } from 'react-native';

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const fontWeight: Record<'regular' | 'medium' | 'bold' | 'black', TextStyle['fontWeight']> = {
  regular: '400',
  medium: '500',
  bold: '700',
  black: '900',
};

export type FontSize = keyof typeof fontSize;
