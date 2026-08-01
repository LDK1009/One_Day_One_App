//////////////////////////////////////// 간격 토큰 ////////////////////////////////////////
// 매직 넘버 대신 의미 있는 간격 상수를 사용합니다.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = keyof typeof spacing;
